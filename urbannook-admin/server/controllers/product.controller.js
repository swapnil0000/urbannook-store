import { uuidv7 } from "uuidv7";
import Product from "../models/product.model.js";
import Counter from "../models/counter.model.js";
import Admin from "../models/admin.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import DeleteApproval from "../models/delete.approval.model.js";

const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json(new ApiResponse(200, "Products fetched successfully", products));
  } catch (error) {
    next(error);
  }
};

const addProduct = async (req, res, next) => {
  try {
    const productId = uuidv7();

    console.log(req.body, "reqreqreqreqreqreq");

    // Validate specifications if provided
    if (req.body.specifications !== undefined) {
      if (!Array.isArray(req.body.specifications)) {
        throw new ApiError(400, "Invalid specifications format");
      }

      for (const spec of req.body.specifications) {
        if (!spec.key || !spec.value) {
          throw new ApiError(400, "Invalid specifications format");
        }
      }
    }

    const counter = await Counter.findByIdAndUpdate(
      "uiProductId",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    const uiProductId = `UN-PROD-${counter.sequence_value}`;

    const product = await Product.create({
      ...req.body,
      productId,
      uiProductId,
      isPublished:
        req.body.isPublished !== undefined ? req.body.isPublished : true,
    });

    res
      .status(201)
      .json(new ApiResponse(201, "Product created successfully", product));
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(
        new ApiError(
          400,
          `A product with this ${field} already exists. Please use a different ${field}.`
        )
      );
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { action, productQuantity, ...updateFields } = req.body;

    // Validate specifications if provided
    if (updateFields.specifications !== undefined) {
      if (!Array.isArray(updateFields.specifications)) {
        throw new ApiError(400, "Invalid specifications format");
      }

      for (const spec of updateFields.specifications) {
        if (!spec.key || !spec.value) {
          throw new ApiError(400, "Invalid specifications format");
        }
      }
    }

    let updatedProduct;

    if (action === "add") {
      updatedProduct = await Product.findOneAndUpdate(
        { productId },
        { $inc: { productQuantity: productQuantity } },
        { new: true }
      );
    } else if (action === "sub") {
      updatedProduct = await Product.findOneAndUpdate(
        { productId },
        { $inc: { productQuantity: -productQuantity } },
        { new: true }
      );
    } else {
      const fieldsToUpdate = { ...updateFields };
      if (productQuantity !== undefined) {
        fieldsToUpdate.productQuantity = productQuantity;
      }
      updatedProduct = await Product.findOneAndUpdate(
        { productId },
        fieldsToUpdate,
        { new: true }
      );
    }

    if (!updatedProduct) {
      throw new ApiError(404, "Product not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, "Product updated successfully", updatedProduct)
      );
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(
        new ApiError(
          400,
          `A product with this ${field} already exists. Please use a different ${field}.`
        )
      );
    }
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({ productId });
    if (!product) throw new ApiError(404, "Product not found");

    const existing = await DeleteApproval.findOne({
      resource: "products",
      resourceId: productId,
      status: "pending",
    });
    if (existing)
      throw new ApiError(409, "A pending approval request already exists for this product");

    const totalSuperAdmins = await Admin.countDocuments({ role: "super_admin" });
    const doc = await DeleteApproval.create({
      resource: "products",
      resourceId: productId,
      resourceName: product.productName,
      initiatedBy: {
        adminUid: req.admin.adminUid,
        email: req.admin.email,
      },
      requiredApprovals: Math.max(2, totalSuperAdmins),
      approvals: [{ adminUid: req.admin.adminUid, email: req.admin.email }],
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Delete approval request created — requires approval from other super_admin", doc));
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const {
      limit = 10,
      currentPage = 1,
      search,
      status,
      category,
      subCategory,
      featured,
    } = req.query;

    const filter = { isPublished: true };

    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }
    if (status) {
      filter.productStatus = status;
    }
    if (category) {
      filter.productCategory = category;
    }
    if (subCategory) {
      filter.productSubCategory = subCategory;
    }
    if (featured === "true") {
      filter.tags = "featured";
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(currentPage, 10);

    const totalProducts = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    res.status(200).json(
      new ApiResponse(200, "Products fetched successfully", {
        products,
        totalProducts,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalProducts / parsedLimit),
      })
    );
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findOne({ productId, isPublished: true });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, "Product fetched successfully", product));
  } catch (error) {
    next(error);
  }
};

const getHomepageProducts = async (req, res, next) => {
  try {
    const tags = ["featured", "new_arrival", "best_seller", "trending"];

    const results = await Promise.all(
      tags.map((tag) =>
        Product.find({ tags: tag, isPublished: true }).limit(2)
      )
    );

    const data = {};
    tags.forEach((tag, index) => {
      data[tag] = results[index];
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, "Homepage products fetched successfully", data)
      );
  } catch (error) {
    next(error);
  }
};

export {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
  getHomepageProducts,
};
