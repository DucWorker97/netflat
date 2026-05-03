/* eslint-disable @typescript-eslint/no-explicit-any */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
    const createService = () => {
        const prisma = {
            payment: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            subscriptionPlan: {
                findFirst: jest.fn(),
            },
        };
        const subscriptionsService = {
            upgradePlan: jest.fn(),
            ensureUserSubscription: jest.fn(),
        };
        const mailService = {
            sendPaymentSuccessEmail: jest.fn(),
        };
        const configService = {
            get: jest.fn().mockReturnValue('false'),
        };
        const paymentProvider = {
            name: 'mock',
            createCheckoutSession: jest.fn(),
            verifyWebhookSignature: jest.fn(),
            parseWebhookEvent: jest.fn(),
        };

        return {
            prisma,
            subscriptionsService,
            mailService,
            configService,
            paymentProvider,
            service: new PaymentsService(
                prisma as any,
                subscriptionsService as any,
                mailService as any,
                configService as any,
                paymentProvider as any,
            ),
        };
    };

    it('rejects mock completion when payment belongs to another user', async () => {
        const { prisma, service } = createService();
        prisma.payment.findUnique.mockResolvedValue({
            id: 'payment-1',
            userId: 'owner-user',
            status: PaymentStatus.pending,
            user: { id: 'owner-user', email: 'owner@example.com', displayName: null },
        });

        await expect(service.completeMockPayment('payment-1', 'other-user')).rejects.toBeInstanceOf(
            ForbiddenException,
        );
    });

    it('rejects mock webhook when provider signature verification fails', async () => {
        const { paymentProvider, service } = createService();
        paymentProvider.verifyWebhookSignature.mockReturnValue(false);

        await expect(
            service.processMockWebhook({
                paymentId: 'payment-1',
                planName: 'pro',
                billingCycle: 'monthly',
            }, 'bad-secret'),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns VNPay code 97 when checksum verification fails', async () => {
        const { paymentProvider, service } = createService();
        paymentProvider.name = 'vnpay';
        paymentProvider.verifyWebhookSignature.mockReturnValue(false);

        await expect(service.processVnpayIpn({})).resolves.toEqual({
            RspCode: '97',
            Message: 'Invalid Checksum',
        });
    });

    it('returns VNPay code 01 when payment reference is not found', async () => {
        const { paymentProvider, prisma, service } = createService();
        paymentProvider.name = 'vnpay';
        paymentProvider.verifyWebhookSignature.mockReturnValue(true);
        paymentProvider.parseWebhookEvent.mockResolvedValue({
            eventType: 'payment.completed',
            providerReference: 'missing-ref',
            amount: 99000,
        });
        prisma.payment.findUnique.mockResolvedValue(null);

        await expect(service.processVnpayIpn({})).resolves.toEqual({
            RspCode: '01',
            Message: 'Order not Found',
        });
    });

    it('returns VNPay code 04 when callback amount does not match payment', async () => {
        const { paymentProvider, prisma, service } = createService();
        paymentProvider.name = 'vnpay';
        paymentProvider.verifyWebhookSignature.mockReturnValue(true);
        paymentProvider.parseWebhookEvent.mockResolvedValue({
            eventType: 'payment.completed',
            providerReference: 'payment-ref',
            amount: 98000,
        });
        prisma.payment.findUnique.mockResolvedValue({
            id: 'payment-1',
            userId: 'user-1',
            amount: 99000,
            status: PaymentStatus.pending,
            planName: 'pro',
            billingCycle: 'monthly',
            paymentMethod: 'vnpay',
            user: { id: 'user-1', email: 'user@example.com', displayName: null },
        });

        await expect(service.processVnpayIpn({})).resolves.toEqual({
            RspCode: '04',
            Message: 'Invalid Amount',
        });
    });

    it('completes VNPay payment and upgrades the stored target plan', async () => {
        const { paymentProvider, prisma, subscriptionsService, mailService, service } = createService();
        paymentProvider.name = 'vnpay';
        paymentProvider.verifyWebhookSignature.mockReturnValue(true);
        paymentProvider.parseWebhookEvent.mockResolvedValue({
            eventType: 'payment.completed',
            providerReference: 'payment-ref',
            providerTransactionId: '14123456',
            responseCode: '00',
            transactionStatus: '00',
            amount: 99000,
            rawPayload: { vnp_TxnRef: 'payment-ref' },
        });
        const payment = {
            id: 'payment-1',
            userId: 'user-1',
            amount: 99000,
            status: PaymentStatus.pending,
            planName: 'pro',
            billingCycle: 'monthly',
            paymentMethod: 'vnpay',
            transactionId: null,
            user: { id: 'user-1', email: 'user@example.com', displayName: null },
        };
        prisma.payment.findUnique.mockResolvedValue(payment);
        prisma.subscriptionPlan.findFirst.mockResolvedValue({
            name: 'pro',
            monthlyPrice: 99000,
            annualPrice: 990000,
        });
        prisma.payment.update.mockResolvedValue({
            ...payment,
            status: PaymentStatus.completed,
            transactionId: 'vnpay_14123456',
        });
        subscriptionsService.upgradePlan.mockResolvedValue({
            endDate: new Date('2027-01-01T00:00:00.000Z'),
            plan: { displayName: 'Pro' },
        });

        await expect(service.processVnpayIpn({})).resolves.toEqual({
            RspCode: '00',
            Message: 'Confirm Success',
        });
        expect(subscriptionsService.upgradePlan).toHaveBeenCalledWith('user-1', 'pro', 'monthly');
        expect(mailService.sendPaymentSuccessEmail).toHaveBeenCalled();
    });

    it('handles completed VNPay IPN retry without upgrading twice', async () => {
        const { paymentProvider, prisma, subscriptionsService, service } = createService();
        paymentProvider.name = 'vnpay';
        paymentProvider.verifyWebhookSignature.mockReturnValue(true);
        paymentProvider.parseWebhookEvent.mockResolvedValue({
            eventType: 'payment.completed',
            providerReference: 'payment-ref',
            amount: 99000,
        });
        prisma.payment.findUnique.mockResolvedValue({
            id: 'payment-1',
            amount: 99000,
            status: PaymentStatus.completed,
            user: { id: 'user-1', email: 'user@example.com', displayName: null },
        });

        await expect(service.processVnpayIpn({})).resolves.toEqual({
            RspCode: '02',
            Message: 'Order already confirmed',
        });
        expect(subscriptionsService.upgradePlan).not.toHaveBeenCalled();
    });

    it('allows VNPay return completion only in development when explicitly enabled', async () => {
        const { configService, paymentProvider, prisma, subscriptionsService, service } = createService();
        paymentProvider.name = 'vnpay';
        paymentProvider.verifyWebhookSignature.mockReturnValue(true);
        paymentProvider.parseWebhookEvent.mockResolvedValue({
            eventType: 'payment.completed',
            providerReference: 'payment-ref',
            providerTransactionId: '14123456',
            responseCode: '00',
            transactionStatus: '00',
            amount: 99000,
            rawPayload: { vnp_TxnRef: 'payment-ref' },
        });
        configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'development';
            if (key === 'VNPAY_ALLOW_RETURN_COMPLETION') return 'true';
            return undefined;
        });
        const payment = {
            id: 'payment-1',
            userId: 'user-1',
            amount: 99000,
            status: PaymentStatus.pending,
            planName: 'pro',
            billingCycle: 'monthly',
            paymentMethod: 'vnpay',
            transactionId: null,
            user: { id: 'user-1', email: 'user@example.com', displayName: null },
        };
        prisma.payment.findUnique.mockResolvedValue(payment);
        prisma.subscriptionPlan.findFirst.mockResolvedValue({
            name: 'pro',
            monthlyPrice: 99000,
            annualPrice: 990000,
        });
        prisma.payment.update.mockResolvedValue({
            ...payment,
            status: PaymentStatus.completed,
            transactionId: 'vnpay_14123456',
        });
        subscriptionsService.upgradePlan.mockResolvedValue({
            endDate: new Date('2027-01-01T00:00:00.000Z'),
            plan: { displayName: 'Pro' },
        });

        await expect(service.processVnpayReturn({})).resolves.toBe('success');
        expect(subscriptionsService.upgradePlan).toHaveBeenCalledWith('user-1', 'pro', 'monthly');
    });
});
