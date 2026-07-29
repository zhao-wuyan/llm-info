import { HUGGING_FACE_CRAWL } from "./config.js";

const EXPAND = [
  "author", "cardData", "createdAt", "downloads", "downloadsAllTime",
  "gated", "lastModified", "likes", "safetensors", "tags", "trendingScore",
];

/**
 * Crawl the top open-weight repositories by download volume.
 * Download-sorted pagination keeps the request count bounded (`maxPages` per pipeline tag)
 * and gives us exactly the popularity ranking we want to display.
 */
export async function crawlHuggingFace({ fetchImpl = fetch, timeoutMs = 30_000, log = () => {} } = {}) {
  const repositories = new Map();
  for (const pipelineTag of HUGGING_FACE_CRAWL.pipelineTags) {
    const parameters = new URLSearchParams({
      filter: pipelineTag,
      sort: "downloads",
      direction: "-1",
      limit: String(HUGGING_FACE_CRAWL.pageSize),
    });
    for (const field of EXPAND) parameters.append("expand[]", field);
    let url = `${HUGGING_FACE_CRAWL.endpoint}?${parameters}`;
    for (let page = 0; page < HUGGING_FACE_CRAWL.maxPages && url; page += 1) {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "llm-info-data-pipeline" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} while crawling ${url}`);
      const batch = await response.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const repository of batch) if (repository?.id) repositories.set(repository.id, repository);
      log(`hugging-face ${pipelineTag}: page ${page + 1}, ${repositories.size} repositories`);
      url = nextLink(response.headers?.get?.("link"));
    }
  }
  return [...repositories.values()];
}

function nextLink(header) {
  if (!header) return null;
  const match = /<([^>]+)>;\s*rel="next"/.exec(header);
  return match ? match[1] : null;
}
