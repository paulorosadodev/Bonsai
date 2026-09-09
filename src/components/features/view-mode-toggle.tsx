"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useFinancePending } from "@/components/layout/finance-pending";
import { cn } from "@/components/ui/cn";
import { currentMonth, currentYear } from "./params";

interface ViewModeToggleProps {
    view: "monthly" | "annual";
    currentYearValue?: number;
}

export function ViewModeToggle({ view, currentYearValue }: ViewModeToggleProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { start } = useFinancePending();
    const [prevViewProp, setPrevViewProp] = useState(view);
    const [selectedView, setSelectedView] = useState<"monthly" | "annual">(view);
    const reduce = useReducedMotion();

    if (view !== prevViewProp) {
        setPrevViewProp(view);
        setSelectedView(view);
    }

    const handleSwitch = (targetView: "monthly" | "annual") => {
        if (targetView === selectedView) return;

        setSelectedView(targetView);

        const nextParams = new URLSearchParams(searchParams.toString());

        if (targetView === "annual") {
            nextParams.set("view", "annual");
            const yr = currentYearValue ?? currentYear();
            nextParams.set("year", String(yr));
            nextParams.delete("month");
        } else {
            nextParams.delete("view");
            nextParams.delete("year");
            nextParams.set("month", currentMonth());
        }

        const query = nextParams.toString();
        const href = query ? `${pathname}?${query}` : pathname;

        start(() => {
            router.push(href, { scroll: false });
        }, "view");
    };

    return (
        <div role="tablist" aria-label="Modo de visualização" className="relative grid grid-cols-2 p-1 self-center w-52 sm:w-56 rounded-2xl bg-surface/90 border border-surface-raised/70 shadow-inner">
            <motion.div
                className="absolute top-1 bottom-1 left-1 rounded-xl bg-surface-raised border border-violet/35 shadow-[0_2px_10px_rgba(8,5,16,0.6)]"
                style={{
                    width: "calc(50% - 4px)",
                }}
                initial={false}
                animate={{
                    x: selectedView === "monthly" ? "0%" : "100%",
                }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 28 }}
                aria-hidden="true"
            />
            <button type="button" role="tab" id="view-mode-monthly" aria-selected={selectedView === "monthly"} onClick={() => handleSwitch("monthly")} className={cn("relative z-10 py-1.5 text-xs font-semibold text-center rounded-xl transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet select-none", selectedView === "monthly" ? "text-text" : "text-muted hover:text-text")}>
                Mensal
            </button>
            <button type="button" role="tab" id="view-mode-annual" aria-selected={selectedView === "annual"} onClick={() => handleSwitch("annual")} className={cn("relative z-10 py-1.5 text-xs font-semibold text-center rounded-xl transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet select-none", selectedView === "annual" ? "text-text" : "text-muted hover:text-text")}>
                Anual
            </button>
        </div>
    );
}
