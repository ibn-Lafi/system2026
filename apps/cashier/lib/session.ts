// جلسة كاشير موقّعة بـHMAC-SHA256 (Web Crypto API — متوافقة مع Edge Runtime
// الذي يعمل عليه middleware.ts بـNext.js 14 وأيضًا Node بالـServer Actions،
// بدل Node's crypto module غير المتاح بالـEdge Runtime). لا جلسة Supabase
// Auth هنا إطلاقًا — الدخول برمز PIN مشترك للجهاز فقط (راجع app/login).

export const CASHIER_SESSION_COOKIE = "cashier_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة (نوبة عمل كاشير نموذجية)

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.CASHIER_SESSION_SECRET;
  if (!secret) throw new Error("CASHIER_SESSION_SECRET غير مُعرَّف");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(terminalId: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${terminalId}.${expiresAt}`;
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${toBase64Url(new TextEncoder().encode(payload))}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ terminalId: string } | null> {
  if (!token) return null;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const payload = new TextDecoder().decode(fromBase64Url(payloadPart));
  const [terminalId, expiresAtStr] = payload.split(".");
  const expiresAt = Number(expiresAtStr);
  if (!terminalId || !expiresAt || Date.now() > expiresAt) return null;

  const key = await getHmacKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signaturePart) as BufferSource,
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;

  return { terminalId };
}
