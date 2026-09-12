"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { House, List, Plus, Receipt, Settings } from "lucide-react";
import { financeSearchHref, isFinancePath } from "@/components/features/params";
import { cn } from "../ui/cn";

const leftTabs = [
    { href: "/", label: "Resumo", icon: House, match: (pathname: string) => pathname === "/" },
    { href: "/fatura", label: "Fatura", icon: Receipt, match: (pathname: string) => pathname.startsWith("/fatura") },
] as const;

function isAdd(pathname: string) {
    return pathname.startsWith("/transacoes/nova");
}

function isList(pathname: string) {
    return pathname === "/transacoes" || (pathname.startsWith("/transacoes/") && !isAdd(pathname));
}

const rightTabs = [
    { href: "/transacoes", label: "Lista", icon: List, match: isList },
    { href: "/ajustes", label: "Ajustes", icon: Settings, match: (pathname: string) => pathname.startsWith("/ajustes") },
] as const;

function NavTab({ href, label, icon: Icon, current }: { href: string; label: string; icon: typeof House; current: boolean }) {
    return (
        <Link href={href} aria-current={current ? "page" : undefined} className={cn("flex min-h-11 flex-col items-center justify-center gap-0.5 pb-2 text-[11px]", current ? "font-semibold text-orchid" : "font-medium text-muted")}>
            <span className={cn("flex size-8 items-center justify-center rounded-lg", current && "bg-surface-raised")}>
                <Icon className="size-5" aria-hidden />
            </span>
            {label}
        </Link>
    );
}

export function BottomNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const carryFinanceQuery = isFinancePath(pathname);

    return (
        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-orchid/50 bg-surface shadow-[0_-16px_40px_rgb(8_5_16/0.85),inset_0_1px_0_rgb(216_180_254/0.28)] pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
            <div className="mx-auto grid h-18 max-w-lg grid-cols-5">
                {leftTabs.map((tab) => (
                    <NavTab key={tab.href} href={carryFinanceQuery ? financeSearchHref(tab.href, searchParams, tab.match(pathname)) : tab.href} label={tab.label} icon={tab.icon} current={tab.match(pathname)} />
                ))}
                <Link href="/transacoes/nova" aria-label="Adicionar transação" aria-current={isAdd(pathname) ? "page" : undefined} className="relative flex min-h-11 flex-col items-center justify-end pb-2 text-[11px] font-medium text-muted">
                    <span className="absolute bottom-7 flex size-14 items-center justify-center rounded-full bg-violet text-ink ring-[5px] ring-ink shadow-[0_8px_24px_rgb(167_139_250/0.35)]">
                        <Plus className="size-7" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className={cn("whitespace-nowrap", isAdd(pathname) && "font-semibold text-orchid")}>Adicionar</span>
                </Link>
                {rightTabs.map((tab) => (
                    <NavTab key={tab.href} href={tab.href} label={tab.label} icon={tab.icon} current={tab.match(pathname)} />
                ))}
            </div>
        </nav>
    );
}
