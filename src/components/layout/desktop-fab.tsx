"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

export function DesktopFab() {
    const pathname = usePathname();

    // Don't show if already creating a transaction
    if (pathname.startsWith("/transactions/new")) {
        return null;
    }

    return (
        <div className="hidden lg:block fixed bottom-8 right-8 z-40">
            <Link href="/transactions/new" aria-label="Adicionar transação" className="group relative flex size-13 items-center justify-center rounded-full bg-violet text-ink shadow-md shadow-black/30 transition-all duration-200 hover:bg-orchid hover:shadow-lg hover:shadow-black/40 hover:scale-105 active:scale-95">
                <Plus className="size-6 stroke-[2.5]" />

                {/* Chat-style tooltip label */}
                <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-xl bg-surface px-2.5 py-1.5 text-xs font-medium text-text shadow-lg border border-surface-raised opacity-0 transition-opacity duration-150 group-hover:opacity-100">Adicionar transação</span>
            </Link>
        </div>
    );
}
