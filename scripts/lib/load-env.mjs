import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadEnvironment(projectRoot = process.cwd(), filenames = [".env.local", ".env.vercel.production.local", ".env.vercel.local"]) {
  for (const filename of filenames) {
    const envPath = path.join(projectRoot, filename);
    if (!existsSync(envPath)) continue;
    for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim().replace(/^export\s+/, "");
      if (process.env[key]) continue;
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}
