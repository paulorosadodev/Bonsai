"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { toast } from "sonner";

import { createTransaction, updateTransaction, updateRecurringOccurrence } from "@/actions";
import { paymentMethodLabels, type CategoryOption, type GeneralTagOption, type SpecificTagOption } from "@/lib/domain/catalog";
import { parseCivilDate, type CivilDate } from "@/lib/domain/billing-cycle";
import { isEligibleForRecurrence, nextEditableEffectiveFrom, previousCivilDate } from "@/lib/domain/recurrence";
import { formatBrl, parseBrlToCents } from "@/lib/domain/money";
import { createTransactionSchema, transactionSchema, type TransactionFormInput } from "@/lib/domain/schemas";
import type { RecurringOccurrenceDetail, TransactionRecord } from "@/lib/data/types";
import { AnimatedChoice } from "@/components/ui/animated-choice";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { messageTone } from "@/components/ui/message";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/components/ui/cn";
import { formatCivilDate } from "./params";
import { getItemVisual, paymentVisuals } from "./transaction-visuals";

function centsToAmountInput(cents: number) {
    return formatBrl(cents);
}

function toFormValues(
    transaction: TransactionRecord | RecurringOccurrenceDetail | undefined,
    today: string,
    isRecurring: boolean,
    defaultCategory?: string
): TransactionFormInput {
    const recurringEndDate = transaction && "endsBefore" in transaction && transaction.endsBefore
        ? previousCivilDate(transaction.endsBefore as CivilDate)
        : "";

    if (!transaction) {
        return {
            name: "",
            description: "",
            amount: "",
            purchaseDate: today,
            paymentMethod: "credit",
            installmentCount: 1,
            isRecurring: false,
            recurringEndDate: "",
            category: defaultCategory || ("" as TransactionFormInput["category"]),
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
        recurringEndDate,
        category: transaction.categoryId,
        generalTags: transaction.generalTagIds ?? [],
        specificTag: transaction.specificTagId ?? null,
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
}

export function TransactionForm({
    mode,
    transaction,
    recurrence,
    today,
    categories = [],
    generalTags = [],
    specificTags = [],
}: TransactionFormProps) {
    const router = useRouter();
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
    const paymentMethod = useWatch({ control, name: "paymentMethod" });
    const installmentCount = Number(useWatch({ control, name: "installmentCount" }) ?? 1);
    const isRecurring = Boolean(useWatch({ control, name: "isRecurring" }));
    const purchaseDate = useWatch({ control, name: "purchaseDate" }) ?? today;
    const category = useWatch({ control, name: "category" });
    const selectedTags = useWatch({ control, name: "generalTags" }) ?? [];
    const specificTag = useWatch({ control, name: "specificTag" });

    let hasValidAmount = false;
    try {
        hasValidAmount = Boolean(amount.trim()) && parseBrlToCents(amount) > 0;
    } catch {
        hasValidAmount = false;
    }

    const isCategoryValid = categories.some((c) => c.id === category);
    const isFormValid = Boolean(name.trim() && hasValidAmount && purchaseDate.trim() && category && isCategoryValid);
    const specificOptions = category ? specificTags.filter((t) => t.categoryId === category) : [];
    const canRecur = isEligibleForRecurrence(paymentMethod, Number.isFinite(installmentCount) ? installmentCount : 1);
    const installmentForcedStandalone = paymentMethod === "credit" && installmentCount > 1;
    const newMonthlyDay = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ? parseCivilDate(purchaseDate as CivilDate).day : 1;
    const effectFrom = editingRecurrence ? nextEditableEffectiveFrom(today as CivilDate, recurrence?.monthlyDay ?? newMonthlyDay, newMonthlyDay) : null;

    async function onSubmit(values: TransactionFormInput) {
        const result = editingRecurrence && recurrence
            ? await updateRecurringOccurrence(recurrence.seriesId, recurrence.occurrenceDate, values)
            : mode === "edit" && transaction
            ? await updateTransaction(transaction.id, values)
            : await createTransaction(values);

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
                            if (Number(event.target.value) > 1 && getValues("isRecurring")) {
                                setValue("isRecurring", false, { shouldValidate: true, shouldDirty: true });
                                setValue("recurringEndDate", "", { shouldValidate: true, shouldDirty: true });
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
                        render={({ field }) => (
                            <DatePicker
                                id="recurringEndDate"
                                label="Fim da recorrência (opcional)"
                                value={field.value ?? ""}
                                onChange={(val) => field.onChange(val)}
                                error={errors.recurringEndDate?.message}
                                today={today}
                                min={purchaseDate}
                                clearable
                                placeholder="Sem data de término (contínua)"
                                hint={field.value ? `A recorrência será cobrada até ${formatCivilDate(field.value as CivilDate)}.` : "Deixe em branco para uma recorrência contínua."}
                            />
                        )}
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
                            className="justify-start"
                            onClick={() => {
                                const currentTagId = getValues("specificTag");
                                setValue("category", item.id, { shouldValidate: true, shouldDirty: true });
                                if (currentTagId) {
                                    const tagStillValid = specificTags.some((t) => t.id === currentTagId && t.categoryId === item.id);
                                    if (!tagStillValid) {
                                        setValue("specificTag", null, { shouldValidate: true, shouldDirty: true });
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
                                onClick={() => setValue("specificTag", specificTag === tag.id ? null : tag.id, { shouldValidate: true, shouldDirty: true })}
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
                                    onClick={() => {
                                        const next = selected ? selectedTags.filter((item) => item !== tag.id) : [...selectedTags, tag.id];
                                        setValue("generalTags", next, { shouldValidate: true, shouldDirty: true });
                                    }}
                                >
                                    {tag.name}
                                </AnimatedChoice>
                            );
                        })}
                    </div>
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
    );
}
