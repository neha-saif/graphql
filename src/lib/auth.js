const TOKEN_KEY = "jwt"; // keep consistent with your existing storage key
const AUTH_ENDPOINT = import.meta.env.VITE_AUTH_ENDPOINT;
console.log("PRODUCTION AUTH ENDPOINT:", AUTH_ENDPOINT);

// local storage helpers
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(`${TOKEN_KEY}_payload`);
}

export function base64EncodeUnicode(str) {
  const utf8 = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
  return btoa(binary);
}

//decode the jwt body
export function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    // decodeURIComponent+escape handles unicode in older payloads safely
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function saveToken(token) {
  setToken(token);
  const payload = decodeJwtPayload(token);
  if (payload) {
    localStorage.setItem(`${TOKEN_KEY}_payload`, JSON.stringify(payload));
  }
}

// Sign in with Basic auth to obtain a JWT.
// Reads URL from .env (VITE_AUTH_ENDPOINT)
export async function signIn(identity, password) {
  if (!AUTH_ENDPOINT) {
    throw new Error("VITE_AUTH_ENDPOINT is not set in your .env");
  }

  const basic = base64EncodeUnicode(`${identity}:${password}`);

  const res = await fetch(AUTH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    // Some backends require a non-empty body to avoid 415
    body: JSON.stringify({}),
  });

  const text = await res.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // if server returns raw token string
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Sign-in failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  // Common token field names
  const token =
    data?.token ||
    data?.jwt ||
    data?.access_token ||
    (typeof data === "string" ? data : data?.raw);

  if (!token) throw new Error("No token returned by server.");

  saveToken(token);
  return token;
}

export function signOut() {
  clearToken();
}
