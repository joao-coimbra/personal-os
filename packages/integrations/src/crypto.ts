import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(
  plaintext: string,
  encryptionKey: string
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(encryptionKey), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string, encryptionKey: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!(ivB64 && tagB64 && dataB64)) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getKey(encryptionKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}
