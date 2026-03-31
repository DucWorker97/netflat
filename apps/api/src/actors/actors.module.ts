import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActorsController } from './actors.controller';
import { ActorsService } from './actors.service';

@Module({
    imports: [PrismaModule],
    controllers: [ActorsController],
    providers: [ActorsService],
})
export class ActorsModule {}
