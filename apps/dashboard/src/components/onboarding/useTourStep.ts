import { useCallback, useSyncExternalStore } from "react";
import { useOnboardingStep } from "../../api/hooks/useOnboarding";

export interface TourStepHandle {
  active: boolean;
  dismiss: () => void;
}

const dismissedSteps = new Set<number>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function useTourStep(step: number): TourStepHandle {
  const { data } = useOnboardingStep();
  const dismissed = useSyncExternalStore(
    subscribe,
    () => dismissedSteps.has(step),
    () => dismissedSteps.has(step),
  );

  const dismiss = useCallback(() => {
    if (dismissedSteps.has(step)) return;
    dismissedSteps.add(step);
    emit();
  }, [step]);

  const active = !!data && !data.completed && data.step === step && !dismissed;
  return { active, dismiss };
}
