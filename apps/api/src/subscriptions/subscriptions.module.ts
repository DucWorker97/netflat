import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageModule } from '../usage/usage.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';

@Module({
    imports: [PrismaModule, UsageModule],
    controllers: [SubscriptionsController],
    providers: [SubscriptionsService, SubscriptionSchedulerService],
    exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
