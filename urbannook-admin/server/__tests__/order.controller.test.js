const { getAllOrders } = require("../controllers/order");
const Order = require("../models/Order");

jest.mock("../models/Order");

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper to create mock req/res
function createMocks() {
  const req = {};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("Order Controller - getAllOrders", () => {
  it("should return all orders sorted by createdAt descending", async () => {
    const mockOrders = [
      {
        _id: "id1",
        orderId: "ORD-001",
        userId: "user1",
        amount: 150,
        status: "PAID",
        createdAt: new Date("2024-03-01"),
      },
      {
        _id: "id2",
        orderId: "ORD-002",
        userId: "user2",
        amount: 75,
        status: "CREATED",
        createdAt: new Date("2024-02-01"),
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(mockOrders);
    Order.find.mockReturnValue({ sort: sortMock });

    const { req, res } = createMocks();
    await getAllOrders(req, res);

    expect(Order.find).toHaveBeenCalled();
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Orders fetched successfully");
    expect(jsonArg.data).toEqual(mockOrders);
    expect(jsonArg.success).toBe(true);
  });

  it("should return an empty array when no orders exist", async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Order.find.mockReturnValue({ sort: sortMock });

    const { req, res } = createMocks();
    await getAllOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.data).toEqual([]);
    expect(jsonArg.success).toBe(true);
  });

  it("should return response in correct ApiResponse format", async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Order.find.mockReturnValue({ sort: sortMock });

    const { req, res } = createMocks();
    await getAllOrders(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty("statusCode");
    expect(jsonArg).toHaveProperty("message");
    expect(jsonArg).toHaveProperty("data");
    expect(jsonArg).toHaveProperty("success");
  });

  it("should sort orders by createdAt in descending order", async () => {
    const mockOrders = [
      { orderId: "ORD-003", createdAt: new Date("2024-03-15") },
      { orderId: "ORD-002", createdAt: new Date("2024-02-10") },
      { orderId: "ORD-001", createdAt: new Date("2024-01-05") },
    ];

    const sortMock = jest.fn().mockResolvedValue(mockOrders);
    Order.find.mockReturnValue({ sort: sortMock });

    const { req, res } = createMocks();
    await getAllOrders(req, res);

    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data).toHaveLength(3);
    expect(jsonArg.data[0].orderId).toBe("ORD-003");
    expect(jsonArg.data[2].orderId).toBe("ORD-001");
  });
});
