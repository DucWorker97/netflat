import { IsIn, IsString } from 'class-validator';

export class CreateCheckoutDto {
    @IsString()
    @IsIn(['free', 'pro', 'premium'])
    planName!: string;

    @IsString()
    @IsIn(['monthly', 'annual'])
    billingCycle: 'monthly' | 'annual' = 'monthly';
}
