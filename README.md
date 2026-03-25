# 🏨 ICT Hotel Management System

> **Group 5** — NestJS · TypeScript · Prisma · MySQL

---

## 📋 Prerequisites

Make sure the following are installed before proceeding:

| Tool | Min Version |
|------|-------------|
| Node.js | v18+ |
| npm | v9+ |
| MySQL / MariaDB | v8+ / v10+ |
| TypeScript | v5+ |
| NestJS CLI | v10+ |

---

## 🚀 Setup Instructions

### Step 1 — Execute the SQL File

Run the provided SQL script to create the database schema.

```bash
# Option A: via terminal
mysql -u root -p < Group5_ICTHotel.sql

# Option B: inside MySQL shell
SOURCE /path/to/Group5_ICTHotel.sql;
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

### Step 3 — Initialize the Node.js Project

```bash
npm init -y
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
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "commonjs",
    "target": "es2023",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"]
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

### Step 6 — Install Prisma

```bash
sudo npm install prisma
npm install prisma

sudo npm install @prisma/client
npm install @prisma/client

sudo npm install @prisma/adapter-mariadb
npm install @prisma/adapter-mariadb
```

---

### Step 7 — Install Validation & Auth Packages

```bash
# Validation
sudo npm install class-validator class-transformer
npm install class-validator class-transformer

# Authentication
sudo npm install @nestjs/passport @nestjs/jwt passport passport-jwt passport-local
npm install @nestjs/passport @nestjs/jwt passport passport-jwt passport-local

# Auth type definitions
sudo npm install -D @types/passport-jwt @types/passport-local
npm install -D @types/passport-jwt @types/passport-local

# Password hashing
sudo npm install bcrypt
npm install bcrypt
npm install --save-dev @types/bcrypt
```

---

### Step 8 — Create the `.env` File

Create a `.env` file in the project root:

```env
DATABASE_URL="mysql://ICTHotelUser:1234@localhost:3306/Group5_ICTHotel"
```

> ⚠️ **Never commit `.env` to version control.** Add it to `.gitignore`.

---

### Step 9 — Initialize Prisma

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

### Step 10 — Pull & Push Database Schema

```bash
# Pull existing schema from the database into Prisma models
npx prisma db pull

# Push any Prisma schema changes back to the database
npx prisma db push
```

---

### Step 11 — Generate Prisma Client

```bash
sudo npx prisma generate
npx prisma generate
```

---

### Step 12 — Run the Application

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

---

## ✅ Setup Checklist

- [ ] Execute `Group5_ICTHotel.sql`
- [ ] Create MySQL user `ICTHotelUser` with password `1234`
- [ ] Grant `ALTER, CREATE, DELETE, DROP, INSERT, SELECT, UPDATE` on `Group5_ICTHotel`
- [ ] `npm init -y`
- [ ] Install TypeScript globally → `tsc --init`
- [ ] Update `tsconfig.json` (add `experimentalDecorators` & `emitDecoratorMetadata`)
- [ ] `npx tsc`
- [ ] Install NestJS CLI globally
- [ ] Install Prisma, `@prisma/client`, `@prisma/adapter-mariadb`
- [ ] Install `class-validator`, `class-transformer`, passport packages, `bcrypt`
- [ ] Create `.env` with `DATABASE_URL`
- [ ] `npx prisma init` → update `schema.prisma`
- [ ] `npx prisma db pull` → `npx prisma db push`
- [ ] `npx prisma generate`
- [ ] `npm run start:dev`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS |
| Language | TypeScript |
| ORM | Prisma |
| Database | MySQL / MariaDB |
| Auth | JWT + Passport |
| Validation | class-validator |
| Hashing | bcrypt |

