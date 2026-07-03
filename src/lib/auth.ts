export const AUTH_COOKIE = "ops_session";
const SESSION_PAYLOAD = "ops-terminal-v1";

export function isAuthEnabled(): boolean {
  return Boolean(process.env.ACCESS_PASSWORD?.trim());
}

export function getAccessPassword(): string | null {
  const password = process.env.ACCESS_PASSWORD?.trim();
  return password || null;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

async function signSession(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_PAYLOAD));
  return bufferToHex(signature);
}

export async function createSessionToken(password: string): Promise<string> {
  return signSession(password);
}

export async function verifySessionToken(token: string, password: string): Promise<boolean> {
  const expected = await signSession(password);
  return timingSafeEqual(token, expected);
}

export function verifyPassword(input: string, expected: string): boolean {
  return timingSafeEqual(input, expected);
}
