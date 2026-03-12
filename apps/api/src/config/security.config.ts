import { registerAs } from '@nestjs/config';
import {
    parseDurationToSeconds,
    splitCsv,
} from './config-parsers';

export interface SecurityConfig {
    cors: {
        origins: string[];
        credentials: boolean;
    };
    auth: {
        jwt: {
            accessTtl: string;
            accessTtlSeconds: number;
            refreshTtl: string;
            refreshTtlSeconds: number;
        };
    };
}

const DEFAULT_CORS_ORIGINS = [
    'http://localhost:3001',
    'http://localhost:3002',
];

const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';

const securityConfig = registerAs(
    'security',
    (): SecurityConfig => {
        const accessTtl = process.env.JWT_EXPIRES_IN || DEFAULT_ACCESS_TTL;
        const refreshTtl = process.env.JWT_REFRESH_EXPIRES_IN || DEFAULT_REFRESH_TTL;

        const corsOrigins = splitCsv(process.env.CORS_ORIGINS);

        return {
            cors: {
                origins: corsOrigins.length > 0 ? corsOrigins : DEFAULT_CORS_ORIGINS,
                credentials: true,
            },
            auth: {
                jwt: {
                    accessTtl,
                    accessTtlSeconds: parseDurationToSeconds(accessTtl, 'JWT_EXPIRES_IN'),
                    refreshTtl,
                    refreshTtlSeconds: parseDurationToSeconds(refreshTtl, 'JWT_REFRESH_EXPIRES_IN'),
                },
            },
        };
    },
);

export default securityConfig;

