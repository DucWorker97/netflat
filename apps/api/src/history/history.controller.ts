import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyGuard } from '../common/guards/policy.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserOwnedPolicy } from '../common/decorators/check-policy.decorator';
import { User } from '@prisma/client';

class UpsertProgressDto {
    @Type(() => Number)
    @IsInt()
    @Min(0)
    progressSeconds!: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    @Max(86400) // max 24h
    durationSeconds?: number;
}

@Controller('history')
@UseGuards(JwtAuthGuard, PolicyGuard)
@UserOwnedPolicy()
export class HistoryController {
    constructor(private readonly historyService: HistoryService) {}

    @Get()
    async findAll(
        @CurrentUser() user: User,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '20', 10);

        const result = await this.historyService.findAll(user.id, pageNum, limitNum);

        return {
            data: result.data,
            meta: {
                page: pageNum,
                limit: limitNum,
                total: result.total,
                totalPages: Math.ceil(result.total / limitNum),
                hasNext: pageNum * limitNum < result.total,
                hasPrev: pageNum > 1,
            },
        };
    }

    @Get('continue-watching')
    async continueWatching(
        @CurrentUser() user: User,
        @Query('limit') limit?: string,
    ) {
        const limitNum = parseInt(limit || '10', 10);
        const data = await this.historyService.continueWatching(user.id, limitNum);
        return { data };
    }

    @Post(':movieId')
    @HttpCode(HttpStatus.OK)
    async upsert(
        @CurrentUser() user: User,
        @Param('movieId', ParseUUIDPipe) movieId: string,
        @Body() dto: UpsertProgressDto,
    ) {
        const result = await this.historyService.upsert(
            user.id,
            movieId,
            dto.progressSeconds,
            dto.durationSeconds || 0,
        );
        return { data: result };
    }

    @Delete(':movieId')
    async remove(
        @CurrentUser() user: User,
        @Param('movieId', ParseUUIDPipe) movieId: string,
    ) {
        const result = await this.historyService.remove(user.id, movieId);
        return { data: result };
    }
}
