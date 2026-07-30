/** Minimal RFC4180-ish CSV parser (quoted fields, embedded commas/newlines). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

/**
 * Parse the flat `- key: value` list layout used by Aider's leaderboard data files.
 * Nested maps and lists are ignored on purpose — we only need scalar leaf metrics.
 */
export function parseFlatYamlList(text) {
  const records = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line || /^\s*#/.test(line)) continue;
    const item = /^-\s+(.*)$/.exec(line);
    if (item) {
      current = {};
      records.push(current);
      assignScalar(current, item[1]);
      continue;
    }
    if (!current) continue;
    if (/^\s{2}\S/.test(line)) assignScalar(current, line.trim());
  }
  return records;
}

function assignScalar(target, entry) {
  const match = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(entry);
  if (!match) return;
  const [, key, raw] = match;
  if (raw === "" || raw === "|" || raw === ">") return;
  const value = raw.replace(/^['"]|['"]$/g, "");
  if (value === "true" || value === "false") { target[key] = value === "true"; return; }
  const numeric = Number(value);
  target[key] = value !== "" && Number.isFinite(numeric) ? numeric : value;
}

export function numberOrNull(value) {
  if (value == null || value === "") return null;
  const numeric = Number(String(value).replace(/[,%+]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}
