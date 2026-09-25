const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

const DEFAULT_KEY = 'a134fb6f5948eb9dd7b9b2bf24345c797aac749921f35d95b71f1442a50d93c9';

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  if (!keyHex || keyHex.length !== 64) {
    return Buffer.from(DEFAULT_KEY, 'hex');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a plain text string.
 * Returns a single string in the form: iv:authTag:cipherText (all hex-encoded)
 * so it can be stored as one field in MongoDB.
 */
function encrypt(text) {
  if (text === null || text === undefined) return text;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string produced by encrypt().
 */
function decrypt(payload) {
  if (payload === null || payload === undefined) return payload;
  const parts = String(payload).split(':');
  if (parts.length !== 3) return payload; // not encrypted / legacy plain text
  const [ivHex, authTagHex, dataHex] = parts;
  try {
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedText = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    return null; // tampered / undecryptable
  }
}

module.exports = { encrypt, decrypt };
