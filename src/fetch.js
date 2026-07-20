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
