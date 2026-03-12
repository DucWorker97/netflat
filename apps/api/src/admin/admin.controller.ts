import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * System diagnostics - check DB, Redis, S3 connectivity
     */
    @Get('diagnostics')
    async getDiagnostics() {
        const diagnostics = await this.adminService.getDiagnostics();
        return { data: diagnostics };
    }

    /**
     * Get users with pagination
     */
    @Get('users')
    async getUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('role') role?: string,
    ) {
        const result = await this.adminService.getUsers({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            search,
            role,
        });
        return result;
    }

    /**
     * User management
     */
    @Post('users')
    async createUser(@Body() dto: CreateUserDto) {
        const user = await this.adminService.createUser(dto);
        return { data: user };
    }

    @Patch('users/:userId')
    async updateUser(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Body() dto: UpdateUserDto,
    ) {
        if (!dto.email && !dto.role && !dto.password) {
            throw new BadRequestException('At least one field must be provided');
        }

        const user = await this.adminService.updateUser({ userId, ...dto });
        return { data: user };
    }

    @Delete('users/:userId')
    async deleteUser(@Param('userId', ParseUUIDPipe) userId: string) {
        const result = await this.adminService.deleteUser(userId);
        return { data: result };
    }
}

