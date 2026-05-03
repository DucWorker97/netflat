import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CompleteMockPaymentDto } from './dto/complete-mock-payment.dto';
import { MockWebhookDto } from './dto/mock-webhook.dto';

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly configService: ConfigService,
    ) {}

    @Post('checkout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async createCheckout(
        @CurrentUser() user: User,
        @Body() dto: CreateCheckoutDto,
        @Req() request: Request,
    ) {
        const checkout = await this.paymentsService.createCheckout(
            user.id,
            dto.planName,
            dto.billingCycle,
            this.getClientIp(request),
        );

        return { data: checkout };
    }

    @Post('mock-complete')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async completeMockPayment(@CurrentUser() user: User, @Body() dto: CompleteMockPaymentDto) {
        const payment = await this.paymentsService.completeMockPayment(
            dto.paymentId,
            user.id,
            dto.planName,
            dto.billingCycle,
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

    @Get('vnpay-ipn')
    async processVnpayIpn(@Query() query: Record<string, unknown>) {
        return this.paymentsService.processVnpayIpn(query);
    }

    @Get('vnpay-return')
    async processVnpayReturn(
        @Query() query: Record<string, unknown>,
        @Res() response: Response,
    ) {
        const status = await this.paymentsService.processVnpayReturn(query);
        return response.redirect(this.buildBillingRedirectUrl(status));
    }

    @Get('history')
    @UseGuards(JwtAuthGuard)
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

    private getClientIp(request: Request) {
        const forwardedFor = request.headers['x-forwarded-for'];
        if (Array.isArray(forwardedFor)) {
            return forwardedFor[0];
        }
        return forwardedFor || request.ip || request.socket.remoteAddress;
    }

    private buildBillingRedirectUrl(status: string) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
        const url = new URL('/profile/billing', frontendUrl);
        url.searchParams.set('vnpay', status);
        return url.toString();
    }
}
