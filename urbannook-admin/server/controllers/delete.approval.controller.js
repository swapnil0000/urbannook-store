import DeleteApproval from "../models/delete.approval.model.js";
import Product from "../models/product.model.js";
import Admin from "../models/admin.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

// POST /admin/delete-approvals
// Initiates a delete approval request (prod env only)
export const initiateDelete = async (req, res, next) => {
  try {
    const { resource, resourceId, resourceName } = req.body;
    if (!resource || !resourceId || !resourceName)
      throw new ApiError(400, "resource, resourceId, resourceName are required");

    // Prevent duplicate pending requests for same resource
    const existing = await DeleteApproval.findOne({
      resource,
      resourceId,
      status: "pending",
    });
    if (existing)
      throw new ApiError(409, "A pending approval request already exists for this item");

    const totalSuperAdmins = await Admin.countDocuments({ role: "super_admin" });

    const doc = await DeleteApproval.create({
      resource,
      resourceId,
      resourceName,
      initiatedBy: {
        adminUid: req.admin.adminUid,
        email: req.admin.email,
      },
      requiredApprovals: Math.max(2, totalSuperAdmins),
      // Initiator's action counts as approval #1
      approvals: [{ adminUid: req.admin.adminUid, email: req.admin.email }],
    });

    res.status(201).json(new ApiResponse(201, "Delete approval request created", doc));
  } catch (err) {
    next(err);
  }
};

// GET /admin/delete-approvals
// List pending approvals (super_admin sees all pending)
export const listPendingApprovals = async (req, res, next) => {
  try {
    const { resource } = req.query;
    const filter = { status: "pending" };
    if (resource) filter.resource = resource;

    const docs = await DeleteApproval.find(filter).sort({ createdAt: -1 });
    res.json(new ApiResponse(200, "Pending approvals fetched", docs));
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/delete-approvals/:id/approve
export const approveDelete = async (req, res, next) => {
  try {
    const doc = await DeleteApproval.findById(req.params.id);
    if (!doc) throw new ApiError(404, "Approval request not found");
    if (doc.status !== "pending")
      throw new ApiError(400, `Request is already ${doc.status}`);

    const adminUid = req.admin.adminUid;

    // Can't approve your own request
    if (doc.initiatedBy.adminUid === adminUid)
      throw new ApiError(400, "Cannot approve your own delete request");

    // Already approved by this admin
    if (doc.approvals.some((a) => a.adminUid === adminUid))
      throw new ApiError(400, "You have already approved this request");

    doc.approvals.push({ adminUid, email: req.admin.email });

    // Use the required count stored at initiation time
    const required = doc.requiredApprovals ?? 2;

    if (doc.approvals.length >= required) {
      // Execute the actual delete
      if (doc.resource === "products") {
        const deleted = await Product.findOneAndDelete({ productId: doc.resourceId });
        if (!deleted) throw new ApiError(404, "Product not found — may have already been deleted");
      }
      doc.status = "approved";
      doc.executedAt = new Date();
    }

    await doc.save();

    const message =
      doc.status === "approved"
        ? "Approved and deleted successfully"
        : `Approval recorded (${doc.approvals.length}/${required} approvals)`;

    res.json(new ApiResponse(200, message, doc));
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/delete-approvals/:id/reject
export const rejectDelete = async (req, res, next) => {
  try {
    const doc = await DeleteApproval.findById(req.params.id);
    if (!doc) throw new ApiError(404, "Approval request not found");
    if (doc.status !== "pending")
      throw new ApiError(400, `Request is already ${doc.status}`);

    doc.status = "rejected";
    doc.rejectedBy = {
      adminUid: req.admin.adminUid,
      email: req.admin.email,
      rejectedAt: new Date(),
    };
    await doc.save();

    res.json(new ApiResponse(200, "Delete request rejected", doc));
  } catch (err) {
    next(err);
  }
};
