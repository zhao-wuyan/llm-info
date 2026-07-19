export function modelHref(canonicalId: string) {
  return `/models/${canonicalId.split("/").map(encodeURIComponent).join("/")}`;
}
