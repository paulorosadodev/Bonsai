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
import { CatalogPreview } from "./catalog-preview";

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

    // Specific tag dedicated sub-modal state (totalmente desacoplado)
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [tagName, setTagName] = useState("");
    const [tagIcon, setTagIcon] = useState("");
    const [tagModalError, setTagModalError] = useState<string | null>(null);

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
        setModalError(null);
        setCatModalOpen(true);
    }

    function openManageCategory(cat: CategoryOption) {
        setCatModalMode("manage");
        setActiveCatId(cat.id);
        setCatName(cat.name);
        setCatColor(cat.color);
        setCatIcon(cat.icon);
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

    // --- Specific Tag actions (Submodal dedicada) ---
    function startCreateTag() {
        setEditingTagId(null);
        setTagName("");
        setTagIcon("");
        setTagModalError(null);
        setTagModalOpen(true);
    }

    function startEditTag(tag: SpecificTagOption) {
        setEditingTagId(tag.id);
        setTagName(tag.name);
        setTagIcon(tag.icon || "");
        setTagModalError(null);
        setTagModalOpen(true);
    }

    async function handleSaveSpecificTag(e: React.FormEvent) {
        e.preventDefault();
        if (!tagName.trim() || !activeCatId) return;

        setLoading(true);
        setTagModalError(null);

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
            setTagModalError(result.error);
            toast.error(result.error);
            return;
        }

        toast.success(editingTagId ? "Tag atualizada com sucesso" : "Tag criada com sucesso");
        setTagModalOpen(false);
        setEditingTagId(null);
        setTagName("");
        setTagIcon("");
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
                <button type="button" onClick={openCreateCategory} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-violet/25 bg-violet/10 px-3 py-1.5 text-xs font-semibold text-orchid transition-all hover:border-violet/40 hover:bg-violet/20 hover:text-white active:scale-95">
                    <Plus className="size-3.5 shrink-0" aria-hidden />
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
            <div className="flex flex-col divide-y divide-white/5">
                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-10 text-center">
                        <Tag className="mb-2 size-7 text-muted" aria-hidden />
                        <p className="text-sm font-medium text-text">Nenhuma categoria encontrada</p>
                        <p className="text-xs text-muted">Crie sua primeira categoria para começar</p>
                    </div>
                ) : (
                    categories.map((cat) => {
                        const catTags = tagsByCategory.get(cat.id) || [];

                        return (
                            <div key={cat.id} onClick={() => openManageCategory(cat)} className="group flex w-full cursor-pointer items-center justify-between py-3 px-2 -mx-2 rounded-xl transition-colors hover:bg-white/3 sm:px-3 sm:-mx-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-inner" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                                        <DynamicIcon name={cat.icon} className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate text-sm font-semibold text-text transition-colors group-hover:text-white">{cat.name}</span>
                                        <span className="text-xs text-muted">{catTags.length === 0 ? "Sem tags vinculadas" : catTags.length === 1 ? "1 tag específica" : `${catTags.length} tags específicas`}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => openManageCategory(cat)} className="rounded-lg p-2 text-muted/50 transition-all hover:bg-surface-raised hover:text-text sm:opacity-0 sm:group-hover:opacity-100" title="Gerenciar categoria e tags" aria-label={`Editar categoria ${cat.name}`}>
                                        <Pencil className="size-3.5" aria-hidden />
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
                                        className="rounded-lg p-2 text-muted/50 transition-all hover:bg-danger/15 hover:text-danger-fg sm:opacity-0 sm:group-hover:opacity-100"
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
                <div className="flex flex-col gap-5">
                    {modalError && (
                        <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                            <AlertCircle className="size-4 shrink-0" aria-hidden />
                            <span>{modalError}</span>
                        </div>
                    )}

                    {/* Preview em Tempo Real */}
                    <CatalogPreview name={catName} color={catColor} icon={catIcon} type="category" />

                    {/* Category Details Form */}
                    <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
                        {/* Nome e Ícone integrados */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text">Nome da Categoria</label>
                            <div className="flex items-center gap-3">
                                <IconPicker value={catIcon} onChange={setCatIcon} color={catColor} variant="avatar" placement="top" usedMap={categoryIconUsage} showUsageText={false} />
                                <input type="text" placeholder="Ex: Alimentação, Transporte, Saúde..." value={catName} onChange={(e) => setCatName(e.target.value)} required maxLength={50} className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-violet" autoFocus={catModalMode === "create"} />
                            </div>
                            {categoryIconUsage?.[catIcon] && categoryIconUsage[catIcon].length > 0 ? (
                                <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted/70">
                                    <span className="size-1.5 shrink-0 rounded-full bg-muted/40" aria-hidden />
                                    <span>
                                        Ícone também usado em: <span className="font-medium text-text/80">{categoryIconUsage[catIcon].join(", ")}</span>
                                    </span>
                                </p>
                            ) : null}
                        </div>

                        {/* Paleta Compacta e Curada */}
                        <ColorPicker value={catColor} onChange={setCatColor} label="Cor da Categoria" usedMap={categoryColorUsage} />

                        {/* Ações da Categoria */}
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
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-sm font-bold text-text">Tags Específicas</h4>
                                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-muted">{activeSpecificTags.length}</span>
                                    </div>
                                    <p className="text-xs text-muted">Subcategorias exclusivas vinculadas a {activeCategory.name}</p>
                                </div>
                                <button type="button" onClick={startCreateTag} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-violet/25 bg-violet/10 px-3 py-1.5 text-xs font-semibold text-orchid transition-all hover:border-violet/40 hover:bg-violet/20 hover:text-white active:scale-95">
                                    <Plus className="size-3.5" aria-hidden />
                                    Nova Tag
                                </button>
                            </div>

                            {/* Tags em chips interativos e limpos */}
                            {activeSpecificTags.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/10 bg-surface/30 p-4 text-center text-xs text-muted">Nenhuma tag específica para esta categoria. Clique em &quot;Nova Tag&quot; para adicionar.</div>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {activeSpecificTags.map((tag) => (
                                        <div key={tag.id} className="group relative flex items-center gap-2 rounded-xl border border-white/8 bg-surface px-2.5 py-1.5 text-xs text-text transition-all hover:border-white/15 hover:bg-surface-raised">
                                            <div
                                                className="flex size-6 shrink-0 items-center justify-center rounded-lg shadow-inner"
                                                style={{
                                                    backgroundColor: `color-mix(in srgb, ${catColor} 18%, transparent)`,
                                                    color: catColor,
                                                }}
                                            >
                                                <DynamicIcon name={tag.icon || catIcon} className="size-3.5" />
                                            </div>
                                            <span className="font-medium text-text">{tag.name}</span>
                                            <div className="flex items-center gap-0.5 ml-1 border-l border-white/10 pl-1">
                                                <button type="button" onClick={() => startEditTag(tag)} className="rounded p-1 text-muted/60 transition-colors hover:bg-white/10 hover:text-text" title={`Editar tag ${tag.name}`} aria-label={`Editar tag ${tag.name}`}>
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
                                                    className="rounded p-1 text-muted/60 transition-colors hover:bg-danger/20 hover:text-danger-fg"
                                                    title={`Excluir tag ${tag.name}`}
                                                    aria-label={`Excluir tag ${tag.name}`}
                                                >
                                                    <Trash2 className="size-3" aria-hidden />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* --- Modal Dedicada: Criar / Editar Tag Específica --- */}
            <Modal open={tagModalOpen} onClose={() => setTagModalOpen(false)} zIndex="z-60" title={editingTagId ? `Editar Tag em "${activeCategory?.name || catName}"` : `Nova Tag em "${activeCategory?.name || catName}"`} description="Tags específicas herdam a cor da categoria e servem para detalhar seus gastos.">
                <form onSubmit={handleSaveSpecificTag} className="flex flex-col gap-4">
                    {tagModalError && (
                        <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                            <AlertCircle className="size-4 shrink-0" aria-hidden />
                            <span>{tagModalError}</span>
                        </div>
                    )}

                    <CatalogPreview name={tagName} color={catColor} icon={tagIcon || catIcon} type="specificTag" parentCategoryName={activeCategory?.name || catName} />

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text">Nome da Tag</label>
                        <div className="flex items-center gap-3">
                            <IconPicker value={tagIcon} onChange={setTagIcon} color={catColor} variant="avatar" placement="top" optional usedMap={tagIconUsage} showUsageText={false} />
                            <input type="text" placeholder="Ex: Restaurante, Celular, Academia..." value={tagName} onChange={(e) => setTagName(e.target.value)} required maxLength={50} className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-violet" autoFocus />
                        </div>
                        {tagIcon && tagIconUsage?.[tagIcon] && tagIconUsage[tagIcon].length > 0 ? (
                            <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted/70">
                                <span className="size-1.5 shrink-0 rounded-full bg-muted/40" aria-hidden />
                                <span>
                                    Ícone também usado em: <span className="font-medium text-text/80">{tagIconUsage[tagIcon].join(", ")}</span>
                                </span>
                            </p>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs text-muted">
                        <span className="size-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: catColor }} aria-hidden />
                        <span>
                            Cor vinculada à categoria: <strong className="font-semibold text-text">{activeCategory?.name || catName}</strong>
                        </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" disabled={loading} onClick={() => setTagModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-text">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || !tagName.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-orchid active:scale-95 disabled:opacity-50">
                            <Check className="size-4" aria-hidden />
                            {loading ? "Salvando..." : editingTagId ? "Salvar Alterações" : "Criar Tag"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* --- Confirm Delete Dialog --- */}
            {(() => {
                const targetCat = deleteDialog.type === "category" ? categories.find((c) => c.id === deleteDialog.id) : null;
                const targetTag = deleteDialog.type === "specificTag" ? specificTags.find((t) => t.id === deleteDialog.id) : null;

                return (
                    <ConfirmDialog
                        open={deleteDialog.open}
                        title={deleteDialog.type === "category" ? `Excluir categoria "${deleteDialog.name}"?` : `Excluir tag "${deleteDialog.name}"?`}
                        description={deleteDialog.type === "category" ? "Se existirem despesas vinculadas a esta categoria, a exclusão será bloqueada para proteger seu histórico financeiro. Caso queira remover, reclassifique as transações antes." : "Esta tag deixará de ser sugerida para novas despesas desta categoria. O histórico existente não será afetado."}
                        itemPreview={
                            deleteDialog.open && (targetCat || targetTag) ? (
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-inner"
                                        style={{
                                            backgroundColor: `${targetCat?.color || targetTag?.color || activeCategory?.color || "#A78BFA"}20`,
                                            color: targetCat?.color || targetTag?.color || activeCategory?.color || "#A78BFA",
                                        }}
                                    >
                                        <DynamicIcon name={targetCat?.icon || targetTag?.icon || activeCategory?.icon || "Tag"} className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate text-sm font-semibold text-text">{targetCat?.name || targetTag?.name || deleteDialog.name}</span>
                                        <span className="text-[11px] text-muted">{deleteDialog.type === "category" ? "Categoria principal" : `Tag vinculada a ${activeCategory?.name || "categoria"}`}</span>
                                    </div>
                                </div>
                            ) : null
                        }
                        confirmLabel="Excluir"
                        cancelLabel="Cancelar"
                        pending={loading}
                        onConfirm={handleConfirmDelete}
                        onClose={() => setDeleteDialog({ open: false, type: "category", id: "", name: "" })}
                    />
                );
            })()}
        </div>
    );
}
