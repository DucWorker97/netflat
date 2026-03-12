import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { ENCODE_QUEUE } from '../encode/encode.constants';

@Module({
    imports: [BullModule.registerQueue({ name: ENCODE_QUEUE })],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule { }
