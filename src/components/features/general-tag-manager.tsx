"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, AlertCircle, Tags } from "lucide-react";
import { toast } from "sonner";
import { createGeneralTag, updateGeneralTag, deleteGeneralTag } from "@/actions/tags";
import type { CategoryOption, GeneralTagOption, SpecificTagOption } from "@/lib/domain/catalog";
import { buildColorUsageMap, buildIconUsageMap } from "@/lib/domain/catalog-usage";
import { ColorPicker } from "@/components/ui/color-picker";
import { IconPicker } from "@/components/ui/icon-picker";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DynamicIcon } from "./transaction-visuals";
import { CatalogPreview } from "./catalog-preview";

interface GeneralTagManagerProps {
    generalTags: GeneralTagOption[];
    categories?: CategoryOption[];
    specificTags?: SpecificTagOption[];
}

export function GeneralTagManager({ generalTags, categories = [] }: GeneralTagManagerProps) {
    // Modal state for creating / editing general tag
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [color, setColor] = useState("#2DD4BF");
    const [icon, setIcon] = useState("");

    // Delete confirmation state
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        id: string;
        name: string;
    }>({
        open: false,
        id: "",
        name: "",
    });

    const [loading, setLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [mainError, setMainError] = useState<string | null>(null);

    const colorUsage = useMemo(() => buildColorUsageMap({ categories, generalTags, excludeId: editingId }), [categories, generalTags, editingId]);
    const iconUsage = useMemo(() => buildIconUsageMap({ categories, generalTags, excludeId: editingId }), [categories, generalTags, editingId]);

    function openCreate() {
        setModalMode("create");
        setEditingId(null);
        setName("");
        setColor("#2DD4BF");
        setIcon("");
        setModalError(null);
        setModalOpen(true);
    }

    function openEdit(tag: GeneralTagOption) {
        setModalMode("edit");
        setEditingId(tag.id);
        setName(tag.name);
        setColor(tag.color);
        setIcon(tag.icon || "");
        setModalError(null);
        setModalOpen(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setModalError(null);

        const result =
            modalMode === "create"
                ? await createGeneralTag({
                      name: name.trim(),
                      color,
                      icon: icon ? icon : null,
                  })
                : await updateGeneralTag(editingId!, {
                      name: name.trim(),
                      color,
                      icon: icon ? icon : null,
                  });

        setLoading(false);

        if (!result.ok) {
            setModalError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success(modalMode === "create" ? "Tag geral criada com sucesso" : "Tag geral atualizada com sucesso");
        setModalOpen(false);
    }

    async function handleConfirmDelete() {
        setLoading(true);
        setMainError(null);

        const result = await deleteGeneralTag(deleteDialog.id);
        setLoading(false);

        if (!result.ok) {
            setMainError(result.error);
            toast.error(result.error);
        } else {
            toast.success("Tag geral excluída com sucesso");
        }

        setDeleteDialog({ open: false, id: "", name: "" });
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mint/15 text-mint">
                        <Tags className="size-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-text">Tags Gerais</h2>
                        <p className="text-xs text-muted">Tags transversais aplicáveis a qualquer despesa (ex: Reembolso, Família, Amigos)</p>
                    </div>
                </div>
                <button type="button" onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-violet/25 bg-violet/10 px-3 py-1.5 text-xs font-semibold text-orchid transition-all hover:border-violet/40 hover:bg-violet/20 hover:text-white active:scale-95">
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    Nova Tag Geral
                </button>
            </div>

            {mainError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    <span>{mainError}</span>
                </div>
            )}

            {/* List of General Tags - Clean Minimalist List */}
            {generalTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-10 text-center">
                    <Tags className="mb-2 size-7 text-muted" aria-hidden />
                    <p className="text-sm font-medium text-text">Nenhuma tag geral cadastrada</p>
                    <p className="text-xs text-muted">Crie tags transversais para enriquecer seus relatórios</p>
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-white/5">
                    {generalTags.map((tag) => (
                        <div key={tag.id} onClick={() => openEdit(tag)} className="group flex w-full cursor-pointer items-center justify-between py-2.5 px-2 -mx-2 rounded-xl transition-colors hover:bg-white/3 sm:px-3 sm:-mx-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-inner" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                                    <DynamicIcon name={tag.icon || "Tag"} className="size-4.5" />
                                </div>
                                <span className="truncate text-sm font-semibold text-text transition-colors group-hover:text-white">{tag.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => openEdit(tag)} className="rounded-lg p-2 text-muted/50 transition-all hover:bg-surface-raised hover:text-text sm:opacity-0 sm:group-hover:opacity-100" title="Editar tag geral" aria-label={`Editar tag ${tag.name}`}>
                                    <Pencil className="size-3.5" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDeleteDialog({
                                            open: true,
                                            id: tag.id,
                                            name: tag.name,
                                        })
                                    }
                                    className="rounded-lg p-2 text-muted/50 transition-all hover:bg-danger/15 hover:text-danger-fg sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Excluir tag geral"
                                    aria-label={`Excluir tag ${tag.name}`}
                                >
                                    <Trash2 className="size-3.5" aria-hidden />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- Modal: Create / Edit General Tag --- */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === "create" ? "Nova Tag Geral" : "Editar Tag Geral"} description="Tags gerais podem ser combinadas com qualquer categoria e tag específica.">
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    {modalError && (
                        <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                            <AlertCircle className="size-4 shrink-0" aria-hidden />
                            <span>{modalError}</span>
                        </div>
                    )}

                    {/* Preview ao vivo */}
                    <CatalogPreview name={name} color={color} icon={icon} type="generalTag" />

                    {/* Nome e Ícone integrados */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text">Nome da Tag Geral</label>
                        <div className="flex items-center gap-3">
                            <IconPicker value={icon} onChange={setIcon} color={color} variant="avatar" placement="top" optional usedMap={iconUsage} showUsageText={false} />
                            <input type="text" placeholder="Ex: Reembolso, Família, Viagem..." value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-violet" autoFocus />
                        </div>
                        {icon && iconUsage?.[icon] && iconUsage[icon].length > 0 ? (
                            <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted/70">
                                <span className="size-1.5 shrink-0 rounded-full bg-muted/40" aria-hidden />
                                <span>
                                    Ícone também usado em: <span className="font-medium text-text/80">{iconUsage[icon].join(", ")}</span>
                                </span>
                            </p>
                        ) : null}
                    </div>

                    <ColorPicker value={color} onChange={setColor} label="Cor da Tag" usedMap={colorUsage} />

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" disabled={loading} onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-text">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || !name.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95 disabled:opacity-50">
                            <Check className="size-4" aria-hidden />
                            {loading ? "Salvando..." : modalMode === "create" ? "Criar Tag Geral" : "Salvar Alterações"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* --- Confirm Delete Dialog --- */}
            {(() => {
                const targetGeneralTag = generalTags.find((t) => t.id === deleteDialog.id);

                return (
                    <ConfirmDialog
                        open={deleteDialog.open}
                        title={`Excluir tag geral "${deleteDialog.name}"?`}
                        description="Esta tag não estará mais disponível para novas despesas. Todas as transações existentes manterão seus dados preservados."
                        itemPreview={
                            deleteDialog.open && targetGeneralTag ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-inner" style={{ backgroundColor: `${targetGeneralTag.color}20`, color: targetGeneralTag.color }}>
                                        <DynamicIcon name={targetGeneralTag.icon || "Tag"} className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate text-sm font-semibold text-text">{targetGeneralTag.name}</span>
                                        <span className="text-[11px] text-muted">Tag transversal</span>
                                    </div>
                                </div>
                            ) : null
                        }
                        confirmLabel="Excluir"
                        cancelLabel="Cancelar"
                        pending={loading}
                        onConfirm={handleConfirmDelete}
                        onClose={() => setDeleteDialog({ open: false, id: "", name: "" })}
                    />
                );
            })()}
        </div>
    );
}
