"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export function Toggle({
    checked,
    onCheckedChange,
    className,
    children,
    ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <button type="button" role="switch" aria-checked={checked} className={cn("inline-flex min-h-11 items-center gap-3 text-left text-sm font-medium text-text touch-manipulation", className)} onClick={() => onCheckedChange(!checked)} {...props}>
            <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-violet" : "bg-surface-raised")}>
                <span className={cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-text transition-transform", checked && "translate-x-5")} />
            </span>
            {children}
        </button>
    );
}
