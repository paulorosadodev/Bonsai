"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { searchTransactionNames, type TransactionSuggestion } from "@/actions/suggestions";
import { DynamicIcon } from "./transaction-visuals";
import { cn } from "@/components/ui/cn";
import { messageTone } from "@/components/ui/message";

export type NameAutocompleteProps = {
    id: string;
    label: ReactNode;
    value: string;
    onChange: (value: string) => void;
    onSuggestionSelected: (suggestion: TransactionSuggestion) => void;
    onBlur?: () => void;
    error?: string;
    hint?: string;
    placeholder?: string;
    maxLength?: number;
    disabled?: boolean;
    className?: string;
};

export function NameAutocomplete({ id, label, value, onChange, onSuggestionSelected, onBlur, error, hint, placeholder = "Lámen", maxLength = 120, disabled = false, className }: NameAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<TransactionSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [isLoading, setIsLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const latestQueryRef = useRef<string>("");
    const hasUserEditedRef = useRef(false);
    const isFocusedRef = useRef(false);
    const skipNextSearchRef = useRef(false);

    // Normalização para match exato
    const normalize = (str: string) =>
        str
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    // Busca sugestões com debounce de 500ms (apenas quando o usuário ativamente edita o campo)
    useEffect(() => {
        if (!hasUserEditedRef.current) {
            return;
        }

        if (skipNextSearchRef.current) {
            skipNextSearchRef.current = false;
            return;
        }

        const clean = value.trim();
        latestQueryRef.current = clean;

        if (clean.length < 2) {
            const clearTimer = setTimeout(() => {
                setSuggestions([]);
                setIsOpen(false);
                setSelectedIndex(-1);
                setIsLoading(false);
            }, 0);
            return () => clearTimeout(clearTimer);
        }

        const fetchTimer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await searchTransactionNames(clean);
                if (latestQueryRef.current !== clean) return;

                if (res.ok && res.suggestions.length > 0) {
                    setSuggestions(res.suggestions);
                    if (isFocusedRef.current) {
                        setIsOpen(true);
                    }
                    setSelectedIndex(-1);
                } else {
                    setSuggestions([]);
                    setIsOpen(false);
                    setSelectedIndex(-1);
                }
            } finally {
                if (latestQueryRef.current === clean) {
                    setIsLoading(false);
                }
            }
        }, 500);

        return () => clearTimeout(fetchTimer);
    }, [value]);

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function selectSuggestion(suggestion: TransactionSuggestion) {
        skipNextSearchRef.current = true;
        onChange(suggestion.name);
        onSuggestionSelected(suggestion);
        setIsOpen(false);
        setSelectedIndex(-1);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!isOpen || suggestions.length === 0) {
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                e.preventDefault();
                selectSuggestion(suggestions[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
            setSelectedIndex(-1);
        }
    }

    function handleInputBlur() {
        // Blur match exato: se o texto digitado bate exatamente com uma das sugestões
        if (hasUserEditedRef.current && suggestions.length > 0) {
            const normalizedVal = normalize(value);
            const exactMatch = suggestions.find((s) => normalize(s.name) === normalizedVal);
            if (exactMatch) {
                onSuggestionSelected(exactMatch);
            }
        }

        // Dá tempo para o click do item executar se necessário
        setIsOpen(false);
        setSelectedIndex(-1);
        onBlur?.();
    }

    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const listboxId = `${id}-listbox`;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
        <div ref={containerRef} className="relative flex flex-col gap-2.5">
            <label htmlFor={id} className="text-sm font-medium text-text">
                {label}
            </label>

            <div className="relative">
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => {
                        hasUserEditedRef.current = true;
                        onChange(e.target.value);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        isFocusedRef.current = true;
                        if (hasUserEditedRef.current && suggestions.length > 0 && value.trim().length >= 2) {
                            setIsOpen(true);
                        }
                    }}
                    onBlur={() => {
                        isFocusedRef.current = false;
                        handleInputBlur();
                    }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    disabled={disabled}
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? listboxId : undefined}
                    aria-activedescendant={selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={cn("min-h-11 w-full rounded-xl border-0 bg-surface px-3 text-base text-text focus:outline-none focus:ring-2 focus:ring-violet/50 transition-shadow", isLoading && "pr-9", error && "outline-2 outline-solid outline-danger", className)}
                />

                {isLoading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden="true" />}

                {isOpen && suggestions.length > 0 && (
                    <ul id={listboxId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-surface-raised py-1 shadow-[0_16px_36px_rgb(8_5_16/0.8)] backdrop-blur-md">
                        {suggestions.map((item, index) => {
                            const isSelected = selectedIndex === index;
                            return (
                                <li
                                    key={`${item.name}-${index}`}
                                    id={`${id}-option-${index}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseDown={(e) => {
                                        // Evita blur antes de registrar o clique
                                        e.preventDefault();
                                        selectSuggestion(item);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={cn("flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors", isSelected ? "bg-violet/15 text-text" : "hover:bg-surface/60 text-text/90")}
                                >
                                    <span className="truncate font-medium text-sm text-text">{item.name}</span>

                                    <div
                                        className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                                        style={{
                                            backgroundColor: `color-mix(in srgb, ${item.categoryColor} 18%, transparent)`,
                                            color: item.categoryColor,
                                        }}
                                    >
                                        <DynamicIcon name={item.categoryIcon} className="size-3" />
                                        <span>{item.categoryName}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

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
