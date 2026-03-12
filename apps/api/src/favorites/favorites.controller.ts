import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyGuard } from '../common/guards/policy.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserOwnedPolicy, MovieVisiblePolicy } from '../common/decorators/check-policy.decorator';
import { User } from '@prisma/client';

@Controller('favorites')
@UseGuards(JwtAuthGuard, PolicyGuard)
@UserOwnedPolicy()
export class FavoritesController {
    constructor(private readonly favoritesService: FavoritesService) { }

    @Get()
    async findAll(
        @CurrentUser() user: User,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '20', 10);

        const result = await this.favoritesService.findAll(user.id, pageNum, limitNum);

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

    @Post(':movieId')
    @HttpCode(HttpStatus.CREATED)
    async add(
        @CurrentUser() user: User,
        @Param('movieId', ParseUUIDPipe) movieId?: string,
    ) {
        const favorite = await this.favoritesService.add(user.id, movieId!);
        return { data: favorite };
    }

    @Delete(':movieId')
    async remove(
        @CurrentUser() user: User,
        @Param('movieId', ParseUUIDPipe) movieId?: string,
    ) {
        const result = await this.favoritesService.remove(user.id, movieId!);
        return { data: result };
    }
}

