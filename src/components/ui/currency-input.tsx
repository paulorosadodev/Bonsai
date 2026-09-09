"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { formatBrl, parseBrlToCents } from "@/lib/domain/money";
import { cn } from "./cn";
import { messageTone } from "./message";

export type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
    label: ReactNode;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    error?: string;
    hint?: string;
};

export function parsePastedCurrency(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return "";

    let normalized = trimmed;
    // Converts US decimal format like 1250.50 or 1250.5 to Brazilian 1250,50
    if (/^\d+(?:\.\d{1,2})$/.test(normalized)) {
        normalized = normalized.replace(".", ",");
    }

    try {
        const cents = parseBrlToCents(normalized);
        return cents > 0 ? formatBrl(cents) : "";
    } catch {
        const digits = trimmed.replace(/\D/g, "");
        if (!digits) return "";
        const cents = Number(digits.slice(0, 11));
        return cents > 0 ? formatBrl(cents) : "";
    }
}

export function CurrencyInput({ id: explicitId, label, value: controlledValue, defaultValue, onChange, onBlur, onFocus, error, hint, placeholder = "R$ 0,00", className, disabled, ...props }: CurrencyInputProps) {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const inputRef = useRef<HTMLInputElement>(null);

    const [internalValue, setInternalValue] = useState<string>(defaultValue ?? "");
    const isControlled = controlledValue !== undefined;
    const displayValue = isControlled ? (controlledValue ?? "") : internalValue;

    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    const updateValue = (nextValue: string) => {
        if (!isControlled) {
            setInternalValue(nextValue);
        }
        onChange?.(nextValue);
    };

    // Keep cursor at the end for active text input when digits are updated
    useEffect(() => {
        const input = inputRef.current;
        if (input && document.activeElement === input) {
            if (input.selectionStart === input.selectionEnd) {
                const len = input.value.length;
                input.setSelectionRange(len, len);
            }
        }
    }, [displayValue]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;

        if (e.key === "Backspace") {
            // If entire field or selection is highlighted
            if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
                e.preventDefault();
                updateValue("");
                return;
            }

            if (input.selectionStart === input.selectionEnd) {
                e.preventDefault();
                const digits = displayValue.replace(/\D/g, "");
                const nextDigits = digits.slice(0, -1);
                if (!nextDigits || Number(nextDigits) === 0) {
                    updateValue("");
                } else {
                    const cents = Number(nextDigits);
                    updateValue(formatBrl(cents));
                }
                return;
            }
        }

        if (e.key === "Delete") {
            if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
                e.preventDefault();
                updateValue("");
                return;
            }
        }

        // Decimal separators are ignored in continuous cent-shifting mask
        if (e.key === "," || e.key === ".") {
            e.preventDefault();
            return;
        }

        // Disallow non-digits (excluding shortcuts and functional keys)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (!/\d/.test(e.key)) {
                e.preventDefault();
                return;
            }

            e.preventDefault();
            const digit = e.key;
            let digits = displayValue.replace(/\D/g, "");

            // If text was fully selected, start fresh
            if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
                digits = "";
            }

            if (digits.length >= 11) {
                return;
            }

            const nextDigits = digits + digit;
            const cents = Number(nextDigits);
            updateValue(cents > 0 ? formatBrl(cents) : "");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const digits = raw.replace(/\D/g, "");
        if (!digits || Number(digits) === 0) {
            updateValue("");
            return;
        }

        const cents = Number(digits.slice(0, 11));
        updateValue(cents > 0 ? formatBrl(cents) : "");
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        const formatted = parsePastedCurrency(text);
        updateValue(formatted);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const len = e.target.value.length;
        e.target.setSelectionRange(len, len);
        onFocus?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
        if (e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
            const len = e.currentTarget.value.length;
            e.currentTarget.setSelectionRange(len, len);
        }
    };

    return (
        <div className="flex flex-col gap-2.5">
            <label htmlFor={id} className="text-sm font-medium text-text">
                {label}
            </label>
            <input
                ref={inputRef}
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={placeholder}
                value={displayValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={handleFocus}
                onMouseUp={handleMouseUp}
                onBlur={onBlur}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={cn("min-h-11 w-full rounded-xl border-0 bg-surface px-3 text-base text-text", error && "outline-2 outline-solid outline-danger", className)}
                {...props}
            />
            {error ? (
                <p id={errorId} className={messageTone.danger}>
                    {error}
                </p>
            ) : null}
            {hint && !error ? (
                <p id={hintId} className="text-xs text-muted">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
