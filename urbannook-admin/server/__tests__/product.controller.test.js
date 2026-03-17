const { getAllProducts, addProduct, updateProduct } = require("../controllers/product");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { uuidv7 } = require("uuidv7");

jest.mock("../models/Product");
jest.mock("../models/Counter");
jest.mock("uuidv7");

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper to create mock req/res
function createMocks({ body = {}, params = {} } = {}) {
  const req = { body, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("Product Controller - getAllProducts", () => {
  it("should return all products sorted by createdAt descending", async () => {
    const mockProducts = [
      { productName: "Product A", createdAt: new Date("2024-02-01") },
      { productName: "Product B", createdAt: new Date("2024-01-01") },
    ];

    const sortMock = jest.fn().mockResolvedValue(mockProducts);
    Product.find.mockReturnValue({ sort: sortMock });

    const { req, res } = createMocks();
    await getAllProducts(req, res);

    expect(Product.find).toHaveBeenCalled();
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Products fetched successfully");
    expect(jsonArg.data).toEqual(mockProducts);
    expect(jsonArg.success).toBe(true);
  });

  it("should return an empty array when no products exist", async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Product.find.mockReturnValue({ sort: sortMock });

    const { req, res } = createMocks();
    await getAllProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data).toEqual([]);
    expect(jsonArg.success).toBe(true);
  });
});

describe("Product Controller - addProduct", () => {
  it("should create a product with auto-generated productId and uiProductId", async () => {
    const mockUuid = "01912345-6789-7abc-def0-123456789abc";
    uuidv7.mockReturnValue(mockUuid);

    Counter.findByIdAndUpdate.mockResolvedValue({ sequence_value: 5 });

    const productData = {
      productName: "Test Product",
      productImg: "https://example.com/img.jpg",
      productDes: "A test product",
      sellingPrice: 25,
      productCategory: "electronics",
      productQuantity: 10,
      productStatus: "in_stock",
      tags: ["featured"],
    };

    const createdProduct = {
      ...productData,
      productId: mockUuid,
      uiProductId: "UN-PROD-5",
      _id: "mongo-id-123",
    };

    Product.create.mockResolvedValue(createdProduct);

    const { req, res } = createMocks({ body: productData });
    await addProduct(req, res);

    expect(uuidv7).toHaveBeenCalled();
    expect(Counter.findByIdAndUpdate).toHaveBeenCalledWith(
      "uiProductId",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    expect(Product.create).toHaveBeenCalledWith({
      ...productData,
      productId: mockUuid,
      uiProductId: "UN-PROD-5",
    });

    expect(res.status).toHaveBeenCalledWith(201);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(201);
    expect(jsonArg.message).toBe("Product created successfully");
    expect(jsonArg.data).toEqual(createdProduct);
    expect(jsonArg.success).toBe(true);
  });

  it("should use upsert for the counter to handle first product creation", async () => {
    uuidv7.mockReturnValue("some-uuid");
    Counter.findByIdAndUpdate.mockResolvedValue({ sequence_value: 1 });
    Product.create.mockResolvedValue({ productId: "some-uuid", uiProductId: "UN-PROD-1" });

    const { req, res } = createMocks({
      body: { productName: "First Product", sellingPrice: 15 },
    });
    await addProduct(req, res);

    expect(Counter.findByIdAndUpdate).toHaveBeenCalledWith(
      "uiProductId",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
  });

  it("should not include productId or uiProductId from request body", async () => {
    uuidv7.mockReturnValue("generated-uuid");
    Counter.findByIdAndUpdate.mockResolvedValue({ sequence_value: 3 });
    Product.create.mockResolvedValue({});

    const { req, res } = createMocks({
      body: {
        productName: "Sneaky Product",
        productId: "user-supplied-id",
        uiProductId: "user-supplied-ui-id",
        sellingPrice: 20,
      },
    });
    await addProduct(req, res);

    // The auto-generated values should override any user-supplied ones
    expect(Product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "generated-uuid",
        uiProductId: "UN-PROD-3",
      })
    );
  });
});

describe("Product Controller - updateProduct", () => {
  it("should increment productQuantity when action is 'add'", async () => {
    const mockProduct = {
      productId: "test-uuid",
      productName: "Test Product",
      productQuantity: 15,
    };

    Product.findOneAndUpdate.mockResolvedValue(mockProduct);

    const { req, res } = createMocks({
      params: { productId: "test-uuid" },
      body: { action: "add", productQuantity: 5 },
    });
    await updateProduct(req, res);

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productId: "test-uuid" },
      { $inc: { productQuantity: 5 } },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.data).toEqual(mockProduct);
    expect(jsonArg.success).toBe(true);
  });

  it("should decrement productQuantity when action is 'sub'", async () => {
    const mockProduct = {
      productId: "test-uuid",
      productName: "Test Product",
      productQuantity: 5,
    };

    Product.findOneAndUpdate.mockResolvedValue(mockProduct);

    const { req, res } = createMocks({
      params: { productId: "test-uuid" },
      body: { action: "sub", productQuantity: 3 },
    });
    await updateProduct(req, res);

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productId: "test-uuid" },
      { $inc: { productQuantity: -3 } },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data).toEqual(mockProduct);
  });

  it("should update only provided fields when no action is specified", async () => {
    const mockProduct = {
      productId: "test-uuid",
      productName: "Updated Name",
      sellingPrice: 30,
      productQuantity: 10,
    };

    Product.findOneAndUpdate.mockResolvedValue(mockProduct);

    const { req, res } = createMocks({
      params: { productId: "test-uuid" },
      body: { productName: "Updated Name", sellingPrice: 30 },
    });
    await updateProduct(req, res);

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productId: "test-uuid" },
      { productName: "Updated Name", sellingPrice: 30 },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data).toEqual(mockProduct);
  });

  it("should include productQuantity in update fields when no action is specified", async () => {
    const mockProduct = {
      productId: "test-uuid",
      productQuantity: 50,
    };

    Product.findOneAndUpdate.mockResolvedValue(mockProduct);

    const { req, res } = createMocks({
      params: { productId: "test-uuid" },
      body: { productQuantity: 50 },
    });
    await updateProduct(req, res);

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { productId: "test-uuid" },
      { productQuantity: 50 },
      { new: true }
    );
  });

  it("should return 404 when product is not found", async () => {
    Product.findOneAndUpdate.mockResolvedValue(null);

    const { req, res } = createMocks({
      params: { productId: "nonexistent-uuid" },
      body: { productName: "Does Not Exist" },
    });

    await expect(updateProduct(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });
  });

  it("should return 404 when product is not found for action 'add'", async () => {
    Product.findOneAndUpdate.mockResolvedValue(null);

    const { req, res } = createMocks({
      params: { productId: "nonexistent-uuid" },
      body: { action: "add", productQuantity: 5 },
    });

    await expect(updateProduct(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });
  });

  it("should return 404 when product is not found for action 'sub'", async () => {
    Product.findOneAndUpdate.mockResolvedValue(null);

    const { req, res } = createMocks({
      params: { productId: "nonexistent-uuid" },
      body: { action: "sub", productQuantity: 3 },
    });

    await expect(updateProduct(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });
  });

  it("should return response in correct ApiResponse format", async () => {
    Product.findOneAndUpdate.mockResolvedValue({ productId: "test-uuid" });

    const { req, res } = createMocks({
      params: { productId: "test-uuid" },
      body: { productName: "Updated" },
    });
    await updateProduct(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty("statusCode", 200);
    expect(jsonArg).toHaveProperty("message", "Product updated successfully");
    expect(jsonArg).toHaveProperty("data");
    expect(jsonArg).toHaveProperty("success", true);
  });
});
