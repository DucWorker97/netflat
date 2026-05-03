import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) {}

    @Get('plans')
    async getPlans() {
        const plans = await this.subscriptionsService.getPlans();
        return { data: plans };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMySubscription(@CurrentUser() user: User) {
        const subscription = await this.subscriptionsService.getByUserId(user.id);
        return { data: subscription };
    }

    @Post('upgrade')
    @UseGuards(JwtAuthGuard)
    async upgradePlan(@CurrentUser() user: User, @Body() dto: UpgradePlanDto) {
        if (dto.planName !== 'free') {
            throw new BadRequestException({
                code: 'PAID_PLAN_REQUIRES_CHECKOUT',
                message: 'Paid plans must be activated through checkout',
            });
        }

        const subscription = await this.subscriptionsService.upgradePlan(
            user.id,
            dto.planName,
            dto.billingCycle,
        );

        return { data: subscription };
    }

    @Post('cancel')
    @UseGuards(JwtAuthGuard)
    async cancelSubscription(@CurrentUser() user: User) {
        const subscription = await this.subscriptionsService.cancelSubscription(user.id);
        return { data: subscription };
    }
}
