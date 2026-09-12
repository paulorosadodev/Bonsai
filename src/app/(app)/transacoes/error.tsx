"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function TransactionsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <ErrorState title="Não foi possível carregar as transações" onRetry={reset} />;
}
