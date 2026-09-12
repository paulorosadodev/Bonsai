"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <ErrorState title="Não foi possível carregar as configurações" onRetry={reset} />;
}
