import aliases from "@/src/model-aliases.json";
import database from "@/data/models.json";

interface ModelAlias {
  canonicalId: string;
  displayName?: string;
}

interface GeneratedModelAlias {
  alias: string;
  canonicalId: string;
}

const generatedAliases = ((database as { modelAliases?: GeneratedModelAlias[] }).modelAliases ?? []).map((alias) => [
  alias.alias,
  alias.canonicalId,
]);
const modelAliases = Object.fromEntries([
  ...generatedAliases,
  ...Object.entries(aliases as Record<string, string | ModelAlias>),
]) as Record<string, string | ModelAlias>;

function aliasTarget(alias: string | ModelAlias) {
  return typeof alias === "string" ? alias : alias.canonicalId;
}

export function resolveCanonicalModelId(canonicalId: string) {
  let resolved = canonicalId;
  const visited = new Set<string>();
  while (modelAliases[resolved] && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = aliasTarget(modelAliases[resolved]);
  }
  return resolved;
}

export function isCanonicalModelAlias(canonicalId: string) {
  return resolveCanonicalModelId(canonicalId) !== canonicalId;
}

export function canonicalModelDisplayName(canonicalId: string) {
  const resolved = resolveCanonicalModelId(canonicalId);
  for (const alias of Object.values(modelAliases)) {
    if (typeof alias !== "string" && resolveCanonicalModelId(alias.canonicalId) === resolved && alias.displayName) {
      return alias.displayName;
    }
  }
  return undefined;
}
