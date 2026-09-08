"use client";

import { Children, forwardRef, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { messageTone } from "./message";

export interface SelectOption {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    color?: string;
    disabled?: boolean;
}

export interface SelectProps {
    id?: string;
    name?: string;
    label?: ReactNode;
    error?: string;
    hint?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    options?: SelectOption[];
    children?: ReactNode;
    placeholder?: string;
    disabled?: boolean;
    size?: "sm" | "md";
    icon?: ReactNode;
    className?: string;
    triggerClassName?: string;
    dropdownClassName?: string;
    align?: "left" | "right";
    "aria-label"?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ id: explicitId, name, label, error, hint, value: propValue, defaultValue, onChange, onBlur, options, children, placeholder = "Selecione...", disabled = false, size = "md", icon, className, triggerClassName, dropdownClassName, align = "left", "aria-label": ariaLabel }, forwardedRef) {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const triggerId = `${id}-trigger`;
    const listboxId = `${id}-listbox`;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const internalSelectRef = useRef<HTMLSelectElement>(null);

    // Merge forwarded ref with internal ref for native select
    const setRef = useCallback(
        (node: HTMLSelectElement | null) => {
            internalSelectRef.current = node;
            if (typeof forwardedRef === "function") {
                forwardedRef(node);
            } else if (forwardedRef) {
                forwardedRef.current = node;
            }
        },
        [forwardedRef],
    );

    // Extract options from props or children
    const parsedOptions: SelectOption[] = useMemo(() => {
        if (options) {
            return options;
        }

        const items: SelectOption[] = [];
        Children.forEach(children, (child) => {
            if (isValidElement(child)) {
                const childProps = child.props as {
                    value?: unknown;
                    children?: ReactNode;
                    disabled?: boolean;
                    color?: string;
                    icon?: ReactNode;
                };

                if (childProps.value !== undefined) {
                    items.push({
                        value: String(childProps.value),
                        label: childProps.children ?? String(childProps.value),
                        disabled: childProps.disabled,
                        color: childProps.color,
                        icon: childProps.icon,
                    });
                }
            }
        });

        return items;
    }, [options, children]);

    const isControlled = propValue !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const currentValue = isControlled ? propValue : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const selectedOption = parsedOptions.find((opt) => opt.value === currentValue);

    const handleSelect = useCallback(
        (val: string) => {
            if (disabled) return;

            if (!isControlled) {
                setInternalValue(val);
            }

            setIsOpen(false);

            if (internalSelectRef.current) {
                internalSelectRef.current.value = val;
                const event = new Event("change", { bubbles: true });
                internalSelectRef.current.dispatchEvent(event);
            }

            if (onChange) {
                (onChange as (val: unknown) => void)(val);
            }

            triggerRef.current?.focus();
        },
        [disabled, isControlled, onChange],
    );

    // Close on click outside or focus loss
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
                const currentIndex = parsedOptions.findIndex((opt) => opt.value === currentValue);
                setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
            } else {
                setHighlightedIndex((prev) => {
                    const delta = e.key === "ArrowDown" ? 1 : -1;
                    let next = prev + delta;
                    if (next < 0) next = parsedOptions.length - 1;
                    if (next >= parsedOptions.length) next = 0;
                    return next;
                });
            }
            return;
        }

        if (e.key === "Enter" || e.key === " ") {
            if (isOpen && highlightedIndex >= 0 && highlightedIndex < parsedOptions.length) {
                e.preventDefault();
                const option = parsedOptions[highlightedIndex];
                if (!option.disabled) {
                    handleSelect(option.value);
                }
            } else if (!isOpen) {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        if (e.key === "Escape" && isOpen) {
            e.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        }
    };

    return (
        <div ref={containerRef} className={cn("relative flex flex-col", label ? (size === "sm" ? "gap-1" : "gap-2") : null, className)}>
            {label ? (
                <label id={`${id}-label`} htmlFor={triggerId} className={cn("font-medium text-text select-none", size === "sm" ? "text-[11px] text-muted" : "text-sm")}>
                    {label}
                </label>
            ) : null}

            {/* Native hidden select for form integration / accessibility */}
            <select
                ref={setRef}
                id={id}
                name={name}
                value={currentValue}
                onChange={(e) => {
                    const val = e.target.value;
                    if (!isControlled) setInternalValue(val);
                    if (onChange) (onChange as (val: unknown) => void)(e);
                }}
                onBlur={onBlur}
                disabled={disabled}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
            >
                {parsedOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {typeof opt.label === "string" ? opt.label : opt.value}
                    </option>
                ))}
            </select>

            {/* Custom Trigger Button */}
            <button
                ref={triggerRef}
                id={triggerId}
                type="button"
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-label={ariaLabel}
                aria-labelledby={label ? `${id}-label ${triggerId}` : undefined}
                aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
                className={cn("group relative flex w-full items-center justify-between gap-2 rounded-xl bg-surface text-text transition-all", "hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-violet", size === "sm" ? "h-9 min-h-9 px-2.5 text-xs" : "min-h-11 px-3 text-sm", isOpen && "ring-2 ring-violet bg-surface-raised", error && "ring-2 ring-danger", disabled && "cursor-not-allowed opacity-50", triggerClassName)}
            >
                <div className="flex min-w-0 items-center gap-2">
                    {icon ? <span className="shrink-0">{icon}</span> : null}

                    {selectedOption?.color ? <span className="size-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: selectedOption.color }} aria-hidden="true" /> : null}

                    {selectedOption?.icon ? (
                        <span className="shrink-0" aria-hidden="true">
                            {selectedOption.icon}
                        </span>
                    ) : null}

                    <span className={cn("truncate font-medium", !selectedOption ? "text-muted" : "text-text")}>{selectedOption ? selectedOption.label : placeholder}</span>
                </div>

                <ChevronDown className={cn("shrink-0 text-muted transition-transform duration-200", size === "sm" ? "size-3.5" : "size-4", isOpen && "rotate-180 text-violet")} aria-hidden="true" />
            </button>

            {/* Custom Dropdown Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id={listboxId}
                        role="listbox"
                        aria-labelledby={triggerId}
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className={cn("absolute top-full z-50 mt-1.5 w-full min-w-40 overflow-hidden rounded-xl border border-surface-raised/90 bg-surface-raised/95 p-1 backdrop-blur-xl shadow-[0_16px_36px_rgb(8_5_16/0.8)]", align === "right" ? "right-0" : "left-0", dropdownClassName)}
                    >
                        <div className="max-h-56 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5">
                            {parsedOptions.length === 0 ? (
                                <div className="px-3 py-2 text-center text-xs text-muted">Nenhuma opção</div>
                            ) : (
                                parsedOptions.map((option, index) => {
                                    const isSelected = option.value === currentValue;
                                    const isHighlighted = index === highlightedIndex;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            disabled={option.disabled}
                                            onClick={() => handleSelect(option.value)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors", size === "sm" ? "text-xs" : "text-sm", isSelected ? "bg-violet/20 font-semibold text-orchid" : isHighlighted ? "bg-surface text-text" : "text-text hover:bg-surface/80", option.disabled && "cursor-not-allowed opacity-40")}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                {option.color ? <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden="true" /> : null}

                                                {option.icon ? (
                                                    <span className="shrink-0" aria-hidden="true">
                                                        {option.icon}
                                                    </span>
                                                ) : null}

                                                <span className="truncate">{option.label}</span>
                                            </div>

                                            {isSelected ? <Check className={cn("shrink-0 text-orchid", size === "sm" ? "size-3" : "size-3.5")} aria-hidden="true" /> : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
});
