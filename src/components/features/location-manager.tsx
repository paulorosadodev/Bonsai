"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, AlertCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createLocation, updateLocation, deleteLocation } from "@/actions/locations";
import type { LocationOption } from "@/lib/data/locations";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/dialog";

interface LocationManagerProps {
    locations: LocationOption[];
}

export function LocationManager({ locations }: LocationManagerProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");

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

    function openCreate() {
        setModalMode("create");
        setEditingId(null);
        setName("");
        setModalError(null);
        setModalOpen(true);
    }

    function openEdit(loc: LocationOption) {
        setModalMode("edit");
        setEditingId(loc.id);
        setName(loc.name);
        setModalError(null);
        setModalOpen(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setModalError(null);

        const result = modalMode === "create" ? await createLocation({ name: name.trim() }) : await updateLocation(editingId!, { name: name.trim() });

        setLoading(false);

        if (!result.ok) {
            setModalError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success(modalMode === "create" ? "Localidade criada com sucesso" : "Localidade atualizada com sucesso");
        setModalOpen(false);
    }

    async function handleConfirmDelete() {
        setLoading(true);
        setMainError(null);

        const result = await deleteLocation(deleteDialog.id);
        setLoading(false);

        if (!result.ok) {
            setMainError(result.error);
            toast.error(result.error);
        } else {
            toast.success("Localidade excluída com sucesso");
        }

        setDeleteDialog({ open: false, id: "", name: "" });
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-400">
                        <MapPin className="size-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-text">Localidades</h2>
                        <p className="text-xs text-muted">Destinos utilizados para transações do tipo Uber (ex: Casa, Trabalho, Aeroporto)</p>
                    </div>
                </div>
                <button type="button" onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-violet/25 bg-violet/10 px-3 py-1.5 text-xs font-semibold text-orchid transition-all hover:border-violet/40 hover:bg-violet/20 hover:text-white active:scale-95">
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    Nova Localidade
                </button>
            </div>

            {mainError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    <span>{mainError}</span>
                </div>
            )}

            {/* List of Locations - Clean Minimalist List */}
            {locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-10 text-center">
                    <MapPin className="mb-2 size-7 text-muted" aria-hidden />
                    <p className="text-sm font-medium text-text">Nenhuma localidade cadastrada</p>
                    <p className="text-xs text-muted">Cadastre destinos para associar às suas corridas de Uber</p>
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-white/5">
                    {locations.map((loc) => (
                        <div key={loc.id} onClick={() => openEdit(loc)} className="group flex w-full cursor-pointer items-center justify-between py-2.5 px-2 -mx-2 rounded-xl transition-colors hover:bg-white/3 sm:px-3 sm:-mx-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <MapPin className="size-3.5 shrink-0 text-muted/60 transition-colors group-hover:text-sky-400" aria-hidden />
                                <span className="truncate text-sm font-medium text-text transition-colors group-hover:text-white">{loc.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => openEdit(loc)} className="rounded-lg p-2 text-muted/50 transition-all hover:bg-surface-raised hover:text-text sm:opacity-0 sm:group-hover:opacity-100" title="Editar localidade" aria-label={`Editar localidade ${loc.name}`}>
                                    <Pencil className="size-3.5" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMainError(null);
                                        setDeleteDialog({ open: true, id: loc.id, name: loc.name });
                                    }}
                                    className="rounded-lg p-2 text-muted/50 transition-all hover:bg-danger/15 hover:text-danger-fg sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Excluir localidade"
                                    aria-label={`Excluir localidade ${loc.name}`}
                                >
                                    <Trash2 className="size-3.5" aria-hidden />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === "create" ? "Nova Localidade" : "Editar Localidade"}>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    {modalError && (
                        <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                            <AlertCircle className="size-4 shrink-0" aria-hidden />
                            <span>{modalError}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted">Nome da Localidade</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Casa, Trabalho, Aeroporto" maxLength={100} required autoFocus className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-violet" />
                    </div>

                    <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted hover:bg-surface">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || !name.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-violet px-4 py-2 text-xs font-semibold text-ink hover:bg-orchid disabled:opacity-50">
                            <Check className="size-4" aria-hidden />
                            {loading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteDialog.open}
                title={`Excluir localidade "${deleteDialog.name}"?`}
                description="Esta localidade deixará de ser sugerida no preenchimento de corridas de Uber. Se já existirem despesas vinculadas, a exclusão será bloqueada por segurança."
                itemPreview={
                    deleteDialog.name ? (
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-400">
                                <MapPin className="size-4.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm font-semibold text-text">{deleteDialog.name}</span>
                                <span className="text-[11px] text-muted">Destino para corridas de Uber</span>
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
        </div>
    );
}
