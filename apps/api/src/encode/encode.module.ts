import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EncodeProcessor } from './encode.processor';
import { ENCODE_QUEUE } from './encode.constants';

@Module({
    imports: [
        BullModule.registerQueue({ name: ENCODE_QUEUE }),
    ],
    providers: [EncodeProcessor],
    exports: [BullModule],
})
export class EncodeModule {}
