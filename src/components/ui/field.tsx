import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { messageTone } from "./message";

export function Field({
    id,
    label,
    error,
    hint,
    className,
    type,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & {
    label: ReactNode;
    error?: string;
    hint?: string;
}) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
        <div className="flex flex-col gap-2.5">
            <label htmlFor={id} className="text-sm font-medium text-text">
                {label}
            </label>
            <input id={id} type={type} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn("min-h-11 w-full rounded-xl border-0 bg-surface px-3 text-base text-text placeholder:text-muted", error && "outline-2 outline-solid outline-danger", className)} {...props} suppressHydrationWarning={type === "date"} />
            {error ? (
                <p id={errorId} className={messageTone.danger}>
                    {error}
                </p>
            ) : null}
            {hint && !error ? (
                <p id={hintId} className="text-sm text-muted">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
