import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Payment, PaymentStatus, SubscriptionPlan, User } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BillingCycle, PaymentProvider } from './providers/payment-provider.interface';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

type PaymentWithUser = Payment & { user: User };

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly mailService: MailService,
        @Inject(PAYMENT_PROVIDER)
        private readonly paymentProvider: PaymentProvider,
    ) {}

    async createCheckout(userId: string, planName: string, billingCycle: BillingCycle) {
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
                paymentMethod: 'mock',
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
        billingCycle: BillingCycle = 'monthly',
    ) {
        const payment = await this.findPaymentWithUser(paymentId);

        if (payment.userId !== requestingUserId) {
            throw new ForbiddenException({
                code: 'PAYMENT_ACCESS_DENIED',
                message: 'You cannot complete another user payment',
            });
        }

        if (planName) {
            await this.assertPaymentMatchesPlan(payment, planName, billingCycle);
        }

        const wasPending = payment.status === PaymentStatus.pending;
        const completedPayment = await this.completePayment(paymentId);

        if (planName && wasPending) {
            const subscription = await this.subscriptionsService.upgradePlan(
                completedPayment.userId,
                planName,
                billingCycle,
            );
            await this.sendPaymentSuccessEmail(completedPayment, subscription, billingCycle);
        }

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
        await this.assertPaymentMatchesPlan(payment, payload.planName, payload.billingCycle);

        const wasPending = payment.status === PaymentStatus.pending;
        const completedPayment = await this.completePayment(event.paymentId);

        if (wasPending) {
            const subscription = await this.subscriptionsService.upgradePlan(
                completedPayment.userId,
                payload.planName,
                payload.billingCycle,
            );
            await this.sendPaymentSuccessEmail(completedPayment, subscription, payload.billingCycle);
        }

        return this.stripUser(completedPayment);
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

    private async completePayment(paymentId: string): Promise<PaymentWithUser> {
        const payment = await this.findPaymentWithUser(paymentId);

        if (payment.status !== PaymentStatus.pending) {
            return payment;
        }

        return this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.completed,
                transactionId: `mock_${paymentId.replace(/-/g, '')}`,
            },
            include: { user: true },
        });
    }

    private stripUser(payment: PaymentWithUser): Payment {
        const paymentRecord: Partial<PaymentWithUser> = { ...payment };
        delete paymentRecord.user;
        return paymentRecord as Payment;
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
