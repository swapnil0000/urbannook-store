# Implementation Plan: Product Specifications

## Overview

This implementation adds flexible product specifications (key-value pairs) to the UrbanNook admin panel. The feature involves updating the MongoDB Product schema, modifying backend API endpoints, and enhancing both AddProductForm and EditProductForm components with dynamic specification management.

## Tasks

- [x] 1. Update Product model schema to support specifications
  - Add specifications field as an array of objects with key and value properties
  - Set default to empty array
  - Make field optional (not required)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.1 Write property test for specification persistence round trip
  - **Property 1: Specification Persistence Round Trip**
  - **Validates: Requirements 1.2, 10.1, 10.3**

- [x] 1.2 Write property test for specification order preservation
  - **Property 2: Specification Order Preservation**
  - **Validates: Requirements 1.4, 8.1, 8.4**

- [x] 2. Update backend API endpoints to handle specifications
  - [x] 2.1 Modify POST /admin/add/inventory endpoint
    - Accept optional specifications array in request body
    - Validate that each specification has both key and value
    - Store specifications with the product
    - _Requirements: 10.1, 10.4_
  
  - [x] 2.2 Modify POST /admin/update/inventory/:productId endpoint
    - Accept optional specifications array in request body
    - Replace existing specifications when provided
    - Preserve existing specifications when not provided
    - _Requirements: 10.2, 10.5_
  
  - [x] 2.3 Verify GET /admin/inventory includes specifications
    - Ensure specifications array is included in product responses
    - _Requirements: 10.3_

- [x] 2.4 Write property test for backend update replaces specifications
  - **Property 13: Backend Update Replaces Specifications**
  - **Validates: Requirements 10.2**

- [x] 2.5 Write property test for backend preserves specifications when not provided
  - **Property 14: Backend Preserves Specifications When Not Provided**
  - **Validates: Requirements 10.5**

- [x] 2.6 Write unit tests for backend API endpoints
  - Test create product with valid specifications
  - Test create product without specifications
  - Test update product with new specifications
  - Test update without specifications field preserves existing
  - Test invalid specification format returns 400 error
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement specification management in AddProductForm
  - [x] 4.1 Add specifications state with initial empty row
    - Initialize state with [{ key: "", value: "" }]
    - _Requirements: 2.1, 9.2_
  
  - [x] 4.2 Implement handleSpecificationChange function
    - Update specific specification's key or value by index
    - _Requirements: 2.3_
  
  - [x] 4.3 Implement addSpecificationField function
    - Append new empty specification object to array
    - _Requirements: 2.2, 2.4_
  
  - [x] 4.4 Implement removeSpecificationField function
    - Remove specification at given index
    - Prevent removal if only one empty specification remains
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 4.5 Update buildCreatePayload to filter and include specifications
    - Filter out specifications where key or value is empty after trimming
    - Trim whitespace from keys and values
    - Only include specifications array if at least one valid entry exists
    - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4_
  
  - [x] 4.6 Add Product Specifications UI section
    - Add section label "Product Specifications"
    - Render specification rows with key and value inputs side by side
    - Add "Remove" button (X icon) for each row
    - Add "Add Specification" button (+ icon with text) at bottom
    - Style section to be visually distinct
    - _Requirements: 2.1, 2.2, 3.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4.7 Write property test for add specification increases count
  - **Property 3: Add Specification Increases Count**
  - **Validates: Requirements 2.2, 2.4, 5.3**

- [ ] 4.8 Write property test for remove specification decreases count
  - **Property 4: Remove Specification Decreases Count**
  - **Validates: Requirements 3.2, 6.2**

- [ ] 4.9 Write property test for remove preserves order
  - **Property 5: Remove Preserves Order**
  - **Validates: Requirements 3.4, 8.3**

- [ ] 4.10 Write property test for incomplete specifications filtered
  - **Property 6: Incomplete Specifications Filtered**
  - **Validates: Requirements 4.1, 4.2, 4.4, 2.5**

- [ ] 4.11 Write property test for whitespace trimming
  - **Property 7: Whitespace Trimming**
  - **Validates: Requirements 4.4**

- [ ] 4.12 Write property test for duplicate keys allowed
  - **Property 8: Duplicate Keys Allowed**
  - **Validates: Requirements 4.5**

- [ ] 4.13 Write property test for new specifications appended
  - **Property 12: New Specifications Appended**
  - **Validates: Requirements 8.2**

- [ ] 4.14 Write property test for each specification row has remove button
  - **Property 15: Each Specification Row Has Remove Button**
  - **Validates: Requirements 3.1, 6.1**

- [ ] 4.15 Write unit tests for AddProductForm specifications
  - Test initial render with empty specification row
  - Test add specification button creates empty row
  - Test remove specification button removes correct row
  - Test cannot remove last empty specification
  - Test specification input changes update state correctly
  - Test form submission includes only non-empty specifications
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 9.2_

- [ ] 5. Checkpoint - Ensure AddProductForm tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement specification management in EditProductForm
  - [ ] 6.1 Initialize specifications state from product data
    - Use existing specifications if available, otherwise single empty row
    - _Requirements: 5.1, 9.1_
  
  - [ ] 6.2 Implement handleSpecificationChange function
    - Update specific specification's key or value by index
    - Same implementation as AddProductForm
    - _Requirements: 5.4_
  
  - [ ] 6.3 Implement addSpecificationField function
    - Append new empty specification object to array
    - Same implementation as AddProductForm
    - _Requirements: 5.2, 5.3_
  
  - [ ] 6.4 Implement removeSpecificationField function
    - Remove specification at given index
    - Allow removal of all specifications (can result in empty array)
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [ ] 6.5 Update getChangedFields to compare specifications
    - Compare specifications arrays using JSON.stringify after filtering empty entries
    - Include specifications in changed object if arrays differ
    - _Requirements: 5.5, 6.3_
  
  - [ ] 6.6 Add Product Specifications UI section
    - Add section label "Product Specifications"
    - Render specification rows with key and value inputs side by side
    - Pre-populate with existing specifications
    - Add "Remove" button (X icon) for each row
    - Add "Add Specification" button (+ icon with text) at bottom
    - Style section to be visually distinct
    - _Requirements: 5.1, 5.2, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 6.7 Write property test for edit form displays all specifications
  - **Property 9: Edit Form Displays All Specifications**
  - **Validates: Requirements 5.1**

- [ ] 6.8 Write property test for specification modification updates state
  - **Property 10: Specification Modification Updates State**
  - **Validates: Requirements 5.4**

- [ ] 6.9 Write property test for modified specifications included in update
  - **Property 11: Modified Specifications Included in Update**
  - **Validates: Requirements 5.5, 6.3**

- [ ] 6.10 Write unit tests for EditProductForm specifications
  - Test initial render with existing specifications
  - Test initial render with no specifications shows empty row
  - Test add specification button creates empty row
  - Test remove specification button removes correct row
  - Test can remove all specifications
  - Test specification input changes update state correctly
  - Test form submission includes updated specifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 9.1, 9.3_

- [ ] 7. Checkpoint - Ensure EditProductForm tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Integration testing and final verification
  - [ ] 8.1 Write integration tests for complete specification flow
    - Test create product with specifications via API, verify in database
    - Test update product specifications via API, verify changes persisted
    - Test edit form loads existing specifications correctly
    - Test add form submits specifications correctly
    - Test remove all specifications from product via edit form
    - _Requirements: 1.2, 2.5, 5.1, 5.5, 6.3, 10.1, 10.2, 10.3_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run minimum 100 iterations each
- Use fast-check or similar property-based testing library for JavaScript
- Checkpoints ensure incremental validation throughout implementation
- The implementation follows existing codebase patterns (Tailwind CSS, React hooks, axios)
- Specifications are stored as flexible key-value pairs to support any product attribute
