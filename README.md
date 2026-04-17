# ICT Hotel Management System

> **Group 5** — NestJS · TypeScript · Prisma · MySQL · Redis · Docker

---

## 📋 Prerequisites

Make sure the following are installed before proceeding:

| Tool | Min Version |
|------|-------------|
| Node.js | v18+ |
| npm | v9+ |
| MySQL / MariaDB | v8+ / v10+ |
| Redis | v7+ |
| TypeScript | v5+ |
| NestJS CLI | v10+ |
| Docker | v24+ |
| Docker Compose | v2+ |

---

## 📌 Project Overview & Architecture

This project is a **Hotel Booking REST API** built with **NestJS**, designed as a production-ready backend system. It supports user authentication, room management, booking lifecycle, search, and notifications.

### Architecture Diagram

```
+----------------------------------------------------------+
|                    Client (HTTP)                         |
+---------------------------+------------------------------+
                            |
+---------------------------v------------------------------+
|                   NestJS API Server                      |
|                                                          |
|  +----------+ +----------+ +----------+ +-----------+   |
|  |   Auth   | |  Rooms   | | Bookings | |  Search   |   |
|  |  Module  | |  Module  | |  Module  | |  Module   |   |
|  +----+-----+ +----+-----+ +----+-----+ +-----+-----+   |
|       +-------------+-------------+-----------+         |
|                      |                                   |
|         +------------v-----------+                       |
|         |   Prisma ORM Layer     |                       |
|         +------------+-----------+                       |
|                      |                                   |
|   +------------------v-------------------------------+   |
|   | Guards: JwtAuthGuard, RolesGuard, ThrottlerGuard |   |
|   +-------------------------------------------------+    |
+---------------+-----------------------+------------------+
                |                       |
    +-----------v----------+  +---------v---------------+
    |   MySQL 8.0          |  |  Redis                  |
    |   Primary DB         |  |  Cache + JWT blacklist  |
    +----------------------+  +-------------------------+
```

### Module Summary

| Module | Routes | Access |
|--------|--------|--------|
| Auth | `/auth/register`, `/auth/login`, `/auth/logout` | Public + JWT |
| Users | `/users/myProfile` | JWT required |
| Rooms | `/rooms` | Admin (write), Any user (read) |
| Bookings | `/bookings` | JWT required, Admin for status update |
| Search | `/search/rooms` | JWT required |
| Notifications | `/notifications` | JWT required, Admin for all |

---

## ⚡ Performance, Caching & Rate-Limiting

### Caching Strategy

Caching is implemented using `@nestjs/cache-manager` backed by Redis.

| Endpoint | TTL | Reason |
|----------|-----|--------|
| `GET /rooms` | 30s | Frequently read, rarely changes |
| `GET /rooms/:id` | 30s | Individual room detail is popular |
| `GET /search/rooms` | 30s | Expensive DB query with filters |

Implemented using `CacheInterceptor` and `@CacheTTL(30)` decorators on GET routes. Cache is stored in Redis and expires automatically — no manual invalidation needed.

### Rate-Limiting Strategy

Rate limiting is applied globally using `ThrottlerGuard` as `APP_GUARD`.

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| Global default | 30 req | 60s | Baseline protection |
| `POST /rooms` | 10 req | 60s | Admin write protection |
| `GET /rooms` | 10 req | 60s | Prevent cache bypass |
| `POST /bookings` | 5 req | 60s | Anti-spam for bookings |
| `GET /search/rooms` | 20 req | 60s | Search query protection |

Exceeding the limit returns **HTTP 429 Too Many Requests**.

### JWT Token Blacklisting

On `POST /auth/logout`, the token is stored in Redis with TTL equal to its remaining expiry time. Every request through `JwtStrategy` checks Redis before allowing access. This ensures logged-out tokens cannot be reused.

---

## 🚀 Quick Start with Docker (Recommended)

### Step 1 — Clone the repository

```bash
git clone https://github.com/ThanakitRatt/68-2-ITCS258-Group5.git
cd 68-2-ITCS258-Group5
```

---

### Step 2 — Create the `.env` file

Create a file named `.env` in the project root:

```env
# Database
DATABASE_URL="mysql://ICTHotelUser:1234@db:3306/Group5_ICTHotel"

MYSQL_DATABASE=Group5_ICTHotel
MYSQL_USER=ICTHotelUser
MYSQL_PASSWORD=1234
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_HOST_PORT=3307

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Auth
JWT_SECRET=mysecretkey
JWT_EXPIRATION=3600

# Server
PORT=3000
```

> ⚠️ **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

### Step 3 — Build and Run

```bash
docker compose up --build
```

> The API runs on **http://localhost:3000**
> Swagger UI is available at **http://localhost:3000/api-docs**

### Stop containers

```bash
docker compose down
```

---

## 🚀 Manual Setup Instructions

### Step 1 — Execute the SQL File

Run the provided SQL script to create the database schema.

```bash
# Option A: via terminal
mysql -u root -p < Group5_ICTHotelDB.sql

# Option B: inside MySQL shell
SOURCE /path/to/Group5_ICTHotelDB.sql;
```

---

### Step 2 — Create the Database User

Run these commands inside your MySQL shell:

```sql
-- Create user
CREATE USER 'ICTHotelUser'@'localhost' IDENTIFIED BY '1234';

-- Grant privileges
GRANT ALTER, CREATE, DELETE, DROP, INSERT, SELECT, UPDATE
  ON Group5_ICTHotel.*
  TO 'ICTHotelUser'@'localhost';

-- Apply
FLUSH PRIVILEGES;
```

---

### Step 3 — Install Dependencies

```bash
npm install
```

---

### Step 4 — Install & Configure TypeScript

```bash
sudo npm install -g typescript
npm install -g typescript

tsc --init
```

Replace the contents of `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "types": ["jest", "node"]
  }
}
```

Compile to verify:

```bash
npx tsc
```

---

### Step 5 — Install NestJS CLI

```bash
sudo npm install -g @nestjs/cli
npm install -g @nestjs/cli
```

---

### Step 6 — Create the `.env` File

Create a `.env` file in the project root:

```env
DATABASE_URL="mysql://ICTHotelUser:1234@localhost:3306/Group5_ICTHotel"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=mysecretkey
JWT_EXPIRATION=3600
PORT=3000
```

> ⚠️ **Never commit `.env` to version control.** Add it to `.gitignore`.

---

### Step 7 — Initialize Prisma

```bash
npx prisma init
```

Open `prisma/schema.prisma` and ensure the datasource block looks like this:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

---

### Step 8 — Pull & Push Database Schema

```bash
# Pull existing schema from the database into Prisma models
npx prisma db pull

# Push any Prisma schema changes back to the database
npx prisma db push
```

---

### Step 9 — Generate Prisma Client

```bash
sudo npx prisma generate
npx prisma generate
```

---

### Step 10 — Install & Start Redis

```bash
brew install redis
brew services start redis
```

```bash
sudo npm install ioredis
npm install ioredis
```

> ⚠️ **macOS only.** For Linux, use `sudo apt install redis-server && sudo systemctl start redis`. For Windows, use WSL or the [Redis Windows port](https://github.com/microsoftarchive/redis/releases).

---

### Step 11 — Run the Application

```bash
# Development (with hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod

# Standard
npm run start
```

> The API runs on **http://localhost:3000** by default.
> Swagger UI is available at **http://localhost:3000/api-docs**

---

## 📖 API Usage Examples

> Base URL: `http://localhost:3000`
> All protected routes require: `Authorization: Bearer <access_token>`

### Register

```bash
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response `201 Created`:
```json
{
  "message": "User registered successfully",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" }
}
```

---

### Login

```bash
POST /auth/login
Content-Type: application/json

{ "email": "john@example.com", "password": "password123" }
```

Response `200 OK`:
```json
{ "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

---

### Logout

```bash
POST /auth/logout
Authorization: Bearer <access_token>
```

Response `200 OK`: `{ "message": "Logged out successfully" }`

---

### Get Profile

```bash
GET /users/myProfile
Authorization: Bearer <access_token>
```

Response `200 OK`:
```json
{ "id": 1, "name": "John Doe", "email": "john@example.com", "role": "User" }
```

---

### Create Room (Admin only)

```bash
POST /rooms
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Deluxe Suite",
  "description": "King bed with sea view",
  "capacity": 2,
  "price_per_night": 250.00,
  "image_url": "https://example.com/room.jpg",
  "is_active": true
}
```

Response `201 Created`: Room object with `id`.

---

### Search Available Rooms

```bash
GET /search/rooms?q=deluxe&minCapacity=2&minPrice=100&maxPrice=500
GET /search/rooms?checkIn=2026-05-01T14:00:00.000Z&checkOut=2026-05-04T12:00:00.000Z
Authorization: Bearer <access_token>
```

Response `200 OK`:
```json
{
  "data": [
    { "id": 1, "name": "Deluxe Suite", "capacity": 2, "price_per_night": "250.00" }
  ],
  "total": 1
}
```

---

### Create Booking

```bash
POST /bookings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "room_id": 1,
  "check_in_date": "2026-05-01T14:00:00.000Z",
  "check_out_date": "2026-05-04T12:00:00.000Z"
}
```

Response `201 Created`:
```json
{
  "message": "Booking created successfully",
  "booking": { "id": 1, "room_id": 1, "user_id": 1, "status": "PENDING" }
}
```

---

### Update Booking Status (Admin only)

```bash
PATCH /bookings/1/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "status": "APPROVED" }
```

Valid statuses: `PENDING` · `APPROVED` · `CANCELLED` · `PAID`

---

## 🧪 API Testing

### Test Commands

```bash
# Run unit tests
npm test

# Run E2E tests — Hotel Booking (17 flows, 104 tests)
npm run test:e2e

# Run E2E tests — Room Lifecycle (13 tests)
npm run test:e2e:rooms

# Run all E2E tests
npm run test:e2e:all
```

---

### E2E Test Setup (one-time)

#### Step 1 — Start Docker

```bash
docker compose up -d
```

---

#### Step 2 — Create the test database

```bash
docker exec -it hotel_db mysql -u root -prootpassword
```

```sql
CREATE DATABASE IF NOT EXISTS Group5_ICTHotel_Test;
GRANT ALL PRIVILEGES ON Group5_ICTHotel_Test.* TO 'ICTHotelUser'@'%';
FLUSH PRIVILEGES;
EXIT;
```

---

#### Step 3 — Push schema to test database

Windows PowerShell:
```powershell
$env:DATABASE_URL="mysql://ICTHotelUser:1234@localhost:3307/Group5_ICTHotel_Test"; npx prisma db push --schema=prisma/schema.prisma
```

macOS / Linux:
```bash
DATABASE_URL="mysql://ICTHotelUser:1234@localhost:3307/Group5_ICTHotel_Test" npx prisma db push --schema=prisma/schema.prisma
```

---

#### Step 4 — Update `.env` to use test database

```env
DATABASE_URL="mysql://ICTHotelUser:1234@localhost:3307/Group5_ICTHotel_Test"
```

---

#### Step 5 — Run tests

```bash
npm run test:e2e
```

---

### Test Results

```
--- Hotel Booking E2E ---
Test Suites : 1 passed
Tests       : 104 passed, 104 total
Time        : ~21s

--- Room Lifecycle E2E ---
Test Suites : 1 passed
Tests       : 13 passed, 13 total
Time        : ~30s
```

---

### E2E Test Coverage

| Flow | What is tested |
|------|----------------|
| Flow 1 | Health Check — API alive |
| Flow 2 | User Registration (success + 4 fail cases + DB state) |
| Flow 3 | Login — User and Admin (success + 3 fail cases) |
| Flow 4 | Protected Profile Route (JWT guard) |
| Flow 5 | Admin Room Management (CRUD + disable/enable + RBAC) |
| Flow 6 | Search Available Rooms (keyword, capacity, price, date filter) |
| Flow 7 | Booking Creation (success + 4 fail cases + DB state) |
| Flow 8 | Double Booking Prevention |
| Flow 9 | View Bookings — User and Admin + RBAC |
| Flow 10 | Admin Manage Booking Status (approve/paid + fail cases) |
| Flow 11 | Booking Cancellation (success + 3 fail cases + DB state) |
| Flow 12 | Notifications (user view + admin view) |
| Flow 13 | Logout |
| Flow 14 | Admin Create Room — Extended Fail Scenarios (9 cases) |
| Flow 15 | Admin Manage Booking — Extended Fail Scenarios (7 cases) |
| Flow 16 | Disabled Room Cannot Be Booked |
| Flow 17 | Full User Journey: register → login → search → book → approve → notify → cancel |

---

## 🐳 Deployment

### Docker Compose Architecture

```
+-------------------------------------------------+
|                 Docker Network                   |
|                                                 |
|  +-------------+  +----------+  +-----------+   |
|  |  hotel_api  |  | hotel_db |  |hotel_redis|   |
|  |  port: 3000 |<-|port: 3306|  |port: 6379 |   |
|  |  (NestJS)   |  | (MySQL)  |  |  (Redis)  |   |
|  +-------------+  +----------+  +-----------+   |
|                                                 |
|  hotel_api waits for db + redis healthcheck      |
+-------------------------------------------------+

Host port mapping:
  localhost:3000  -->  hotel_api:3000
  localhost:3307  -->  hotel_db:3306
  localhost:6379  -->  hotel_redis:6379
```

### Deployment Commands

```bash
# First time / after code changes
docker compose up --build

# Start existing containers in background
docker compose up -d

# Stop all containers
docker compose down

# View live API logs
docker compose logs -f api

# Rebuild only the API container
docker compose up --build api
```

---

### Deployment Instructions

This project is deployed on a private Mahidol University server using Docker Compose.

**Prerequisites:** - Must be connected to the Mahidol University VPN or campus network.
- Access to the faculty GitLab repository.

**Deployment Steps:**
1. SSH into the production server: `ssh student@10.34.112.154`
2. Navigate to the project directory: `cd 68-2-ITCS258-Group5`
3. Pull the latest code from the GitLab main branch: `git pull origin main`
4. Rebuild and start the services: `docker compose up -d --build`
   *(Note: The database is automatically seeded via `Group5_ICTHotelDB.sql` during the initial build).*

**Live Services:**
- Nginx / API Entrypoint: `http://10.34.112.154` (Port 80)
- Database: Running internally (Exposed securely on 3307 if remote access is required via VPN).

**Test Credentials:**
- **Role: Admin** | Email: `admin@example.com` | Password: `password123`
- **Role: User** | Email: `user@example.com` | Password: `password123`

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma connection string | Required |
| `MYSQL_DATABASE` | Database name | `Group5_ICTHotel` |
| `MYSQL_USER` | DB username | `ICTHotelUser` |
| `MYSQL_PASSWORD` | DB password | `1234` |
| `MYSQL_ROOT_PASSWORD` | Root password | `rootpassword` |
| `MYSQL_HOST_PORT` | Host port for MySQL | `3307` |
| `REDIS_HOST` | Redis hostname | `redis` (Docker) / `localhost` (local) |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRATION` | Token expiry in seconds | `3600` |
| `PORT` | API server port | `3000` |

---

## ✅ Setup Checklist

- [ ] Clone repository
- [ ] Create `.env` file with correct values
- [ ] `docker compose up --build`
- [ ] Verify API at `http://localhost:3000`
- [ ] Verify Swagger at `http://localhost:3000/api-docs`
- [ ] Create test database and push schema
- [ ] Run `npm run test:e2e` and confirm 104 tests pass

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS |
| Language | TypeScript |
| ORM | Prisma (MariaDB adapter) |
| Database | MySQL 8.0 |
| Cache + Token Blacklist | Redis |
| Auth | JWT + Passport |
| Validation | class-validator + class-transformer |
| Password Hashing | bcrypt |
| API Documentation | Swagger / OpenAPI |
| Containerization | Docker + Docker Compose |
| Testing | Jest + Supertest (Unit + E2E) |
