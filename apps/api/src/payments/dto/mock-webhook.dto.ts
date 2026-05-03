import { IsIn, IsString } from 'class-validator';

export class MockWebhookDto {
    @IsString()
    paymentId!: string;

    @IsString()
    @IsIn(['free', 'pro', 'premium'])
    planName!: string;

    @IsString()
    @IsIn(['monthly', 'annual'])
    billingCycle: 'monthly' | 'annual' = 'monthly';
}
