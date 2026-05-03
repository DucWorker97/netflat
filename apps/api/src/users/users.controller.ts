import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { IsString, Matches, MinLength, IsOptional, MaxLength } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
    MIN_PASSWORD_LENGTH,
    PASSWORD_POLICY_MESSAGE,
    PASSWORD_POLICY_REGEX,
} from '../common/utils/security';

class ChangePasswordDto {
    @IsString()
    currentPassword!: string;

    @IsString()
    @MinLength(MIN_PASSWORD_LENGTH)
    @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
    newPassword!: string;
}

class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    displayName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    avatarUrl?: string;
}

class DisableUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Req() req: any) {
        const profile = await this.usersService.getProfile(req.user.id);
        return { data: profile };
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(
        @Req() req: any,
        @Body() dto: UpdateProfileDto,
    ) {
        const profile = await this.usersService.updateProfile(req.user.id, dto);
        return { data: profile };
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    async changePassword(
        @Req() req: any,
        @Body() dto: ChangePasswordDto
    ) {
        await this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
        return { data: { message: 'Password changed successfully' } };
    }

    /**
     * Admin: Disable a user account
     */
    @Patch(':id/disable')
    @UseGuards(JwtAuthGuard)
    async disableUser(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: DisableUserDto,
    ) {
        // Only admins can disable users
        if (req.user.role !== 'admin') {
            throw new Error('Forbidden');
        }
        await this.usersService.toggleUserStatus(id, false);
        return { data: { message: 'User account disabled' } };
    }

    /**
     * Admin: Re-enable a user account
     */
    @Patch(':id/enable')
    @UseGuards(JwtAuthGuard)
    async enableUser(
        @Req() req: any,
        @Param('id') id: string,
    ) {
        if (req.user.role !== 'admin') {
            throw new Error('Forbidden');
        }
        await this.usersService.toggleUserStatus(id, true);
        return { data: { message: 'User account re-enabled' } };
    }
}
