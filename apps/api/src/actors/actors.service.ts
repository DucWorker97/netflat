import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActorsService {
    constructor(private prisma: PrismaService) { }

    /** Autocomplete: return actor names matching a query */
    async suggest(q: string, limit = 20): Promise<string[]> {
        const actors = await this.prisma.actor.findMany({
            where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
            orderBy: { name: 'asc' },
            take: limit,
            select: { name: true },
        });
        return actors.map((a) => a.name);
    }

    /** Ensure all names exist in the Actor dictionary, creating missing ones. Returns normalized names. */
    async syncNames(names: string[]): Promise<string[]> {
        const trimmed = [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 0))];
        if (trimmed.length === 0) return [];

        // Title-case normalization
        const normalized = trimmed.map((n) =>
            n.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        );

        const existing = await this.prisma.actor.findMany({
            where: { name: { in: normalized, mode: 'insensitive' } },
            select: { name: true },
        });
        const existingSet = new Set(existing.map((a) => a.name.toLowerCase()));

        const missing = normalized.filter((n) => !existingSet.has(n.toLowerCase()));
        if (missing.length > 0) {
            await this.prisma.actor.createMany({
                data: missing.map((name) => ({ name })),
                skipDuplicates: true,
            });
        }

        return normalized;
    }
}
