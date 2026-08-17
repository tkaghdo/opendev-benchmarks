type MintResult =
  | { ok: true; session: Record<string, unknown> }
  | { ok: false; status: number; error: string; code?: string };

export async function mintEmbedSessionForTenant(input: {
  apiUrl: string;
  embedApiKey: string;
  embedToken: string;
  customerId: string;
}): Promise<MintResult> {
  const res = await fetch(`${input.apiUrl}/public/embed/v1/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.embedApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embedToken: input.embedToken,
      customerId: input.customerId,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as Record<string, unknown> & {
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof data.error === "string" ? data.error : "Session mint failed",
      code: typeof data.code === "string" ? data.code : undefined,
    };
  }

  return { ok: true, session: data };
}
