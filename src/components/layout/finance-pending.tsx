"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";

export type PendingKind = "reimbursements" | "month" | "year" | "view" | null;

const FinancePending = createContext<{
    pending: boolean;
    pendingKind: PendingKind;
    start: (action: () => void, kind?: PendingKind) => void;
}>({
    pending: false,
    pendingKind: null,
    start: (action) => action(),
});

export function FinancePendingProvider({ children }: { children: ReactNode }) {
    const [pending, startTransition] = useTransition();
    const [pendingKind, setPendingKind] = useState<PendingKind>(null);

    const start = useCallback((action: () => void, kind: PendingKind = null) => {
        setPendingKind(kind);
        startTransition(() => {
            action();
        });
    }, []);

    const effectiveKind = pending ? pendingKind : null;

    return <FinancePending.Provider value={{ pending, pendingKind: effectiveKind, start }}>{children}</FinancePending.Provider>;
}

export function useFinancePending() {
    return useContext(FinancePending);
}

export function PendingMain({ children }: { children: ReactNode }) {
    const { pending, pendingKind } = useFinancePending();
    const label = pendingKind === "reimbursements" ? "Atualizando reembolsos" : pendingKind === "month" ? "Atualizando mês" : pendingKind === "year" ? "Atualizando ano" : pendingKind === "view" ? "Alternando visualização" : "Atualizando dados";

    const isDimmed = pending && pendingKind !== "view";

    return (
        <div className={isDimmed ? "pointer-events-none opacity-55 transition-opacity" : "transition-opacity"} aria-busy={pending || undefined}>
            {children}
            {pending ? <span className="sr-only">{label}</span> : null}
        </div>
    );
}
