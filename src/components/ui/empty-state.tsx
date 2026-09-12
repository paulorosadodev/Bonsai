import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClassName } from "./button";

export function EmptyState({ title, description, actionHref = "/transacoes/nova", actionLabel = "Adicionar transação", action }: { title: string; description: string; actionHref?: string; actionLabel?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-3 py-6">
            <h2 className="text-lg font-bold text-text">{title}</h2>
            <p className="text-sm text-muted">{description}</p>
            {action ?? (
                <Link href={actionHref} className={buttonClassName("primary")}>
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
