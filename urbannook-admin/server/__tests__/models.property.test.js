/**
 * Feature: urbannook-admin-panel, Property 1: Mongoose Model Validation
 *
 * For any input object and any Mongoose model (Product, Order, Waitlist, Admin),
 * the model should accept objects that satisfy all required fields and constraints
 * (e.g., sellingPrice >= 10, valid enum values) and reject objects that violate
 * any constraint, returning a Mongoose validation error.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6
 */

const fc = require("fast-check");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Waitlist = require("../models/Waitlist");
const Admin = require("../models/Admin");

// --- Arbitraries ---

const validProductArb = fc.record({
  productName: fc.string({ minLength: 1 }),
  productId: fc.uuid(),
  uiProductId: fc.string({ minLength: 1 }),
  productImg: fc.webUrl(),
  productDes: fc.string({ minLength: 1 }),
  sellingPrice: fc.integer({ min: 10, max: 100000 }),
  productCategory: fc.string({ minLength: 1 }),
  productQuantity: fc.nat({ max: 10000 }),
  productStatus: fc.constantFrom("in_stock", "out_of_stock", "discontinued"),
  tags: fc.subarray(["featured", "new_arrival", "best_seller", "trending"]),
});

const validWaitlistArb = fc.record({
  userName: fc.string({ minLength: 1 }),
  userEmail: fc.emailAddress(),
});

const validAdminArb = fc.record({
  email: fc.emailAddress(),
  password: fc.string({ minLength: 6 }),
});

const validOrderArb = fc.record({
  orderId: fc.uuid(),
  status: fc.constantFrom("CREATED", "PAID", "FAILED"),
  amount: fc.float({ min: 0, noNaN: true }),
});

// --- Tests ---

describe("Property 1: Mongoose Model Validation", () => {
  it("valid Product objects pass validation", () => {
    fc.assert(
      fc.property(validProductArb, (data) => {
        const doc = new Product(data);
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("Product rejects sellingPrice < 10", () => {
    fc.assert(
      fc.property(
        validProductArb,
        fc.integer({ min: -1000, max: 9 }),
        (data, badPrice) => {
          const doc = new Product({ ...data, sellingPrice: badPrice });
          const err = doc.validateSync();
          expect(err).toBeDefined();
          expect(err.errors.sellingPrice).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Product rejects missing required fields", () => {
    const requiredFields = [
      "productName",
      "productId",
      "uiProductId",
      "productImg",
      "productDes",
      "sellingPrice",
      "productCategory",
    ];

    fc.assert(
      fc.property(
        validProductArb,
        fc.constantFrom(...requiredFields),
        (data, fieldToRemove) => {
          const copy = { ...data };
          delete copy[fieldToRemove];
          const doc = new Product(copy);
          const err = doc.validateSync();
          expect(err).toBeDefined();
          expect(err.errors[fieldToRemove]).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Product rejects invalid productStatus enum values", () => {
    fc.assert(
      fc.property(
        validProductArb,
        fc.string({ minLength: 1 }).filter(
          (s) => !["in_stock", "out_of_stock", "discontinued"].includes(s)
        ),
        (data, badStatus) => {
          const doc = new Product({ ...data, productStatus: badStatus });
          const err = doc.validateSync();
          expect(err).toBeDefined();
          expect(err.errors.productStatus).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Product rejects invalid tag enum values", () => {
    const validTags = ["featured", "new_arrival", "best_seller", "trending"];
    fc.assert(
      fc.property(
        validProductArb,
        fc.string({ minLength: 1 }).filter((s) => !validTags.includes(s)),
        (data, badTag) => {
          const doc = new Product({ ...data, tags: [badTag] });
          const err = doc.validateSync();
          expect(err).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("valid Waitlist objects pass validation", () => {
    fc.assert(
      fc.property(validWaitlistArb, (data) => {
        const doc = new Waitlist(data);
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("Waitlist rejects missing required fields", () => {
    fc.assert(
      fc.property(
        validWaitlistArb,
        fc.constantFrom("userName", "userEmail"),
        (data, fieldToRemove) => {
          const copy = { ...data };
          delete copy[fieldToRemove];
          const doc = new Waitlist(copy);
          const err = doc.validateSync();
          expect(err).toBeDefined();
          expect(err.errors[fieldToRemove]).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("valid Admin objects pass validation", () => {
    fc.assert(
      fc.property(validAdminArb, (data) => {
        const doc = new Admin(data);
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("Admin rejects missing required fields", () => {
    fc.assert(
      fc.property(
        validAdminArb,
        fc.constantFrom("email", "password"),
        (data, fieldToRemove) => {
          const copy = { ...data };
          delete copy[fieldToRemove];
          const doc = new Admin(copy);
          const err = doc.validateSync();
          expect(err).toBeDefined();
          expect(err.errors[fieldToRemove]).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("valid Order objects pass validation", () => {
    fc.assert(
      fc.property(validOrderArb, (data) => {
        const doc = new Order(data);
        const err = doc.validateSync();
        expect(err).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("Order rejects invalid status enum values", () => {
    fc.assert(
      fc.property(
        validOrderArb,
        fc.string({ minLength: 1 }).filter(
          (s) => !["CREATED", "PAID", "FAILED"].includes(s)
        ),
        (data, badStatus) => {
          const doc = new Order({ ...data, status: badStatus });
          const err = doc.validateSync();
          expect(err).toBeDefined();
          expect(err.errors.status).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
