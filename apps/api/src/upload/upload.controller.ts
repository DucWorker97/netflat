import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Req,
    Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadCompleteDto } from './dto/upload-complete.dto';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly uploadService: UploadService) { }

    @Get('presigned-url')
    async getPresignedUrl(
        @Query('movieId', ParseUUIDPipe) movieId: string,
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
        @Query('sizeBytes') sizeBytes: string,
        @Query('fileType') fileType?: string,
    ) {
        const result = await this.uploadService.getPresignedUrl({
            movieId,
            fileName,
            contentType,
            sizeBytes: parseInt(sizeBytes, 10),
            fileType: (fileType as 'video' | 'thumbnail') || 'video',
        });

        return { data: result };
    }

    @Post('complete/:movieId')
    async uploadComplete(
        @Req() req: Request,
        @Param('movieId', ParseUUIDPipe) movieId: string,
        @Body() dto: UploadCompleteDto,
    ) {
        const requestId = req.requestId || 'unknown';

        const result = await this.uploadService.uploadComplete({
            movieId,
            objectKey: dto.objectKey,
            fileType: dto.fileType,
            requestId,
        });

        this.logger.log(
            JSON.stringify({
                type: 'upload_complete',
                requestId,
                movieId,
                jobId: 'jobId' in result ? result.jobId : undefined,
                deprecated: true,
            })
        );

        return { data: result };
    }

    @Get('subtitle-presigned-url')
    async getSubtitlePresignedUrl(
        @Query('movieId', ParseUUIDPipe) movieId: string,
        @Query('fileName') fileName: string,
    ) {
        const result = await this.uploadService.getSubtitlePresignedUrl({
            movieId,
            fileName,
        });

        return { data: result };
    }

    @Post('subtitle-complete/:movieId')
    async subtitleComplete(
        @Param('movieId', ParseUUIDPipe) movieId: string,
        @Body() dto: { objectKey: string },
    ) {
        const result = await this.uploadService.subtitleComplete({
            movieId,
            objectKey: dto.objectKey,
        });

        this.logger.log(
            JSON.stringify({
                type: 'subtitle_upload_complete',
                movieId,
                subtitleUrl: result.subtitleUrl,
            })
        );

        return { data: result };
    }
}
