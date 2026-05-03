/**
 * ===== COMMON MODULE - MODULE DÙNG CHUNG TOÀN CỤC =====
 *
 * CommonModule cung cấp các guard (bảo vệ route) dùng chung cho toàn ứng dụng.
 *
 * @Global() decorator đánh dấu module này là toàn cục:
 * → Import 1 lần ở AppModule, tất cả module khác đều dùng được
 *   mà KHÔNG cần import lại CommonModule.
 *
 * Exports:
 * - PolicyGuard: Kiểm tra quyền truy cập tài nguyên (BOLA protection)
 * - RolesGuard: Kiểm tra vai trò (admin/viewer)
 *
 * Lưu ý: Guards KHÔNG được đăng ký global tự động.
 * Phải được áp dụng thủ công trên từng route bằng @UseGuards().
 */

import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyGuard } from './guards/policy.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()  // Module toàn cục: import 1 lần, dùng mọi nơi
@Module({
    imports: [PrismaModule],               // PolicyGuard cần PrismaService để truy vấn DB
    providers: [PolicyGuard, RolesGuard],  // Đăng ký guards làm providers
    exports: [PolicyGuard, RolesGuard],    // Xuất để các module khác inject
})
export class CommonModule { }
