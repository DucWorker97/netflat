import { IsIn, IsOptional, IsString } from 'class-validator';

export class CompleteMockPaymentDto {
    @IsString()
    paymentId!: string;

    @IsOptional()
    @IsString()
    @IsIn(['free', 'pro', 'premium'])
    planName?: string;

    @IsOptional()
    @IsString()
    @IsIn(['monthly', 'annual'])
    billingCycle?: 'monthly' | 'annual';
}
