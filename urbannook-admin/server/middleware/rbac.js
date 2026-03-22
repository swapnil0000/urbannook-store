import RolePermission from "../models/role.permission.model.js";
import Admin from "../models/admin.model.js";
import { getActiveEnv } from "../utils/activeEnv.js";

const R = 4, W = 2, D = 1;

export function invalidateCache() {} // kept for import compatibility

export async function getPermission(role, resource, adminUid = null) {
  if (getActiveEnv() === "dev") return R | W | D;
  if (!adminUid) return 0;
  // Always fetch role from current DB — JWT role may be stale after env switch
  const adminDoc = await Admin.findOne({ adminUid }, { role: 1 }).lean();
  const actualRole = adminDoc?.role ?? role;
  if (actualRole === "super_admin") return R | W | D;
  // Always fetch fresh from DB — no cache, no stale data across env switches
  const doc = await RolePermission.findOne({ adminUid }, { [`resources.${resource}`]: 1 }).lean();
  if (doc?.resources?.[resource] !== undefined) return doc.resources[resource];
  // No doc yet — sensible default: rw- for most, r-- for read-only resources
  return ["waitlist", "abandoned_carts"].includes(resource) ? R : R | W;
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
