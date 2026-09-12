"use client";

import { useOptimistic } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import logo1 from "@/assets/logo.png";
import { financeSearchHref, isFinancePath } from "@/components/features/params";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/components/ui/cn";
import { useFinancePending } from "./finance-pending";

const desktopNavTabs = [
    { href: "/", label: "Resumo", match: (p: string) => p === "/", finance: true },
    { href: "/fatura", label: "Fatura", match: (p: string) => p.startsWith("/fatura"), finance: true },
    { href: "/transacoes", label: "Lista", match: (p: string) => p === "/transacoes" || (p.startsWith("/transacoes/") && !p.startsWith("/transacoes/nova")), finance: false },
    { href: "/ajustes", label: "Ajustes", match: (p: string) => p.startsWith("/ajustes"), finance: false },
];

export function AppHeader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const onFinance = isFinancePath(pathname);
    const urlChecked = searchParams.get("includeReimbursements") === "true";
    const [checked, setChecked] = useOptimistic(urlChecked);
    const { pending, pendingKind, start } = useFinancePending();
    const homeHref = onFinance ? financeSearchHref("/", searchParams) : "/";
    const isReimbursementPending = pending && pendingKind === "reimbursements";
    const progressLabel = pendingKind === "month" ? "Atualizando mês" : pendingKind === "year" ? "Atualizando ano" : pendingKind === "view" ? "Alternando visualização" : "Atualizando reembolsos";

    return (
        <header className="sticky top-0 z-30 bg-ink pt-[env(safe-area-inset-top,0px)]">
            <div className="relative mx-auto flex h-14 w-full max-w-lg lg:max-w-5xl items-center px-4">
                <Link href={homeHref} aria-label="Bonsai" className="inline-flex items-center gap-2">
                    <Image src={logo1} alt="" width={1000} height={1000} className="size-12 mt-1 object-contain" priority />
                    <span className="font-brand mt-1 text-3xl tracking-wide text-text [text-shadow:0_0_8px_color-mix(in_srgb,var(--orchid)_35%,transparent),0_0_18px_color-mix(in_srgb,var(--orchid)_18%,transparent)]">盆栽</span>
                </Link>
                <nav className="hidden lg:flex items-center gap-1 ml-6" aria-label="Principal">
                    {desktopNavTabs.map((tab) => {
                        const current = tab.match(pathname);
                        const resolvedHref = tab.finance && onFinance ? financeSearchHref(tab.href, searchParams, current) : tab.href;
                        return (
                            <Link key={tab.href} href={resolvedHref} aria-current={current ? "page" : undefined} className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", current ? "text-orchid bg-surface-raised/60" : "text-muted hover:text-text")}>
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="flex items-center gap-3 ml-auto">
                    {onFinance ? (
                        <Toggle
                            checked={checked}
                            className="gap-2"
                            aria-busy={isReimbursementPending || undefined}
                            onCheckedChange={(next) => {
                                const nextParams = new URLSearchParams(searchParams.toString());
                                if (next) {
                                    nextParams.set("includeReimbursements", "true");
                                } else {
                                    nextParams.delete("includeReimbursements");
                                }
                                const query = nextParams.toString();
                                const href = query ? `${pathname}?${query}` : pathname;

                                start(() => {
                                    setChecked(next);
                                    router.replace(href, { scroll: false });
                                }, "reimbursements");
                            }}
                        >
                            Reembolsos
                            {isReimbursementPending ? <LoaderCircle className="size-4 animate-spin text-orchid" aria-hidden /> : null}
                        </Toggle>
                    ) : null}
                </div>
                {pending ? (
                    <div className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label={progressLabel}>
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-violet" />
                    </div>
                ) : null}
            </div>
        </header>
    );
}
