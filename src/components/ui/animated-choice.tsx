"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
import type { TransactionVisual } from "@/components/features/transaction-visuals";
import { visualStyle } from "@/components/features/transaction-visuals";
import { cn } from "./cn";

export function AnimatedChoice({
    selected,
    visual,
    layoutId,
    children,
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    selected: boolean;
    visual: TransactionVisual;
    layoutId?: string;
    children: ReactNode;
}) {
    const Icon = visual.icon;

    return (
        <button
            type="button"
            aria-pressed={selected}
            className={cn("group relative isolate inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl px-3 text-sm font-medium text-muted touch-manipulation transition-colors", selected && "text-text", className)}
            style={visualStyle(visual)}
            {...props}
        >
            {selected ? (
                <motion.span
                    layoutId={layoutId}
                    className="absolute inset-0 -z-10 rounded-[inherit] border border-(--choice-color) bg-[color-mix(in_srgb,var(--choice-color)_16%,var(--surface))] shadow-[inset_0_0_18px_color-mix(in_srgb,var(--choice-color)_10%,transparent)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
            ) : (
                <span className="absolute inset-0 -z-10 rounded-[inherit] bg-surface transition-colors group-hover:bg-[color-mix(in_srgb,var(--choice-color)_12%,var(--surface))]" />
            )}
            <Icon className={cn("size-4 shrink-0 transition-colors", selected ? "text-(--choice-color)" : "text-muted group-hover:text-(--choice-color)")} aria-hidden />
            <span>{children}</span>
        </button>
    );
}
