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
        @Req() req: Request,
        @Query('movieId', ParseUUIDPipe) movieId: string,
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
        @Query('sizeBytes') sizeBytes: string,
        @Query('fileType') fileType?: string,
    ) {
        const originHeader = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
        const refererHeader = Array.isArray(req.headers.referer) ? req.headers.referer[0] : req.headers.referer;

        const result = await this.uploadService.getPresignedUrl({
            movieId,
            fileName,
            contentType,
            sizeBytes: parseInt(sizeBytes, 10),
            fileType: (fileType as 'video' | 'thumbnail') || 'video',
            origin: originHeader ?? refererHeader,
        });

        return { data: result };
    }

    @Post('complete/:movieId')
    async uploadComplete(
        @Param('movieId', ParseUUIDPipe) movieId: string,
        @Body() dto: UploadCompleteDto,
    ) {
        const result = await this.uploadService.uploadComplete({
            movieId,
            objectKey: dto.objectKey,
            fileType: dto.fileType,
        });

        return { data: result };
    }
}
