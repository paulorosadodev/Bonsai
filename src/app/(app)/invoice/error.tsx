"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function InvoiceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <ErrorState title="Não foi possível carregar a fatura" onRetry={reset} />;
}
