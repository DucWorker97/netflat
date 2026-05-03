import { ConfigService } from '@nestjs/config';
import { VnpayPaymentProvider } from './vnpay-payment.provider';

describe('VnpayPaymentProvider', () => {
    const createProvider = () => {
        const configService = {
            get: jest.fn((key: string) => {
                const values: Record<string, string> = {
                    VNPAY_TMN_CODE: 'TESTTMN',
                    VNPAY_HASH_SECRET: 'test-secret',
                    VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
                    VNPAY_RETURN_URL: 'http://localhost:3000/api/payments/vnpay-return',
                };
                return values[key];
            }),
        };

        return new VnpayPaymentProvider(configService as unknown as ConfigService);
    };

    it('creates stable signatures for sorted VNPay params', () => {
        const provider = createProvider();
        const first = provider.buildSignedQuery({
            vnp_TxnRef: 'abc123',
            vnp_Amount: '9900000',
            vnp_Command: 'pay',
        });
        const second = provider.buildSignedQuery({
            vnp_Command: 'pay',
            vnp_Amount: '9900000',
            vnp_TxnRef: 'abc123',
        });

        expect(first).toBe(second);
        expect(first).toContain('vnp_SecureHash=');
    });

    it('rejects missing or invalid secure hash values', () => {
        const provider = createProvider();
        const signed = provider.buildSignedQuery({
            vnp_TxnRef: 'abc123',
            vnp_Amount: '9900000',
            vnp_Command: 'pay',
        });
        const params = Object.fromEntries(new URLSearchParams(signed));

        expect(provider.verifyWebhookSignature({ ...params, vnp_SecureHash: 'bad' })).toBe(false);
        expect(provider.verifyWebhookSignature({ vnp_TxnRef: 'abc123' })).toBe(false);
    });

    it('builds a VNPay checkout URL with required payment params', async () => {
        const provider = createProvider();
        const session = await provider.createCheckoutSession({
            paymentId: '11111111-2222-3333-4444-555555555555',
            amount: 99000,
            currency: 'VND',
            planName: 'pro',
            billingCycle: 'monthly',
            userId: 'user-1',
            ipAddress: '127.0.0.1',
        });
        const url = new URL(session.checkoutUrl);

        expect(url.hostname).toBe('sandbox.vnpayment.vn');
        expect(url.searchParams.get('vnp_TmnCode')).toBe('TESTTMN');
        expect(url.searchParams.get('vnp_TxnRef')).toBe('11111111222233334444555555555555');
        expect(url.searchParams.get('vnp_Amount')).toBe('9900000');
        expect(url.searchParams.get('vnp_SecureHash')).toBeTruthy();
        expect(session.providerRef).toBe('11111111222233334444555555555555');
    });
});
