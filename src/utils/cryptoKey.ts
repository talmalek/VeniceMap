const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Decrypts a base64-encoded payload ([16B salt][12B iv][ciphertext + 16B GCM authTag])
 * using PBKDF2-SHA256 + AES-256-GCM via the browser's native Web Crypto API.
 */
export async function decryptApiKey(
  encodedPayload: string,
  password: string
): Promise<string> {
  if (!encodedPayload || !password) {
    throw new Error('Missing encrypted payload or password.');
  }

  const binary = atob(encodedPayload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (bytes.length <= SALT_LENGTH + IV_LENGTH + 16) {
    throw new Error('Invalid encrypted key payload.');
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertextWithTag = bytes.slice(SALT_LENGTH + IV_LENGTH);

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {name: 'AES-GCM', length: 256},
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {name: 'AES-GCM', iv},
    aesKey,
    ciphertextWithTag
  );

  return new TextDecoder().decode(decryptedBuffer);
}
