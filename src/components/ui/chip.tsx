import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

const tones = {
    default: "text-text",
    reimbursement: "text-mint",
    muted: "text-muted",
} as const;

export function Chip({
    selected = false,
    tone = "default",
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    selected?: boolean;
    tone?: keyof typeof tones;
}) {
    return <button type="button" aria-pressed={selected} className={cn("inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium touch-manipulation", selected ? "bg-surface-raised" : "bg-surface", tones[tone], tone === "reimbursement" && "shadow-[inset_3px_0_0_0_var(--mint)]", selected && tone !== "reimbursement" && "shadow-[inset_3px_0_0_0_var(--violet)]", className)} {...props} />;
}
