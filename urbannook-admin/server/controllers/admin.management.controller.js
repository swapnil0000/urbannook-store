import Admin from "../models/admin.model.js";
import RolePermission from "../models/role.permission.model.js";
import AppConfig from "../models/app.config.model.js";
import User from "../models/user.model.js";
import { invalidateCache, permissionString } from "../middleware/rbac.js";
import { getActiveEnv } from "../utils/activeEnv.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

// Hardcoded fallback in case AppConfig is missing from DB
const FALLBACK_RESOURCES = [
  "products","orders","users","coupons","shipments",
  "testimonials","waitlist","instagram_orders","abandoned_carts",
];
const FALLBACK_DEFAULT_BITS = {
  products: 6, orders: 6, users: 6, coupons: 6, shipments: 6,
  testimonials: 6, waitlist: 4, instagram_orders: 6, abandoned_carts: 4,
};

export function invalidateConfigCache() {} // kept for import compatibility

async function getConfig() {
  // Always fetch fresh — no cache, avoids stale data after env switch
  const [rDoc, dDoc] = await Promise.all([
    AppConfig.findOne({ key: "resources" }),
    AppConfig.findOne({ key: "default_admin_permissions" }),
  ]);
  const resources = rDoc?.value?.length ? rDoc.value : FALLBACK_RESOURCES;
  const defaultBits = (dDoc?.value && Object.keys(dDoc.value).length) ? dDoc.value : FALLBACK_DEFAULT_BITS;
  return { resources, defaultBits };
}

// GET /admin/my-permissions
export const getMyPermissions = async (req, res, next) => {
  try {
    const adminUid = req.admin?.adminUid;
    const { resources, defaultBits } = await getConfig();

    // Always fetch role from current DB — JWT role may be stale after env switch
    const adminDoc = adminUid ? await Admin.findOne({ adminUid }, { role: 1 }).lean() : null;
    const role = adminDoc?.role ?? req.admin?.role ?? "admin";

    if (role === "super_admin") {
      return res.json(
        new ApiResponse(200, "Permissions fetched", {
          role,
          permissions: Object.fromEntries(resources.map((r) => [r, 7])),
        }),
      );
    }

    // Dev env — admin gets full access
    if (getActiveEnv() === "dev") {
      return res.json(
        new ApiResponse(200, "Permissions fetched", {
          role,
          permissions: Object.fromEntries(resources.map((r) => [r, 7])),
        }),
      );
    }

    // Prod: lookup by adminUid (stable across DBs)
    const doc = adminUid ? await RolePermission.findOne({ adminUid }) : null;
    const permissions = doc
      ? { ...doc.resources.toObject() }
      : { ...defaultBits };
    res.json(
      new ApiResponse(200, "Permissions fetched", { role, permissions }),
    );
  } catch (err) {
    next(err);
  }
};

// GET /admin/admins
export const listAdmins = async (req, res, next) => {
  try {
    const { resources, defaultBits } = await getConfig();
    const admins = await Admin.find({}, { password: 0 }).sort({
      createdAt: -1,
    });
    const permDocs = await RolePermission.find({});

    const permMap = {};
    for (const d of permDocs) permMap[d.adminUid] = d.resources;

    const data = admins.map((a) => {
      let res;
      if (a.role === "super_admin") {
        res = Object.fromEntries(resources.map((r) => [r, 7]));
      } else {
        const raw = permMap[a.adminUid];
        res = raw ? { ...(raw.toObject?.() ?? raw) } : { ...defaultBits };
      }
      return {
        _id: a._id,
        adminUid: a.adminUid,
        email: a.email,
        role: a.role,
        isSuspended: a.isSuspended ?? false,
        createdAt: a.createdAt,
        resources: res,
      };
    });

    const counts = {
      total: admins.length,
      super_admin: admins.filter((a) => a.role === "super_admin").length,
      admin: admins.filter((a) => a.role === "admin").length,
      users: await User.countDocuments(),
    };

    res.json(new ApiResponse(200, "Admins fetched", { admins: data, counts }));
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/admins/:id/role
export const changeAdminRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["admin", "super_admin"].includes(role))
      throw new ApiError(400, "Invalid role");

    const target = await Admin.findById(req.params.id);
    if (!target) throw new ApiError(404, "Admin not found");
    if (target.email === req.admin.email)
      throw new ApiError(400, "Cannot change your own role");

    target.role = role;
    await target.save();
    invalidateCache();

    res.json(
      new ApiResponse(200, `Role updated to ${role}`, {
        _id: target._id,
        adminUid: target.adminUid,
        email: target.email,
        role: target.role,
      }),
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/permissions — update a specific resource's bits for an admin
// Body: { adminUid, resource, bits }
export const updatePermission = async (req, res, next) => {
  try {
    const { adminUid, resource, bits } = req.body;
    if (!adminUid) throw new ApiError(400, "adminUid is required");
    if (!resource) throw new ApiError(400, "resource is required");
    if (bits === undefined || bits < 0 || bits > 7)
      throw new ApiError(400, "bits must be 0-7");

    const { resources } = await getConfig();
    if (!resources.includes(resource))
      throw new ApiError(400, "Invalid resource");

    const target = await Admin.findOne({ adminUid });
    if (!target) throw new ApiError(404, "Admin not found");
    if (target.role === "super_admin")
      throw new ApiError(400, "Cannot modify super_admin permissions");

    const doc = await RolePermission.findOneAndUpdate(
      { adminUid },
      {
        $set: { [`resources.${resource}`]: Number(bits), role: target.role },
        $setOnInsert: { adminUid },
      },
      { new: true, upsert: true },
    );

    invalidateCache();

    res.json(
      new ApiResponse(200, "Permission updated", {
        adminUid,
        resource,
        bits: doc.resources[resource],
        string: permissionString(doc.resources[resource]),
      }),
    );
  } catch (err) {
    next(err);
  }
};

// GET /admin/permissions
export const getPermissions = async (req, res, next) => {
  try {
    const docs = await RolePermission.find({});
    res.json(new ApiResponse(200, "Permissions fetched", docs));
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/admins/:id/suspend  &  /unsuspend
export const suspendAdmin = async (req, res, next) => {
  try {
    const target = await Admin.findById(req.params.id);
    if (!target) throw new ApiError(404, "Admin not found");
    if (target.role === "super_admin")
      throw new ApiError(400, "Cannot suspend a super_admin");
    if (target.email === req.admin.email)
      throw new ApiError(400, "Cannot suspend yourself");
    target.isSuspended = true;
    await target.save();
    res.json(
      new ApiResponse(200, "Admin suspended", {
        _id: target._id,
        isSuspended: true,
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const unsuspendAdmin = async (req, res, next) => {
  try {
    const target = await Admin.findById(req.params.id);
    if (!target) throw new ApiError(404, "Admin not found");
    target.isSuspended = false;
    await target.save();
    res.json(
      new ApiResponse(200, "Admin unsuspended", {
        _id: target._id,
        isSuspended: false,
      }),
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/admins/me/password  (self) or /admin/admins/:id/password (super_admin)
export const changeAdminPassword = async (req, res, next) => {
  try {
    const { password, currentPassword } = req.body;
    if (!password || password.length < 6)
      throw new ApiError(400, "Password must be at least 6 characters");

    // "me" means the currently logged-in admin
    const isSelfRoute = req.params.id === "me";
    const target = isSelfRoute
      ? await Admin.findOne({ adminUid: req.admin.adminUid })
      : await Admin.findById(req.params.id);
    if (!target) throw new ApiError(404, "Admin not found");

    // Non-super_admin can only change their own password
    if (req.admin.role !== "super_admin" && target.adminUid !== req.admin.adminUid)
      throw new ApiError(403, "You can only change your own password");

    // Non-super_admin must verify current password
    if (req.admin.role !== "super_admin") {
      if (!currentPassword) throw new ApiError(400, "Current password is required");
      const isMatch = await target.isPasswordCorrect(currentPassword);
      if (!isMatch) throw new ApiError(401, "Current password is incorrect");
      if (currentPassword === password)
        throw new ApiError(400, "New password must be different from current password");
    }

    target.password = password;
    await target.save();

    res.json(new ApiResponse(200, "Password updated successfully"));
  } catch (err) {
    next(err);
  }
};
