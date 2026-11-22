// Writes services/api/app/content_schemas.json, the API's copy of these schemas (the content
// admin validates edits on the server too). services/api/tests/test_cms.py fails if it drifts.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SCHEMAS } from "../src/index.js";

const out = fileURLToPath(new URL("../../../services/api/app/content_schemas.json", import.meta.url));
writeFileSync(out, JSON.stringify(SCHEMAS, null, 1) + "\n");
console.log(`✓ wrote ${out}`);
