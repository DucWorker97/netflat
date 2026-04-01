import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const result = await this.adminService.getUsers(pageNum, limitNum);
        return result;
    }

    /**
     * Toggle user status (disable/enable)
     */
    @Patch('users/:userId/status')
    async toggleUserStatus(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Body() body: { active: boolean },
    ) {
        const user = await this.adminService.toggleUserStatus(userId, body.active);
        return { data: user };
    }
}

