import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GenresModule } from './genres/genres.module';
import { MoviesModule } from './movies/movies.module';
import { FavoritesModule } from './favorites/favorites.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { RatingsModule } from './ratings/ratings.module';
import { ActorsModule } from './actors/actors.module';
import { HistoryModule } from './history/history.module';
import { EncodeModule } from './encode/encode.module';
import { MailModule } from './mail/mail.module';
import securityConfig from './config/security.config';
import { validateEnvironment } from './config/env.validation';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            expandVariables: true,
            envFilePath: ['../../.env', '.env'],
            load: [securityConfig],
            validate: validateEnvironment,
        }),
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                connection: {
                    host: new URL(cfg.get<string>('REDIS_URL') || 'redis://localhost:6379').hostname,
                    port: parseInt(new URL(cfg.get<string>('REDIS_URL') || 'redis://localhost:6379').port || '6379', 10),
                },
            }),
        }),
        ThrottlerModule.forRoot([{
            ttl: 60_000,
            limit: 20,
        }]),
        PrismaModule,
        CommonModule,
        MailModule,
        AuthModule,
        UsersModule,
        GenresModule,
        MoviesModule,
        FavoritesModule,
        UploadModule,
        AdminModule,
        RatingsModule,
        ActorsModule,
        HistoryModule,
        EncodeModule,
    ],
    controllers: [HealthController],
})
export class AppModule {}
