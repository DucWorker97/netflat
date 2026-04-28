import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

@Module({
    imports: [PrismaModule, SubscriptionsModule],
    providers: [
        MockPaymentProvider,
        {
            provide: PAYMENT_PROVIDER,
            useExisting: MockPaymentProvider,
        },
        PaymentsService,
    ],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule {}
