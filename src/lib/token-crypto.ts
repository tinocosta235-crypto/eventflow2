import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32; // 256-bit

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY ?? "";
  if (!raw) {
    // In dev without key set, use a deterministic zero key (not for prod)
    return Buffer.alloc(KEY_LEN, 0);
  }
  // Accept hex string or raw 32-byte base64
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length >= KEY_LEN) return buf.subarray(0, KEY_LEN);
  // Pad if shorter (dev convenience)
  const padded = Buffer.alloc(KEY_LEN, 0);
  buf.copy(padded);
  return padded;
}

export function encryptTokens(data: object): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit nonce for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plain = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext — base64 encoded
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptTokens<T = Record<string, unknown>>(blob: string): T {
  const key = getKey();
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}
