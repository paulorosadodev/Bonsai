"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";

const FinancePending = createContext<{
    pending: boolean;
    start: (action: () => void) => void;
}>({
    pending: false,
    start: (action) => action(),
});

export function FinancePendingProvider({ children }: { children: ReactNode }) {
    const [pending, start] = useTransition();

    return <FinancePending.Provider value={{ pending, start }}>{children}</FinancePending.Provider>;
}

export function useFinancePending() {
    return useContext(FinancePending);
}

export function PendingMain({ children }: { children: ReactNode }) {
    const { pending } = useFinancePending();

    return (
        <div className={pending ? "pointer-events-none opacity-55 transition-opacity" : "transition-opacity"} aria-busy={pending || undefined}>
            {children}
            {pending ? <span className="sr-only">Atualizando reembolsos</span> : null}
        </div>
    );
}
