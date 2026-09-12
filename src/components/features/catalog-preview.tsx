"use client";

import { DynamicIcon } from "./transaction-visuals";
import { CreditCard } from "lucide-react";

interface CatalogPreviewProps {
    name: string;
    color: string;
    icon?: string | null;
    type?: "category" | "specificTag" | "generalTag";
    parentCategoryName?: string;
    parentCategoryColor?: string;
}

export function CatalogPreview({ name, color, icon, type = "category", parentCategoryName }: CatalogPreviewProps) {
    const displayName = name.trim() || (type === "category" ? "Nova Categoria" : "Nova Tag");
    const displayIcon = icon || (type === "category" ? "ReceiptText" : "Tag");

    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-surface/40 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted/60">
                <span>Prévia ao vivo</span>
                <span>Como aparece no app</span>
            </div>

            {/* Simulação do Extrato de Transações */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-surface-raised/60 px-3 py-2.5 shadow-inner">
                <div className="flex min-w-0 items-center gap-2.5">
                    {/* Avatar colorido com o ícone */}
                    <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${color} 16%, var(--surface-raised))`,
                            color: color,
                            border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
                        }}
                    >
                        <DynamicIcon name={displayIcon} className="size-4.5" />
                    </div>

                    <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-xs font-semibold text-text">Exemplo de Despesa</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                            {type === "specificTag" && parentCategoryName ? (
                                <>
                                    <span>{parentCategoryName}</span>
                                    <span className="text-muted/40">•</span>
                                    <span className="font-medium text-text/90" style={{ color }}>
                                        {displayName}
                                    </span>
                                </>
                            ) : (
                                <span className="font-medium text-text/90" style={{ color }}>
                                    {displayName}
                                </span>
                            )}
                            <span className="text-muted/40">•</span>
                            <span className="inline-flex items-center gap-1 rounded bg-sky-400/10 px-1 py-0.2 text-[9px] font-medium text-sky-300">
                                <CreditCard className="size-2.5" aria-hidden />
                                Cartão
                            </span>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 text-right">
                    <span className="tabular font-mono text-xs font-semibold text-text">R$ 142,50</span>
                </div>
            </div>

            {/* Chip de filtro / seleção */}
            <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-muted/60">Badge:</span>
                <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-text transition-all"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface-raised))`,
                        border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
                    }}
                >
                    <DynamicIcon name={displayIcon} className="size-3.5" style={{ color }} />
                    <span className="max-w-48 truncate">{displayName}</span>
                </div>
            </div>
        </div>
    );
}
