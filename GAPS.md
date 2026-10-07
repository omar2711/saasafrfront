# Frontend / Backend Gaps

This document records fields or features where a mismatch exists between the frontend UI and the backend API.

---

## 1. Caja Chica (`/ventas/caja-chica`)

**Status:** Frontend only — no backend module.

The caja-chica page displays income/expense transactions from `mockPettyCashTransactions`. There is no corresponding backend module or database table for petty cash.

**Fields used in frontend:**
- `id`, `type` (income | expense), `description`, `category`, `reference`, `amount`, `createdAt`

**Action required:** Create a `petty_cash` backend module (NestJS) with a PostgreSQL table if this feature is needed in production.

---

## 2. Reportes (`/reportes`)

**Status:** Frontend only — no dedicated backend endpoint.

The reports page is static/mock. The backend has no `/operations/reports` or equivalent endpoint.

**To implement:** Aggregate data from:
- `GET /operations/sales` — revenue totals
- `GET /operations/purchases/orders` — cost totals
- `GET /operations/inventory/stock` — stock value
- `GET /operations/quotes` — conversion rates

---

## 3. Backend fields not exposed in frontend

### Quotes: `customerId` (FK)
- Backend: `quotes.customer_id` (UUID FK to `customers` table)
- Frontend: sends inline `clientName`, `clientEmail`, `clientPhone` — no customer lookup
- Gap: the `customerId` FK remains unused from the frontend

### Sales: `customerId` (FK)
- Same as quotes above

### Purchase Orders: `discountTotal`
- Backend accepts `discountTotal` in create/update DTO
- Frontend: no discount field in the order creation form
- Gap: `discountTotal` is always 0 from frontend

### Purchase Orders: `orderedAt`
- Backend accepts an `orderedAt` timestamp
- Frontend: no date picker for this field; always uses server default

### Products: `description` in inventory page
- Backend stores `description` on the product
- Inventory page (`/operativo/inventario`) shows description from the product list, but the filter does not search by description

---

## 4. Organization context still uses mock data

The `OrganizationProvider` in `contexts/organization-context.tsx` still loads branches and organization from `lib/mock-data.ts`. This means:

- `currentBranch.id` will be a mock ID (`branch-1`) until connected to a real org/branches API
- Pages that require `branchId` (ordenes-compra, cotizaciones, pos, inventario) will pass the mock ID to the backend, causing UUID validation errors

**Action required:** Update `OrganizationProvider` to call the backend branches endpoint (e.g., `GET /mi-tienda/branches`) and load real branch data after login.
