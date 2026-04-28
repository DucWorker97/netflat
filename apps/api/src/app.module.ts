/**
 * ===== APP.MODULE.TS - MODULE Gá»C Cá»¦A á»¨NG Dá»¤NG =====
 *
 * AppModule lĂ  module gá»‘c (root module) cá»§a á»©ng dá»¥ng NestJS.
 * NĂ³ Ä‘Ă³ng vai trĂ² "bá»™ nĂ£o" tá»•ng há»£p, káº¿t ná»‘i táº¥t cáº£ cĂ¡c module
 * con láº¡i vá»›i nhau thĂ nh má»™t á»©ng dá»¥ng hoĂ n chá»‰nh.
 *
 * Cáº¥u trĂºc module:
 * â”Œâ”€ ConfigModule      â†’ Quáº£n lĂ½ biáº¿n mĂ´i trÆ°á»ng (.env)
 * â”œâ”€ BullModule        â†’ HĂ ng Ä‘á»£i (queue) cho xá»­ lĂ½ ná»n (encode video)
 * â”œâ”€ ThrottlerModule   â†’ Giá»›i háº¡n tá»‘c Ä‘á»™ request (rate limiting)
 * â”œâ”€ PrismaModule      â†’ Káº¿t ná»‘i PostgreSQL qua Prisma ORM
 * â”œâ”€ CommonModule      â†’ Guards & utilities dĂ¹ng chung
 * â”œâ”€ MailModule        â†’ Gá»­i email (reset password, thĂ´ng bĂ¡o)
 * â”œâ”€ AuthModule        â†’ XĂ¡c thá»±c (Ä‘Äƒng kĂ½, Ä‘Äƒng nháº­p, JWT)
 * â”œâ”€ UsersModule       â†’ Quáº£n lĂ½ há»“ sÆ¡ ngÆ°á»i dĂ¹ng
 * â”œâ”€ GenresModule      â†’ CRUD thá»ƒ loáº¡i phim
 * â”œâ”€ MoviesModule      â†’ CRUD phim, streaming
 * â”œâ”€ FavoritesModule   â†’ Danh sĂ¡ch phim yĂªu thĂ­ch
 * â”œâ”€ UploadModule      â†’ Upload file lĂªn S3/MinIO
 * â”œâ”€ AdminModule       â†’ Trang quáº£n trá»‹ (diagnostics, quáº£n lĂ½ user)
 * â”œâ”€ RatingsModule     â†’ ÄĂ¡nh giĂ¡ & bĂ¬nh luáº­n phim
 * â”œâ”€ HistoryModule     â†’ Lá»‹ch sá»­ & tiáº¿n trĂ¬nh xem phim
 * â””â”€ EncodeModule      â†’ MĂ£ hĂ³a video thĂ nh HLS (FFmpeg)
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import securityConfig from './config/security.config';
import { validateEnvironment } from './config/env.validation';

@Module({
    imports: [
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // Cáº¤U HĂŒNH MĂ”I TRÆ¯á»œNG (Environment Configuration)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // - isGlobal: Cho phĂ©p inject ConfigService á»Ÿ báº¥t ká»³ module nĂ o
        //   mĂ  khĂ´ng cáº§n import láº¡i ConfigModule
        // - cache: Cache giĂ¡ trá»‹ Ä‘Ă£ Ä‘á»c Ä‘á»ƒ tÄƒng hiá»‡u suáº¥t
        // - expandVariables: Há»— trá»£ biáº¿n tham chiáº¿u trong .env 
        //   (VD: DATABASE_URL=$DB_HOST:$DB_PORT)
        // - envFilePath: Äá»c .env tá»« thÆ° má»¥c gá»‘c monorepo rá»“i thÆ° má»¥c con
        // - load: Náº¡p cáº¥u hĂ¬nh báº£o máº­t tĂ¹y chá»‰nh (security.config.ts)
        // - validate: Kiá»ƒm tra vĂ  xĂ¡c nháº­n táº¥t cáº£ biáº¿n mĂ´i trÆ°á»ng cáº§n thiáº¿t
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            expandVariables: true,
            envFilePath: ['../../.env', '.env'],
            load: [securityConfig],
            validate: validateEnvironment,
        }),

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // HĂ€NG Äá»¢I Xá»¬ LĂ Ná»€N (Background Job Queue - BullMQ)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // Káº¿t ná»‘i Redis Ä‘á»ƒ quáº£n lĂ½ hĂ ng Ä‘á»£i cĂ´ng viá»‡c ná»n.
        // ÄÆ°á»£c sá»­ dá»¥ng chĂ­nh cho viá»‡c encode video (FFmpeg â†’ HLS).
        // - Khi admin upload video, má»™t job Ä‘Æ°á»£c thĂªm vĂ o queue
        // - Worker (EncodeProcessor) láº¥y job ra vĂ  xá»­ lĂ½ (encode FFmpeg)
        // - Há»— trá»£ retry, backoff, vĂ  giĂ¡m sĂ¡t tiáº¿n trĂ¬nh
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                connection: {
                    // Parse URL Redis Ä‘á»ƒ láº¥y host vĂ  port káº¿t ná»‘i
                    host: new URL(cfg.get<string>('REDIS_URL') || 'redis://localhost:6379').hostname,
                    port: parseInt(new URL(cfg.get<string>('REDIS_URL') || 'redis://localhost:6379').port || '6379', 10),
                },
            }),
        }),

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // GIá»I Háº N Tá»C Äá»˜ REQUEST (Rate Limiting - Throttler)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // Cáº¥u hĂ¬nh máº·c Ä‘á»‹nh: Tá»‘i Ä‘a 20 request trong 60 giĂ¢y cho má»—i IP.
        // Chá»‘ng brute force vĂ  DDoS cÆ¡ báº£n.
        // Má»™t sá»‘ route cĂ³ cáº¥u hĂ¬nh riĂªng (VD: Ä‘Äƒng nháº­p chá»‰ 10 láº§n/phĂºt)
        ThrottlerModule.forRoot([{
            ttl: 60_000,     // Khoáº£ng thá»i gian: 60 giĂ¢y (Ä‘Æ¡n vá»‹: ms)
            limit: 20,       // Sá»‘ request tá»‘i Ä‘a trong khoáº£ng thá»i gian trĂªn
        }]),
        ScheduleModule.forRoot(),

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // CĂC MODULE NGHIá»†P Vá»¤ (Business Modules)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        PrismaModule,       // Káº¿t ná»‘i vĂ  tÆ°Æ¡ng tĂ¡c vá»›i PostgreSQL
        CommonModule,       // Guards (báº£o vá»‡ route), decorators dĂ¹ng chung
        MailModule,         // Dá»‹ch vá»¥ gá»­i email (quĂªn máº­t kháº©u, v.v.)
        AuthModule,         // XĂ¡c thá»±c: Ä‘Äƒng kĂ½, Ä‘Äƒng nháº­p, refresh token, quĂªn MK
        UsersModule,        // Há»“ sÆ¡ ngÆ°á»i dĂ¹ng: xem/sá»­a profile, Ä‘á»•i máº­t kháº©u
        GenresModule,       // Thể loại phim: CRUD (admin), xem danh sách (public)
        MoviesModule,       // Phim: CRUD (admin), tìm kiếm, streaming (user)
        ActorsModule,       // Gợi ý diễn viên từ dữ liệu movies.actors hiện có
        FavoritesModule,    // Danh sĂ¡ch yĂªu thĂ­ch: thĂªm/xĂ³a/xem phim yĂªu thĂ­ch
        UploadModule,       // Upload: táº¡o presigned URL, xĂ¡c nháº­n upload â†’ trigger encode
        AdminModule,        // Quáº£n trá»‹: diagnostics há»‡ thá»‘ng, quáº£n lĂ½ user
        RatingsModule,      // ÄĂ¡nh giĂ¡: cháº¥m Ä‘iá»ƒm & bĂ¬nh luáº­n phim

        HistoryModule,      // Lá»‹ch sá»­ xem: lÆ°u tiáº¿n trĂ¬nh, "tiáº¿p tá»¥c xem"
        EncodeModule,       // MĂ£ hĂ³a video: FFmpeg â†’ HLS (480p, 720p)
        SubscriptionsModule,
        PaymentsModule,
    ],

    // HealthController xá»­ lĂ½ endpoint /health (khĂ´ng cĂ³ prefix /api)
    // â†’ DĂ¹ng Ä‘á»ƒ monitoring kiá»ƒm tra server cĂ²n sá»‘ng khĂ´ng
    controllers: [HealthController],
})
export class AppModule {}


