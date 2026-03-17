const {
  getProducts,
  getProductById,
  getHomepageProducts,
} = require("../controllers/product");
const Product = require("../models/Product");

jest.mock("../models/Product");
jest.mock("../models/Counter");
jest.mock("uuidv7");

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// Helper to create mock req/res
function createMocks({ query = {}, params = {} } = {}) {
  const req = { query, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("Product Controller - getProducts (paginated listing)", () => {
  it("should return paginated products with default limit and page", async () => {
    const mockProducts = [
      { productName: "Product A" },
      { productName: "Product B" },
    ];

    const limitMock = jest.fn().mockResolvedValue(mockProducts);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(2);

    const { req, res } = createMocks();
    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({});
    expect(Product.find).toHaveBeenCalledWith({});
    expect(skipMock).toHaveBeenCalledWith(0); // (1 - 1) * 10
    expect(limitMock).toHaveBeenCalledWith(10);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data.products).toEqual(mockProducts);
    expect(jsonArg.data.totalProducts).toBe(2);
    expect(jsonArg.data.currentPage).toBe(1);
    expect(jsonArg.data.totalPages).toBe(1);
  });

  it("should apply custom limit and currentPage", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(25);

    const { req, res } = createMocks({
      query: { limit: "5", currentPage: "3" },
    });
    await getProducts(req, res);

    expect(skipMock).toHaveBeenCalledWith(10); // (3 - 1) * 5
    expect(limitMock).toHaveBeenCalledWith(5);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.currentPage).toBe(3);
    expect(jsonArg.data.totalPages).toBe(5); // ceil(25 / 5)
    expect(jsonArg.data.totalProducts).toBe(25);
  });

  it("should filter by search using case-insensitive regex on productName", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks({
      query: { search: "sneaker" },
    });
    await getProducts(req, res);

    const expectedFilter = {
      productName: { $regex: "sneaker", $options: "i" },
    };
    expect(Product.countDocuments).toHaveBeenCalledWith(expectedFilter);
    expect(Product.find).toHaveBeenCalledWith(expectedFilter);
  });

  it("should filter by status", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks({
      query: { status: "in_stock" },
    });
    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      productStatus: "in_stock",
    });
    expect(Product.find).toHaveBeenCalledWith({
      productStatus: "in_stock",
    });
  });

  it("should filter by category and subCategory", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks({
      query: { category: "electronics", subCategory: "phones" },
    });
    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      productCategory: "electronics",
      productSubCategory: "phones",
    });
  });

  it("should combine multiple filters", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks({
      query: {
        search: "shoe",
        status: "in_stock",
        category: "footwear",
        subCategory: "running",
        limit: "20",
        currentPage: "2",
      },
    });
    await getProducts(req, res);

    const expectedFilter = {
      productName: { $regex: "shoe", $options: "i" },
      productStatus: "in_stock",
      productCategory: "footwear",
      productSubCategory: "running",
    };
    expect(Product.countDocuments).toHaveBeenCalledWith(expectedFilter);
    expect(Product.find).toHaveBeenCalledWith(expectedFilter);
    expect(skipMock).toHaveBeenCalledWith(20); // (2 - 1) * 20
    expect(limitMock).toHaveBeenCalledWith(20);
  });

  it("should return empty products array when no products match", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    Product.find.mockReturnValue({ skip: skipMock });
    Product.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks();
    await getProducts(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.products).toEqual([]);
    expect(jsonArg.data.totalProducts).toBe(0);
    expect(jsonArg.data.totalPages).toBe(0);
  });
});

describe("Product Controller - getProductById", () => {
  it("should return a product when found by productId", async () => {
    const mockProduct = {
      productId: "test-uuid-123",
      productName: "Test Product",
      sellingPrice: 25,
    };

    Product.findOne.mockResolvedValue(mockProduct);

    const { req, res } = createMocks({
      params: { productId: "test-uuid-123" },
    });
    await getProductById(req, res);

    expect(Product.findOne).toHaveBeenCalledWith({ productId: "test-uuid-123" });
    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Product fetched successfully");
    expect(jsonArg.data).toEqual(mockProduct);
    expect(jsonArg.success).toBe(true);
  });

  it("should throw 404 ApiError when product is not found", async () => {
    Product.findOne.mockResolvedValue(null);

    const { req, res } = createMocks({
      params: { productId: "nonexistent-uuid" },
    });

    await expect(getProductById(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });
  });
});

describe("Product Controller - getHomepageProducts", () => {
  it("should return products grouped by tags with max 2 per group", async () => {
    const featuredProducts = [
      { productName: "Featured 1", tags: ["featured"] },
      { productName: "Featured 2", tags: ["featured"] },
    ];
    const newArrivalProducts = [
      { productName: "New 1", tags: ["new_arrival"] },
    ];
    const bestSellerProducts = [
      { productName: "Best 1", tags: ["best_seller"] },
      { productName: "Best 2", tags: ["best_seller"] },
    ];
    const trendingProducts = [];

    // Product.find returns a chainable object with .limit()
    Product.find
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue(featuredProducts) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue(newArrivalProducts) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue(bestSellerProducts) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue(trendingProducts) });

    const { req, res } = createMocks();
    await getHomepageProducts(req, res);

    expect(Product.find).toHaveBeenCalledTimes(4);
    expect(Product.find).toHaveBeenCalledWith({ tags: "featured" });
    expect(Product.find).toHaveBeenCalledWith({ tags: "new_arrival" });
    expect(Product.find).toHaveBeenCalledWith({ tags: "best_seller" });
    expect(Product.find).toHaveBeenCalledWith({ tags: "trending" });

    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Homepage products fetched successfully");
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data.featured).toEqual(featuredProducts);
    expect(jsonArg.data.new_arrival).toEqual(newArrivalProducts);
    expect(jsonArg.data.best_seller).toEqual(bestSellerProducts);
    expect(jsonArg.data.trending).toEqual(trendingProducts);
  });

  it("should return empty arrays when no products have tags", async () => {
    Product.find
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) });

    const { req, res } = createMocks();
    await getHomepageProducts(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.featured).toEqual([]);
    expect(jsonArg.data.new_arrival).toEqual([]);
    expect(jsonArg.data.best_seller).toEqual([]);
    expect(jsonArg.data.trending).toEqual([]);
  });

  it("should limit each tag group to 2 products", async () => {
    const limitMocks = [
      jest.fn().mockResolvedValue([]),
      jest.fn().mockResolvedValue([]),
      jest.fn().mockResolvedValue([]),
      jest.fn().mockResolvedValue([]),
    ];

    Product.find
      .mockReturnValueOnce({ limit: limitMocks[0] })
      .mockReturnValueOnce({ limit: limitMocks[1] })
      .mockReturnValueOnce({ limit: limitMocks[2] })
      .mockReturnValueOnce({ limit: limitMocks[3] });

    const { req, res } = createMocks();
    await getHomepageProducts(req, res);

    // Verify .limit(2) was called for each tag query
    for (const limitMock of limitMocks) {
      expect(limitMock).toHaveBeenCalledWith(2);
    }
  });

  it("should return response in correct ApiResponse format", async () => {
    Product.find
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) });

    const { req, res } = createMocks();
    await getHomepageProducts(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty("statusCode", 200);
    expect(jsonArg).toHaveProperty("message");
    expect(jsonArg).toHaveProperty("data");
    expect(jsonArg).toHaveProperty("success", true);
    expect(jsonArg.data).toHaveProperty("featured");
    expect(jsonArg.data).toHaveProperty("new_arrival");
    expect(jsonArg.data).toHaveProperty("best_seller");
    expect(jsonArg.data).toHaveProperty("trending");
  });
});
