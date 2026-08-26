import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { messageTone } from "./message";

export function Select({
    id,
    label,
    error,
    hint,
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
    label?: ReactNode;
    error?: string;
    hint?: string;
}) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
        <div className={cn("flex flex-col", label ? "gap-2.5" : null)}>
            {label ? (
                <label htmlFor={id} className="text-sm font-medium text-text">
                    {label}
                </label>
            ) : null}
            <select
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={cn("min-h-11 w-full appearance-none rounded-xl border-0 bg-surface bg-size-[1rem] bg-position-[right_0.75rem_center] bg-no-repeat px-3 pr-10 text-base text-text", error && "outline-2 outline-solid outline-danger", className)}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A398B5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                }}
                {...props}
            >
                {children}
            </select>
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
