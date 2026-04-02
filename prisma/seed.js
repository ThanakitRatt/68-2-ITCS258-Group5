const { PrismaClient, Users_Role } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcrypt');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

async function upsertUser({ name, email, plainPassword, role }) {
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  return prisma.users.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      Role: role,
    },
    create: {
      name,
      email,
      password: passwordHash,
      Role: role,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    name: 'Admin User',
    email: 'admin@example.com',
    plainPassword: 'password123',
    role: Users_Role.Admin,
  });

  const user = await upsertUser({
    name: 'John Doe',
    email: 'user@example.com',
    plainPassword: 'password123',
    role: Users_Role.User,
  });

  console.log('Seeded users:');
  console.log(`- Admin: ${admin.email}`);
  console.log(`- User: ${user.email}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
