import RolePermission from "../models/RolePermission.js";
import { getActiveEnv } from "../utils/activeEnv.js";

const R = 4, W = 2, D = 1;

// Cache: adminUid (string) → resources object { products: 7, orders: 6, ... }
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60 * 1000;

export async function loadPermissions() {
  const docs = await RolePermission.find({});
  _cache = {};
  for (const doc of docs) {
    _cache[doc.adminUid] = doc.resources;
  }
  _cacheTime = Date.now();
}

export function invalidateCache() {
  _cache = null;
}

async function ensureCache() {
  if (!_cache || Date.now() - _cacheTime > CACHE_TTL) {
    await loadPermissions();
  }
}

export async function getPermission(role, resource, adminUid = null) {
  if (role === "super_admin") return R | W | D;
  if (getActiveEnv() === "dev") return R | W | D;
  await ensureCache();
  if (!adminUid) return 0;
  return _cache[adminUid]?.[resource] ?? 0;
}

export function permissionString(bits) {
  return [bits & R ? "r" : "-", bits & W ? "w" : "-", bits & D ? "d" : "-"].join("");
}

export function requirePermission(resource, action) {
  const bit = action === "read" ? R : action === "write" ? W : D;

  return async (req, res, next) => {
    try {
      const role     = req.admin?.role ?? "admin";
      const adminUid = req.admin?.adminUid ?? null;
      const perm     = await getPermission(role, resource, adminUid);

      if (perm & bit) return next();

      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: `Forbidden: cannot '${action}' on '${resource}' (${permissionString(perm)})`,
      });
    } catch (err) {
      next(err);
    }
  };
}
