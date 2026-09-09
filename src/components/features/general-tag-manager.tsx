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
    const [color, setColor] = useState("#5EEAD4");
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
        setColor("#5EEAD4");
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
                <button type="button" onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95">
                    <Plus className="size-4 shrink-0" aria-hidden />
                    Nova Tag Geral
                </button>
            </div>

            {mainError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    <span>{mainError}</span>
                </div>
            )}

            {/* List of General Tags - Stacked 100% width */}
            {generalTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-raised py-10 text-center">
                    <Tags className="mb-2 size-7 text-muted" aria-hidden />
                    <p className="text-sm font-medium text-text">Nenhuma tag geral cadastrada</p>
                    <p className="text-xs text-muted">Crie tags transversais para enriquecer seus relatórios</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2 lg:max-h-64 lg:overflow-y-auto lg:pr-1.5">
                    {generalTags.map((tag) => (
                        <div key={tag.id} className="group flex w-full items-center justify-between rounded-2xl bg-surface-raised p-3.5 transition-colors hover:bg-surface-raised/80">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-inner" style={{ backgroundColor: `${tag.color}25`, color: tag.color }}>
                                    <DynamicIcon name={tag.icon} className="size-4.5" />
                                </div>
                                <span className="text-sm font-semibold text-text">{tag.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => openEdit(tag)} className="rounded-xl p-2 text-muted transition-colors hover:bg-surface hover:text-text" title="Editar tag geral" aria-label={`Editar tag ${tag.name}`}>
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
                                    className="rounded-xl p-2 text-muted transition-colors hover:bg-danger/15 hover:text-danger-fg"
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

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text">Nome da Tag Geral</label>
                        <input type="text" placeholder="Ex: Reembolso, Família, Viagem..." value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} className="rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-violet" autoFocus />
                    </div>

                    <ColorPicker value={color} onChange={setColor} label="Cor da Tag" usedMap={colorUsage} />

                    <IconPicker value={icon} onChange={setIcon} color={color} label="Ícone da Tag (opcional)" optional usedMap={iconUsage} />

                    <div className="flex items-center justify-end gap-2 pt-3">
                        <button type="button" disabled={loading} onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-text">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || !name.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95 disabled:opacity-50">
                            <Check className="size-4" aria-hidden />
                            {loading ? "Salvando..." : "Salvar Tag"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* --- Confirm Delete Dialog --- */}
            <ConfirmDialog open={deleteDialog.open} title={`Excluir tag geral "${deleteDialog.name}"?`} description="A tag será desvinculada de transações futuras. Transações existentes preservarão seu histórico." confirmLabel="Excluir" cancelLabel="Cancelar" pending={loading} onConfirm={handleConfirmDelete} onClose={() => setDeleteDialog({ open: false, id: "", name: "" })} />
        </div>
    );
}
