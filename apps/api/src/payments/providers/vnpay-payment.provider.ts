import { createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CheckoutSession,
    CreateCheckoutSessionParams,
    PaymentProvider,
    WebhookEvent,
} from './payment-provider.interface';

const VNPAY_VERSION = '2.1.0';
const DEFAULT_VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_API_PUBLIC_URL = 'http://localhost:3000';

type VnpayParams = Record<string, string>;

@Injectable()
export class VnpayPaymentProvider implements PaymentProvider {
    readonly name = 'vnpay';

    constructor(private readonly configService: ConfigService) {}

    async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
        const providerRef = this.createProviderReference(params.paymentId);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
        const vnpayParams: VnpayParams = {
            vnp_Version: VNPAY_VERSION,
            vnp_Command: 'pay',
            vnp_TmnCode: this.getRequiredConfig('VNPAY_TMN_CODE'),
            vnp_Amount: String(Math.round(params.amount * 100)),
            vnp_CurrCode: 'VND',
            vnp_TxnRef: providerRef,
            vnp_OrderInfo: this.buildOrderInfo(params.planName, params.billingCycle, providerRef),
            vnp_OrderType: 'other',
            vnp_ReturnUrl: params.returnUrl || this.getReturnUrl(),
            vnp_IpAddr: this.normalizeIp(params.ipAddress),
            vnp_CreateDate: this.formatVnpayDate(now),
            vnp_ExpireDate: this.formatVnpayDate(expiresAt),
            vnp_Locale: 'vn',
        };

        const checkoutUrl = `${this.getVnpayUrl()}?${this.buildSignedQuery(vnpayParams)}`;

        return {
            checkoutUrl,
            providerRef,
        };
    }

    verifyWebhookSignature(payload: unknown): boolean {
        const params = this.extractVnpayParams(payload);
        const secureHash = params.vnp_SecureHash;

        if (!secureHash) {
            return false;
        }

        delete params.vnp_SecureHash;
        delete params.vnp_SecureHashType;

        const signed = this.sign(params);
        return secureHash.toLowerCase() === signed.toLowerCase();
    }

    async parseWebhookEvent(payload: unknown): Promise<WebhookEvent> {
        const params = this.extractVnpayParams(payload);
        const responseCode = params.vnp_ResponseCode;
        const transactionStatus = params.vnp_TransactionStatus;
        const providerReference = params.vnp_TxnRef;
        const amount = Number(params.vnp_Amount);
        const success = responseCode === '00' && transactionStatus === '00';

        return {
            eventType: success ? 'payment.completed' : 'payment.failed',
            providerReference,
            providerRef: providerReference,
            providerTransactionId: params.vnp_TransactionNo,
            responseCode,
            transactionStatus,
            amount: Number.isFinite(amount) ? amount / 100 : undefined,
            rawPayload: params,
        };
    }

    buildSignedQuery(params: VnpayParams): string {
        return this.toQueryString({
            ...params,
            vnp_SecureHash: this.sign(params),
        });
    }

    createProviderReference(paymentId: string): string {
        return paymentId.replace(/-/g, '');
    }

    private sign(params: VnpayParams): string {
        const signData = this.toQueryString(params);
        return createHmac('sha512', this.getRequiredConfig('VNPAY_HASH_SECRET'))
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');
    }

    private toQueryString(params: VnpayParams): string {
        return Object.keys(params)
            .filter((key) => params[key] !== undefined && params[key] !== null)
            .sort()
            .map((key) => `${this.encode(key)}=${this.encode(params[key])}`)
            .join('&');
    }

    private extractVnpayParams(payload: unknown): VnpayParams {
        if (!payload || typeof payload !== 'object') {
            return {};
        }

        return Object.entries(payload as Record<string, unknown>).reduce<VnpayParams>((acc, [key, value]) => {
            if (!key.startsWith('vnp_')) {
                return acc;
            }

            if (Array.isArray(value)) {
                acc[key] = String(value[0] ?? '');
                return acc;
            }

            acc[key] = String(value ?? '');
            return acc;
        }, {});
    }

    private getReturnUrl(): string {
        const configured = this.configService.get<string>('VNPAY_RETURN_URL')?.trim();
        if (configured) {
            return configured;
        }

        const apiPublicUrl = this.configService.get<string>('API_PUBLIC_URL')?.trim() || DEFAULT_API_PUBLIC_URL;
        return `${apiPublicUrl.replace(/\/$/, '')}/api/payments/vnpay-return`;
    }

    private getVnpayUrl(): string {
        return this.configService.get<string>('VNPAY_URL')?.trim() || DEFAULT_VNPAY_URL;
    }

    private getRequiredConfig(key: string): string {
        const value = this.configService.get<string>(key)?.trim();
        if (!value) {
            throw new Error(`${key} is required for VNPay payments`);
        }
        return value;
    }

    private buildOrderInfo(planName: string, billingCycle: string, providerRef: string): string {
        return `Thanh toan goi ${planName} ${billingCycle} Netflat ${providerRef}`;
    }

    private normalizeIp(value?: string): string {
        const firstIp = value?.split(',')[0]?.trim();
        if (!firstIp || firstIp === '::1') {
            return '127.0.0.1';
        }

        return firstIp.startsWith('::ffff:') ? firstIp.slice('::ffff:'.length) : firstIp;
    }

    private formatVnpayDate(date: Date): string {
        const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const year = String(gmt7.getUTCFullYear());
        const month = String(gmt7.getUTCMonth() + 1).padStart(2, '0');
        const day = String(gmt7.getUTCDate()).padStart(2, '0');
        const hours = String(gmt7.getUTCHours()).padStart(2, '0');
        const minutes = String(gmt7.getUTCMinutes()).padStart(2, '0');
        const seconds = String(gmt7.getUTCSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    private encode(value: string): string {
        return encodeURIComponent(value).replace(/%20/g, '+');
    }
}
