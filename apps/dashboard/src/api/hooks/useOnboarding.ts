import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface OnboardingStep {
  step: number;
  completed: boolean;
}

const KEY = ["onboarding", "me"] as const;

export function useOnboardingStep() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<OnboardingStep | null | "">("/onboarding/me");
      return res.data ? (res.data as OnboardingStep) : null;
    },
    staleTime: 30_000,
  });
}

export function useCompleteOnboardingStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: number) => {
      const res = await api.post<OnboardingStep | null | "">("/onboarding/me/complete", {
        step,
      });
      return res.data ? (res.data as OnboardingStep) : null;
    },
    onSuccess: (next) => {
      qc.setQueryData(KEY, next);
    },
  });
}
