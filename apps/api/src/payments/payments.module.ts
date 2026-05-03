import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { VnpayPaymentProvider } from './providers/vnpay-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

@Module({
    imports: [PrismaModule, SubscriptionsModule],
    providers: [
        MockPaymentProvider,
        VnpayPaymentProvider,
        {
            provide: PAYMENT_PROVIDER,
            inject: [ConfigService, MockPaymentProvider, VnpayPaymentProvider],
            useFactory: (
                configService: ConfigService,
                mockProvider: MockPaymentProvider,
                vnpayProvider: VnpayPaymentProvider,
            ) => {
                const provider = configService.get<string>('PAYMENT_PROVIDER') || 'mock';
                return provider === 'vnpay' ? vnpayProvider : mockProvider;
            },
        },
        PaymentsService,
    ],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule {}
