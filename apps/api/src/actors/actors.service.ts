import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActorsService {
    constructor(private readonly prisma: PrismaService) { }

    async suggest(query: string, limit = 10): Promise<string[]> {
        const normalizedQuery = query.trim();
        const cappedLimit = Math.min(Math.max(limit, 1), 50);

        const searchClause = normalizedQuery
            ? Prisma.sql`AND actor ILIKE ${`%${normalizedQuery}%`}`
            : Prisma.empty;

        const rows = await this.prisma.$queryRaw<Array<{ actor: string }>>(Prisma.sql`
            SELECT actor
            FROM (
                SELECT DISTINCT ON (LOWER(actor)) actor
                FROM (
                    SELECT UNNEST("actors") AS actor
                    FROM "movies"
                ) expanded
                WHERE BTRIM(actor) <> ''
                ${searchClause}
                ORDER BY LOWER(actor), actor
            ) deduped
            ORDER BY actor ASC
            LIMIT ${cappedLimit}
        `);

        return rows.map((row) => row.actor);
    }
}
