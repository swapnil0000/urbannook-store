const { uuidv7 } = require("uuidv7");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const getAllProducts = async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res
    .status(200)
    .json(new ApiResponse(200, "Products fetched successfully", products));
};

const addProduct = async (req, res) => {
  const productId = uuidv7();

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
  });

  res
    .status(201)
    .json(new ApiResponse(201, "Product created successfully", product));
};

const updateProduct = async (req, res) => {
  const { productId } = req.params;
  const { action, productQuantity, ...updateFields } = req.body;

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
    .json(new ApiResponse(200, "Product updated successfully", updatedProduct));
};

const deleteProduct = async (req, res) => {
  const { productId } = req.params;
  const deletedProduct = await Product.findOneAndDelete({ productId });

  if (!deletedProduct) {
    throw new ApiError(404, "Product not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Product deleted successfully", deletedProduct));
};

const getProducts = async (req, res) => {
  const {
    limit = 10,
    currentPage = 1,
    search,
    status,
    category,
    subCategory,
  } = req.query;

  const filter = {};

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
};

const getProductById = async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findOne({ productId });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Product fetched successfully", product));
};

const getHomepageProducts = async (req, res) => {
  const tags = ["featured", "new_arrival", "best_seller", "trending"];

  const results = await Promise.all(
    tags.map((tag) => Product.find({ tags: tag }).limit(2))
  );

  const data = {};
  tags.forEach((tag, index) => {
    data[tag] = results[index];
  });

  res
    .status(200)
    .json(new ApiResponse(200, "Homepage products fetched successfully", data));
};

module.exports = {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
  getHomepageProducts,
};
