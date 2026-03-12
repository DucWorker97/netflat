import {
    parseBoolean,
    parseDurationToMilliseconds,
    splitCsv,
} from './config-parsers';

type EnvRecord = Record<string, unknown>;

const BOOLEAN_KEYS = [
    'CORS_CREDENTIALS',
] as const;

const DURATION_KEYS = [
    ['JWT_EXPIRES_IN', '15m'],
    ['JWT_REFRESH_EXPIRES_IN', '7d'],
] as const;

export function validateEnvironment(config: EnvRecord): EnvRecord {
    const errors: string[] = [];

    const env = config as Record<string, string | undefined>;

    const requiredKeys = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    for (const key of requiredKeys) {
        const value = env[key]?.trim();
        if (!value) {
            errors.push(`${key} is required`);
        }
    }

    for (const [key, fallback] of DURATION_KEYS) {
        const value = env[key] || fallback;
        try {
            parseDurationToMilliseconds(value, key);
        } catch (error) {
            errors.push((error as Error).message);
        }
    }

    for (const key of BOOLEAN_KEYS) {
        const raw = env[key];
        if (!raw) continue;
        try {
            parseBoolean(raw, key);
        } catch (error) {
            errors.push((error as Error).message);
        }
    }

    const corsOrigins = splitCsv(env.CORS_ORIGINS);
    for (const origin of corsOrigins) {
        if (origin === '*') continue;
        try {
            const parsed = new URL(origin);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                errors.push(`CORS_ORIGINS contains non-http origin: ${origin}`);
            }
        } catch {
            errors.push(`CORS_ORIGINS contains invalid URL: ${origin}`);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
    }

    return config;
}
