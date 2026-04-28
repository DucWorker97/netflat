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
            paymentProvider,
            service: new PaymentsService(
                prisma as any,
                subscriptionsService as any,
                mailService as any,
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
});
