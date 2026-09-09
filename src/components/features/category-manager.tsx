"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, AlertCircle, Tag } from "lucide-react";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { createSpecificTag, updateSpecificTag, deleteSpecificTag } from "@/actions/tags";
import type { CategoryOption, GeneralTagOption, SpecificTagOption } from "@/lib/domain/catalog";
import { buildColorUsageMap, buildIconUsageMap, buildSpecificTagIconUsageMap } from "@/lib/domain/catalog-usage";
import { ColorPicker } from "@/components/ui/color-picker";
import { IconPicker } from "@/components/ui/icon-picker";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DynamicIcon } from "./transaction-visuals";

interface CategoryManagerProps {
    categories: CategoryOption[];
    specificTags?: SpecificTagOption[];
    generalTags?: GeneralTagOption[];
}

export function CategoryManager({ categories, specificTags = [], generalTags = [] }: CategoryManagerProps) {
    // Map specific tags by category
    const tagsByCategory = useMemo(() => {
        const map = new Map<string, SpecificTagOption[]>();
        for (const tag of specificTags) {
            const list = map.get(tag.categoryId) || [];
            list.push(tag);
            map.set(tag.categoryId, list);
        }
        return map;
    }, [specificTags]);

    // Active Category Modal state
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [catModalMode, setCatModalMode] = useState<"create" | "manage">("create");
    const [activeCatId, setActiveCatId] = useState<string | null>(null);
    const [catName, setCatName] = useState("");
    const [catColor, setCatColor] = useState("#A78BFA");
    const [catIcon, setCatIcon] = useState("ReceiptText");

    // Specific tag inline form inside Category Modal
    const [tagFormOpen, setTagFormOpen] = useState(false);
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [tagName, setTagName] = useState("");
    const [tagIcon, setTagIcon] = useState("");

    // Delete Confirmation Dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        type: "category" | "specificTag";
        id: string;
        name: string;
    }>({
        open: false,
        type: "category",
        id: "",
        name: "",
    });

    const [loading, setLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [mainError, setMainError] = useState<string | null>(null);

    // Active category object
    const activeCategory = useMemo(() => categories.find((c) => c.id === activeCatId), [categories, activeCatId]);

    // Specific tags for active category
    const activeSpecificTags = useMemo(() => (activeCatId ? tagsByCategory.get(activeCatId) || [] : []), [tagsByCategory, activeCatId]);

    // Usage maps for category (compara apenas com outras categorias e tags gerais)
    const categoryColorUsage = useMemo(() => buildColorUsageMap({ categories, generalTags, excludeId: activeCatId }), [categories, generalTags, activeCatId]);
    const categoryIconUsage = useMemo(() => buildIconUsageMap({ categories, generalTags, excludeId: activeCatId }), [categories, generalTags, activeCatId]);

    // Usage map para ícones de tags específicas da mesma categoria
    const tagIconUsage = useMemo(() => buildSpecificTagIconUsageMap({ specificTags: activeSpecificTags, excludeId: editingTagId }), [activeSpecificTags, editingTagId]);

    // --- Category actions ---
    function openCreateCategory() {
        setCatModalMode("create");
        setActiveCatId(null);
        setCatName("");
        setCatColor("#A78BFA");
        setCatIcon("ReceiptText");
        setTagFormOpen(false);
        setModalError(null);
        setCatModalOpen(true);
    }

    function openManageCategory(cat: CategoryOption) {
        setCatModalMode("manage");
        setActiveCatId(cat.id);
        setCatName(cat.name);
        setCatColor(cat.color);
        setCatIcon(cat.icon);
        setTagFormOpen(false);
        setEditingTagId(null);
        setModalError(null);
        setCatModalOpen(true);
    }

    async function handleSaveCategory(e: React.FormEvent) {
        e.preventDefault();
        if (!catName.trim()) return;

        setLoading(true);
        setModalError(null);

        const result =
            catModalMode === "create"
                ? await createCategory({
                      name: catName.trim(),
                      color: catColor,
                      icon: catIcon,
                  })
                : await updateCategory(activeCatId!, {
                      name: catName.trim(),
                      color: catColor,
                      icon: catIcon,
                  });

        setLoading(false);

        if (!result.ok) {
            setModalError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success(catModalMode === "create" ? "Categoria criada com sucesso" : "Categoria atualizada com sucesso");

        if (catModalMode === "create") {
            setCatModalOpen(false);
        }
    }

    // --- Specific Tag actions inside modal ---
    function startCreateTag() {
        setEditingTagId(null);
        setTagName("");
        setTagIcon("");
        setTagFormOpen(true);
    }

    function startEditTag(tag: SpecificTagOption) {
        setEditingTagId(tag.id);
        setTagName(tag.name);
        setTagIcon(tag.icon || "");
        setTagFormOpen(true);
    }

    function cancelTagForm() {
        setTagFormOpen(false);
        setEditingTagId(null);
        setTagName("");
    }

    async function handleSaveSpecificTag(e: React.FormEvent) {
        e.preventDefault();
        if (!tagName.trim() || !activeCatId) return;

        setLoading(true);
        setModalError(null);

        const result = editingTagId
            ? await updateSpecificTag(editingTagId, {
                  name: tagName.trim(),
                  color: catColor,
                  icon: tagIcon ? tagIcon : null,
              })
            : await createSpecificTag({
                  categoryId: activeCatId,
                  name: tagName.trim(),
                  color: catColor,
                  icon: tagIcon ? tagIcon : null,
              });

        setLoading(false);

        if (!result.ok) {
            setModalError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success(editingTagId ? "Tag atualizada com sucesso" : "Tag criada com sucesso");
        cancelTagForm();
    }

    // --- Deletion actions ---
    async function handleConfirmDelete() {
        setLoading(true);
        setMainError(null);

        const result = deleteDialog.type === "category" ? await deleteCategory(deleteDialog.id) : await deleteSpecificTag(deleteDialog.id);

        setLoading(false);

        if (!result.ok) {
            setMainError(result.error);
            toast.error(result.error);
        } else {
            toast.success(deleteDialog.type === "category" ? "Categoria excluída com sucesso" : "Tag excluída com sucesso");
        }

        if (deleteDialog.type === "category") {
            setCatModalOpen(false);
        }

        setDeleteDialog({ open: false, type: "category", id: "", name: "" });
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orchid/15 text-orchid">
                        <Tag className="size-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-text">Categorias e Tags Específicas</h2>
                        <p className="text-xs text-muted">Gerencie suas categorias e as tags exclusivas vinculadas a cada uma</p>
                    </div>
                </div>
                <button type="button" onClick={openCreateCategory} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95">
                    <Plus className="size-4 shrink-0" aria-hidden />
                    Nova Categoria
                </button>
            </div>

            {mainError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    <span>{mainError}</span>
                </div>
            )}

            {/* Clean Category List */}
            <div className="flex flex-col gap-2 lg:max-h-72 lg:overflow-y-auto lg:pr-1.5">
                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-raised py-12 text-center">
                        <Tag className="mb-2 size-8 text-muted" aria-hidden />
                        <p className="text-sm font-medium text-text">Nenhuma categoria encontrada</p>
                        <p className="text-xs text-muted">Crie sua primeira categoria para começar</p>
                    </div>
                ) : (
                    categories.map((cat) => {
                        const catTags = tagsByCategory.get(cat.id) || [];

                        return (
                            <div key={cat.id} onClick={() => openManageCategory(cat)} className="group flex w-full cursor-pointer items-center justify-between rounded-2xl bg-surface-raised p-3.5 transition-colors hover:bg-surface-raised/80">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-inner" style={{ backgroundColor: `${cat.color}25`, color: cat.color }}>
                                        <DynamicIcon name={cat.icon} className="size-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-text">{cat.name}</span>
                                        <span className="text-xs text-muted">{catTags.length === 0 ? "Sem tags vinculadas" : catTags.length === 1 ? "1 tag específica" : `${catTags.length} tags específicas`}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => openManageCategory(cat)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface/80" title="Gerenciar categoria e tags">
                                        <Pencil className="size-3 text-muted" aria-hidden />
                                        <span>Editar</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDeleteDialog({
                                                open: true,
                                                type: "category",
                                                id: cat.id,
                                                name: cat.name,
                                            })
                                        }
                                        className="rounded-xl p-2 text-muted transition-colors hover:bg-danger/15 hover:text-danger-fg"
                                        title="Excluir categoria"
                                        aria-label={`Excluir categoria ${cat.name}`}
                                    >
                                        <Trash2 className="size-3.5" aria-hidden />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* --- Modal: Category Create / Manage --- */}
            <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title={catModalMode === "create" ? "Nova Categoria" : `Gerenciar "${activeCategory?.name || catName}"`} description={catModalMode === "create" ? "Personalize o nome, cor e ícone da categoria." : "Edite as configurações da categoria e gerencie suas tags específicas vinculadas."}>
                <div className="flex flex-col gap-6">
                    {modalError && (
                        <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                            <AlertCircle className="size-4 shrink-0" aria-hidden />
                            <span>{modalError}</span>
                        </div>
                    )}

                    {/* Category Details Form */}
                    <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text">Nome da Categoria</label>
                            <input type="text" placeholder="Ex: Alimentação, Transporte, Saúde..." value={catName} onChange={(e) => setCatName(e.target.value)} required maxLength={50} className="rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-violet" autoFocus={catModalMode === "create"} />
                        </div>

                        <ColorPicker value={catColor} onChange={setCatColor} label="Cor da Categoria" usedMap={categoryColorUsage} />

                        <IconPicker value={catIcon} onChange={setCatIcon} color={catColor} label="Ícone da Categoria" usedMap={categoryIconUsage} />

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button type="button" disabled={loading} onClick={() => setCatModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-text">
                                Fechar
                            </button>
                            <button type="submit" disabled={loading || !catName.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95 disabled:opacity-50">
                                <Check className="size-4" aria-hidden />
                                {loading ? "Salvando..." : catModalMode === "create" ? "Criar Categoria" : "Salvar Alterações"}
                            </button>
                        </div>
                    </form>

                    {/* Specific Tags Section (Only shown in manage mode) */}
                    {catModalMode === "manage" && activeCategory && (
                        <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <h4 className="text-sm font-bold text-text">Tags Específicas</h4>
                                    <p className="text-xs text-muted">Subcategorias exclusivas de {activeCategory.name}</p>
                                </div>
                                {!tagFormOpen && (
                                    <button type="button" onClick={startCreateTag} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface/80">
                                        <Plus className="size-3.5 text-violet" aria-hidden />
                                        Nova Tag
                                    </button>
                                )}
                            </div>

                            {/* Inline Tag Create/Edit Form */}
                            {tagFormOpen && (
                                <form onSubmit={handleSaveSpecificTag} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
                                    <h5 className="text-xs font-bold text-text">{editingTagId ? "Editar Tag Específica" : "Nova Tag Específica"}</h5>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-muted">Nome da Tag</label>
                                        <input type="text" placeholder="Ex: Restaurante, Celular, Academia..." value={tagName} onChange={(e) => setTagName(e.target.value)} required maxLength={50} className="rounded-xl bg-surface-raised px-3 py-2 text-xs text-text outline-none focus:ring-1 focus:ring-violet" autoFocus />
                                    </div>

                                    <div className="flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2 text-xs text-muted">
                                        <span className="size-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: catColor }} aria-hidden />
                                        <span>
                                            Cor vinculada à categoria: <strong className="font-semibold text-text">{catName || "Categoria"}</strong>
                                        </span>
                                    </div>

                                    <IconPicker value={tagIcon} onChange={setTagIcon} color={catColor} label="Ícone (opcional)" optional usedMap={tagIconUsage} />

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button type="button" onClick={cancelTagForm} className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-text">
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={loading || !tagName.trim()} className="inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-violet px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95 disabled:opacity-50">
                                            <Check className="size-3.5" aria-hidden />
                                            {loading ? "Salvando..." : "Salvar Tag"}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Stacked List of Specific Tags */}
                            <div className="flex flex-col gap-2">
                                {activeSpecificTags.length === 0 ? (
                                    <div className="rounded-xl bg-surface p-4 text-center text-xs text-muted">Nenhuma tag específica para esta categoria.</div>
                                ) : (
                                    activeSpecificTags.map((tag) => (
                                        <div key={tag.id} className="flex w-full items-center justify-between rounded-xl bg-surface p-2.5 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="flex size-7 items-center justify-center rounded-lg shadow-inner"
                                                    style={{
                                                        backgroundColor: `${tag.color || catColor}25`,
                                                        color: tag.color || catColor,
                                                    }}
                                                >
                                                    <DynamicIcon name={tag.icon || catIcon} className="size-4" />
                                                </div>
                                                <span className="text-xs font-semibold text-text">{tag.name}</span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => startEditTag(tag)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-text" title="Editar tag" aria-label={`Editar tag ${tag.name}`}>
                                                    <Pencil className="size-3" aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteDialog({
                                                            open: true,
                                                            type: "specificTag",
                                                            id: tag.id,
                                                            name: tag.name,
                                                        })
                                                    }
                                                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/15 hover:text-danger-fg"
                                                    title="Excluir tag"
                                                    aria-label={`Excluir tag ${tag.name}`}
                                                >
                                                    <Trash2 className="size-3" aria-hidden />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* --- Confirm Delete Dialog --- */}
            <ConfirmDialog
                open={deleteDialog.open}
                title={deleteDialog.type === "category" ? `Excluir categoria "${deleteDialog.name}"?` : `Excluir tag "${deleteDialog.name}"?`}
                description={deleteDialog.type === "category" ? "Transações vinculadas a esta categoria impedirão a exclusão por integridade. Caso deseje remover, reclassifique as transações antes." : "A tag específica será removida. Transações já salvas manterão o histórico."}
                confirmLabel="Excluir"
                cancelLabel="Cancelar"
                pending={loading}
                onConfirm={handleConfirmDelete}
                onClose={() => setDeleteDialog({ open: false, type: "category", id: "", name: "" })}
            />
        </div>
    );
}
