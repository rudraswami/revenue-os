import { SetMetadata } from "@nestjs/common";

export const SKIP_SUBSCRIPTION_CHECK = "skipSubscriptionCheck";
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_CHECK, true);
