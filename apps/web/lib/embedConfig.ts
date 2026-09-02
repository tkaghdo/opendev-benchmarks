export function embedConfig() {
  const apiUrl = process.env.EMBEDDED_CANVAS_API_URL?.replace(/\/$/, "");
  const embedApiKey = process.env.EMBED_API_KEY?.trim();
  const embedToken = process.env.EMBED_TOKEN?.trim();
  const publicEmbedToken = process.env.NEXT_PUBLIC_EMBED_TOKEN?.trim() || embedToken || "";
  return { apiUrl, embedApiKey, embedToken, publicEmbedToken };
}

export function allowedEmbedTokens(): string[] {
  const tokens = new Set<string>();
  for (const [key, value] of Object.entries(process.env)) {
    if (!value?.trim()) continue;
    if (key === "EMBED_TOKEN" || key.startsWith("EMBED_TOKEN_") || key.startsWith("NEXT_PUBLIC_EMBED_TOKEN")) {
      tokens.add(value.trim());
    }
  }
  return [...tokens];
}

/** Only mint tokens this deployment registered. Ignore unknown client values. */
export function resolveMintEmbedToken(requested?: string | null): string | null {
  const allowed = allowedEmbedTokens();
  const trimmed = requested?.trim() ?? "";
  if (trimmed && allowed.includes(trimmed)) return trimmed;
  return embedConfig().embedToken || allowed[0] || null;
}

export function assertEmbedServerConfig() {
  const { apiUrl, embedApiKey, embedToken } = embedConfig();
  if (!apiUrl || !embedApiKey || !embedToken) {
    throw new Error("Set EMBEDDED_CANVAS_API_URL, EMBED_API_KEY, and EMBED_TOKEN");
  }
  return { apiUrl, embedApiKey, embedToken };
}
