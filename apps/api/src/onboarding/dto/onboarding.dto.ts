import { IsInt, Max, Min } from "class-validator";

export const ONBOARDING_MAX_STEP = 5;

export class CompleteOnboardingDto {
  @IsInt()
  @Min(1)
  @Max(ONBOARDING_MAX_STEP)
  step!: number;
}

export interface OnboardingStepResponse {
  step: number;
  completed: boolean;
}
