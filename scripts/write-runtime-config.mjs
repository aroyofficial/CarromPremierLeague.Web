import { writeFile } from "node:fs/promises";

const apiBaseUrl = process.env.VITE_API_BASE_URL;
const isProduction = process.env.VITE_WEB_ENV === "production";

if (!apiBaseUrl) {
  if (isProduction) {
    throw new Error("VITE_API_BASE_URL is required for a production build.");
  }
  process.exit(0);
}

let url;
try {
  url = new URL(apiBaseUrl);
} catch {
  throw new Error("VITE_API_BASE_URL must be a valid URL.");
}

if (isProduction && (url.protocol !== "https:" || !url.hostname.endsWith(".onrender.com"))) {
  throw new Error("Production VITE_API_BASE_URL must use an https onrender.com URL.");
}

const normalized = url.href.endsWith("/") ? url.href : `${url.href}/`;
await writeFile(
  "dist/runtime-config.js",
  `window.__CPL_API_BASE_URL__ = ${JSON.stringify(normalized)};\n`,
);
