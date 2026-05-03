/**
 * ===== PRISMA SERVICE - KẾT NỐI CƠ SỞ DỮ LIỆU =====
 *
 * PrismaService là lớp bọc (wrapper) quanh PrismaClient.
 * Nó quản lý vòng đời kết nối database PostgreSQL trong NestJS:
 * - Tự động kết nối khi module khởi tạo (onModuleInit)
 * - Tự động ngắt kết nối khi module bị hủy (onModuleDestroy)
 *
 * Được inject vào tất cả các service khác để thực hiện
 * các thao tác CRUD với database thông qua Prisma ORM.
 *
 * Ví dụ sử dụng:
 *   this.prisma.user.findUnique({ where: { id } })
 *   this.prisma.movie.create({ data: { title, ... } })
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {

    /**
     * Hook vòng đời: Được gọi khi NestJS khởi tạo module
     * → Tạo kết nối tới PostgreSQL thông qua DATABASE_URL trong .env
     */
    async onModuleInit() {
        await this.$connect();
        console.log('📦 Prisma connected to database');
    }

    /**
     * Hook vòng đời: Được gọi khi NestJS tắt (graceful shutdown)
     * → Đóng kết nối database an toàn, giải phóng tài nguyên
     */
    async onModuleDestroy() {
        await this.$disconnect();
    }
}
