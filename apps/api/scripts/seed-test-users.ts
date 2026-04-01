import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TEST_USERS, TestUserSeed } from './seed-shared';

const prisma = new PrismaClient();

async function upsertUser(user: TestUserSeed): Promise<void> {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
        where: { email: user.email },
        update: {
            passwordHash,
            role: user.role,
        },
        create: {
            email: user.email,
            passwordHash,
            role: user.role,
        },
    });
}

async function main(): Promise<void> {
    console.log(`Seeding ${TEST_USERS.length} test accounts...`);

    for (const user of TEST_USERS) {
        await upsertUser(user);
        console.log(`Upserted ${user.email} (${user.role})`);
    }

    console.log('Test account seeding completed.');
}

main()
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to seed test accounts:', message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
