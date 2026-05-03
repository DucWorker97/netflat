/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
    const freePlan = {
        id: 'free-plan',
        name: 'free',
        displayName: 'Free',
        maxMoviesPerMonth: 5,
        maxQualityResolution: '480p',
        maxFavorites: 10,
        maxDevices: 1,
        showAds: true,
        monthlyPrice: 0,
        annualPrice: 0,
        isActive: true,
    };

    const createService = () => {
        const prisma = {
            subscription: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            subscriptionPlan: {
                findUnique: jest.fn(),
            },
        };
        const usageService = {
            getCurrentMonthUsage: jest.fn().mockResolvedValue({
                year: 2026,
                month: 4,
                moviesWatched: 0,
            }),
        };
        const mailService = {
            sendSubscriptionCanceledEmail: jest.fn(),
        };
        const configService = {
            get: jest.fn().mockReturnValue('http://localhost:3002'),
        };

        return {
            prisma,
            usageService,
            mailService,
            service: new SubscriptionsService(
                prisma as any,
                usageService as any,
                mailService as any,
                configService as any,
            ),
        };
    };

    it('uses the Free plan as the effective plan after a paid subscription expires', async () => {
        const { prisma, service } = createService();
        prisma.subscription.findUnique.mockResolvedValue({
            id: 'sub-1',
            userId: 'user-1',
            status: SubscriptionStatus.active,
            endDate: new Date('2026-01-01T00:00:00.000Z'),
            autoRenew: true,
            plan: { ...freePlan, id: 'pro-plan', name: 'pro', displayName: 'Pro' },
        });
        prisma.subscriptionPlan.findUnique.mockResolvedValue(freePlan);

        const subscription = await service.getActiveSubscription('user-1');

        expect(subscription.status).toBe(SubscriptionStatus.expired);
        expect(subscription.autoRenew).toBe(false);
        expect(subscription.plan.name).toBe('free');
    });

    it('does not allow canceling the Free plan', async () => {
        const { prisma, service } = createService();
        prisma.subscription.findUnique.mockResolvedValue({
            id: 'sub-1',
            userId: 'user-1',
            endDate: new Date('2027-01-01T00:00:00.000Z'),
            plan: freePlan,
        });

        await expect(service.cancelSubscription('user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancels a paid plan at period end', async () => {
        const { prisma, mailService, service } = createService();
        const paidPlan = { ...freePlan, id: 'pro-plan', name: 'pro', displayName: 'Pro' };
        prisma.subscription.findUnique.mockResolvedValue({
            id: 'sub-1',
            userId: 'user-1',
            endDate: new Date('2027-01-01T00:00:00.000Z'),
            plan: paidPlan,
        });
        prisma.subscription.update.mockResolvedValue({
            id: 'sub-1',
            userId: 'user-1',
            status: SubscriptionStatus.canceled,
            endDate: new Date('2027-01-01T00:00:00.000Z'),
            autoRenew: false,
            plan: paidPlan,
            user: { email: 'user@example.com', displayName: null },
        });

        const subscription = await service.cancelSubscription('user-1');

        expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
            data: {
                status: SubscriptionStatus.canceled,
                autoRenew: false,
            },
        }));
        expect(mailService.sendSubscriptionCanceledEmail).toHaveBeenCalled();
        expect(subscription.status).toBe(SubscriptionStatus.canceled);
        expect(subscription.autoRenew).toBe(false);
    });
});
