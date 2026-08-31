import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import logo1 from "@/assets/logo.png";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { FinancePendingProvider, PendingMain } from "./finance-pending";

function HeaderFallback() {
    return (
        <header className="sticky top-0 z-30 bg-ink pt-[env(safe-area-inset-top,0px)]">
            <div className="mx-auto flex h-14 w-full max-w-lg items-center px-4">
                <span className="inline-flex items-center gap-2">
                    <Image src={logo1} alt="" width={1000} height={1000} className="size-13 object-contain" priority />
                    <span className="mt-1 font-brand text-3xl tracking-wide text-text [text-shadow:0_0_8px_color-mix(in_srgb,var(--orchid)_35%,transparent),0_0_18px_color-mix(in_srgb,var(--orchid)_18%,transparent)]">盆栽</span>
                </span>
            </div>
        </header>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-dvh bg-ink text-text">
            <FinancePendingProvider>
                <Suspense fallback={<HeaderFallback />}>
                    <AppHeader />
                </Suspense>
                <main className="mx-auto w-full max-w-lg px-4 pt-3 pb-(--page-pad-bottom)">
                    <PendingMain>{children}</PendingMain>
                </main>
            </FinancePendingProvider>
            <Suspense>
                <BottomNav />
            </Suspense>
        </div>
    );
}
