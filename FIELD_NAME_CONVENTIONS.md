# Field Name Conventions

This document outlines the naming conventions used throughout the FinTrack application to help maintain consistency and avoid confusion.

## Database Schema vs UI State Naming

Our application deals with two different naming patterns:

1. **Database Schema**: Uses `name` and `type` columns in the `categories` table
2. **UI and API**: Uses `category_name` and `category_type` in joined queries and UI components

### Transaction Data Flow

When data flows through the application:

1. The database stores category data with `name` and `type` fields.
2. Our SQL view `transaction_details` maps these as `category_name` and `category_type` in joined queries.
3. The TypeScript `Transaction` interface receives these fields as `category_name` and `category_type`.
4. When editing a transaction in UI components like `TransactionRow.tsx`, we use local variables with the database naming pattern (`name` and `type`) for interface clarity.

### Naming Guidelines

- **Database Operations**: Use `name` and `type` when directly interacting with the categories table
- **UI State**: Use `name` and `type` for local state variables dealing with category data
- **API/Services**: Maintain `category_name` and `category_type` fields in service responses to match the `Transaction` interface

Following these conventions helps reduce confusion and maintains a clear separation between database field names and UI-centric properties. 