import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus, User } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class SubscriptionsService {
    private readonly logger = new Logger(SubscriptionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly usageService: UsageService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
    ) {}

    async getPlans() {
        return this.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { monthlyPrice: 'asc' },
        });
    }

    async getByUserId(userId: string) {
        const subscription = await this.getActiveSubscription(userId);
        const usage = await this.usageService.getCurrentMonthUsage(userId);

        return {
            ...subscription,
            usage: {
                year: usage.year,
                month: usage.month,
                moviesWatched: usage.moviesWatched,
            },
        };
    }

    async getActiveSubscription(userId: string) {
        const subscription = await this.ensureUserSubscription(userId);

        if (subscription.plan.name === 'free' || subscription.endDate >= new Date()) {
            return subscription;
        }

        const freePlan = await this.getFreePlan();
        return {
            ...subscription,
            status: SubscriptionStatus.expired,
            autoRenew: false,
            plan: freePlan,
        };
    }

    async ensureUserSubscription(userId: string) {
        const existing = await this.prisma.subscription.findUnique({
            where: { userId },
            include: { plan: true },
        });

        if (existing) {
            return existing;
        }

        const freePlan = await this.prisma.subscriptionPlan.findUnique({
            where: { name: 'free' },
        });

        if (!freePlan) {
            throw new NotFoundException({
                code: 'FREE_PLAN_NOT_FOUND',
                message: 'Free plan is missing. Please seed subscription plans.',
            });
        }

        return this.prisma.subscription.create({
            data: {
                userId,
                planId: freePlan.id,
                status: SubscriptionStatus.active,
                startDate: new Date(),
                endDate: this.computeEndDate('annual'),
                autoRenew: true,
            },
            include: { plan: true },
        });
    }

    async upgradePlan(userId: string, planName: string, billingCycle: 'monthly' | 'annual') {
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

        const now = new Date();
        const endDate = this.computeEndDate(billingCycle, now);

        const subscription = await this.prisma.subscription.upsert({
            where: { userId },
            create: {
                userId,
                planId: plan.id,
                status: SubscriptionStatus.active,
                startDate: now,
                endDate,
                autoRenew: true,
            },
            update: {
                planId: plan.id,
                status: SubscriptionStatus.active,
                startDate: now,
                endDate,
                autoRenew: true,
            },
            include: { plan: true },
        });

        return {
            id: subscription.id,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew,
            plan: {
                id: subscription.plan.id,
                name: subscription.plan.name,
                displayName: subscription.plan.displayName,
                description: subscription.plan.description,
                maxMoviesPerMonth: subscription.plan.maxMoviesPerMonth,
                maxQualityResolution: subscription.plan.maxQualityResolution,
                maxFavorites: subscription.plan.maxFavorites,
                maxDevices: subscription.plan.maxDevices,
                showAds: subscription.plan.showAds,
                monthlyPrice: subscription.plan.monthlyPrice,
                annualPrice: subscription.plan.annualPrice,
                isActive: subscription.plan.isActive,
            },
        };
    }

    async cancelSubscription(userId: string) {
        const current = await this.ensureUserSubscription(userId);

        if (current.plan.name === 'free') {
            throw new BadRequestException({
                code: 'CANNOT_CANCEL_FREE_PLAN',
                message: 'Free plan cannot be canceled',
            });
        }

        if (current.endDate < new Date()) {
            throw new BadRequestException({
                code: 'SUBSCRIPTION_ALREADY_EXPIRED',
                message: 'Subscription is already expired',
            });
        }

        const updated = await this.prisma.subscription.update({
            where: { userId },
            data: {
                status: SubscriptionStatus.canceled,
                autoRenew: false,
            },
            include: {
                plan: true,
                user: true,
            },
        });

        await this.sendCanceledEmail(updated);
        const usage = await this.usageService.getCurrentMonthUsage(userId);

        return {
            id: updated.id,
            userId: updated.userId,
            planId: updated.planId,
            status: updated.status,
            startDate: updated.startDate,
            endDate: updated.endDate,
            autoRenew: updated.autoRenew,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            plan: updated.plan,
            usage: {
                year: usage.year,
                month: usage.month,
                moviesWatched: usage.moviesWatched,
            },
        };
    }

    async downgradeExpiredSubscriptionToFree(subscriptionId: string) {
        const current = await this.prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                plan: true,
                user: true,
            },
        });

        if (!current) {
            throw new NotFoundException({
                code: 'SUBSCRIPTION_NOT_FOUND',
                message: 'Subscription not found',
            });
        }

        if (current.plan.name === 'free') {
            return {
                changed: false,
                previousPlan: current.plan,
                subscription: current,
            };
        }

        const freePlan = await this.getFreePlan();
        const now = new Date();
        const updated = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                planId: freePlan.id,
                status: SubscriptionStatus.active,
                startDate: now,
                endDate: this.computeEndDate('annual', now),
                autoRenew: true,
            },
            include: {
                plan: true,
                user: true,
            },
        });

        return {
            changed: true,
            previousPlan: current.plan,
            subscription: updated,
        };
    }

    async getFreePlan(): Promise<SubscriptionPlan> {
        const freePlan = await this.prisma.subscriptionPlan.findUnique({
            where: { name: 'free' },
        });

        if (!freePlan) {
            throw new NotFoundException({
                code: 'FREE_PLAN_NOT_FOUND',
                message: 'Free plan is missing. Please seed subscription plans.',
            });
        }

        return freePlan;
    }

    private computeEndDate(cycle: 'monthly' | 'annual', baseDate: Date = new Date()) {
        const date = new Date(baseDate);
        if (cycle === 'annual') {
            date.setUTCFullYear(date.getUTCFullYear() + 1);
            return date;
        }

        date.setUTCMonth(date.getUTCMonth() + 1);
        return date;
    }

    private async sendCanceledEmail(subscription: {
        user: User;
        plan: SubscriptionPlan;
        endDate: Date;
    }) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';

        try {
            await this.mailService.sendSubscriptionCanceledEmail({
                to: subscription.user.email,
                displayName: subscription.user.displayName ?? subscription.user.email,
                planName: subscription.plan.displayName,
                endDate: subscription.endDate,
                renewUrl: `${frontendUrl}/profile/billing`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Subscription cancellation email failed for ${subscription.user.email}: ${message}`);
        }
    }
}
