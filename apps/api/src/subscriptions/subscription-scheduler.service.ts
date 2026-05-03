import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionSchedulerService {
    private readonly logger = new Logger(SubscriptionSchedulerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleExpiringSubscriptions() {
        const now = new Date();
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);

        const expiring = await this.prisma.subscription.findMany({
            where: {
                status: { in: [SubscriptionStatus.active, SubscriptionStatus.canceled] },
                endDate: {
                    gte: now,
                    lte: sevenDaysFromNow,
                },
                plan: {
                    name: { not: 'free' },
                },
            },
            include: {
                user: true,
                plan: true,
            },
        });

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
        for (const subscription of expiring) {
            try {
                await this.mailService.sendSubscriptionExpiringEmail({
                    to: subscription.user.email,
                    displayName: subscription.user.displayName ?? subscription.user.email,
                    planName: subscription.plan.displayName,
                    endDate: subscription.endDate,
                    renewUrl: `${frontendUrl}/pricing`,
                });
                this.logger.log(`Expiring subscription notice sent to ${subscription.user.email}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Expiring subscription notice failed for ${subscription.user.email}: ${message}`);
            }
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleExpiredSubscriptions() {
        const expired = await this.prisma.subscription.findMany({
            where: {
                status: { in: [SubscriptionStatus.active, SubscriptionStatus.canceled, SubscriptionStatus.expired] },
                endDate: { lt: new Date() },
                plan: {
                    name: { not: 'free' },
                },
            },
            include: {
                user: true,
                plan: true,
            },
        });

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
        for (const subscription of expired) {
            try {
                const result = await this.subscriptionsService.downgradeExpiredSubscriptionToFree(subscription.id);
                if (!result.changed) {
                    continue;
                }

                await this.mailService.sendSubscriptionExpiredEmail({
                    to: result.subscription.user.email,
                    displayName: result.subscription.user.displayName ?? result.subscription.user.email,
                    upgradeUrl: `${frontendUrl}/pricing`,
                });

                this.logger.log(
                    `Expired subscription downgraded to Free: ${subscription.user.email} (${subscription.plan.name})`,
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Expired subscription handling failed for ${subscription.id}: ${message}`);
            }
        }
    }
}
