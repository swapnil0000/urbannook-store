const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { login, logout } = require("../controllers/auth");
const Admin = require("../models/Admin");

jest.mock("../models/Admin");

const JWT_SECRET = "test-secret-key";
const originalEnv = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterAll(() => {
  process.env.JWT_SECRET = originalEnv;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper to create mock req/res
function createMocks(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("Auth Controller - login", () => {
  it("should return 401 when email is missing", async () => {
    const { req, res } = createMocks({ password: "password123" });

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Email and password are required",
    });
  });

  it("should return 401 when password is missing", async () => {
    const { req, res } = createMocks({ email: "admin@test.com" });

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Email and password are required",
    });
  });

  it("should return 401 when both email and password are missing", async () => {
    const { req, res } = createMocks({});

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Email and password are required",
    });
  });

  it("should return 401 when admin is not found", async () => {
    Admin.findOne.mockResolvedValue(null);
    const { req, res } = createMocks({
      email: "nonexistent@test.com",
      password: "password123",
    });

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });

    expect(Admin.findOne).toHaveBeenCalledWith({ email: "nonexistent@test.com" });
  });

  it("should return 401 when password does not match", async () => {
    const hashedPassword = await bcrypt.hash("correctpassword", 10);
    Admin.findOne.mockResolvedValue({
      email: "admin@test.com",
      password: hashedPassword,
    });

    const { req, res } = createMocks({
      email: "admin@test.com",
      password: "wrongpassword",
    });

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
  });

  it("should return 200 with token and set httpOnly cookie on valid credentials", async () => {
    const hashedPassword = await bcrypt.hash("correctpassword", 10);
    Admin.findOne.mockResolvedValue({
      email: "admin@test.com",
      password: hashedPassword,
    });

    const { req, res } = createMocks({
      email: "admin@test.com",
      password: "correctpassword",
    });

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalledWith(
      "adminAccessToken",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
      })
    );

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Login successful");
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data.userEmail).toBe("admin@test.com");
    expect(jsonArg.data.adminAccessToken).toBeDefined();
    expect(typeof jsonArg.data.adminAccessToken).toBe("string");

    // Verify the token is a valid JWT
    const decoded = jwt.verify(jsonArg.data.adminAccessToken, JWT_SECRET);
    expect(decoded.email).toBe("admin@test.com");
  });

  it("should generate a JWT with the admin email in the payload", async () => {
    const hashedPassword = await bcrypt.hash("mypassword", 10);
    Admin.findOne.mockResolvedValue({
      email: "specific@admin.com",
      password: hashedPassword,
    });

    const { req, res } = createMocks({
      email: "specific@admin.com",
      password: "mypassword",
    });

    await login(req, res);

    const token = res.json.mock.calls[0][0].data.adminAccessToken;
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.email).toBe("specific@admin.com");
    expect(decoded.exp).toBeDefined(); // token should have expiration
  });
});

describe("Auth Controller - logout", () => {
  it("should clear the adminAccessToken cookie and return success", async () => {
    const { req, res } = createMocks();

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.clearCookie).toHaveBeenCalledWith(
      "adminAccessToken",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
      })
    );

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(200);
    expect(jsonArg.message).toBe("Logout successful");
    expect(jsonArg.success).toBe(true);
  });

  it("should return a response with the correct ApiResponse format", async () => {
    const { req, res } = createMocks();

    await logout(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty("statusCode");
    expect(jsonArg).toHaveProperty("message");
    expect(jsonArg).toHaveProperty("data");
    expect(jsonArg).toHaveProperty("success");
    expect(jsonArg.data).toBeNull();
  });
});
