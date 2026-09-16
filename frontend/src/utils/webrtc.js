// Lightweight manager around native WebRTC RTCPeerConnection for a mesh-topology
// multi-user call. Signaling (offer/answer/ICE) is relayed through Socket.io.

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class PeerManager {
  constructor(socket, localStream, callbacks = {}) {
    this.socket = socket;
    this.localStream = localStream;
    this.peers = new Map(); // socketId -> RTCPeerConnection
    this.onRemoteStream = callbacks.onRemoteStream || (() => {});
    this.onPeerClosed = callbacks.onPeerClosed || (() => {});
  }

  createPeerConnection(remoteSocketId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      this.onRemoteStream(remoteSocketId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.onPeerClosed(remoteSocketId);
      }
    };

    this.peers.set(remoteSocketId, pc);
    return pc;
  }

  async callPeer(remoteSocketId) {
    const pc = this.createPeerConnection(remoteSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('webrtc-offer', { to: remoteSocketId, offer });
  }

  async handleOffer(fromSocketId, offer) {
    const pc = this.createPeerConnection(fromSocketId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit('webrtc-answer', { to: fromSocketId, answer });
  }

  async handleAnswer(fromSocketId, answer) {
    const pc = this.peers.get(fromSocketId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(fromSocketId, candidate) {
    const pc = this.peers.get(fromSocketId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        // benign if it arrives before remote description is set in rare races
      }
    }
  }

  // Replace the outgoing video track on every connection at once (used for screen share toggle)
  replaceVideoTrack(newTrack) {
    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(newTrack);
    });
  }

  closePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
    }
  }

  closeAll() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
  }
}
