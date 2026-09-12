"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Car, Unlock, Plus, Check, AlertCircle } from "lucide-react";

import { getReturnUrl } from "@/lib/navigation/return-url";

import { createTransaction, updateTransaction, updateRecurringOccurrence } from "@/actions";
import { createLocation } from "@/actions/locations";
import { paymentMethodLabels, type CategoryOption, type GeneralTagOption, type SpecificTagOption } from "@/lib/domain/catalog";
import { parseCivilDate, type CivilDate } from "@/lib/domain/billing-cycle";
import { effectiveFromForOccurrence, isEligibleForRecurrence, previousCivilDate } from "@/lib/domain/recurrence";
import { formatBrl, parseBrlToCents } from "@/lib/domain/money";
import { createTransactionSchema, transactionSchema, type TransactionFormInput } from "@/lib/domain/schemas";
import type { RecurringOccurrenceDetail, TransactionRecord } from "@/lib/data/types";
import type { LocationOption } from "@/lib/data/locations";
import { AnimatedChoice } from "@/components/ui/animated-choice";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { messageTone } from "@/components/ui/message";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/components/ui/cn";
import { formatCivilDate } from "./params";
import { getItemVisual, paymentVisuals } from "./transaction-visuals";
import { NameAutocomplete } from "./name-autocomplete";
import type { TransactionSuggestion } from "@/actions/suggestions";

const DEFAULT_PARTIAL_REIMBURSEMENT_BRL = "R$ 49,00";

function centsToAmountInput(cents: number) {
    return formatBrl(cents);
}

function toFormValues(transaction: TransactionRecord | RecurringOccurrenceDetail | undefined, today: string, isRecurring: boolean, defaultCategory?: string): TransactionFormInput {
    const recurringEndDate = transaction && "endsBefore" in transaction && transaction.endsBefore ? previousCivilDate(transaction.endsBefore as CivilDate) : "";

    if (!transaction) {
        return {
            name: "",
            description: "",
            amount: "",
            reimbursedAmount: "",
            purchaseDate: today,
            paymentMethod: "credit",
            installmentCount: 1,
            isRecurring: false,
            recurringEndDate: "",
            category: defaultCategory || ("" as TransactionFormInput["category"]),
            generalTags: [],
            specificTag: null,
            locationId: null,
        };
    }

    const reimbursedAmount = transaction && "reimbursedAmountCents" in transaction && transaction.reimbursedAmountCents ? centsToAmountInput(transaction.reimbursedAmountCents) : "";

    return {
        name: transaction.name,
        description: transaction.description ?? "",
        amount: centsToAmountInput(transaction.amountCents),
        reimbursedAmount,
        purchaseDate: "purchaseDate" in transaction ? transaction.purchaseDate : transaction.occurrenceDate,
        paymentMethod: transaction.paymentMethod,
        installmentCount: "installmentCount" in transaction ? transaction.installmentCount : 1,
        isRecurring,
        recurringEndDate,
        category: transaction.categoryId,
        generalTags: transaction.generalTagIds ?? [],
        specificTag: transaction.specificTagId ?? null,
        locationId: "locationId" in transaction ? (transaction.locationId ?? null) : null,
    };
}

interface TransactionFormProps {
    mode: "create" | "edit";
    transaction?: TransactionRecord;
    recurrence?: RecurringOccurrenceDetail;
    today: string;
    categories?: CategoryOption[];
    generalTags?: GeneralTagOption[];
    specificTags?: SpecificTagOption[];
    locations?: LocationOption[];
    returnUrl?: string;
}

export function TransactionForm({ mode, transaction, recurrence, today, categories = [], generalTags = [], specificTags = [], locations = [], returnUrl }: TransactionFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const resolvedReturnUrl = getReturnUrl(returnUrl ?? searchParams.get("returnUrl"), "/transacoes");
    const editingRecurrence = Boolean(recurrence);
    const defaultCat = categories[0]?.id;
    const defaults = toFormValues(recurrence ?? transaction, today, editingRecurrence, defaultCat);
    const schema = mode === "create" ? createTransactionSchema(today) : transactionSchema;
    const {
        register,
        control,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<TransactionFormInput>({
        resolver: zodResolver(schema, undefined, { raw: true }),
        defaultValues: defaults,
    });
    const name = useWatch({ control, name: "name" }) ?? "";
    const amount = useWatch({ control, name: "amount" }) ?? "";
    const reimbursedAmount = useWatch({ control, name: "reimbursedAmount" }) ?? "";
    const paymentMethod = useWatch({ control, name: "paymentMethod" });
    const installmentCount = Number(useWatch({ control, name: "installmentCount" }) ?? 1);
    const isRecurring = Boolean(useWatch({ control, name: "isRecurring" }));
    const purchaseDate = useWatch({ control, name: "purchaseDate" }) ?? today;
    const category = useWatch({ control, name: "category" });
    const selectedTags = useWatch({ control, name: "generalTags" }) ?? [];
    const specificTag = useWatch({ control, name: "specificTag" });
    const locationId = useWatch({ control, name: "locationId" });

    const reimbursementTag = generalTags.find((t) => t.name.toLowerCase() === "reembolso" || t.name.toLowerCase() === "reimbursement" || (t as { slug?: string }).slug === "reimbursement");
    const isReimbursementSelected = Boolean(reimbursementTag && selectedTags.includes(reimbursementTag.id));
    const isPartialEligible = installmentCount === 1 && !isRecurring;
    const [isPartialExplicit, setIsPartialExplicit] = useState<boolean | null>(null);
    const isPartialMode = isPartialEligible && (isPartialExplicit !== null ? isPartialExplicit : Boolean(defaults.reimbursedAmount || reimbursedAmount));

    const [locationList, setLocationList] = useState<LocationOption[]>(locations);
    const uberTag = specificTags.find((t) => t.name.toLowerCase() === "uber" || (t as { slug?: string }).slug === "uber");
    const transportCategory = categories.find((c) => c.name.toLowerCase() === "transporte" || (c as { slug?: string }).slug === "transportation");

    const initialIsUber = Boolean((transaction && "locationId" in transaction && transaction.locationId) || (transaction && transaction.name.trim().toLowerCase() === "uber") || defaults.name.trim().toLowerCase() === "uber" || (defaults.specificTag && uberTag && defaults.specificTag === uberTag.id));
    const [isUberLocked, setIsUberLocked] = useState(initialIsUber);

    const [categoryManuallyModified, setCategoryManuallyModified] = useState(false);
    const [tagsManuallyModified, setTagsManuallyModified] = useState(false);
    const [pulsingField, setPulsingField] = useState<{ category?: boolean; tags?: boolean }>({});

    function triggerPulse(type: "category" | "tags") {
        setPulsingField((prev) => ({ ...prev, [type]: true }));
        setTimeout(() => {
            setPulsingField((prev) => ({ ...prev, [type]: false }));
        }, 1600);
    }

    function handleSuggestionSelected(suggestion: TransactionSuggestion) {
        if (mode === "edit" && name.trim().toLowerCase() === defaults.name.trim().toLowerCase()) {
            return;
        }

        if (!categoryManuallyModified) {
            const catExists = categories.some((c) => c.id === suggestion.categoryId);
            if (catExists) {
                setValue("category", suggestion.categoryId, { shouldValidate: true, shouldDirty: true });
                triggerPulse("category");
            }
        }

        if (!tagsManuallyModified) {
            const targetCategory = !categoryManuallyModified ? suggestion.categoryId : category;
            const validSpecTag = suggestion.specificTagId && specificTags.some((t) => t.id === suggestion.specificTagId && t.categoryId === targetCategory);
            setValue("specificTag", validSpecTag ? suggestion.specificTagId : null, { shouldValidate: true, shouldDirty: true });

            const validGenTags = (suggestion.generalTagIds ?? []).filter((gid) => generalTags.some((gt) => gt.id === gid));
            setValue("generalTags", validGenTags, { shouldValidate: true, shouldDirty: true });

            triggerPulse("tags");
        }
    }

    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickName, setQuickName] = useState("");
    const [quickLoading, setQuickLoading] = useState(false);
    const [quickError, setQuickError] = useState<string | null>(null);

    let hasValidAmount = false;
    try {
        hasValidAmount = Boolean(amount.trim()) && parseBrlToCents(amount) > 0;
    } catch {
        hasValidAmount = false;
    }

    const isCategoryValid = categories.some((c) => c.id === category);
    const isUber = isUberLocked || specificTag === uberTag?.id || name.trim().toLowerCase() === "uber";
    const isLocationValid = isUber ? Boolean(locationId && locationList.some((l) => l.id === locationId)) : true;
    const isFormValid = Boolean(name.trim() && hasValidAmount && purchaseDate.trim() && category && isCategoryValid && isLocationValid);
    const specificOptions = category ? specificTags.filter((t) => t.categoryId === category) : [];
    const canRecur = isEligibleForRecurrence(paymentMethod, Number.isFinite(installmentCount) ? installmentCount : 1);
    const installmentForcedStandalone = paymentMethod === "credit" && installmentCount > 1;
    const newMonthlyDay = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ? parseCivilDate(purchaseDate as CivilDate).day : 1;
    const effectFrom = editingRecurrence ? effectiveFromForOccurrence(today as CivilDate, recurrence?.occurrenceDate as CivilDate, newMonthlyDay) : null;

    async function handleQuickAddLocation(e: React.FormEvent) {
        e.preventDefault();
        if (!quickName.trim()) return;

        setQuickLoading(true);
        setQuickError(null);

        const res = await createLocation({ name: quickName.trim() });
        setQuickLoading(false);

        if (!res.ok) {
            setQuickError(res.error);
            return;
        }

        const newLoc: LocationOption = { id: res.id, name: res.name };
        setLocationList((prev) => [...prev, newLoc].sort((a, b) => a.name.localeCompare(b.name)));
        setValue("locationId", res.id, { shouldValidate: true, shouldDirty: true });
        setQuickAddOpen(false);
        setQuickName("");
        toast.success("Localidade adicionada");
    }

    async function onSubmit(values: TransactionFormInput) {
        const result = editingRecurrence && recurrence ? await updateRecurringOccurrence(recurrence.seriesId, recurrence.occurrenceDate, values) : mode === "edit" && transaction ? await updateTransaction(transaction.id, values) : await createTransaction(values);

        if (!result.ok) {
            toast.error(result.error);
            return;
        }

        toast.success(mode === "edit" ? "Transação atualizada" : "Transação criada");
        router.push(resolvedReturnUrl);
        router.refresh();
    }

    return (
        <>
            <motion.form className="flex flex-col gap-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
                {isUberLocked ? (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text">Nome</label>
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet/30 bg-surface px-4 py-3 shadow-inner">
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-violet/20 text-violet">
                                    <Car className="size-4" />
                                </span>
                                <span className="font-semibold text-text">Uber</span>
                                <span className="rounded-md bg-surface-raised px-2 py-0.5 text-xs text-muted">Bloqueado para Uber</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsUberLocked(false);
                                    setValue("locationId", null, { shouldValidate: true, shouldDirty: true });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:bg-surface-raised hover:text-text transition-colors"
                                title="Destravar campo para editar o nome livremente"
                            >
                                <Unlock className="size-3.5" />
                                Destravar
                            </button>
                        </div>
                        <input type="hidden" {...register("name")} />
                    </div>
                ) : (
                    <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <NameAutocomplete
                                id="name"
                                label="Nome"
                                error={errors.name?.message}
                                placeholder="Lámen"
                                maxLength={120}
                                value={field.value ?? ""}
                                onChange={(val) => {
                                    field.onChange(val);
                                    if (val.trim().toLowerCase() === "uber") {
                                        setIsUberLocked(true);
                                        setValue("name", "Uber", { shouldValidate: true, shouldDirty: true });
                                        if (transportCategory) {
                                            setValue("category", transportCategory.id, { shouldValidate: true, shouldDirty: true });
                                        }
                                        if (uberTag) {
                                            setValue("specificTag", uberTag.id, { shouldValidate: true, shouldDirty: true });
                                        }
                                    }
                                }}
                                onSuggestionSelected={handleSuggestionSelected}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                )}

                {isUberLocked ? (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="locationId" className="text-sm font-medium text-text">
                                Localidade <span className="text-danger">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setQuickError(null);
                                    setQuickName("");
                                    setQuickAddOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-violet hover:text-orchid"
                            >
                                <Plus className="size-3.5" />
                                Nova localidade
                            </button>
                        </div>
                        <select
                            id="locationId"
                            value={locationId ?? ""}
                            onChange={(e) => {
                                if (e.target.value === "__new__") {
                                    setQuickError(null);
                                    setQuickName("");
                                    setQuickAddOpen(true);
                                } else {
                                    setValue("locationId", e.target.value || null, { shouldValidate: true, shouldDirty: true });
                                }
                            }}
                            className={cn("w-full rounded-2xl bg-surface px-3 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-violet", errors.locationId && "outline-2 outline-solid outline-danger")}
                        >
                            <option value="">Selecione o destino da corrida...</option>
                            {locationList.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                            <option value="__new__">+ Adicionar nova localidade...</option>
                        </select>
                        {errors.locationId?.message ? <p className={messageTone.danger}>{errors.locationId.message}</p> : null}
                    </div>
                ) : null}
                <Controller control={control} name="amount" render={({ field }) => <CurrencyInput id="amount" label="Valor" error={errors.amount?.message} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />
                <Controller control={control} name="purchaseDate" render={({ field }) => <DatePicker id="purchaseDate" label="Data da Compra" value={field.value} onChange={(val) => field.onChange(val)} error={errors.purchaseDate?.message} today={today} />} />
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-medium text-text">Forma de Pagamento</legend>
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-raised p-1">
                        {(["credit", "pix"] as const).map((method) => (
                            <AnimatedChoice
                                key={method}
                                selected={paymentMethod === method}
                                visual={paymentVisuals[method]}
                                layoutId="payment-method-selection"
                                onClick={() => {
                                    setValue("paymentMethod", method, { shouldValidate: true });
                                    if (method === "pix") {
                                        setValue("installmentCount", 1, { shouldValidate: true });
                                    }
                                }}
                            >
                                {paymentMethodLabels[method]}
                            </AnimatedChoice>
                        ))}
                    </div>
                    {errors.paymentMethod?.message ? <p className={messageTone.danger}>{errors.paymentMethod.message}</p> : null}
                </fieldset>
                {paymentMethod === "credit" ? (
                    <Field
                        id="installmentCount"
                        label="Parcelas"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={60}
                        error={errors.installmentCount?.message}
                        {...register("installmentCount", {
                            onChange: (event) => {
                                if (Number(event.target.value) > 1) {
                                    if (getValues("isRecurring")) {
                                        setValue("isRecurring", false, { shouldValidate: true, shouldDirty: true });
                                        setValue("recurringEndDate", "", { shouldValidate: true, shouldDirty: true });
                                    }
                                    setValue("reimbursedAmount", "", { shouldValidate: true });
                                    setIsPartialExplicit(null);
                                }
                            },
                        })}
                    />
                ) : (
                    <input type="hidden" {...register("installmentCount")} />
                )}
                {installmentForcedStandalone ? (
                    <p className={messageTone.warning} role="status">
                        A compra se tornou parcelada e avulsa. Recorrência vale só para PIX ou cartão à vista.
                    </p>
                ) : null}
                {canRecur ? (
                    <Controller
                        control={control}
                        name="isRecurring"
                        render={({ field }) => (
                            <Toggle
                                checked={Boolean(field.value)}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (!checked) {
                                        setValue("recurringEndDate", "", { shouldValidate: true, shouldDirty: true });
                                    } else {
                                        setValue("reimbursedAmount", "", { shouldValidate: true });
                                        setIsPartialExplicit(null);
                                    }
                                }}
                                className="rounded-2xl bg-surface px-3"
                            >
                                Recorrente
                            </Toggle>
                        )}
                    />
                ) : null}
                {canRecur && isRecurring ? (
                    <div className="flex flex-col gap-2">
                        <Controller
                            control={control}
                            name="recurringEndDate"
                            render={({ field }) => <DatePicker id="recurringEndDate" label="Fim da recorrência (opcional)" value={field.value ?? ""} onChange={(val) => field.onChange(val)} error={errors.recurringEndDate?.message} today={today} min={purchaseDate} clearable placeholder="Sem data de término (contínua)" hint={field.value ? `A recorrência será cobrada até ${formatCivilDate(field.value as CivilDate)}.` : "Deixe em branco para uma recorrência contínua."} />}
                        />
                    </div>
                ) : null}
                <div aria-live="polite" className="flex flex-col gap-2">
                    {errors.isRecurring?.message ? <p className={messageTone.danger}>{errors.isRecurring.message}</p> : null}
                    {isRecurring && effectFrom ? <p className={messageTone.info}>Alterações valerão a partir de {formatCivilDate(effectFrom)}.</p> : null}
                    {mode === "edit" && !editingRecurrence && isRecurring ? <p className={messageTone.info}>Esta compra se tornará a primeira ocorrência da série.</p> : null}
                </div>
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-medium text-text">Categoria</legend>
                    <input type="hidden" {...register("category")} />
                    <div className="grid grid-cols-2 gap-2">
                        {categories.map((item) => (
                            <AnimatedChoice
                                key={item.id}
                                selected={category === item.id}
                                visual={getItemVisual(item)}
                                layoutId="category-selection"
                                className={cn("justify-start", pulsingField.category && category === item.id && "animate-suggestion-pulse")}
                                onClick={() => {
                                    setCategoryManuallyModified(true);
                                    const currentTagId = getValues("specificTag");
                                    setValue("category", item.id, { shouldValidate: true, shouldDirty: true });
                                    if (currentTagId) {
                                        const tagStillValid = specificTags.some((t) => t.id === currentTagId && t.categoryId === item.id);
                                        if (!tagStillValid) {
                                            setValue("specificTag", null, { shouldValidate: true, shouldDirty: true });
                                            if (uberTag && currentTagId === uberTag.id) {
                                                setIsUberLocked(false);
                                                setValue("locationId", null, { shouldValidate: true, shouldDirty: true });
                                            }
                                        }
                                    }
                                }}
                            >
                                {item.name}
                            </AnimatedChoice>
                        ))}
                    </div>
                    {errors.category?.message ? <p className={messageTone.danger}>{errors.category.message}</p> : null}
                </fieldset>
                {specificOptions.length > 0 ? (
                    <fieldset className="flex flex-col gap-3">
                        <legend className="mb-2 text-sm font-medium text-text">Tag Específica</legend>
                        <div className="flex flex-wrap gap-2">
                            {specificOptions.map((tag) => (
                                <AnimatedChoice
                                    key={tag.id}
                                    selected={specificTag === tag.id}
                                    visual={getItemVisual(tag)}
                                    layoutId="specific-tag-selection"
                                    className={pulsingField.tags && specificTag === tag.id ? "animate-suggestion-pulse" : undefined}
                                    onClick={() => {
                                        setTagsManuallyModified(true);
                                        const nextTag = specificTag === tag.id ? null : tag.id;
                                        setValue("specificTag", nextTag, { shouldValidate: true, shouldDirty: true });
                                        if (uberTag && nextTag === uberTag.id) {
                                            setIsUberLocked(true);
                                            setValue("name", "Uber", { shouldValidate: true, shouldDirty: true });
                                            if (transportCategory) {
                                                setValue("category", transportCategory.id, { shouldValidate: true, shouldDirty: true });
                                            }
                                        } else if (uberTag && tag.id === uberTag.id && nextTag === null) {
                                            setIsUberLocked(false);
                                            setValue("locationId", null, { shouldValidate: true, shouldDirty: true });
                                        }
                                    }}
                                >
                                    {tag.name}
                                </AnimatedChoice>
                            ))}
                        </div>
                        {errors.specificTag?.message ? <p className={messageTone.danger}>{errors.specificTag.message}</p> : null}
                    </fieldset>
                ) : null}
                {generalTags.length > 0 ? (
                    <fieldset className="flex flex-col gap-3">
                        <legend className="mb-2 text-sm font-medium text-text">Tags Gerais</legend>
                        <div className="flex flex-wrap gap-2">
                            {generalTags.map((tag) => {
                                const selected = selectedTags.includes(tag.id);
                                return (
                                    <AnimatedChoice
                                        key={tag.id}
                                        selected={selected}
                                        visual={getItemVisual(tag)}
                                        layoutId={`general-tag-${tag.id}`}
                                        className={pulsingField.tags && selected ? "animate-suggestion-pulse" : undefined}
                                        onClick={() => {
                                            setTagsManuallyModified(true);
                                            const next = selected ? selectedTags.filter((item) => item !== tag.id) : [...selectedTags, tag.id];
                                            setValue("generalTags", next, { shouldValidate: true, shouldDirty: true });
                                            if (selected && tag.id === reimbursementTag?.id) {
                                                setIsPartialExplicit(null);
                                                setValue("reimbursedAmount", "", { shouldValidate: true, shouldDirty: true });
                                            }
                                        }}
                                    >
                                        {tag.name}
                                    </AnimatedChoice>
                                );
                            })}
                        </div>
                        {isReimbursementSelected && isPartialEligible ? (
                            <div className="flex flex-col gap-3 rounded-2xl border border-surface-raised bg-surface-raised/40 p-3.5">
                                <span className="text-xs font-semibold text-text">Tipo de Reembolso</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPartialExplicit(false);
                                            setValue("reimbursedAmount", "", { shouldValidate: true, shouldDirty: true });
                                        }}
                                        className={cn("flex-1 rounded-xl py-2 text-xs font-medium transition-colors cursor-pointer", !isPartialMode ? "bg-violet text-ink font-semibold" : "bg-surface text-muted hover:text-text")}
                                    >
                                        Integral (100%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPartialExplicit(true);
                                            if (!getValues("reimbursedAmount")) {
                                                setValue("reimbursedAmount", DEFAULT_PARTIAL_REIMBURSEMENT_BRL, { shouldValidate: true, shouldDirty: true });
                                            }
                                        }}
                                        className={cn("flex-1 rounded-xl py-2 text-xs font-medium transition-colors cursor-pointer", isPartialMode ? "bg-violet text-ink font-semibold" : "bg-surface text-muted hover:text-text")}
                                    >
                                        Parcial
                                    </button>
                                </div>
                                {isPartialMode ? (
                                    <div className="flex flex-col gap-1.5 pt-1">
                                        <CurrencyInput id="reimbursedAmount" label="Valor a ser reembolsado" value={reimbursedAmount} onChange={(val) => setValue("reimbursedAmount", val, { shouldValidate: true, shouldDirty: true })} error={errors.reimbursedAmount?.message} placeholder={DEFAULT_PARTIAL_REIMBURSEMENT_BRL} autoFocus />
                                        <p className="text-xs text-muted">Informe quanto será devolvido. Esse valor será abatido da despesa quando o toggle de reembolsos estiver desligado.</p>
                                    </div>
                                ) : null}
                            </div>
                        ) : isReimbursementSelected && !isPartialEligible ? (
                            <p className="text-xs text-muted">{isRecurring ? "Despesas recorrentes aceitam apenas reembolso integral." : "Compras parceladas aceitam apenas reembolso integral."}</p>
                        ) : null}
                        {errors.generalTags?.message ? <p className={messageTone.danger}>{errors.generalTags.message}</p> : null}
                    </fieldset>
                ) : null}
                <div className="flex flex-col gap-2.5">
                    <label htmlFor="description" className="text-sm font-medium text-text">
                        Descrição
                    </label>
                    <textarea id="description" maxLength={500} rows={3} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? "description-error" : undefined} className={cn("min-h-24 w-full rounded-xl border-0 bg-surface px-3 py-2 text-base text-text", errors.description && "outline-2 outline-solid outline-danger")} {...register("description")} />
                    {errors.description?.message ? (
                        <p id="description-error" className={messageTone.danger}>
                            {errors.description.message}
                        </p>
                    ) : null}
                </div>
                <Button type="submit" loading={isSubmitting} disabled={!isFormValid}>
                    {mode === "edit" ? "Salvar alterações" : "Salvar transação"}
                </Button>
            </motion.form>

            {/* Quick Add Location Modal */}
            <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Nova Localidade">
                <form onSubmit={handleQuickAddLocation} className="flex flex-col gap-4">
                    {quickError && (
                        <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-xs text-danger-fg">
                            <AlertCircle className="size-4 shrink-0" aria-hidden />
                            <span>{quickError}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted">Nome da Localidade</label>
                        <input type="text" value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="ex: Casa, Trabalho, Aeroporto" maxLength={100} required autoFocus className="w-full rounded-xl bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-violet" />
                    </div>

                    <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setQuickAddOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted hover:bg-surface">
                            Cancelar
                        </button>
                        <button type="submit" disabled={quickLoading || !quickName.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-violet px-4 py-2 text-xs font-semibold text-ink hover:bg-orchid disabled:opacity-50">
                            <Check className="size-4" aria-hidden />
                            {quickLoading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
