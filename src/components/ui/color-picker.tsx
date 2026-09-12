"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Pipette, SlidersHorizontal, X } from "lucide-react";
import { cn } from "./cn";
import { PRESET_COLORS } from "@/lib/domain/catalog";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    id?: string;
    label?: string;
    usedMap?: Record<string, string[]>;
    placement?: "top" | "bottom";
}

// Helpers de cor puros (RGB <-> HEX)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    let cleanHex = hex.replace("#", "").trim();

    if (cleanHex.length === 3) {
        cleanHex = cleanHex
            .split("")
            .map((c) => c + c)
            .join("");
    }

    const parsed = parseInt(cleanHex, 16);

    if (cleanHex.length !== 6 || Number.isNaN(parsed)) {
        return { r: 167, g: 139, b: 250 }; // Fallback para o violeta do Bonsai
    }

    return {
        r: (parsed >> 16) & 255,
        g: (parsed >> 8) & 255,
        b: parsed & 255,
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
    const toHexPart = (val: number) => clamp(val).toString(16).padStart(2, "0").toUpperCase();
    return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;
}

function isValidHex(hex: string): boolean {
    return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

export function ColorPicker({ value, onChange, id, label, usedMap, placement = "top" }: ColorPickerProps) {
    const inputId = useId();
    const colorInputId = id || inputId;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const normalizedValue = (value || "#A78BFA").trim();
    const isCustom = !PRESET_COLORS.some((c) => c.value.toLowerCase() === normalizedValue.toLowerCase());
    const currentUsage = normalizedValue ? usedMap?.[normalizedValue.toLowerCase()] : undefined;

    // Estado para digitação no campo HEX sem precisar de useEffect de sincronização
    const [editingHex, setEditingHex] = useState<{ value: string; color: string } | null>(null);
    const hexInput = editingHex && editingHex.color.toLowerCase() === normalizedValue.toLowerCase() ? editingHex.value : normalizedValue.replace("#", "").toUpperCase();

    const rgb = hexToRgb(normalizedValue);

    const [popoverAlign, setPopoverAlign] = useState<"left" | "right">("left");

    // Sincroniza alinhamento do popover com base na posição do botão na tela
    useEffect(() => {
        if (!isPopoverOpen || !triggerRef.current) return;

        const updateAlignment = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const isRightHalf = rect.left + rect.width / 2 > window.innerWidth / 2;
            const wouldOverflowRight = rect.left + 320 > window.innerWidth - 16;
            setPopoverAlign(isRightHalf || wouldOverflowRight ? "right" : "left");
        };

        updateAlignment();
        window.addEventListener("resize", updateAlignment);
        return () => window.removeEventListener("resize", updateAlignment);
    }, [isPopoverOpen]);

    // Fechamento ao clicar fora ou apertar Escape
    useEffect(() => {
        if (!isPopoverOpen) return;

        function handleClickOutside(event: PointerEvent | MouseEvent | TouchEvent) {
            const path = event.composedPath ? event.composedPath() : [];
            const isInsidePopover = popoverRef.current && (path.length > 0 ? path.includes(popoverRef.current) : popoverRef.current.contains(event.target as Node));
            const isInsideTrigger = triggerRef.current && (path.length > 0 ? path.includes(triggerRef.current) : triggerRef.current.contains(event.target as Node));

            if (!isInsidePopover && !isInsideTrigger) {
                setIsPopoverOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsPopoverOpen(false);
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
    }, [isPopoverOpen]);

    // Manipuladores de canal RGB
    function handleChannelChange(channel: "r" | "g" | "b", channelValue: number) {
        const currentRgb = hexToRgb(normalizedValue);
        const nextRgb = {
            ...currentRgb,
            [channel]: Math.max(0, Math.min(255, channelValue)),
        };
        const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
        setEditingHex(null);
        onChange(nextHex);
    }

    // Manipulador de input manual de Hex
    function handleHexInputChange(inputValue: string) {
        const sanitized = inputValue
            .replace(/[^0-9A-Fa-f]/g, "")
            .slice(0, 6)
            .toUpperCase();

        if (sanitized.length === 6 || sanitized.length === 3) {
            const nextHex = `#${sanitized}`;
            if (isValidHex(nextHex)) {
                setEditingHex({ value: sanitized, color: nextHex });
                onChange(nextHex);
                return;
            }
        }
        setEditingHex({ value: sanitized, color: normalizedValue });
    }

    // EyeDropper API (se disponível no navegador)
    async function handleEyeDropper() {
        if (typeof window === "undefined") return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const EyeDropperClass = (window as any).EyeDropper;
            if (EyeDropperClass) {
                const eyeDropper = new EyeDropperClass();
                const result = await eyeDropper.open();
                if (result?.sRGBHex) {
                    setEditingHex(null);
                    onChange(result.sRGBHex.toUpperCase());
                }
            }
        } catch {
            // Cancelado pelo usuário ou não suportado
        }
    }

    // Copiar código HEX
    function handleCopyHex() {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(normalizedValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    }

    const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

    return (
        <div className="flex flex-col gap-2">
            {label ? (
                <div className="flex items-center justify-between">
                    <label htmlFor={colorInputId} className="text-xs font-semibold text-text">
                        {label}
                    </label>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted/60">{normalizedValue}</span>
                </div>
            ) : null}

            <div className="grid grid-cols-8 sm:grid-cols-9 gap-2">
                {PRESET_COLORS.map((color) => {
                    const isSelected = normalizedValue.toLowerCase() === color.value.toLowerCase();
                    const usedBy = usedMap?.[color.value.toLowerCase()];
                    const isUsed = Boolean(usedBy && usedBy.length > 0);
                    const titleText = isUsed ? `${color.label} (Já em uso por: ${usedBy!.join(", ")})` : color.label;

                    return (
                        <button
                            key={color.value}
                            type="button"
                            title={titleText}
                            onClick={() => {
                                onChange(color.value);
                                setIsPopoverOpen(false);
                            }}
                            className={cn("group relative flex size-8 items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95", isSelected ? "ring-2 ring-white/90 ring-offset-2 ring-offset-surface-raised shadow-md" : "opacity-90 hover:opacity-100")}
                            style={{ backgroundColor: color.value }}
                            aria-label={`Selecionar cor ${color.label}`}
                        >
                            {isSelected ? <Check className="size-4 text-ink drop-shadow-sm" strokeWidth={3} aria-hidden /> : isUsed ? <span className="size-1.5 rounded-full bg-white/90 shadow-sm" aria-hidden /> : null}
                        </button>
                    );
                })}

                {/* Gatilho do Seletor Personalizado RGB e Popover Ancorado Diretamente a Ele */}
                <div className="relative size-8">
                    <button
                        ref={triggerRef}
                        type="button"
                        id={colorInputId}
                        onClick={() => {
                            if (!isPopoverOpen && triggerRef.current) {
                                const rect = triggerRef.current.getBoundingClientRect();
                                const isRightHalf = rect.left + rect.width / 2 > window.innerWidth / 2;
                                const wouldOverflowRight = rect.left + 320 > window.innerWidth - 16;
                                setPopoverAlign(isRightHalf || wouldOverflowRight ? "right" : "left");
                            }
                            setIsPopoverOpen((prev) => !prev);
                        }}
                        title={isCustom ? `Cor personalizada: ${normalizedValue} (Clique para ajustar RGB)` : "Abrir seletor RGB personalizado"}
                        className={cn("relative flex size-8 items-center justify-center rounded-xl border transition-all hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-violet", isCustom ? "border-transparent ring-2 ring-white/90 ring-offset-2 ring-offset-surface-raised shadow-md" : "border-dashed border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10")}
                        style={isCustom ? { backgroundColor: normalizedValue } : undefined}
                        aria-label="Abrir estúdio de cor personalizada"
                        aria-expanded={isPopoverOpen}
                        aria-haspopup="dialog"
                    >
                        {isCustom ? <Check className="size-4 text-ink drop-shadow-sm" strokeWidth={3} aria-hidden /> : <SlidersHorizontal className="size-3.5 text-muted transition-colors group-hover:text-text" aria-hidden />}
                    </button>

                    {/* Popover Flutuante do Estúdio RGB Ancorado ao Botão */}
                    <AnimatePresence>
                        {isPopoverOpen && (
                            <motion.div
                                ref={popoverRef}
                                initial={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className={cn("absolute z-50 flex w-72 sm:w-80 max-w-[calc(100vw-3rem)] flex-col gap-3.5 rounded-2xl border border-white/12 bg-[#1c1335] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl", placement === "top" ? "bottom-full mb-2" : "top-full mt-2", popoverAlign === "right" ? "right-0" : "left-0")}
                                role="dialog"
                                aria-label="Estúdio de Cores RGB"
                            >
                                {/* Header com Título e Fechar */}
                                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                                        <SlidersHorizontal className="size-3.5 text-violet" aria-hidden />
                                        <span>Estúdio de Cores</span>
                                    </div>
                                    <button type="button" onClick={() => setIsPopoverOpen(false)} className="rounded-lg p-1 text-muted transition-colors hover:bg-white/10 hover:text-text" aria-label="Fechar estúdio de cores">
                                        <X className="size-3.5" aria-hidden />
                                    </button>
                                </div>

                                {/* Preview da Cor + HEX + Ações Rápidas */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/15 transition-shadow"
                                        style={{
                                            backgroundColor: normalizedValue,
                                            boxShadow: `0 0 20px color-mix(in srgb, ${normalizedValue} 35%, transparent)`,
                                        }}
                                    >
                                        <span className="sr-only">Cor atual: {normalizedValue}</span>
                                    </div>

                                    <div className="flex flex-1 items-center gap-1.5 min-w-0">
                                        <div className="flex flex-1 items-center rounded-xl bg-surface px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-violet transition-all">
                                            <span className="font-mono text-xs font-semibold text-muted mr-1 select-none">#</span>
                                            <input type="text" value={hexInput} onChange={(e) => handleHexInputChange(e.target.value)} maxLength={6} placeholder="A78BFA" className="w-full bg-transparent font-mono text-xs uppercase text-text outline-none" aria-label="Código hexadecimal" />
                                        </div>

                                        <button type="button" onClick={handleCopyHex} title={copied ? "Copiado!" : "Copiar HEX"} className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-text" aria-label="Copiar código HEX">
                                            {copied ? <Check className="size-3.5 text-mint" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                                        </button>

                                        {hasEyeDropper && (
                                            <button type="button" onClick={handleEyeDropper} title="Capturar cor da tela" className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-violet" aria-label="Capturar cor da tela com conta-gotas">
                                                <Pipette className="size-3.5" aria-hidden />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Sliders RGB Interativos com Gradientes Dinâmicos */}
                                <div className="flex flex-col gap-2.5 pt-1">
                                    {/* Canal R (Red) */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-3 text-center font-mono text-[11px] font-bold text-red-400 select-none">R</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="255"
                                            value={rgb.r}
                                            onChange={(e) => handleChannelChange("r", Number(e.target.value))}
                                            className="color-slider flex-1"
                                            style={{
                                                background: `linear-gradient(to right, rgb(0, ${rgb.g}, ${rgb.b}), rgb(255, ${rgb.g}, ${rgb.b}))`,
                                            }}
                                            aria-label="Canal Vermelho (Red)"
                                        />
                                        <input type="number" min="0" max="255" value={rgb.r} onChange={(e) => handleChannelChange("r", Number(e.target.value))} className="w-12 rounded-lg bg-surface px-1.5 py-1 text-center font-mono text-xs tabular-nums text-text outline-none focus:ring-1 focus:ring-violet" aria-label="Valor numérico de Vermelho" />
                                    </div>

                                    {/* Canal G (Green) */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-3 text-center font-mono text-[11px] font-bold text-emerald-400 select-none">G</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="255"
                                            value={rgb.g}
                                            onChange={(e) => handleChannelChange("g", Number(e.target.value))}
                                            className="color-slider flex-1"
                                            style={{
                                                background: `linear-gradient(to right, rgb(${rgb.r}, 0, ${rgb.b}), rgb(${rgb.r}, 255, ${rgb.b}))`,
                                            }}
                                            aria-label="Canal Verde (Green)"
                                        />
                                        <input type="number" min="0" max="255" value={rgb.g} onChange={(e) => handleChannelChange("g", Number(e.target.value))} className="w-12 rounded-lg bg-surface px-1.5 py-1 text-center font-mono text-xs tabular-nums text-text outline-none focus:ring-1 focus:ring-violet" aria-label="Valor numérico de Verde" />
                                    </div>

                                    {/* Canal B (Blue) */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-3 text-center font-mono text-[11px] font-bold text-blue-400 select-none">B</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="255"
                                            value={rgb.b}
                                            onChange={(e) => handleChannelChange("b", Number(e.target.value))}
                                            className="color-slider flex-1"
                                            style={{
                                                background: `linear-gradient(to right, rgb(${rgb.r}, ${rgb.g}, 0), rgb(${rgb.r}, ${rgb.g}, 255))`,
                                            }}
                                            aria-label="Canal Azul (Blue)"
                                        />
                                        <input type="number" min="0" max="255" value={rgb.b} onChange={(e) => handleChannelChange("b", Number(e.target.value))} className="w-12 rounded-lg bg-surface px-1.5 py-1 text-center font-mono text-xs tabular-nums text-text outline-none focus:ring-1 focus:ring-violet" aria-label="Valor numérico de Azul" />
                                    </div>
                                </div>

                                {/* Rodapé com Ação Concluir */}
                                <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                                    <span className="font-mono text-[11px] text-muted/60">
                                        RGB({rgb.r}, {rgb.g}, {rgb.b})
                                    </span>
                                    <button type="button" onClick={() => setIsPopoverOpen(false)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet/20 px-3 py-1.5 text-xs font-semibold text-violet transition-colors hover:bg-violet hover:text-ink active:scale-95">
                                        <Check className="size-3.5" aria-hidden />
                                        <span>Pronto</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Aviso de conflito sutil e não intrusivo */}
            {currentUsage && currentUsage.length > 0 ? (
                <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted/70">
                    <span className="size-1.5 shrink-0 rounded-full bg-muted/40" aria-hidden />
                    <span>
                        Também usada em: <span className="font-medium text-text/80">{currentUsage.join(", ")}</span>
                    </span>
                </p>
            ) : null}
        </div>
    );
}
