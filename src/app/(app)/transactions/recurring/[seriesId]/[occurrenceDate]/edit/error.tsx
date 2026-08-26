"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function EditRecurringError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <ErrorState title="Não foi possível carregar a recorrência" onRetry={reset} />;
}
