import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, Prisma, SubscriptionPlan, User } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BillingCycle, PaymentProvider, WebhookEvent } from './providers/payment-provider.interface';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

type PaymentWithUser = Payment & { user: User };

interface ProviderPaymentMetadata {
    transactionId?: string;
    providerTransactionId?: string;
    providerResponseCode?: string;
    providerTransactionStatus?: string;
    providerPayload?: Prisma.InputJsonValue;
}

interface PaymentTarget {
    planName: string;
    billingCycle: BillingCycle;
}

export interface VnpayIpnResponse {
    RspCode: string;
    Message: string;
}

export type VnpayReturnStatus = 'success' | 'failed' | 'pending';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
        @Inject(PAYMENT_PROVIDER)
        private readonly paymentProvider: PaymentProvider,
    ) {}

    async createCheckout(
        userId: string,
        planName: string,
        billingCycle: BillingCycle,
        ipAddress?: string,
    ) {
        const plan = await this.prisma.subscriptionPlan.findFirst({
            where: {
                name: planName,
                isActive: true,
            },
        });

        if (!plan) {
            throw new NotFoundException({
                code: 'PLAN_NOT_FOUND',
                message: 'Subscription plan not found',
            });
        }

        const subscription = await this.subscriptionsService.ensureUserSubscription(userId);
        const amount = this.getPlanAmount(plan, billingCycle);

        const payment = await this.prisma.payment.create({
            data: {
                userId,
                subscriptionId: subscription.id,
                amount,
                currency: 'VND',
                paymentMethod: this.paymentProvider.name,
                planName,
                billingCycle,
                status: PaymentStatus.pending,
            },
        });

        const checkout = await this.paymentProvider.createCheckoutSession({
            paymentId: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            planName,
            billingCycle,
            userId,
            ipAddress,
        });

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                providerReference: checkout.providerRef,
            },
        });

        return {
            paymentId: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            checkoutUrl: checkout.checkoutUrl,
            provider: this.paymentProvider.name,
        };
    }

    async getHistory(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.prisma.payment.findMany({
                where: { userId },
                include: {
                    subscription: {
                        include: { plan: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.payment.count({ where: { userId } }),
        ]);

        return {
            data: items,
            total,
        };
    }

    async completeMockPayment(
        paymentId: string,
        requestingUserId: string,
        planName?: string,
        billingCycle?: BillingCycle,
    ) {
        const payment = await this.findPaymentWithUser(paymentId);

        if (payment.userId !== requestingUserId) {
            throw new ForbiddenException({
                code: 'PAYMENT_ACCESS_DENIED',
                message: 'You cannot complete another user payment',
            });
        }

        const target = this.resolvePaymentTarget(payment, planName, billingCycle);
        const completedPayment = await this.completePaymentAndUpgrade(payment, target);
        return this.stripUser(completedPayment);
    }

    async processMockWebhook(payload: {
        paymentId: string;
        planName: string;
        billingCycle: BillingCycle;
    }, webhookSecret?: string) {
        if (!this.paymentProvider.verifyWebhookSignature(payload, webhookSecret)) {
            throw new UnauthorizedException({
                code: 'INVALID_WEBHOOK_SIGNATURE',
                message: 'Invalid webhook signature',
            });
        }

        const event = await this.paymentProvider.parseWebhookEvent(payload);
        if (!event.paymentId) {
            throw new BadRequestException({
                code: 'INVALID_WEBHOOK_PAYLOAD',
                message: 'Webhook payload is missing paymentId',
            });
        }

        const payment = await this.findPaymentWithUser(event.paymentId);
        const target = this.resolvePaymentTarget(payment, payload.planName, payload.billingCycle);
        const completedPayment = await this.completePaymentAndUpgrade(payment, target);
        return this.stripUser(completedPayment);
    }

    async processVnpayIpn(query: Record<string, unknown>): Promise<VnpayIpnResponse> {
        if (this.paymentProvider.name !== 'vnpay') {
            return { RspCode: '99', Message: 'VNPay provider is not enabled' };
        }

        if (!this.paymentProvider.verifyWebhookSignature(query)) {
            return { RspCode: '97', Message: 'Invalid Checksum' };
        }

        const event = await this.paymentProvider.parseWebhookEvent(query);
        if (!event.providerReference) {
            return { RspCode: '99', Message: 'Missing transaction reference' };
        }

        const payment = await this.findPaymentByProviderReference(event.providerReference);
        if (!payment) {
            return { RspCode: '01', Message: 'Order not Found' };
        }

        if (!this.isProviderAmountValid(payment, event.amount)) {
            return { RspCode: '04', Message: 'Invalid Amount' };
        }

        if (payment.status !== PaymentStatus.pending) {
            return { RspCode: '02', Message: 'Order already confirmed' };
        }

        const metadata = this.buildProviderMetadata(event);
        if (event.eventType === 'payment.completed') {
            const target = this.resolvePaymentTarget(payment);
            await this.completePaymentAndUpgrade(payment, target, metadata);
            return { RspCode: '00', Message: 'Confirm Success' };
        }

        await this.failPayment(payment, metadata);
        return { RspCode: '00', Message: 'Confirm Success' };
    }

    async processVnpayReturn(query: Record<string, unknown>): Promise<VnpayReturnStatus> {
        if (this.paymentProvider.name !== 'vnpay') {
            return 'failed';
        }

        if (!this.paymentProvider.verifyWebhookSignature(query)) {
            return 'failed';
        }

        const event = await this.paymentProvider.parseWebhookEvent(query);
        if (event.eventType !== 'payment.completed' || !event.providerReference) {
            return 'failed';
        }

        const payment = await this.findPaymentByProviderReference(event.providerReference);
        if (!payment || !this.isProviderAmountValid(payment, event.amount)) {
            return 'failed';
        }

        if (payment.status === PaymentStatus.completed) {
            return 'success';
        }

        if (payment.status !== PaymentStatus.pending) {
            return 'failed';
        }

        if (!this.allowReturnCompletion()) {
            return 'pending';
        }

        const target = this.resolvePaymentTarget(payment);
        await this.completePaymentAndUpgrade(payment, target, this.buildProviderMetadata(event));
        return 'success';
    }

    private async findPaymentWithUser(paymentId: string): Promise<PaymentWithUser> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { user: true },
        });

        if (!payment) {
            throw new NotFoundException({
                code: 'PAYMENT_NOT_FOUND',
                message: 'Payment not found',
            });
        }

        return payment;
    }

    private async findPaymentByProviderReference(providerReference: string): Promise<PaymentWithUser | null> {
        return this.prisma.payment.findUnique({
            where: { providerReference },
            include: { user: true },
        });
    }

    private async completePaymentAndUpgrade(
        payment: PaymentWithUser,
        target: PaymentTarget,
        metadata?: ProviderPaymentMetadata,
    ): Promise<PaymentWithUser> {
        await this.assertPaymentMatchesPlan(payment, target.planName, target.billingCycle);

        const wasPending = payment.status === PaymentStatus.pending;
        const completedPayment = await this.completePayment(payment, metadata);

        if (wasPending) {
            const subscription = await this.subscriptionsService.upgradePlan(
                completedPayment.userId,
                target.planName,
                target.billingCycle,
            );
            await this.sendPaymentSuccessEmail(completedPayment, subscription, target.billingCycle);
        }

        return completedPayment;
    }

    private async completePayment(
        payment: PaymentWithUser,
        metadata?: ProviderPaymentMetadata,
    ): Promise<PaymentWithUser> {
        if (payment.status !== PaymentStatus.pending) {
            return payment;
        }

        const data: Prisma.PaymentUpdateInput = {
            status: PaymentStatus.completed,
            transactionId: metadata?.transactionId ?? payment.transactionId ?? this.buildTransactionId(payment),
        };

        this.assignProviderMetadata(data, metadata);

        return this.prisma.payment.update({
            where: { id: payment.id },
            data,
            include: { user: true },
        });
    }

    private async failPayment(
        payment: PaymentWithUser,
        metadata?: ProviderPaymentMetadata,
    ): Promise<PaymentWithUser> {
        const data: Prisma.PaymentUpdateInput = {
            status: PaymentStatus.failed,
        };

        this.assignProviderMetadata(data, metadata);

        return this.prisma.payment.update({
            where: { id: payment.id },
            data,
            include: { user: true },
        });
    }

    private assignProviderMetadata(
        data: Prisma.PaymentUpdateInput,
        metadata?: ProviderPaymentMetadata,
    ) {
        if (!metadata) {
            return;
        }

        if (metadata.providerTransactionId !== undefined) {
            data.providerTransactionId = metadata.providerTransactionId;
        }
        if (metadata.providerResponseCode !== undefined) {
            data.providerResponseCode = metadata.providerResponseCode;
        }
        if (metadata.providerTransactionStatus !== undefined) {
            data.providerTransactionStatus = metadata.providerTransactionStatus;
        }
        if (metadata.providerPayload !== undefined) {
            data.providerPayload = metadata.providerPayload;
        }
    }

    private stripUser(payment: PaymentWithUser): Payment {
        const paymentRecord: Partial<PaymentWithUser> = { ...payment };
        delete paymentRecord.user;
        return paymentRecord as Payment;
    }

    private resolvePaymentTarget(
        payment: Payment,
        requestedPlanName?: string,
        requestedBillingCycle?: BillingCycle,
    ): PaymentTarget {
        if (payment.planName && requestedPlanName && payment.planName !== requestedPlanName) {
            throw new BadRequestException({
                code: 'PAYMENT_PLAN_MISMATCH',
                message: 'Payment plan does not match the selected plan',
            });
        }

        if (
            payment.billingCycle &&
            requestedBillingCycle &&
            payment.billingCycle !== requestedBillingCycle
        ) {
            throw new BadRequestException({
                code: 'PAYMENT_BILLING_CYCLE_MISMATCH',
                message: 'Payment billing cycle does not match the selected billing cycle',
            });
        }

        const planName = payment.planName ?? requestedPlanName;
        if (!planName) {
            throw new BadRequestException({
                code: 'PAYMENT_PLAN_REQUIRED',
                message: 'Payment target plan is missing',
            });
        }

        const billingCycle = this.parseBillingCycle(payment.billingCycle) ?? requestedBillingCycle ?? 'monthly';
        return { planName, billingCycle };
    }

    private parseBillingCycle(value: string | null): BillingCycle | undefined {
        return value === 'monthly' || value === 'annual' ? value : undefined;
    }

    private async assertPaymentMatchesPlan(
        payment: Payment,
        planName: string,
        billingCycle: BillingCycle,
    ) {
        const plan = await this.prisma.subscriptionPlan.findFirst({
            where: {
                name: planName,
                isActive: true,
            },
        });

        if (!plan) {
            throw new NotFoundException({
                code: 'PLAN_NOT_FOUND',
                message: 'Subscription plan not found',
            });
        }

        const expectedAmount = this.getPlanAmount(plan, billingCycle);
        if (Math.abs(payment.amount - expectedAmount) > 0.01) {
            throw new BadRequestException({
                code: 'PAYMENT_AMOUNT_MISMATCH',
                message: 'Payment amount does not match the selected plan',
            });
        }
    }

    private getPlanAmount(plan: SubscriptionPlan, billingCycle: BillingCycle) {
        return billingCycle === 'annual'
            ? (plan.annualPrice ?? plan.monthlyPrice * 12)
            : plan.monthlyPrice;
    }

    private isProviderAmountValid(payment: Payment, providerAmount?: number) {
        return providerAmount !== undefined && Math.abs(payment.amount - providerAmount) <= 0.01;
    }

    private buildProviderMetadata(event: WebhookEvent): ProviderPaymentMetadata {
        const providerReference = event.providerReference ?? event.providerRef;
        const transactionId = event.providerTransactionId
            ? `vnpay_${event.providerTransactionId}`
            : providerReference
                ? `vnpay_${providerReference}`
                : undefined;

        return {
            transactionId,
            providerTransactionId: event.providerTransactionId,
            providerResponseCode: event.responseCode,
            providerTransactionStatus: event.transactionStatus,
            providerPayload: event.rawPayload as Prisma.InputJsonObject | undefined,
        };
    }

    private buildTransactionId(payment: Payment) {
        return `${payment.paymentMethod}_${payment.id.replace(/-/g, '')}`;
    }

    private allowReturnCompletion() {
        const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
        const allow = this.configService.get<string>('VNPAY_ALLOW_RETURN_COMPLETION') || 'false';
        return nodeEnv === 'development' && allow.toLowerCase() === 'true';
    }

    private async sendPaymentSuccessEmail(
        payment: PaymentWithUser,
        subscription: {
            endDate: Date;
            plan: { displayName: string };
        },
        billingCycle: BillingCycle,
    ) {
        try {
            await this.mailService.sendPaymentSuccessEmail({
                to: payment.user.email,
                displayName: payment.user.displayName ?? payment.user.email,
                planName: subscription.plan.displayName,
                amount: payment.amount,
                billingCycle,
                endDate: subscription.endDate,
                transactionId: payment.transactionId ?? payment.id,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Payment success email failed for payment ${payment.id}: ${message}`);
        }
    }
}
