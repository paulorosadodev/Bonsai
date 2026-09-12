"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Search, X, Pencil, Ban } from "lucide-react";
import { cn } from "./cn";
import { PRESET_ICONS } from "@/lib/domain/catalog";
import { DynamicIcon } from "@/components/features/transaction-visuals";

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    color?: string;
    label?: string;
    optional?: boolean;
    usedMap?: Record<string, string[]>;
    variant?: "default" | "avatar";
    placement?: "top" | "bottom";
    showUsageText?: boolean;
}

export function IconPicker({ value, onChange, color = "#A78BFA", label, optional = false, usedMap, variant = "default", placement = "top", showUsageText = true }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [popoverAlign, setPopoverAlign] = useState<"left" | "right">("left");
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredIcons = PRESET_ICONS.filter((icon) => icon.toLowerCase().includes(search.toLowerCase().trim()));
    const currentUsage = value ? usedMap?.[value.trim()] : undefined;

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        const updateAlignment = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const isRightHalf = rect.left + rect.width / 2 > window.innerWidth / 2;
            const wouldOverflowRight = rect.left + 320 > window.innerWidth - 16;
            setPopoverAlign(isRightHalf || wouldOverflowRight ? "right" : "left");
        };

        updateAlignment();
        window.addEventListener("resize", updateAlignment);
        return () => window.removeEventListener("resize", updateAlignment);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: PointerEvent | MouseEvent | TouchEvent) {
            if (!containerRef.current) return;
            const path = event.composedPath ? event.composedPath() : [];
            const isInside = path.length > 0 ? path.includes(containerRef.current) : containerRef.current.contains(event.target as Node);

            if (!isInside) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handleClickOutside, true);
        document.addEventListener("mousedown", handleClickOutside, true);
        document.addEventListener("touchstart", handleClickOutside, true);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handleClickOutside, true);
            document.removeEventListener("mousedown", handleClickOutside, true);
            document.removeEventListener("touchstart", handleClickOutside, true);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    function handleToggleOpen() {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const isRightHalf = rect.left + rect.width / 2 > window.innerWidth / 2;
            const wouldOverflowRight = rect.left + 320 > window.innerWidth - 16;
            setPopoverAlign(isRightHalf || wouldOverflowRight ? "right" : "left");
        }
        setIsOpen((prev) => !prev);
    }

    return (
        <div className="relative flex flex-col gap-1.5">
            {label && variant === "default" ? <label className="text-xs font-semibold text-text">{label}</label> : null}

            <div ref={containerRef} className="relative flex items-center gap-2">
                {variant === "avatar" ? (
                    <button
                        type="button"
                        onClick={handleToggleOpen}
                        className="group relative flex size-12 shrink-0 items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-violet"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${color} 18%, var(--surface))`,
                            color: color,
                            border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
                        }}
                        title={value ? `Ícone atual: ${value} (Clique para alterar)` : "Escolher ícone"}
                        aria-label={value ? `Alterar ícone: ${value}` : "Escolher ícone"}
                    >
                        <DynamicIcon name={value || "Tag"} className="size-6 transition-transform group-hover:scale-110" />
                        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-surface-raised border border-white/15 text-muted transition-colors group-hover:text-text group-hover:border-violet">
                            <Pencil className="size-2.5" aria-hidden />
                        </span>
                    </button>
                ) : (
                    <button type="button" onClick={handleToggleOpen} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-sm text-text transition-all hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-violet active:scale-98">
                        {value ? (
                            <div className="flex size-7 items-center justify-center rounded-lg shadow-inner" style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}>
                                <DynamicIcon name={value} className="size-4" />
                            </div>
                        ) : (
                            <div className="flex size-7 items-center justify-center rounded-lg bg-surface-raised text-muted">
                                <DynamicIcon name="Tag" className="size-3.5" />
                            </div>
                        )}
                        <span className="text-xs font-medium text-text">{value ? value : optional ? "Sem ícone" : "Escolher ícone"}</span>
                        <ChevronDown className={cn("size-3.5 text-muted transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
                    </button>
                )}

                {optional && value && variant === "default" ? (
                    <button type="button" onClick={() => onChange("")} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-text" title="Remover ícone" aria-label="Remover ícone">
                        <X className="size-3.5" aria-hidden />
                    </button>
                ) : null}

                {/* Popover de Ícones */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.97 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className={cn("absolute z-50 flex w-72 sm:w-80 max-w-[calc(100vw-3rem)] flex-col gap-2.5 rounded-2xl border border-white/12 bg-[#1c1335] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl", placement === "top" ? "bottom-full mb-2" : "top-full mt-2", popoverAlign === "right" ? "right-0" : "left-0")}
                        >
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted/70" aria-hidden />
                                <input type="text" placeholder="Buscar ícone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl bg-surface/80 py-1.5 pl-8 pr-7 text-xs text-text outline-none focus:ring-1 focus:ring-violet" autoFocus />
                                {search ? (
                                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                                        <X className="size-3" aria-hidden />
                                    </button>
                                ) : null}
                            </div>

                            {optional && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange("");
                                        setIsOpen(false);
                                    }}
                                    className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors", !value ? "bg-violet/15 text-violet font-medium" : "text-muted hover:bg-white/5 hover:text-text")}
                                >
                                    <Ban className="size-3.5" aria-hidden />
                                    <span>Nenhum ícone (usar ícone padrão)</span>
                                </button>
                            )}

                            <div className="grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain p-0.5">
                                {filteredIcons.map((iconName) => {
                                    const isSelected = value === iconName;
                                    const usedBy = usedMap?.[iconName];
                                    const isUsed = Boolean(usedBy && usedBy.length > 0);
                                    const titleText = isUsed ? `${iconName} (Já em uso por: ${usedBy!.join(", ")})` : iconName;

                                    return (
                                        <button
                                            key={iconName}
                                            type="button"
                                            title={titleText}
                                            onClick={() => {
                                                onChange(iconName);
                                                setIsOpen(false);
                                            }}
                                            className={cn("group relative flex size-10 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95", isSelected ? "bg-white/15 ring-2 ring-violet text-white shadow-sm" : "bg-surface/60 text-muted/80 hover:bg-white/10 hover:text-text")}
                                        >
                                            <DynamicIcon name={iconName} className="size-5 transition-transform group-hover:scale-110" style={{ color: isSelected ? color : undefined }} />
                                            {isUsed && !isSelected ? <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-white/70 shadow-sm" aria-hidden /> : null}
                                        </button>
                                    );
                                })}

                                {filteredIcons.length === 0 && <div className="col-span-6 py-6 text-center text-xs text-muted/60">Nenhum ícone encontrado</div>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Aviso de conflito sutil e não intrusivo */}
            {showUsageText && currentUsage && currentUsage.length > 0 ? (
                <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted/70">
                    <span className="size-1.5 shrink-0 rounded-full bg-muted/40" aria-hidden />
                    <span>
                        Também usado em: <span className="font-medium text-text/80">{currentUsage.join(", ")}</span>
                    </span>
                </p>
            ) : null}
        </div>
    );
}
