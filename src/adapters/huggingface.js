import { normalizeId, normalizeModelId, resolveCanonicalId } from "../ids.js";
import huggingfaceMap from "../huggingface-models.json" with { type: "json" };
import spdxLicenses from "../spdx-licenses.json" with { type: "json" };

const SPDX_BY_KEY = new Map(spdxLicenses.map((id) => [id.toLowerCase(), id]));
const UNKNOWN_LICENSE_KEYS = new Set(["other", "unknown", "unlicensed", "none", "noassertion"]);
const LICENSE_TAG_PREFIX = "license:";

export const HUGGINGFACE_AUTHORS = Object.keys(huggingfaceMap.authors);

export function huggingFaceAuthorOwners() {
  return huggingfaceMap.authors;
}

function licenseKeyFromRecord(record) {
  const cardLicense = record?.cardData?.license;
  if (typeof cardLicense === "string" && cardLicense.trim()) return cardLicense.trim().toLowerCase();
  const tag = (record?.tags || []).find((value) => typeof value === "string" && value.startsWith(LICENSE_TAG_PREFIX));
  return tag ? tag.slice(LICENSE_TAG_PREFIX.length).trim().toLowerCase() : null;
}

/**
 * 交叉验证 Hugging Face 的 license 标识：命中 SPDX 列表时归一化为标准 SPDX ID，
 * 明确的 other/unknown 归为 unknown，其余（llama3.3、gemma 等自定义模型协议）归为 custom。
 */
export function resolveLicense(record) {
  const key = licenseKeyFromRecord(record);
  if (!key || UNKNOWN_LICENSE_KEYS.has(key)) return { license: null, licenseType: "unknown" };
  const spdxId = SPDX_BY_KEY.get(key);
  if (spdxId) return { license: spdxId, licenseType: "spdx" };
  return { license: key, licenseType: "custom" };
}

function nonNegativeInteger(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function parameterCount(record) {
  const total = record?.safetensors?.total;
  return nonNegativeInteger(total);
}

function candidateCanonicalIds(record) {
  const explicit = huggingfaceMap.models[record.id];
  const explicitIds = (Array.isArray(explicit) ? explicit : explicit ? [explicit] : []).map(resolveCanonicalId);
  const [author, ...nameParts] = String(record.id || "").split("/");
  const repoName = nameParts.join("/");
  if (!author || !repoName) return explicitIds;
  const owners = huggingfaceMap.authors[author] || [];
  const derivedIds = owners.map((owner) => {
    const normalizedOwner = normalizeId(owner);
    return resolveCanonicalId(`${normalizedOwner}/${normalizeModelId(repoName, normalizedOwner)}`);
  });
  return [...new Set([...explicitIds, ...derivedIds])];
}

/**
 * 把 Hugging Face Hub 公开 API 的模型仓库记录转换为开源权重证据。
 * 只保留权重可及性、许可证和热度字段，不覆盖本地价格、上下文或能力数据。
 */
export function adaptHuggingFace(records, { observedAt } = {}) {
  if (!Array.isArray(records)) throw new Error("huggingface: expected an array of model records");
  if (!observedAt) throw new Error("huggingface: observation time is required");

  const weights = [];
  const unmappedRepos = [];

  for (const record of records) {
    if (typeof record?.id !== "string" || !record.id.includes("/")) continue;
    if (record.private === true) continue;
    const candidates = candidateCanonicalIds(record);
    if (candidates.length === 0) {
      unmappedRepos.push(record.id);
      continue;
    }    const { license, licenseType } = resolveLicense(record);
    weights.push({
      candidateCanonicalIds: candidates,
      matchKind: huggingfaceMap.models[record.id] ? "explicit" : "author",
      source: "huggingface",
      repoId: record.id,
      repoUrl: `https://huggingface.co/${record.id}`,
      license,
      licenseType,
      licenseUrl: typeof record?.cardData?.license_link === "string" ? record.cardData.license_link : null,
      licenseName: typeof record?.cardData?.license_name === "string" ? record.cardData.license_name : null,
      downloads: nonNegativeInteger(record.downloads),
      likes: nonNegativeInteger(record.likes),
      trendingScore: nonNegativeInteger(record.trendingScore),
      parameters: parameterCount(record),
      gated: record.gated !== false && Boolean(record.gated),
      pipelineTag: typeof record.pipeline_tag === "string" ? record.pipeline_tag : null,
      revision: typeof record.sha === "string" ? record.sha : null,
      lastModified: typeof record.lastModified === "string" ? record.lastModified : null,
      observedAt,
    });
  }

  return {
    providers: [],
    models: [],
    weights,
    meta: {
      recordCount: weights.length,
      observedAt,
      repoCount: records.length,
    },
  };
}
