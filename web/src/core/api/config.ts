import { type IASMindConfig } from "../config/types";

import { resolveServiceURL } from "./resolve-service-url";

declare global {
  interface Window {
    __iasmindConfig: IASMindConfig;
  }
}

export async function loadConfig() {
  const res = await fetch(resolveServiceURL("./config"));
  const config = await res.json();
  return config;
}

export function getConfig(): IASMindConfig {
  if (
    typeof window === "undefined" ||
    typeof window.__iasmindConfig === "undefined"
  ) {
    throw new Error("Config not loaded");
  }
  return window.__iasmindConfig;
}
