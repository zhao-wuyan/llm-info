export async function fetchJson(url, { timeoutMs = 30_000 } = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "llm-info-data-pipeline" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
  return response.json();
}
