import { PrismaClient, Users_Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUser(params: {
  name: string;
  email: string;
  plainPassword: string;
  role: Users_Role;
}) {
  const passwordHash = await bcrypt.hash(params.plainPassword, 12);

  return prisma.users.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      password: passwordHash,
      Role: params.role,
    },
    create: {
      name: params.name,
      email: params.email,
      password: passwordHash,
      Role: params.role,
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