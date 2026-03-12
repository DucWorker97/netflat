import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
        where: { email: 'admin@netflat.local' },
        data: { passwordHash: hash }
    });
    console.log('âœ… Admin password reset to: admin123');
}

main()
    .catch((e) => {
        console.error('âŒ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
