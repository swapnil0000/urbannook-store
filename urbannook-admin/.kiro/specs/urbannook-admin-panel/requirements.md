# Requirements Document

## Introduction

The UrbanNook Admin Panel is a full-stack web application consisting of a backend API (Express 5 + MongoDB) and a frontend admin dashboard (React 19 + Vite). The backend provides RESTful API endpoints for authentication, product management, waitlist management, and order management, all connected to a MongoDB database. The frontend consumes these APIs to provide administrators with a clean, responsive interface for managing the UrbanNook e-commerce platform. Authentication uses JWT cookie-based tokens.

## Glossary

- **Backend_API**: The Express 5 server application that handles HTTP requests, business logic, and MongoDB database operations
- **Frontend_App**: The React 19 + Vite web application providing the admin user interface
- **Admin_User**: An authenticated administrator who accesses the Admin_Panel
- **Auth_Guard**: A route protection mechanism on the frontend that verifies the presence of the adminAccessToken cookie before granting access to protected routes
- **Auth_Middleware**: Server-side middleware that validates the JWT adminAccessToken from cookies or Authorization header before allowing access to protected API endpoints
- **API_Client**: The configured Axios instance on the frontend used for all HTTP communication with the Backend_API
- **Product**: A merchandise item in the UrbanNook catalog stored in MongoDB, identified by a UUID v7 productId and a human-readable uiProductId (format: UN-PROD-{number})
- **Product_Model**: The Mongoose schema and model defining the Product document structure in MongoDB
- **Order_Model**: The Mongoose schema and model defining the Order document structure in MongoDB
- **Waitlist_Model**: The Mongoose schema and model defining the Waitlist user document structure in MongoDB
- **Admin_Model**: The Mongoose schema and model defining the Admin user document structure in MongoDB
- **Dashboard**: The main overview page on the frontend displaying summary statistics and quick navigation actions
- **Product_Manager**: The frontend component responsible for listing, creating, and editing products
- **Waitlist_View**: The frontend component displaying users who have joined the platform waitlist
- **Orders_View**: The frontend component displaying and managing customer orders
- **Sidebar**: The persistent navigation component visible on desktop layouts
- **Mobile_Drawer**: The slide-out navigation menu used on mobile viewports
- **Toast_Notification**: A transient UI message providing feedback on user actions (success, error, info)

## Requirements

### Requirement 1: Backend — Database Models and Connection

**User Story:** As a developer, I want well-defined database models and a reliable MongoDB connection, so that the application can persist and retrieve data correctly.

#### Acceptance Criteria

1. THE Backend_API SHALL connect to a MongoDB database named "un" using Mongoose and log a confirmation message on successful connection
2. IF the MongoDB connection fails, THEN THE Backend_API SHALL log the error and terminate the process
3. THE Product_Model SHALL define fields: productName (String, required, unique), productId (String, required, unique), uiProductId (String, required, unique), productImg (String, required, unique), productDes (String, required), sellingPrice (Number, required, minimum 10), productCategory (String, required), productQuantity (Number, default 0), productStatus (String, enum: in_stock, out_of_stock, discontinued), tags (Array of Strings, enum: featured, new_arrival, best_seller, trending), isPublished (Boolean), productSubDes (String, optional), productSubCategory (String, optional), with timestamps enabled
4. THE Order_Model SHALL define fields: userId (String), orderId (String, unique), items (Array of objects with productId, productSnapshot containing productName, productImg, quantity, productCategory, productSubCategory, priceAtPurchase), amount (Number), deliveryAddress (object with addressId, formattedAddress, lat, long), payment (object with razorpayOrderId, razorpayPaymentId, razorpaySignature), status (String, enum: CREATED, PAID, FAILED), with timestamps enabled
5. THE Waitlist_Model SHALL define fields: userName (String, required), userEmail (String, required, unique), joinedAt (Date, default to current date), with timestamps enabled
6. THE Admin_Model SHALL define fields: email (String, required, unique), password (String, required, hashed), with timestamps enabled

### Requirement 2: Backend — Admin Authentication API

**User Story:** As an Admin_User, I want secure login and logout endpoints, so that I can authenticate with the Admin_Panel.

#### Acceptance Criteria

1. WHEN a POST request is sent to /admin/login with valid email and password, THE Backend_API SHALL verify the credentials against the Admin_Model, generate a JWT token, set it as an httpOnly cookie named adminAccessToken, and return a response containing userEmail and adminAccessToken in the data field
2. WHEN a POST request is sent to /admin/login with invalid credentials, THE Backend_API SHALL return a 401 response with an appropriate error message
3. WHEN a POST request is sent to /admin/logout with a valid auth token, THE Backend_API SHALL clear the adminAccessToken cookie and return a success response
4. THE Auth_Middleware SHALL extract the JWT token from the adminAccessToken cookie or the Authorization Bearer header and verify it before allowing access to protected routes
5. IF the Auth_Middleware receives a request without a valid token, THEN THE Backend_API SHALL return a 401 response with message "Authentication token missing"

### Requirement 3: Backend — Product Management API

**User Story:** As an Admin_User, I want API endpoints to create, read, and update products, so that I can manage the product catalog.

#### Acceptance Criteria

1. WHEN a GET request is sent to /admin/total/products with valid auth, THE Backend_API SHALL return all products from the database sorted by createdAt descending
2. WHEN a POST request is sent to /admin/add/inventory with valid auth and product data, THE Backend_API SHALL auto-generate a UUID v7 for productId, auto-generate the next sequential uiProductId in format UN-PROD-{number}, create the product in the database, and return the created product
3. WHEN a POST request is sent to /admin/update/inventory/:productId with valid auth, THE Backend_API SHALL update only the provided fields for the matching product and return the updated product
4. WHEN a product update request includes action: "add" with a productQuantity value, THE Backend_API SHALL increment the existing productQuantity by the provided value
5. WHEN a product update request includes action: "sub" with a productQuantity value, THE Backend_API SHALL decrement the existing productQuantity by the provided value
6. WHEN a GET request is sent to /products with optional query params (limit, currentPage, search, status, category, subCategory), THE Backend_API SHALL return a paginated and filtered list of products with pagination metadata including totalProducts, currentPage, and totalPages
7. WHEN a GET request is sent to /product/:productId, THE Backend_API SHALL return the single product matching the provided productId
8. WHEN a GET request is sent to /products/homepage, THE Backend_API SHALL return products grouped by tags: featured, new_arrival, best_seller, and trending, with a maximum of 2 products per tag group

### Requirement 4: Backend — Waitlist API

**User Story:** As an Admin_User, I want an API endpoint to view waitlist users, so that I can track platform interest.

#### Acceptance Criteria

1. WHEN a GET request is sent to /admin/joined/waitlist with valid auth, THE Backend_API SHALL return the list of all waitlist users and the total count of waitlist users

### Requirement 5: Backend — Orders API

**User Story:** As an Admin_User, I want an API endpoint to view all orders, so that I can monitor sales and fulfillment.

#### Acceptance Criteria

1. WHEN a GET request is sent to /admin/orders with valid auth, THE Backend_API SHALL return all orders from the database sorted by createdAt descending

### Requirement 6: Backend — API Response Format

**User Story:** As a developer, I want consistent API response formatting, so that the frontend can reliably parse all responses.

#### Acceptance Criteria

1. THE Backend_API SHALL return all successful responses in the format: { statusCode: number, message: string, data: object, success: true }
2. THE Backend_API SHALL return all error responses in the format: { statusCode: number, message: string, data: null, success: false }
3. THE Backend_API SHALL enable CORS with credentials support and configure cookie-parser for handling authentication cookies

### Requirement 7: Frontend — Authentication UI

**User Story:** As an Admin_User, I want a login page and authentication flow, so that I can securely access the Admin_Panel.

#### Acceptance Criteria

1. WHEN an Admin_User submits valid credentials on the login form, THE Frontend_App SHALL send a POST request to /admin/login with email and password, and navigate to the Dashboard upon receiving a successful response
2. WHEN the Backend_API returns an error response to a login attempt, THE Frontend_App SHALL display the error message in a Toast_Notification and remain on the login page
3. WHEN an Admin_User clicks the logout action, THE Frontend_App SHALL send a POST request to /admin/logout with the userEmail, clear the adminAccessToken cookie on the client side, and navigate to the login page
4. WHILE the login form is being submitted, THE Frontend_App SHALL display a loading indicator on the submit button and disable the form inputs to prevent duplicate submissions

### Requirement 8: Frontend — Route Protection

**User Story:** As an Admin_User, I want protected routes to require authentication, so that unauthorized users cannot access admin functionality.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access any protected route, THE Auth_Guard SHALL redirect the user to the login page
2. WHEN the API_Client receives a 401 status code response from any authenticated request, THE Frontend_App SHALL clear the adminAccessToken cookie and redirect the Admin_User to the login page
3. WHEN an authenticated Admin_User navigates to the login page, THE Auth_Guard SHALL redirect the Admin_User to the Dashboard

### Requirement 9: Frontend — API Client Configuration

**User Story:** As a developer, I want a centralized API client configuration, so that all HTTP requests use consistent settings and error handling.

#### Acceptance Criteria

1. THE API_Client SHALL use the VITE_API_BASE_URL environment variable as the base URL for all requests
2. THE API_Client SHALL include withCredentials: true in every request to support cookie-based authentication
3. WHEN the API_Client receives a 401 response, THE API_Client SHALL trigger a redirect to the login page and clear the adminAccessToken cookie via a response interceptor
4. WHEN the API_Client sends an authenticated request, THE API_Client SHALL include the adminAccessToken as a Bearer token in the Authorization header

### Requirement 10: Frontend — Dashboard

**User Story:** As an Admin_User, I want to see a summary of key metrics on the dashboard, so that I can quickly assess the state of the platform.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Frontend_App SHALL fetch and display the total number of products, total number of orders, and total number of waitlist users as summary cards
2. WHEN any Dashboard data fetch fails, THE Frontend_App SHALL display an error Toast_Notification and show a fallback state on the affected card
3. THE Dashboard SHALL display quick-action cards that navigate to the Products, Orders, and Waitlist management pages
4. THE Dashboard SHALL render in a responsive grid layout that adapts from a single column on mobile to multiple columns on desktop

### Requirement 11: Frontend — Product Listing

**User Story:** As an Admin_User, I want to view all products in the inventory, so that I can monitor and manage the product catalog.

#### Acceptance Criteria

1. WHEN the Product_Manager page loads, THE Frontend_App SHALL fetch all products from GET /admin/total/products and display them sorted by creation date descending
2. THE Product_Manager SHALL display each product with its thumbnail image, productName, uiProductId, sellingPrice, productCategory, productStatus, and productQuantity
3. THE Product_Manager SHALL display a color-coded status badge for each product: green for in_stock, yellow for out_of_stock, and red for discontinued
4. WHILE product data is being fetched, THE Product_Manager SHALL display a loading indicator
5. WHEN the product fetch fails, THE Product_Manager SHALL display an error message with a retry option

### Requirement 12: Frontend — Product Creation

**User Story:** As an Admin_User, I want to add new products to the inventory, so that I can expand the product catalog.

#### Acceptance Criteria

1. WHEN an Admin_User submits the Add Product form with valid data, THE Product_Manager SHALL send a POST request to /admin/add/inventory with productName, productImg, productDes, sellingPrice, productCategory, productQuantity, productStatus, tags, productSubDes, and productSubCategory
2. THE Product_Manager SHALL NOT include productId or uiProductId in the create request body
3. THE Product_Manager SHALL validate that sellingPrice is a number greater than or equal to 10 before submission
4. THE Product_Manager SHALL validate that productName, productImg, productDes, sellingPrice, productCategory, and productStatus are provided before allowing submission
5. WHEN a product is successfully created, THE Product_Manager SHALL display a success Toast_Notification and refresh the product list
6. WHEN the productImg URL is entered, THE Product_Manager SHALL display a preview of the image below the input field
7. THE Product_Manager SHALL provide selectable options for productStatus (in_stock, out_of_stock, discontinued) and tags (featured, new_arrival, best_seller, trending) as multi-select inputs

### Requirement 13: Frontend — Product Editing

**User Story:** As an Admin_User, I want to edit existing products, so that I can keep product information accurate and up to date.

#### Acceptance Criteria

1. WHEN an Admin_User submits the Edit Product form, THE Product_Manager SHALL send a POST request to /admin/update/inventory/:productId containing only the fields that have changed
2. WHEN an Admin_User increments or decrements product quantity, THE Product_Manager SHALL send the request with action: "add" or action: "sub" along with the productQuantity delta value
3. WHEN a product is successfully updated, THE Product_Manager SHALL display a success Toast_Notification and refresh the product data
4. THE Product_Manager SHALL pre-populate the edit form with the current product data
5. IF the product update request fails, THEN THE Product_Manager SHALL display the error message in a Toast_Notification and retain the form data

### Requirement 14: Frontend — Waitlist Management

**User Story:** As an Admin_User, I want to view all users who joined the waitlist, so that I can track interest in the platform.

#### Acceptance Criteria

1. WHEN the Waitlist_View page loads, THE Frontend_App SHALL fetch data from GET /admin/joined/waitlist and display the list of waitlist users
2. THE Waitlist_View SHALL display each user's userName, userEmail, and joinedAt date
3. THE Waitlist_View SHALL display the total count of waitlist users
4. WHILE waitlist data is being fetched, THE Waitlist_View SHALL display a loading indicator
5. WHEN the waitlist fetch fails, THE Waitlist_View SHALL display an error message with a retry option

### Requirement 15: Frontend — Orders Management

**User Story:** As an Admin_User, I want to view and inspect customer orders, so that I can monitor sales and order fulfillment.

#### Acceptance Criteria

1. WHEN the Orders_View page loads, THE Frontend_App SHALL fetch orders from GET /admin/orders and display them in a list
2. THE Orders_View SHALL display each order's orderId, customer information, items summary, total amount, payment status, and order date
3. THE Orders_View SHALL display color-coded status badges for payment status: green for PAID, yellow for CREATED, and red for FAILED
4. WHEN an Admin_User clicks on an order row, THE Orders_View SHALL expand the row to show full order details including individual items with product snapshots and delivery address
5. WHILE order data is being fetched, THE Orders_View SHALL display a loading indicator
6. WHEN the orders fetch fails, THE Orders_View SHALL display an error message with a retry option

### Requirement 16: Frontend — Layout and Navigation

**User Story:** As an Admin_User, I want a consistent navigation layout, so that I can easily move between different sections of the Admin_Panel.

#### Acceptance Criteria

1. THE Frontend_App SHALL display a Sidebar on desktop viewports containing navigation links to Dashboard, Products, Waitlist, Orders, and a Logout action
2. THE Sidebar SHALL display "UrbanNook Admin" branding at the top
3. THE Sidebar SHALL visually highlight the currently active route
4. WHEN the viewport width is below the desktop breakpoint, THE Frontend_App SHALL replace the Sidebar with a top header containing a hamburger menu icon
5. WHEN the hamburger menu icon is clicked, THE Frontend_App SHALL open a Mobile_Drawer containing the same navigation links as the Sidebar
6. THE Frontend_App SHALL use a minimal black, white, and gray color theme with Lucide React icons for navigation items

### Requirement 17: Frontend — Toast Notification System

**User Story:** As an Admin_User, I want to receive visual feedback on my actions, so that I know whether operations succeeded or failed.

#### Acceptance Criteria

1. WHEN an operation succeeds, THE Frontend_App SHALL display a success Toast_Notification with the relevant message
2. WHEN an operation fails, THE Frontend_App SHALL display an error Toast_Notification with the error message from the API response
3. THE Toast_Notification SHALL automatically dismiss after a configurable duration
4. THE Toast_Notification SHALL support manual dismissal by the Admin_User
