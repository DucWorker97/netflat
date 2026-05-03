import {
    parseBoolean,
    parseDurationToMilliseconds,
    splitCsv,
} from './config-parsers';

type EnvRecord = Record<string, unknown>;

const BOOLEAN_KEYS = [
    'CORS_CREDENTIALS',
    'VNPAY_ALLOW_RETURN_COMPLETION',
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

    const paymentProvider = (env.PAYMENT_PROVIDER || 'mock').trim();
    if (!['mock', 'vnpay'].includes(paymentProvider)) {
        errors.push('PAYMENT_PROVIDER must be one of: mock, vnpay');
    }

    const nodeEnv = (env.NODE_ENV || 'development').trim();
    const strictMockWebhookSecret = paymentProvider === 'mock'
        && (nodeEnv === 'production' || nodeEnv === 'staging');
    if (strictMockWebhookSecret && !env.MOCK_WEBHOOK_SECRET?.trim()) {
        errors.push('MOCK_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=mock in production/staging');
    }

    if (paymentProvider === 'vnpay') {
        for (const key of ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_URL', 'VNPAY_RETURN_URL']) {
            if (!env[key]?.trim()) {
                errors.push(`${key} is required when PAYMENT_PROVIDER=vnpay`);
            }
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
