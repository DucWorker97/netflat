export type BillingCycle = 'monthly' | 'annual';

export interface CreateCheckoutSessionParams {
    paymentId: string;
    amount: number;
    currency: string;
    planName: string;
    billingCycle: BillingCycle;
    userId: string;
    returnUrl?: string;
}

export interface CheckoutSession {
    checkoutUrl: string;
    providerRef: string;
}

export interface WebhookEvent {
    paymentId: string;
    eventType: 'payment.completed' | 'payment.failed';
    providerRef?: string;
}

export interface PaymentProvider {
    readonly name: string;

    createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>;
    verifyWebhookSignature(payload: unknown, signature?: string): boolean;
    parseWebhookEvent(payload: unknown): Promise<WebhookEvent>;
}
