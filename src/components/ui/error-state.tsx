import { Button } from "./button";
import { messageTone } from "./message";

export function ErrorState({ title = "Não foi possível carregar", description = "Tente de novo em alguns instantes.", retryLabel = "Tentar de novo", onRetry }: { title?: string; description?: string; retryLabel?: string; onRetry?: () => void }) {
    return (
        <div className="flex flex-col items-start gap-3 py-6">
            <div className={`${messageTone.danger} w-full`}>
                <h2 className="text-lg font-bold text-danger-fg">{title}</h2>
                <p className="mt-1 text-sm text-danger-fg/90">{description}</p>
            </div>
            {onRetry ? (
                <Button variant="secondary" onClick={onRetry}>
                    {retryLabel}
                </Button>
            ) : null}
        </div>
    );
}
