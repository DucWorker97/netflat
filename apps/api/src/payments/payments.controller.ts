import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CompleteMockPaymentDto } from './dto/complete-mock-payment.dto';
import { MockWebhookDto } from './dto/mock-webhook.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('checkout')
    @HttpCode(HttpStatus.CREATED)
    async createCheckout(@CurrentUser() user: User, @Body() dto: CreateCheckoutDto) {
        const checkout = await this.paymentsService.createCheckout(
            user.id,
            dto.planName,
            dto.billingCycle,
        );

        return { data: checkout };
    }

    @Post('mock-complete')
    @HttpCode(HttpStatus.OK)
    async completeMockPayment(@CurrentUser() user: User, @Body() dto: CompleteMockPaymentDto) {
        const payment = await this.paymentsService.completeMockPayment(
            dto.paymentId,
            user.id,
            dto.planName,
            dto.billingCycle ?? 'monthly',
        );
        return { data: payment };
    }

    @Post('mock-webhook')
    @HttpCode(HttpStatus.OK)
    async processMockWebhook(
        @Headers('x-webhook-secret') webhookSecret: string | undefined,
        @Body() dto: MockWebhookDto,
    ) {
        const payment = await this.paymentsService.processMockWebhook(dto, webhookSecret);
        return { data: payment };
    }

    @Get('history')
    async getHistory(
        @CurrentUser() user: User,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '20', 10);
        const result = await this.paymentsService.getHistory(user.id, pageNum, limitNum);

        return {
            data: result.data,
            meta: {
                page: pageNum,
                limit: limitNum,
                total: result.total,
                totalPages: Math.ceil(result.total / limitNum),
                hasNext: pageNum * limitNum < result.total,
                hasPrev: pageNum > 1,
            },
        };
    }
}
