import { IsIn, IsString } from 'class-validator';

export class UpgradePlanDto {
    @IsString()
    @IsIn(['free', 'pro', 'premium'])
    planName!: string;

    @IsString()
    @IsIn(['monthly', 'annual'])
    billingCycle: 'monthly' | 'annual' = 'monthly';
}
