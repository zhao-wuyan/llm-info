import { createHash } from "node:crypto";

export async function fetchJson(url, { timeoutMs = 30_000, headers = {} } = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "llm-info-data-pipeline", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
  return response.json();
}

export async function fetchGitHubJsonSource(source, { timeoutMs = 30_000, headers = {} } = {}) {
  const target = source.github;
  if (!target?.repository || !target.ref || !target.path) {
    throw new Error(`${source.id}: incomplete GitHub source coordinates`);
  }

  const apiHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "llm-info-data-pipeline",
    "X-GitHub-Api-Version": "2022-11-28",
    ...headers,
  };
  const commit = await fetchJson(
    `https://api.github.com/repos/${target.repository}/commits/${encodeURIComponent(target.ref)}`,
    { timeoutMs, headers: apiHeaders },
  );
  if (!/^[0-9a-f]{40}$/i.test(commit?.sha || "")) {
    throw new Error(`${source.id}: unable to resolve a full Git commit SHA`);
  }

  const encodedPath = target.path.split("/").map(encodeURIComponent).join("/");
  const pinnedUrl = `https://raw.githubusercontent.com/${target.repository}/${commit.sha}/${encodedPath}`;
  const response = await fetch(pinnedUrl, {
    headers: { Accept: "application/json", "User-Agent": "llm-info-data-pipeline" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${pinnedUrl}`);
  const content = Buffer.from(await response.arrayBuffer());
  let data;
  try {
    data = JSON.parse(content.toString("utf8"));
  } catch (error) {
    throw new Error(`${source.id}: invalid JSON at ${commit.sha}`, { cause: error });
  }

  return {
    data,
    provenance: {
      revision: commit.sha,
      revisionUrl: `https://github.com/${target.repository}/commit/${commit.sha}`,
      contentSha256: createHash("sha256").update(content).digest("hex"),
      commitVerified: Boolean(commit.commit?.verification?.verified),
      commitVerificationReason: commit.commit?.verification?.reason || "unknown",
      observedAt: commit.commit?.committer?.date || null,
    },
  };
}

export async function fetchGitHubTextSource(source, { timeoutMs = 30_000, headers = {} } = {}) {
  const target = source.github;
  if (!target?.repository || !target.ref || !target.path) {
    throw new Error(`${source.id}: incomplete GitHub source coordinates`);
  }
  const apiHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "llm-info-data-pipeline",
    "X-GitHub-Api-Version": "2022-11-28",
    ...headers,
  };
  const commit = await fetchJson(
    `https://api.github.com/repos/${target.repository}/commits/${encodeURIComponent(target.ref)}`,
    { timeoutMs, headers: apiHeaders },
  );
  if (!/^[0-9a-f]{40}$/i.test(commit?.sha || "")) {
    throw new Error(`${source.id}: unable to resolve a full Git commit SHA`);
  }
  const encodedPath = target.path.split("/").map(encodeURIComponent).join("/");
  const pinnedUrl = `https://raw.githubusercontent.com/${target.repository}/${commit.sha}/${encodedPath}`;
  const response = await fetch(pinnedUrl, {
    headers: { "User-Agent": "llm-info-data-pipeline" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${pinnedUrl}`);
  const content = Buffer.from(await response.arrayBuffer());
  return {
    text: content.toString("utf8"),
    provenance: {
      revision: commit.sha,
      revisionUrl: `https://github.com/${target.repository}/commit/${commit.sha}`,
      contentSha256: createHash("sha256").update(content).digest("hex"),
      commitVerified: Boolean(commit.commit?.verification?.verified),
      commitVerificationReason: commit.commit?.verification?.reason || "unknown",
      observedAt: commit.commit?.committer?.date || null,
    },
  };
}

/**
 * 带退避的 fetch：Hugging Face 请求可能发生 transient network reset（如 ECONNRESET）。
 * 此 helper 仅对可重试失败（transient 网络异常与 5xx/429）退避重试；4xx 与解析错误不重试，
 * 避免把配置/格式错误伪装成网络波动。每次重试新建 AbortSignal.timeout。
 */
async function fetchWithRetry(url, { timeoutMs = 30_000, headers = {}, maxAttempts = 4 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastError = error;
      const transient = ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_SOCKET"].includes(error?.cause?.code);
      if (!transient || attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
      continue;
    }
    // 仅 4xx（配置错误，含无效 revision 的 404）不重试；5xx 与 429 退避重试
    if (response.ok || (response.status !== 429 && response.status < 500)) return response;
    lastError = new Error(`HTTP ${response.status} while fetching ${url}`);
    if (attempt === maxAttempts) throw lastError;
    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
  }
  throw lastError;
}

/**
 * Fetch a pinned parquet file from a Hugging Face dataset with reproducible provenance.
 * Mirrors `fetchGitHubTextSource`: resolve the current revision SHA first, then pin the
 * download to that SHA so every build is traceable. Returns parsed parquet rows + provenance.
 */
export async function fetchHfDatasetParquet(source, { timeoutMs = 30_000, headers = {} } = {}) {
  const { repo, ref = "main", path } = source.huggingface ?? {};
  if (!repo || !path) {
    throw new Error(`${source.id}: incomplete Hugging Face dataset coordinates (need repo, path)`);
  }
  const requestHeaders = { Accept: "application/json", "User-Agent": "llm-info-data-pipeline", ...headers };
  const revisionResponse = await fetchWithRetry(
    `https://huggingface.co/api/datasets/${repo}/revision/${encodeURIComponent(ref)}`,
    { timeoutMs, headers: requestHeaders },
  );
  if (!revisionResponse.ok) throw new Error(`HTTP ${revisionResponse.status} while resolving ${repo}@${ref}`);
  const revision = await revisionResponse.json();
  const sha = revision?.oid || revision?.sha;
  if (!/^[0-9a-f]{40}$/i.test(sha || "")) {
    throw new Error(`${source.id}: unable to resolve a full Hugging Face dataset revision SHA`);
  }
  const pinnedUrl = `https://huggingface.co/datasets/${repo}/resolve/${sha}/${path}`;
  const response = await fetchWithRetry(pinnedUrl, {
    timeoutMs,
    headers: { "User-Agent": "llm-info-data-pipeline" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${pinnedUrl}`);
  const content = Buffer.from(await response.arrayBuffer());
  const { parquetReadObjects } = await import("hyparquet");
  // hyparquet 接受纯 ArrayBuffer；slice 掉 Buffer 的 byteOffset 偏移，
  // 使其内部 DataView 从字节 0 开始。一次下载、一次解析、一个可校验哈希。
  const file = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
  const rows = await parquetReadObjects({ file });
  return {
    rows,
    provenance: {
      revision: sha,
      revisionUrl: `https://huggingface.co/datasets/${repo}/tree/${sha}`,
      sourceUrl: `https://huggingface.co/datasets/${repo}`,
      license: "CC-BY-4.0",
      attribution: "LM Arena (lmarena-ai)",
      contentSha256: createHash("sha256").update(content).digest("hex"),
      observedAt: revision?.lastModified ?? null,
      file: path,
    },
  };
}

function detectLicenseSpdx(content) {
  const checks = [
    ["MIT", /MIT License[\s\S]*Permission is hereby granted/i],
    ["Apache-2.0", /Apache License[\s\S]*Version 2\.0/i],
    ["AGPL-3.0", /GNU AFFERO GENERAL PUBLIC LICENSE[\s\S]*Version 3/i],
    ["LGPL-3.0", /GNU LESSER GENERAL PUBLIC LICENSE[\s\S]*Version 3/i],
    ["GPL-3.0", /GNU GENERAL PUBLIC LICENSE[\s\S]*Version 3/i],
    ["GPL-2.0", /GNU GENERAL PUBLIC LICENSE[\s\S]*Version 2/i],
    ["MPL-2.0", /Mozilla Public License[\s\S]*Version 2\.0/i],
    ["ISC", /ISC License[\s\S]*Permission to use, copy, modify/i],
    ["BSD-3-Clause", /Redistributions of source code must retain[\s\S]*Neither the name/i],
    ["BSD-2-Clause", /Redistributions of source code must retain[\s\S]*Redistributions in binary form/i],
  ];
  return checks.find(([, pattern]) => pattern.test(content))?.[0] || null;
}

export async function fetchGitHubLicense(repository, { timeoutMs = 30_000, headers = {} } = {}) {
  const repositoryUrl = new URL(repository);
  const [owner, repo] = repositoryUrl.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (repositoryUrl.hostname !== "github.com" || !owner || !repo) {
    throw new Error(`Unsupported GitHub repository URL: ${repository}`);
  }

  const endpoint = `https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, "")}/license`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "llm-info-data-pipeline",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (response.status === 404) {
    return { license: "NOASSERTION", licenseLabel: "未标注", licenseFile: false, licenseUrl: null };
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} while checking license for ${repository}`);

  const data = await response.json();
  const apiSpdxId = data.license?.spdx_id;
  const licenseText = data.content ? Buffer.from(data.content, "base64").toString("utf8") : "";
  const spdxId =
    (typeof apiSpdxId === "string" && apiSpdxId !== "NOASSERTION" ? apiSpdxId : null) ||
    detectLicenseSpdx(licenseText);
  const recognized = Boolean(spdxId);
  return {
    license: recognized ? spdxId : "NOASSERTION",
    licenseLabel: recognized ? spdxId : "未识别",
    licenseFile: true,
    licenseUrl: data.html_url || null,
  };
}
