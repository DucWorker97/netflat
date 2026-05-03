import { PrismaClient } from '@prisma/client';
import { normalizeS3AssetUrl } from '../src/common/utils/storage-url';

const prisma = new PrismaClient();

type CliOptions = {
    dryRun: boolean;
    limit?: number;
    baseUrl?: string;
    bucket?: string;
};

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = { dryRun: false };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--dry-run') {
            options.dryRun = true;
            continue;
        }

        if (arg === '--limit') {
            const next = argv[i + 1];
            const parsed = Number.parseInt(next ?? '', 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                options.limit = parsed;
                i += 1;
            }
            continue;
        }

        if (arg === '--base-url') {
            const next = argv[i + 1];
            if (next) {
                options.baseUrl = next;
                i += 1;
            }
            continue;
        }

        if (arg === '--bucket') {
            const next = argv[i + 1];
            if (next) {
                options.bucket = next;
                i += 1;
            }
        }
    }

    return options;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const bucket = options.bucket || process.env.S3_BUCKET || 'netflat-media';
    const s3PublicBaseUrl = options.baseUrl || process.env.S3_PUBLIC_BASE_URL || 'http://localhost:9002/netflat-media';

    const movies = await prisma.movie.findMany({
        where: { posterUrl: { not: null } },
        select: { id: true, title: true, posterUrl: true },
        orderBy: { createdAt: 'asc' },
        take: options.limit,
    });

    let scanned = 0;
    let changed = 0;

    console.log(`[poster-migrate] Target base: ${s3PublicBaseUrl}`);
    console.log(`[poster-migrate] Dry run: ${options.dryRun}`);
    console.log(`[poster-migrate] Rows loaded: ${movies.length}`);

    for (const movie of movies) {
        scanned += 1;
        const current = movie.posterUrl;
        const next = normalizeS3AssetUrl(current, s3PublicBaseUrl, bucket);

        if (!current || !next || current === next) {
            continue;
        }

        changed += 1;
        console.log(`[poster-migrate] ${movie.id} | ${movie.title}`);
        console.log(`  from: ${current}`);
        console.log(`  to  : ${next}`);

        if (!options.dryRun) {
            await prisma.movie.update({
                where: { id: movie.id },
                data: { posterUrl: next },
            });
        }
    }

    console.log(`[poster-migrate] Scanned: ${scanned}`);
    console.log(`[poster-migrate] Rewritten: ${changed}`);
    console.log(`[poster-migrate] Done.`);
}

main()
    .catch((error) => {
        console.error('[poster-migrate] Failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
