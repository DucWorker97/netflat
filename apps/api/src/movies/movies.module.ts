import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

import { UploadModule } from '../upload/upload.module';
import { ActorsModule } from '../actors/actors.module';

@Module({
    imports: [UploadModule, ActorsModule],
    controllers: [MoviesController],
    providers: [MoviesService],
    exports: [MoviesService],
})
export class MoviesModule { }
