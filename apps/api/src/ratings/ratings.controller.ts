import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
    Query,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyGuard } from '../common/guards/policy.guard';
import { MovieVisiblePolicy } from '../common/decorators/check-policy.decorator';
import { RatingsService } from './ratings.service';
import { RateMovieDto } from './dto/rate-movie.dto';

@Controller('ratings')
export class RatingsController {
    constructor(private ratingsService: RatingsService) { }

    private getUserId(req: any) {
        const userId = req.user?.id;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }
        return userId;
    }

    /**
     * Rate a movie
     */
    @Post(':movieId')
    @UseGuards(JwtAuthGuard, PolicyGuard)
    @MovieVisiblePolicy('movieId')
    async rateMovie(
        @Req() req: any,
        @Param('movieId') movieId: string,
        @Body() dto: RateMovieDto,
    ) {
        const userId = this.getUserId(req);
        const rating = await this.ratingsService.createOrUpdate(userId, movieId, dto.rating, dto.comment);
        return { data: rating };
    }

    /**
     * Get user's own rating for a movie
     */
    @Get(':movieId/user')
    @UseGuards(JwtAuthGuard)
    async getUserRating(@Req() req: any, @Param('movieId') movieId: string) {
        const userId = this.getUserId(req);
        const rating = await this.ratingsService.getRating(userId, movieId);
        return { data: rating };
    }

    /**
     * Get average rating stats for a movie (public endpoint)
     */
    @Get(':movieId/stats')
    @UseGuards(PolicyGuard)
    @MovieVisiblePolicy('movieId')
    async getMovieStats(@Param('movieId') movieId: string) {
        const stats = await this.ratingsService.getStats(movieId);
        return { data: stats };
    }

    /**
     * List ratings for a movie (public)
     */
    @Get(':movieId/list')
    @UseGuards(PolicyGuard)
    @MovieVisiblePolicy('movieId')
    async listMovieRatings(
        @Param('movieId') movieId: string,
        @Query('limit') limit?: string,
    ) {
        const parsed = limit ? parseInt(limit, 10) : NaN;
        const parsedLimit = Number.isFinite(parsed) ? Math.min(parsed, 50) : 20;
        const ratings = await this.ratingsService.getMovieRatings(movieId, 1, parsedLimit);
        return { data: ratings };
    }

    /**
     * Delete rating
     */
    @Delete(':movieId')
    @UseGuards(JwtAuthGuard)
    async deleteRating(@Req() req: any, @Param('movieId') movieId: string) {
        const userId = this.getUserId(req);
        await this.ratingsService.deleteRating(userId, movieId);
        return { data: { success: true } };
    }
}
