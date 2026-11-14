// Thin fetch wrapper around the Flask REST API. Same endpoints and payloads as before the redesign.
const KEY = "t"; // localStorage key kept from the original UI so existing sessions stay signed in

export const getToken = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };
export const setToken = (t) => { try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ } };
export const clearToken = () => { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let onAuthFail = () => {};
export const setAuthFailHandler = (fn) => { onAuthFail = fn; };

const PUBLIC = new Set(["/login", "/register"]);

export async function api(path, method = "GET", body) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken() && !PUBLIC.has(path)) {
    clearToken();
    onAuthFail();
  }
  if (!res.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", res.status);
  return data;
}
