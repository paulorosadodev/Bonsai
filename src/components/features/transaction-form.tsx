"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { toast } from "sonner";

import { createTransaction, updateTransaction, updateRecurringOccurrence } from "@/actions";
import { categories, categoryLabels, generalTagLabels, generalTags, isSpecificTagForCategory, paymentMethodLabels, specificTagLabels, specificTagsByCategory, type Category } from "@/lib/domain/catalog";
import { parseCivilDate, type CivilDate } from "@/lib/domain/billing-cycle";
import { isEligibleForRecurrence, nextEditableEffectiveFrom, nextUnrealizedOccurrence } from "@/lib/domain/recurrence";
import { formatBrl, parseBrlToCents } from "@/lib/domain/money";
import { createTransactionSchema, transactionSchema, type TransactionFormInput } from "@/lib/domain/schemas";
import type { RecurringOccurrenceDetail, TransactionRecord } from "@/lib/data/types";
import { AnimatedChoice } from "@/components/ui/animated-choice";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { messageTone } from "@/components/ui/message";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/components/ui/cn";
import { formatCivilDate } from "./params";
import { categoryVisuals, generalTagVisuals, paymentVisuals, specificTagVisual } from "./transaction-visuals";

function centsToAmountInput(cents: number) {
    return formatBrl(cents)
        .replace(/^R\$\s?/, "")
        .trim();
}

function toFormValues(transaction: TransactionRecord | RecurringOccurrenceDetail | undefined, today: string, isRecurring: boolean): TransactionFormInput {
    if (!transaction) {
        return {
            name: "",
            description: "",
            amount: "",
            purchaseDate: today,
            paymentMethod: "credit",
            installmentCount: 1,
            isRecurring: false,
            category: "" as TransactionFormInput["category"],
            generalTags: [],
            specificTag: null,
        };
    }

    return {
        name: transaction.name,
        description: transaction.description ?? "",
        amount: centsToAmountInput(transaction.amountCents),
        purchaseDate: "purchaseDate" in transaction ? transaction.purchaseDate : transaction.occurrenceDate,
        paymentMethod: transaction.paymentMethod,
        installmentCount: "installmentCount" in transaction ? transaction.installmentCount : 1,
        isRecurring,
        category: transaction.category,
        generalTags: transaction.generalTags,
        specificTag: transaction.specificTag,
    };
}

export function TransactionForm({ mode, transaction, recurrence, today }: { mode: "create" | "edit"; transaction?: TransactionRecord; recurrence?: RecurringOccurrenceDetail; today: string }) {
    const router = useRouter();
    const editingRecurrence = Boolean(recurrence);
    const defaults = toFormValues(recurrence ?? transaction, today, editingRecurrence);
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
    const paymentMethod = useWatch({ control, name: "paymentMethod" });
    const installmentCount = Number(useWatch({ control, name: "installmentCount" }) ?? 1);
    const isRecurring = Boolean(useWatch({ control, name: "isRecurring" }));
    const purchaseDate = useWatch({ control, name: "purchaseDate" }) ?? today;
    const category = useWatch({ control, name: "category" });
    const selectedTags = useWatch({ control, name: "generalTags" }) ?? [];
    const specificTag = useWatch({ control, name: "specificTag" });
    const specificOptions = category && categories.includes(category as Category) ? specificTagsByCategory[category as Category] : [];
    const canRecur = isEligibleForRecurrence(paymentMethod, Number.isFinite(installmentCount) ? installmentCount : 1);
    const installmentForcedStandalone = paymentMethod === "credit" && installmentCount > 1;
    const newMonthlyDay = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ? parseCivilDate(purchaseDate as CivilDate).day : 1;
    const effectFrom = editingRecurrence ? nextEditableEffectiveFrom(today as CivilDate, recurrence?.monthlyDay ?? newMonthlyDay, newMonthlyDay) : null;
    const conversionStart = mode === "edit" && !editingRecurrence && isRecurring && purchaseDate <= today ? nextUnrealizedOccurrence(today as CivilDate, newMonthlyDay) : null;

    async function onSubmit(values: TransactionFormInput) {
        const result = editingRecurrence && recurrence ? await updateRecurringOccurrence(recurrence.seriesId, recurrence.occurrenceDate, values) : mode === "edit" && transaction ? await updateTransaction(transaction.id, values) : await createTransaction(values);

        if (!result.ok) {
            toast.error(result.error);
            return;
        }

        toast.success(mode === "edit" ? "Transação atualizada" : "Transação criada");
        router.push("/transactions");
        router.refresh();
    }

    return (
        <motion.form className="flex flex-col gap-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
            <Field id="name" label="Nome" error={errors.name?.message} placeholder="Lámen" maxLength={120} {...register("name")} />
            <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                    <Field
                        id="amount"
                        label="Valor"
                        inputMode="decimal"
                        placeholder="1.250,67"
                        error={errors.amount?.message}
                        value={field.value}
                        name={field.name}
                        onChange={field.onChange}
                        onBlur={(event) => {
                            field.onBlur();
                            try {
                                setValue("amount", centsToAmountInput(parseBrlToCents(event.target.value)), { shouldValidate: true });
                            } catch {
                                return;
                            }
                        }}
                    />
                )}
            />
            <Field id="purchaseDate" label="Data da Compra" type="date" error={errors.purchaseDate?.message} defaultValue={defaults.purchaseDate} {...register("purchaseDate")} />
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
                            if (Number(event.target.value) > 1 && getValues("isRecurring")) {
                                setValue("isRecurring", false, { shouldValidate: true, shouldDirty: true });
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
                        <Toggle checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked)} className="rounded-2xl bg-surface px-3">
                            Recorrente
                        </Toggle>
                    )}
                />
            ) : null}
            <div aria-live="polite" className="flex flex-col gap-2">
                {errors.isRecurring?.message ? <p className={messageTone.danger}>{errors.isRecurring.message}</p> : null}
                {mode === "create" && isRecurring && purchaseDate < today ? <p className={messageTone.danger}>Uma nova recorrência não aceita data anterior a hoje.</p> : null}
                {isRecurring && effectFrom ? <p className={messageTone.info}>Alterações valerão a partir de {formatCivilDate(effectFrom)}.</p> : null}
                {conversionStart ? <p className={messageTone.info}>A compra passada permanece avulsa. A série começa em {formatCivilDate(conversionStart)}.</p> : null}
                {mode === "edit" && !editingRecurrence && isRecurring && purchaseDate > today ? <p className={messageTone.info}>Esta compra se tornará a primeira ocorrência da série.</p> : null}
            </div>
            <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-medium text-text">Categoria</legend>
                <input type="hidden" {...register("category")} />
                <div className="grid grid-cols-2 gap-2">
                    {categories.map((item) => (
                        <AnimatedChoice
                            key={item}
                            selected={category === item}
                            visual={categoryVisuals[item]}
                            layoutId="category-selection"
                            className="justify-start"
                            onClick={() => {
                                const currentTag = getValues("specificTag");
                                setValue("category", item, { shouldValidate: true, shouldDirty: true });
                                if (currentTag && !isSpecificTagForCategory(item, currentTag)) {
                                    setValue("specificTag", null, { shouldValidate: true, shouldDirty: true });
                                }
                            }}
                        >
                            {categoryLabels[item]}
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
                            <AnimatedChoice key={tag} selected={specificTag === tag} visual={specificTagVisual(tag)} layoutId="specific-tag-selection" onClick={() => setValue("specificTag", specificTag === tag ? null : tag, { shouldValidate: true, shouldDirty: true })}>
                                {specificTagLabels[tag]}
                            </AnimatedChoice>
                        ))}
                    </div>
                    {errors.specificTag?.message ? <p className={messageTone.danger}>{errors.specificTag.message}</p> : null}
                </fieldset>
            ) : null}
            <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-medium text-text">Tags Gerais</legend>
                <div className="flex flex-wrap gap-2">
                    {generalTags.map((tag) => {
                        const selected = selectedTags.includes(tag);
                        return (
                            <AnimatedChoice
                                key={tag}
                                selected={selected}
                                visual={generalTagVisuals[tag]}
                                layoutId={`general-tag-${tag}`}
                                onClick={() => {
                                    const next = selected ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag];
                                    setValue("generalTags", next, { shouldValidate: true, shouldDirty: true });
                                }}
                            >
                                {generalTagLabels[tag]}
                            </AnimatedChoice>
                        );
                    })}
                </div>
                {errors.generalTags?.message ? <p className={messageTone.danger}>{errors.generalTags.message}</p> : null}
            </fieldset>
            <div className="flex flex-col gap-2.5">
                <label htmlFor="description" className="text-sm font-medium text-text">
                    Descrição
                </label>
                <textarea id="description" maxLength={500} rows={3} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? "description-error" : undefined} className={cn("min-h-24 w-full rounded-xl border-0 bg-surface px-3 py-2 text-base text-text placeholder:text-muted", errors.description && "outline-2 outline-solid outline-danger")} {...register("description")} />
                {errors.description?.message ? (
                    <p id="description-error" className={messageTone.danger}>
                        {errors.description.message}
                    </p>
                ) : null}
            </div>
            <Button type="submit" loading={isSubmitting}>
                {mode === "edit" ? "Salvar alterações" : "Salvar transação"}
            </Button>
        </motion.form>
    );
}
