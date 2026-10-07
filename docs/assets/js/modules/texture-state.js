// A user's texture choice is independent of WebGL availability/context recovery.
const TEXTURE_STORAGE_KEY = "modelized.texture";
let texturePreference = "liquid";
try {
  const saved = localStorage.getItem(TEXTURE_STORAGE_KEY);
  if (saved === "flat" || saved === "liquid") texturePreference = saved;
} catch { /* Private/blocked storage still permits an in-memory choice. */ }

export const getTexturePreference = () => texturePreference;
export function saveTexturePreference(texture) {
  if (texture !== "flat" && texture !== "liquid") return;
  texturePreference = texture;
  try { localStorage.setItem(TEXTURE_STORAGE_KEY, texture); } catch { /* Optional persistence. */ }
}
