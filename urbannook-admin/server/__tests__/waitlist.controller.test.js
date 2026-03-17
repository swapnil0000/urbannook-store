const { getWaitlistUsers } = require("../controllers/waitlist");
const Waitlist = require("../models/Waitlist");

jest.mock("../models/Waitlist");

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

describe("Waitlist Controller - getWaitlistUsers", () => {
  it("should return all waitlist users with total count", async () => {
    const mockUsers = [
      {
        _id: "id1",
        userName: "Alice",
        userEmail: "alice@example.com",
        joinedAt: new Date("2024-01-15"),
      },
      {
        _id: "id2",
        userName: "Bob",
        userEmail: "bob@example.com",
        joinedAt: new Date("2024-02-20"),
      },
    ];

    Waitlist.find.mockResolvedValue(mockUsers);
    Waitlist.countDocuments.mockResolvedValue(2);

    const { req, res } = createMocks();
    await getWaitlistUsers(req, res);

    expect(Waitlist.find).toHaveBeenCalled();
    expect(Waitlist.countDocuments).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Waitlist users fetched successfully");
    expect(jsonArg.data.users).toEqual(mockUsers);
    expect(jsonArg.data.totalJoinedUserWaitList).toBe(2);
    expect(jsonArg.success).toBe(true);
  });

  it("should return an empty array and zero count when no waitlist users exist", async () => {
    Waitlist.find.mockResolvedValue([]);
    Waitlist.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks();
    await getWaitlistUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.data.users).toEqual([]);
    expect(jsonArg.data.totalJoinedUserWaitList).toBe(0);
    expect(jsonArg.success).toBe(true);
  });

  it("should return response in correct ApiResponse format", async () => {
    Waitlist.find.mockResolvedValue([]);
    Waitlist.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks();
    await getWaitlistUsers(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty("statusCode");
    expect(jsonArg).toHaveProperty("message");
    expect(jsonArg).toHaveProperty("data");
    expect(jsonArg).toHaveProperty("success");
  });

  it("should return totalJoinedUserWaitList matching the number of users", async () => {
    const mockUsers = [
      { _id: "id1", userName: "User1", userEmail: "u1@test.com", joinedAt: new Date() },
      { _id: "id2", userName: "User2", userEmail: "u2@test.com", joinedAt: new Date() },
      { _id: "id3", userName: "User3", userEmail: "u3@test.com", joinedAt: new Date() },
    ];

    Waitlist.find.mockResolvedValue(mockUsers);
    Waitlist.countDocuments.mockResolvedValue(3);

    const { req, res } = createMocks();
    await getWaitlistUsers(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.users).toHaveLength(3);
    expect(jsonArg.data.totalJoinedUserWaitList).toBe(3);
  });
});
