import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CheckoutSession,
    CreateCheckoutSessionParams,
    PaymentProvider,
    WebhookEvent,
} from './payment-provider.interface';

interface MockWebhookPayload {
    paymentId?: string;
}

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
    readonly name = 'mock';
    private readonly logger = new Logger(MockPaymentProvider.name);

    constructor(private readonly configService: ConfigService) {}

    async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
        return {
            checkoutUrl: `/billing/mock-checkout?paymentId=${params.paymentId}`,
            providerRef: `mock_${params.paymentId}`,
        };
    }

    verifyWebhookSignature(_payload: unknown, signature?: string): boolean {
        const expectedSecret = this.configService.get<string>('MOCK_WEBHOOK_SECRET')?.trim();
        const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
        const strict = nodeEnv === 'production' || nodeEnv === 'staging';

        if (!expectedSecret) {
            if (strict) {
                return false;
            }

            this.logger.warn('MOCK_WEBHOOK_SECRET is not set; mock webhook signature checks are disabled outside production/staging.');
            return true;
        }

        return signature === expectedSecret;
    }

    async parseWebhookEvent(payload: unknown): Promise<WebhookEvent> {
        const body = payload as MockWebhookPayload;
        return {
            paymentId: body.paymentId || '',
            eventType: 'payment.completed',
            providerRef: body.paymentId ? `mock_${body.paymentId}` : undefined,
        };
    }
}
