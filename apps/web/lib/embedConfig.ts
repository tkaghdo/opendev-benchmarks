export function embedConfig() {
  const apiUrl = process.env.EMBEDDED_CANVAS_API_URL?.replace(/\/$/, "");
  const embedApiKey = process.env.EMBED_API_KEY?.trim();
  const embedToken = process.env.EMBED_TOKEN?.trim();
  const publicEmbedToken = process.env.NEXT_PUBLIC_EMBED_TOKEN?.trim() || embedToken || "";
  return { apiUrl, embedApiKey, embedToken, publicEmbedToken };
}

export function assertEmbedServerConfig() {
  const { apiUrl, embedApiKey, embedToken } = embedConfig();
  if (!apiUrl || !embedApiKey || !embedToken) {
    throw new Error("Set EMBEDDED_CANVAS_API_URL, EMBED_API_KEY, and EMBED_TOKEN");
  }
  return { apiUrl, embedApiKey, embedToken };
}
