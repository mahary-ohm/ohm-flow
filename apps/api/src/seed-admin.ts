import "dotenv/config";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "./db.js";

const input = z.object({ email: z.string().email(), firstName: z.string().min(1), lastName: z.string().min(1), password: z.string().min(16) }).parse({ email: process.env.ADMIN_EMAIL, firstName: process.env.ADMIN_FIRST_NAME, lastName: process.env.ADMIN_LAST_NAME, password: process.env.ADMIN_PASSWORD });
const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
try {
	const admin = await prisma.user.upsert({
		where: { email: input.email.toLowerCase() },
		update: {},
		create: { email: input.email.toLowerCase(), firstName: input.firstName, lastName: input.lastName, passwordHash, role: "ADMIN" },
	});
	console.log(`Administrateur initialise: ${admin.email}`);
} finally {
	await prisma.$disconnect();
}
