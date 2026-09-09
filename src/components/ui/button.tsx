import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

const variants = {
    primary: "bg-violet text-ink hover:bg-orchid",
    secondary: "bg-surface-raised text-text hover:bg-[#32225a] hover:text-white border border-transparent hover:border-violet/30",
    ghost: "bg-transparent text-text hover:bg-surface-raised",
    danger: "bg-danger text-ink hover:brightness-110",
    dangerSoft: "bg-danger/15 text-danger-fg hover:bg-danger/25",
} as const;

const sizes = {
    md: "min-h-11 px-4 text-sm",
    sm: "min-h-11 px-3 text-sm",
    icon: "size-11",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClassName(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
    return cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium touch-manipulation transition-colors disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className);
}

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    className,
    disabled,
    children,
    type = "button",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}) {
    return (
        <button type={type} className={buttonClassName(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {children}
        </button>
    );
}
