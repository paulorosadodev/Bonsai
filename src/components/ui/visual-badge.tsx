import type { ReactNode } from "react";
import type { TransactionVisual } from "@/components/features/transaction-visuals";
import { visualStyle } from "@/components/features/transaction-visuals";
import { cn } from "./cn";

export function VisualBadge({ visual, children, className }: { visual: TransactionVisual; children: ReactNode; className?: string }) {
    const Icon = visual.icon;

    return (
        <span
            className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--choice-color)_12%,var(--surface-raised))] px-2.5 text-xs font-medium text-text", className)}
            style={visualStyle(visual)}
        >
            <Icon className="size-3.5 shrink-0 text-(--choice-color)" aria-hidden />
            {children}
        </span>
    );
}
