// The saved texture choice is independent of WebGL availability and recovery.
const TEXTURE_STORAGE_KEY = "modelized.texture";
let texturePreference = "liquid";
try {
  const saved = localStorage.getItem(TEXTURE_STORAGE_KEY);
  if (saved === "flat" || saved === "liquid") texturePreference = saved;
} catch {
  // Keep the in-memory choice when storage is unavailable.
}

export const getTexturePreference = () => texturePreference;
export function saveTexturePreference(texture) {
  if (texture !== "flat" && texture !== "liquid") return;
  texturePreference = texture;
  try { localStorage.setItem(TEXTURE_STORAGE_KEY, texture); } catch {
    // The choice remains valid even if it cannot be saved.
  }
}
