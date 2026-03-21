import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse env file into object WITHOUT touching process.env
function parseEnvFile(filename) {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, "..", filename));
    return dotenv.parse(content);
  } catch {
    return {};
  }
}

const DEV_CONFIG = parseEnvFile(".env");
const PROD_CONFIG = parseEnvFile(".env.production");

const DB_CONFIGS = {
  dev: {
    uri: DEV_CONFIG.DB_URI?.replace(/^'|'$/g, ""),
    name: DEV_CONFIG.DB_NAME?.replace(/^'|'$/g, ""),
  },
  prod: {
    uri: PROD_CONFIG.DB_URI?.replace(/^'|'$/g, ""),
    name: PROD_CONFIG.DB_NAME?.replace(/^'|'$/g, ""),
  },
};

// Runtime state — starts from whatever NODE_ENV says
let activeEnv = process.env.NODE_ENV === "production" ? "prod" : "dev";

export function getActiveEnv() {
  return activeEnv;
}

// GET /admin/env
export const getEnv = (req, res) => {
  res.status(200).json(new ApiResponse(200, "Current env", { env: activeEnv }));
};

// POST /admin/env/switch  { env: "dev" | "prod" }
export const switchEnv = async (req, res) => {
  const { env } = req.body;

  if (env !== "dev" && env !== "prod") {
    throw new ApiError(400, "env must be 'dev' or 'prod'");
  }

  if (env === activeEnv) {
    return res.status(200).json(
      new ApiResponse(200, `Already on ${env}`, { env: activeEnv }),
    );
  }

  const config = DB_CONFIGS[env];
  if (!config.uri) {
    throw new ApiError(500, `DB_URI not found in ${env === "dev" ? ".env" : ".env.production"}`);
  }

  await mongoose.disconnect();
  await mongoose.connect(config.uri, { dbName: config.name });

  activeEnv = env;
  console.log(`[EnvSwitch] Switched to ${env} — DB: ${config.name}`);

  res.status(200).json(new ApiResponse(200, `Switched to ${env}`, { env: activeEnv }));
};
