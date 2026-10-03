# Problem 5: A Crude Server

A backend CRUD REST API built with Express.js, TypeScript, and SQLite for data persistence.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```
   Server starts on `http://localhost:3000` and automatically creates `./data/resources.db`.

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Run walkthrough demo:**
   ```bash
   npm run demo
   ```

## Configuration

Default environment variables (or define in `.env`):
- `PORT`: Server port (default: `3000`)
- `NODE_ENV`: `development` / `production` / `test` (test mode uses `:memory:` database)
- `DATABASE_PATH`: SQLite file path (default: `./data/resources.db`)

## Architecture

The project follows a standard layered architecture:
- **Routes (`src/routes/`):** Endpoint definitions, validation, and idempotency middleware.
- **Controllers (`src/controllers/`):** Request/response handling and status codes.
- **Services (`src/services/`):** Business logic and domain validations.
- **Repositories (`src/repositories/`):** Data access layer using SQLite (`better-sqlite3`).
- **DTOs (`src/dto/`):** Request schemas and type validation via Zod.
- **Middleware (`src/middleware/`):** Error handling, request ID tracing, and schema validation.

## Key Decisions & Trade-offs

- **SQLite (`better-sqlite3`):** Zero external database dependencies. WAL mode enabled for concurrent read/write operations. Tables and B-Tree indexes (`name`, `price`, `created_at`) are created automatically on startup.
- **Cursor-based Pagination:** Uses keyset pagination `(sortColumn, id)` instead of offset pagination (`OFFSET / LIMIT`). Keyset pagination prevents missing or duplicate records when rows are inserted or deleted during paging.
- **Read-Through LRU Cache:** In-memory LRU cache with a 5-second TTL on `findById` to reduce disk reads for frequently requested resources. Mutations invalidate cache entries.
- **Idempotency:** Accepts an optional `Idempotency-Key` header on POST requests with a 5-minute TTL cache, safely handling network retries without duplicate inserts.

## API Documentation

### Create Resource
```bash
curl -X POST http://localhost:3000/resources \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-key-1" \
  -d '{"name": "Mechanical Keyboard", "description": "Wireless tactile", "price": 129.99}'
```

### List Resources (with Filters, Sort, and Cursor Pagination)
```bash
curl "http://localhost:3000/resources?name=keyboard&minPrice=50&maxPrice=200&sortBy=price&sortOrder=asc&limit=10"
```

### Get Resource
```bash
curl http://localhost:3000/resources/<resource-id>
```

### Update Resource (Full)
```bash
curl -X PUT http://localhost:3000/resources/<resource-id> \
  -H "Content-Type: application/json" \
  -d '{"name": "Mechanical Keyboard Pro", "description": "Hot-swappable RGB", "price": 149.99}'
```

### Update Resource (Partial)
```bash
curl -X PATCH http://localhost:3000/resources/<resource-id> \
  -H "Content-Type: application/json" \
  -d '{"price": 139.99}'
```

### Delete Resource
```bash
curl -X DELETE http://localhost:3000/resources/<resource-id>
```
