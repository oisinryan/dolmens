// Renders the eight plates to ../figures/plates/*.png at 1920 × 1080.
//
//   npm run plates
//   npm run plates -- --browser-executable=/path/to/chrome   (extra flags go to remotion still)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const out = new URL("../figures/plates/", root);
mkdirSync(out, { recursive: true });
// read the list from src/plates/index.ts without a TypeScript loader
const src = readFileSync(new URL("src/plates/index.ts", root), "utf8");
const plates = [...src.matchAll(/id: "([^"]+)", file: "([^"]+)"/g)].map(([, id, file]) => ({ id, file }));
for (const { id, file } of plates) {
  execFileSync("npx", ["remotion", "still", "src/index.ts", id, new URL(file, out).pathname, "--log=error", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
  console.log(`figures/plates/${file}`);
}
