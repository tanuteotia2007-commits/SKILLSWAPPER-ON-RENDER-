import { api } from "./api.js";

// Cached profile (shared by the shell and views). Refresh after anything that changes it.
export const state = { me: null };
const listeners = new Set();

export const onMeChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function loadMe(force = false) {
  if (!state.me || force) {
    state.me = await api("/profile");
    listeners.forEach((fn) => fn(state.me));
  }
  return state.me;
}

export function resetState() { state.me = null; }
