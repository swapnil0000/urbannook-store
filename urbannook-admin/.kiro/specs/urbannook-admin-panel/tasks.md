# Implementation Plan: UrbanNook Admin Panel

## Overview

Full-stack implementation of the UrbanNook Admin Panel with an Express 5 + MongoDB backend and a React 19 + Vite frontend. Tasks are ordered so each step builds on the previous, starting with backend infrastructure, then API endpoints, then frontend scaffolding, and finally wiring everything together.

## Tasks

- [x] 1. Initialize project structure and backend foundation
  - [x] 1.1 Initialize the backend project in `server/` with `package.json`, install dependencies: express, mongoose, cors, cookie-parser, jsonwebtoken, bcryptjs, uuidv7, dotenv
    - Create `server/package.json` with start and dev scripts
    - Create `server/.env` with MONGODB_URI, JWT_SECRET, CORS_ORIGIN, PORT placeholders
    - _Requirements: 1.1, 6.3_
  - [x] 1.2 Create MongoDB connection module (`server/config/db.js`) and server entry point (`server/index.js`)
    - Implement `connectDB()` that connects to MongoDB with dbName "un" and logs success
    - Configure Express 5 app with CORS (credentials: true), cookie-parser, JSON body parser
    - Mount route placeholders and global error handler middleware
    - _Requirements: 1.1, 1.2, 6.3_
  - [x] 1.3 Create the API response utility (`server/utils/apiResponse.js`)
    - Implement `ApiResponse` class with statusCode, message, data, success fields
    - Implement `ApiError` class extending Error for consistent error responses
    - _Requirements: 6.1, 6.2_
  - [x] 1.4 Create all Mongoose models: Product, Order, Waitlist, Admin, Counter
    - `server/models/Product.js` — full schema with all fields, validators (min: 10 for sellingPrice), enums, timestamps
    - `server/models/Order.js` — schema with items array, deliveryAddress, payment subdocs, status enum, timestamps
    - `server/models/Waitlist.js` — schema with userName, userEmail (unique), joinedAt default
    - `server/models/Admin.js` — schema with email (unique), password (hashed via bcryptjs pre-save hook)
    - `server/models/Counter.js` — schema with _id (String) and sequence_value (Number)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  - [x] 1.5 Write property test for Mongoose model validation (Property 1)
    - **Property 1: Mongoose Model Validation**
    - Use fast-check to generate random valid/invalid product objects and verify Mongoose validation accepts/rejects correctly
    - Test sellingPrice < 10 rejection, missing required fields, invalid enum values
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

- [x] 2. Implement backend authentication
  - [x] 2.1 Create auth middleware (`server/middleware/auth.js`)
    - Extract JWT from `adminAccessToken` cookie or `Authorization: Bearer` header
    - Verify token with jsonwebtoken, attach decoded payload to `req.admin`
    - Return 401 with "Authentication token missing" if no valid token
    - _Requirements: 2.4, 2.5_
  - [x] 2.2 Create auth controller and routes (`server/controllers/auth.js`, `server/routes/admin.js`)
    - POST /admin/login: validate email/password against Admin model, compare bcrypt hash, generate JWT, set httpOnly cookie `adminAccessToken`, return { userEmail, adminAccessToken }
    - POST /admin/logout: clear `adminAccessToken` cookie, return success
    - Wire routes in `server/routes/admin.js` with auth middleware on logout
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 2.3 Write property test for auth middleware token verification (Property 2)
    - **Property 2: Auth Middleware Token Verification**
    - Use fast-check to generate random valid/invalid JWT tokens and verify middleware allows/rejects correctly
    - **Validates: Requirements 2.4, 2.5**

- [x] 3. Implement backend product management API
  - [x] 3.1 Create product controller (`server/controllers/product.js`) — admin endpoints
    - GET /admin/total/products: fetch all products sorted by createdAt desc
    - POST /admin/add/inventory: auto-generate UUID v7 productId, auto-increment uiProductId via Counter model, create product, return created product
    - POST /admin/update/inventory/:productId: update only provided fields; handle action "add"/"sub" for quantity using $inc
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Create product controller — public endpoints
    - GET /products: paginated listing with query params (limit, currentPage, search, status, category, subCategory), return products + pagination metadata
    - GET /product/:productId: single product by productId
    - GET /products/homepage: products grouped by tags (featured, new_arrival, best_seller, trending), max 2 per group
    - Wire all routes: admin routes with auth middleware, public routes without
    - _Requirements: 3.6, 3.7, 3.8_
  - [ ]* 3.3 Write property tests for product API (Properties 3–7)
    - **Property 3: Product List Sorting** — verify createdAt descending order
    - **Property 4: Product ID Auto-Generation** — verify UUID v7 and UN-PROD-{n} format
    - **Property 5: Partial Update Preservation** — verify unchanged fields remain identical
    - **Property 6: Quantity Increment/Decrement Round Trip** — verify add then sub returns original quantity
    - **Property 7: Pagination Consistency** — verify totalPages = ceil(totalProducts / limit)
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

- [x] 4. Implement backend waitlist and orders API
  - [x] 4.1 Create waitlist controller and routes (`server/controllers/waitlist.js`)
    - GET /admin/joined/waitlist: return all waitlist users + totalJoinedUserWaitList count
    - Wire route with auth middleware
    - _Requirements: 4.1_
  - [x] 4.2 Create order controller and routes (`server/controllers/order.js`)
    - GET /admin/orders: return all orders sorted by createdAt desc
    - Wire route with auth middleware
    - _Requirements: 5.1_
  - [ ]* 4.3 Write property tests for waitlist and orders (Properties 8–12)
    - **Property 8: Single Product Retrieval** — verify GET /product/:productId returns exact matching document
    - **Property 9: Homepage Tag Grouping** — verify products grouped by tag with max 2 per group
    - **Property 10: Waitlist Count Consistency** — verify array length equals totalJoinedUserWaitList count
    - **Property 11: Orders Sorting** — verify createdAt descending order
    - **Property 12: API Response Format Consistency** — verify all responses have correct shape with statusCode, message, data, success
    - **Validates: Requirements 3.7, 3.8, 4.1, 5.1, 6.1, 6.2**

- [x] 5. Checkpoint — Backend complete
  - Ensure all backend tests pass, ask the user if questions arise.
  - Verify all API endpoints work with correct response format
  - Verify auth middleware protects admin routes

- [x] 6. Initialize frontend project
  - [x] 6.1 Scaffold React 19 + Vite project in `client/`
    - Install dependencies: react-router-dom, axios, react-cookie, lucide-react, tailwindcss, @tailwindcss/vite
    - Configure Tailwind CSS with black/white/gray theme
    - Create `client/.env` with VITE_API_BASE_URL placeholder
    - _Requirements: 9.1_
  - [x] 6.2 Create Axios API client (`client/src/api/axios.js`)
    - Configure baseURL from VITE_API_BASE_URL, withCredentials: true
    - Request interceptor: attach Bearer token from adminAccessToken cookie
    - Response interceptor: on 401, clear cookie and redirect to /admin/login
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 6.3 Create Toast context and component (`client/src/context/ToastContext.jsx`, `client/src/components/Toast.jsx`)
    - ToastProvider with showToast(message, type) function
    - Toast component with auto-dismiss (4s default), manual close button, success/error/info styling
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [x] 6.4 Create Auth context (`client/src/context/AuthContext.jsx`)
    - AuthProvider with user state, login(), logout(), isAuthenticated
    - login(): POST /admin/login, store user email, cookie set by server
    - logout(): POST /admin/logout, remove cookie, navigate to login
    - _Requirements: 7.1, 7.3_

- [x] 7. Implement frontend routing and layout
  - [x] 7.1 Create Auth Guard component (`client/src/components/AuthGuard.jsx`)
    - Check adminAccessToken cookie presence
    - Redirect to /admin/login if absent on protected routes
    - Redirect to /admin/dashboard if present on login page
    - _Requirements: 8.1, 8.3_
  - [x] 7.2 Create Layout component with Sidebar and Mobile Drawer (`client/src/components/Layout.jsx`, `client/src/components/Sidebar.jsx`)
    - Desktop: fixed sidebar (240px) with "UrbanNook Admin" branding, nav links (Dashboard, Products, Waitlist, Orders, Logout) with Lucide icons, active route highlighting
    - Mobile: top header with hamburger icon, slide-out drawer with same nav links
    - Black/white/gray theme
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_
  - [x] 7.3 Set up React Router in App.jsx
    - Login route (public), protected routes wrapped in AuthGuard + Layout
    - Catch-all redirect to /admin/dashboard
    - _Requirements: 8.1, 8.3_
  - [ ]* 7.4 Write property tests for Auth Guard and Sidebar (Properties 13, 14, 21)
    - **Property 13: Auth Guard Route Protection** — verify redirect to /admin/login when cookie absent, redirect to /admin/dashboard when cookie present on login page
    - **Property 14: API Client 401 Interceptor** — verify cookie removal and redirect on 401 responses
    - **Property 21: Sidebar Active Route Highlighting** — verify correct nav link is highlighted for each route
    - **Validates: Requirements 8.1, 8.2, 8.3, 16.3**

- [x] 8. Implement Login page
  - [x] 8.1 Create Login page component (`client/src/pages/Login.jsx`)
    - Centered card layout with email and password inputs
    - Submit handler calls AuthContext login()
    - Loading state on submit button, disabled inputs during submission
    - Error display via Toast on failed login
    - On success, navigate to /admin/dashboard
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 9. Implement Dashboard page
  - [x] 9.1 Create Dashboard page component (`client/src/pages/Dashboard.jsx`)
    - Fetch total products (GET /admin/total/products → count array length), total orders (GET /admin/orders → count), total waitlist users (GET /admin/joined/waitlist → totalJoinedUserWaitList)
    - Display 3 summary metric cards in responsive grid
    - Display quick-action cards linking to Products, Orders, Waitlist pages
    - Loading states during fetch, error Toast + fallback on failure
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Implement Product Management pages
  - [x] 10.1 Create Product List view (`client/src/pages/Products.jsx`)
    - Fetch all products from GET /admin/total/products
    - Display product cards/rows with thumbnail, productName, uiProductId, sellingPrice, productCategory, productStatus badge (color-coded), productQuantity
    - Loading spinner during fetch, error state with retry button
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 10.2 Create Add Product form (`client/src/components/AddProductForm.jsx`)
    - Form fields: productName, productImg (text input + image preview), productDes, sellingPrice, productCategory, productQuantity, productStatus (select), tags (multi-select checkboxes), productSubDes, productSubCategory
    - Client-side validation: required fields check, sellingPrice >= 10
    - Submit to POST /admin/add/inventory (exclude productId, uiProductId)
    - Success Toast + refresh list, error Toast on failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  - [x] 10.3 Create Edit Product form (`client/src/components/EditProductForm.jsx`)
    - Pre-populate form with current product data
    - Track changed fields, submit only changed fields to POST /admin/update/inventory/:productId
    - Quantity increment/decrement controls with action: "add"/"sub"
    - Success Toast + refresh, error Toast with form data retention
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [ ]* 10.4 Write property tests for product forms and status badges (Properties 15–19)
    - **Property 15: Product Status Badge Color Mapping** — verify green for in_stock, yellow for out_of_stock, red for discontinued
    - **Property 16: Product Form Validation** — verify rejection when required fields missing or sellingPrice < 10
    - **Property 17: Product Create Payload Exclusion** — verify productId and uiProductId never in create request body
    - **Property 18: Edit Form Changed Fields Only** — verify only modified fields sent in update request
    - **Property 19: Edit Form Pre-population** — verify all form fields match product data on open
    - **Validates: Requirements 11.3, 12.2, 12.3, 12.4, 13.1, 13.4**

- [x] 11. Implement Waitlist page
  - [x] 11.1 Create Waitlist page component (`client/src/pages/Waitlist.jsx`)
    - Fetch from GET /admin/joined/waitlist
    - Display table/list with userName, userEmail, joinedAt (formatted date)
    - Display total count header
    - Loading indicator during fetch, error state with retry
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 12. Implement Orders page
  - [x] 12.1 Create Orders page component (`client/src/pages/Orders.jsx`)
    - Fetch from GET /admin/orders
    - Display order list with orderId, customer info, items summary, total amount, payment status badge (color-coded), date
    - Click to expand: show individual items with product snapshots (name, image, quantity, price), delivery address
    - Loading indicator during fetch, error state with retry
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [ ]* 12.2 Write property tests for order and toast components (Properties 20, 22)
    - **Property 20: Order Status Badge Color Mapping** — verify green for PAID, yellow for CREATED, red for FAILED
    - **Property 22: Toast Notification Display** — verify correct type and message for success/error operations
    - **Validates: Requirements 15.3, 17.1, 17.2**

- [x] 13. Final checkpoint — Full stack complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify frontend connects to backend correctly
  - Verify all pages render with correct data
  - Verify auth flow works end-to-end (login → protected pages → logout)

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Backend is built first so frontend can be tested against real endpoints
