/**
 * ===== AUTH MODULE - CẤU HÌNH MODULE XÁC THỰC =====
 *
 * AuthModule cấu hình toàn bộ hệ thống xác thực (authentication):
 * - PassportModule: Framework xác thực, sử dụng chiến lược JWT
 * - JwtModule: Ký và xác minh JSON Web Token
 * - UsersModule: Truy vấn thông tin user từ database
 *
 * Quan hệ dependency:
 *   AuthModule → JwtModule (ký token)
 *              → UsersModule (tìm/tạo user)
 *              → AuthService (logic xác thực)
 *              → JwtStrategy (giải mã JWT từ header Authorization)
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { SecurityConfig } from '../config/security.config';

@Module({
    imports: [
        // Đăng ký Passport với chiến lược mặc định là JWT
        // → Mọi route dùng @UseGuards(JwtAuthGuard) sẽ yêu cầu token hợp lệ
        PassportModule.register({ defaultStrategy: 'jwt' }),

        // Cấu hình JwtModule bất đồng bộ (async) vì cần đọc secret từ .env
        // - secret: Khóa bí mật để ký JWT (từ biến JWT_SECRET)
        // - expiresIn: Thời gian sống của access token (VD: "15m", "1h")
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const security = configService.getOrThrow<SecurityConfig>('security');
                return {
                    secret: configService.getOrThrow<string>('JWT_SECRET'),
                    signOptions: {
                        expiresIn: security.auth.jwt.accessTtl,
                    },
                };
            },
            inject: [ConfigService],
        }),

        // Import UsersModule để AuthService có thể tìm kiếm/tạo user
        UsersModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,    // Logic xử lý đăng ký, đăng nhập, refresh token
        JwtStrategy,    // Chiến lược giải mã JWT từ header Authorization
    ],
    exports: [
        AuthService,    // Xuất để các module khác có thể dùng
        JwtModule,      // Xuất JwtModule để các module khác có thể ký token
    ],
})
export class AuthModule { }
