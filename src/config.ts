import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CONFIG_FILE = ".gitglancerc.json";

export interface Config {
  limit?: number;
  since?: string;
  until?: string;
  maxFileSize?: number;
  staleDays?: number;
  days?: number;
}

const NUMBER_KEYS = ["limit", "maxFileSize", "staleDays", "days"] as const;
const STRING_KEYS = ["since", "until"] as const;

/** Validate parsed JSON into a Config; throws a descriptive error. */
export function parseConfig(raw: unknown): Config {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${CONFIG_FILE} must contain a JSON object`);
  }
  const config: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if ((NUMBER_KEYS as readonly string[]).includes(key)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(
          `${CONFIG_FILE}: "${key}" must be a non-negative number`,
        );
      }
      config[key] = value;
    } else if ((STRING_KEYS as readonly string[]).includes(key)) {
      if (typeof value !== "string") {
        throw new Error(`${CONFIG_FILE}: "${key}" must be a string`);
      }
      config[key] = value;
    } else {
      throw new Error(`${CONFIG_FILE}: unknown option "${key}"`);
    }
  }
  return config as Config;
}

/** Load `.gitglancerc.json` from dir; returns {} when the file is absent. */
export function loadConfig(dir: string): Config {
  const file = join(dir, CONFIG_FILE);
  if (!existsSync(file)) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(`${CONFIG_FILE} is not valid JSON`);
  }
  return parseConfig(raw);
}
