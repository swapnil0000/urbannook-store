// Shared mutable state for active env — avoids circular imports
let activeEnv = process.env.NODE_ENV === "production" ? "prod" : "dev";

export function getActiveEnv() { return activeEnv; }
export function setActiveEnv(env) { activeEnv = env; }
