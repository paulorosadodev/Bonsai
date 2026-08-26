"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function EditTransactionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <ErrorState title="Não foi possível carregar a transação" onRetry={reset} />;
}
