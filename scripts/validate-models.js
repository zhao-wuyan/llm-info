import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateDatabase } from "../src/validate.js";

const inputPath = resolve(process.argv[2] || "data/models.json");
const database = JSON.parse(await readFile(inputPath, "utf8"));
const errors = validateDatabase(database);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Valid: ${inputPath}`);
  console.log(JSON.stringify(database.stats, null, 2));
}
