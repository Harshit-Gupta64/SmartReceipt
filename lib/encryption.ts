import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "smartreceipt-default-key";

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch {
    return text;
  }
}

export function decrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  try {
    // If it doesn't look like encrypted data, return as-is
    if (!ciphertext.startsWith("U2FsdGVkX1")) return ciphertext;
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext;
  } catch {
    return ciphertext;
  }
}