# Inventory & Billing System (Spring Boot + React)

Full stack app for small shops: products, stock in/out, GST billing (POS), invoice PDF,
credit dues, low-stock alerts, reports with Excel export and an Admin panel.

## Logins (created automatically on first run)
| Role  | Username | Password  | Can do |
|-------|----------|-----------|--------|
| Admin | admin    | admin123  | Everything: add / edit / delete products, categories, suppliers, stock in, stock adjust, reports, staff accounts |
| Staff | staff    | staff123  | Billing, invoices, customers, view products and dashboard only |

Change these passwords from Admin panel > Staff accounts after the first login.

## Requirements
Java 17, Maven 3.9+ (or the VS Code Java + Spring Boot extensions), MySQL 8, Node 18+

## Run the backend
1. Start MySQL. Database `inventory_db` is created automatically.
2. Set your MySQL password in `backend/src/main/resources/application.properties`
   (or set env vars `DB_USERNAME`, `DB_PASSWORD`). Default is root / root.
3. In a terminal:
   ```
   cd backend
   mvn spring-boot:run
   ```
   (In VS Code you can also open `InventoryApplication.java` and click Run.)
4. API runs on http://localhost:8080. Swagger docs: http://localhost:8080/swagger-ui.html

## Run the frontend
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 . Requests to /api are proxied to port 8080.
Optional: copy `.env.example` to `.env` to set your shop name.

## Where is what
- Shop name/address/GSTIN on the invoice PDF: `app.shop.*` in application.properties
- Low stock email: set `app.low-stock.enabled=true`, `app.low-stock.to`, and the `spring.mail.*` lines (Gmail App Password). Schedule: `app.low-stock.cron` (default 9 AM daily). Dashboard warning works without email.
- Permissions: `@PreAuthorize("hasRole('ADMIN')")` on admin controllers (ProductController create/update/delete etc.)

## Upgrading an existing database (decimal quantities)
Quantities now support decimals (0.5 kg, 250 g, 1.25 L). If you already ran an older version and want to KEEP your bills,
run `backend/migration-decimal-quantity.sql` once before starting the backend.
If you have only test data, simply drop the database instead: `DROP DATABASE inventory_db;`

## Selling loose items (kg / litre)
Admin > Products > Edit > "Sold by (unit)" = kg or litre, and set the price per kg / litre.
In New bill, type 0.5 or tap the 250 g / 500 g / 750 g / 1 kg buttons. Pieces, packs and dozens accept whole numbers only.

## Bill history
Sidebar > Bill history: search by invoice no. or customer, filter by Today / Last 7 days / This month / custom dates.
Bills without a customer (walk-in) are included.

## Notes
- Deleting a product hides it (soft delete) so old invoices still show it.
- Stock changes only through purchases, sales or Admin > Stock history > Adjust stock, so every change is logged.
- Two cashiers selling the same item at once: product has `@Version`, the second gets a "try again" message instead of wrong stock.
- Not included yet (as requested): automated tests and deployment (Docker / Render).
