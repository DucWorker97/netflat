/* eslint-disable @typescript-eslint/no-explicit-any */
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';

describe('SubscriptionSchedulerService', () => {
    it('downgrades expired paid subscriptions and sends expired email', async () => {
        const prisma = {
            subscription: {
                findMany: jest.fn().mockResolvedValue([
                    {
                        id: 'sub-1',
                        user: { email: 'user@example.com', displayName: 'User' },
                        plan: { name: 'pro' },
                    },
                ]),
            },
        };
        const subscriptionsService = {
            downgradeExpiredSubscriptionToFree: jest.fn().mockResolvedValue({
                changed: true,
                subscription: {
                    user: { email: 'user@example.com', displayName: 'User' },
                },
            }),
        };
        const mailService = {
            sendSubscriptionExpiredEmail: jest.fn(),
        };
        const configService = {
            get: jest.fn().mockReturnValue('http://localhost:3002'),
        };
        const service = new SubscriptionSchedulerService(
            prisma as any,
            subscriptionsService as any,
            mailService as any,
            configService as any,
        );

        await service.handleExpiredSubscriptions();

        expect(prisma.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                status: {
                    in: [SubscriptionStatus.active, SubscriptionStatus.canceled, SubscriptionStatus.expired],
                },
            }),
        }));
        expect(subscriptionsService.downgradeExpiredSubscriptionToFree).toHaveBeenCalledWith('sub-1');
        expect(mailService.sendSubscriptionExpiredEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'user@example.com',
        }));
    });
});
