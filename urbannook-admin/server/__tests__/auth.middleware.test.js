const jwt = require("jsonwebtoken");
const { verifyAuth } = require("../middleware/auth");

const JWT_SECRET = "test-secret-key";

// Store original env and restore after tests
const originalEnv = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterAll(() => {
  process.env.JWT_SECRET = originalEnv;
});

// Helper to create mock req/res/next
function createMocks(overrides = {}) {
  const req = {
    cookies: {},
    header: jest.fn().mockReturnValue(undefined),
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("Auth Middleware - verifyAuth", () => {
  describe("token extraction", () => {
    it("should extract token from adminAccessToken cookie", () => {
      const payload = { email: "admin@test.com" };
      const token = jwt.sign(payload, JWT_SECRET);
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: token },
      });

      verifyAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.admin).toBeDefined();
      expect(req.admin.email).toBe("admin@test.com");
    });

    it("should extract token from Authorization Bearer header", () => {
      const payload = { email: "admin@test.com" };
      const token = jwt.sign(payload, JWT_SECRET);
      const { req, res, next } = createMocks();
      req.header = jest.fn((name) => {
        if (name === "Authorization") return `Bearer ${token}`;
        return undefined;
      });

      verifyAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.admin).toBeDefined();
      expect(req.admin.email).toBe("admin@test.com");
    });

    it("should prefer cookie over Authorization header", () => {
      const cookiePayload = { email: "cookie@test.com" };
      const headerPayload = { email: "header@test.com" };
      const cookieToken = jwt.sign(cookiePayload, JWT_SECRET);
      const headerToken = jwt.sign(headerPayload, JWT_SECRET);

      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: cookieToken },
      });
      req.header = jest.fn((name) => {
        if (name === "Authorization") return `Bearer ${headerToken}`;
        return undefined;
      });

      verifyAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.admin.email).toBe("cookie@test.com");
    });
  });

  describe("missing token", () => {
    it("should return 401 when no cookie and no header", () => {
      const { req, res, next } = createMocks();

      verifyAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Authentication token missing",
        data: null,
        success: false,
      });
    });

    it("should return 401 when cookies object is undefined", () => {
      const { req, res, next } = createMocks({ cookies: undefined });

      verifyAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 401 when cookie is empty string", () => {
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: "" },
      });

      verifyAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("invalid token", () => {
    it("should return 401 for a malformed token", () => {
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: "not-a-valid-jwt" },
      });

      verifyAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Authentication token missing",
        data: null,
        success: false,
      });
    });

    it("should return 401 for a token signed with wrong secret", () => {
      const token = jwt.sign({ email: "admin@test.com" }, "wrong-secret");
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: token },
      });

      verifyAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 401 for an expired token", () => {
      const token = jwt.sign({ email: "admin@test.com" }, JWT_SECRET, {
        expiresIn: "0s",
      });
      // Token is already expired at creation with 0s
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: token },
      });

      verifyAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("successful verification", () => {
    it("should attach decoded payload to req.admin and call next", () => {
      const payload = { email: "admin@test.com", role: "admin" };
      const token = jwt.sign(payload, JWT_SECRET);
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: token },
      });

      verifyAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.admin).toBeDefined();
      expect(req.admin.email).toBe("admin@test.com");
      expect(req.admin.role).toBe("admin");
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should not modify the response on success", () => {
      const token = jwt.sign({ email: "admin@test.com" }, JWT_SECRET);
      const { req, res, next } = createMocks({
        cookies: { adminAccessToken: token },
      });

      verifyAuth(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
