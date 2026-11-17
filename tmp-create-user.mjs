import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();
const email = 'sessiontest@local.test';
const password = 'TestPassword123456!';

const existing = await prisma.user.findUnique({ where: { email } });
if (!existing) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      email,
      firstName: 'Session',
      lastName: 'Tester',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      cellId: null,
    },
  });
}

console.log(JSON.stringify({ email, password }, null, 2));
await prisma.$disconnect();
