import { SetMetadata } from '@nestjs/common';
import { POLICY_KEY, PolicyType, PolicyOptions } from '../guards/policy.guard';

export const CheckPolicy = (type: PolicyType, options?: PolicyOptions) =>
    SetMetadata(POLICY_KEY, { type, options });

export const MovieReadPolicy = (param = 'id') =>
    CheckPolicy('MovieRead', { param });

export const MovieVisiblePolicy = (param = 'movieId') =>
    CheckPolicy('MovieVisible', { param });

export const MovieWritePolicy = () =>
    CheckPolicy('MovieWrite');

export const UserOwnedPolicy = () =>
    CheckPolicy('UserOwned');
