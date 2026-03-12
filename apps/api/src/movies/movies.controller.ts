import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Req,
    Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PolicyGuard } from '../common/guards/policy.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MovieReadPolicy, MovieVisiblePolicy } from '../common/decorators/check-policy.decorator';
import { User } from '@prisma/client';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ListMoviesDto } from './dto/list-movies.dto';
import { PublishDto } from './dto/publish.dto';
import { UploadService } from '../upload/upload.service';
import { UploadCompleteDto } from '../upload/dto/upload-complete.dto';

@Controller('movies')
export class MoviesController {
    private readonly logger = new Logger(MoviesController.name);

    constructor(
        private readonly moviesService: MoviesService,
        private readonly uploadService: UploadService,
    ) { }


    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async findAll(@Query() query: ListMoviesDto, @CurrentUser() user: User | null) {
        const result = await this.moviesService.findAll(query, user ?? undefined);
        const { page = 1, limit = 20 } = query;

        return {
            data: result.data,
            meta: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
                hasNext: page * limit < result.total,
                hasPrev: page > 1,
            },
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async create(@Body() dto: CreateMovieDto) {
        const movie = await this.moviesService.create(dto);
        return { data: movie };
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PolicyGuard)
    @MovieReadPolicy('id')
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const movie = await this.moviesService.findById(id, user);
        return { data: movie };
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateMovieDto,
    ) {
        const movie = await this.moviesService.update(id, dto);
        return { data: movie };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Param('id', ParseUUIDPipe) id: string) {
        const result = await this.moviesService.delete(id);
        return { data: result };
    }

    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async publish(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: PublishDto,
    ) {
        const movie = await this.moviesService.publish(id, dto.published);
        return { data: movie };
    }

    @Post(':id/upload-complete')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async uploadComplete(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UploadCompleteDto,
    ) {
        const result = await this.uploadService.uploadComplete({
            movieId: id,
            objectKey: dto.objectKey,
            fileType: dto.fileType,
        });

        this.logger.log(
            JSON.stringify({
                type: 'upload_complete',
                movieId: id,
            })
        );

        return { data: result };
    }

    @Get(':id/stream')
    @UseGuards(JwtAuthGuard)
    async getStreamUrl(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const result = await this.moviesService.getStreamUrl(id, user);
        return { data: result };
    }

    @Get(':id/progress')
    @UseGuards(JwtAuthGuard)
    async getProgress(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const result = await this.moviesService.getProgress(id, user.id);
        return { data: result };
    }
}
