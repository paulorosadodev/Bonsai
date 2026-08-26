import { z } from "zod";
import { categories, generalTags, isSpecificTagForCategory, paymentMethods, specificTags } from "./catalog";
import { parseBrlToCents } from "./money";

const civilDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida")
    .refine((value) => {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(0);
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCFullYear(year, month - 1, day);
        return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }, "Informe uma data válida");
const monthSchema = z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Informe uma competência válida")
    .refine((value) => {
        const [year, month] = value.split("-").map(Number);
        return year >= 1000 && month >= 1 && month <= 12;
    }, "Informe uma competência válida");
const cycleDaySchema = z.coerce.number().int().min(1).max(28);
const booleanParameterSchema = z.preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
}, z.boolean());

export const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
});

export const transactionSchema = z
    .object({
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).optional().or(z.literal("")),
        amount: z.string().transform((value, context) => {
            try {
                const amountCents = parseBrlToCents(value);

                if (amountCents <= 0) {
                    context.addIssue({ code: "custom", message: "O valor deve ser maior que zero" });
                    return z.NEVER;
                }

                return amountCents;
            } catch {
                context.addIssue({ code: "custom", message: "Informe um valor em reais válido" });
                return z.NEVER;
            }
        }),
        purchaseDate: civilDateSchema,
        paymentMethod: z.enum(paymentMethods),
        installmentCount: z.coerce.number().int().min(1).max(60),
        isRecurring: z.boolean().optional().default(false),
        category: z.enum(categories),
        generalTags: z
            .array(z.enum(generalTags))
            .max(generalTags.length)
            .refine((tags) => new Set(tags).size === tags.length, "Não repita tags"),
        specificTag: z.enum(specificTags).nullable().optional(),
    })
    .superRefine((transaction, context) => {
        if (transaction.paymentMethod === "pix" && transaction.installmentCount !== 1) {
            context.addIssue({
                code: "custom",
                path: ["installmentCount"],
                message: "PIX deve ter uma parcela",
            });
        }

        if (transaction.isRecurring && transaction.installmentCount !== 1) {
            context.addIssue({
                code: "custom",
                path: ["isRecurring"],
                message: "Compras parceladas não podem ser recorrentes",
            });
        }

        if (transaction.specificTag && !isSpecificTagForCategory(transaction.category, transaction.specificTag)) {
            context.addIssue({
                code: "custom",
                path: ["specificTag"],
                message: "A tag específica não pertence à categoria",
            });
        }
    });

export function createTransactionSchema(today: string) {
    return transactionSchema.superRefine((transaction, context) => {
        if (transaction.isRecurring && transaction.purchaseDate < today) {
            context.addIssue({
                code: "custom",
                path: ["purchaseDate"],
                message: "Uma nova recorrência não aceita data anterior a hoje",
            });
        }
    });
}

export const settingsSchema = z.object({
    closingDay: cycleDaySchema,
    dueDay: cycleDaySchema,
});

export const transactionFiltersSchema = z.object({
    month: monthSchema.optional(),
    category: z.enum(categories).optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
    generalTag: z.enum(generalTags).optional(),
    includeReimbursements: booleanParameterSchema.default(false),
});

export const exportParametersSchema = z
    .object({
        from: civilDateSchema.optional(),
        to: civilDateSchema.optional(),
        category: z.enum(categories).optional(),
        paymentMethod: z.enum(paymentMethods).optional(),
        includeReimbursements: booleanParameterSchema.default(false),
    })
    .refine(({ from, to }) => !from || !to || from <= to, {
        path: ["to"],
        message: "A data final deve ser igual ou posterior à inicial",
    });

export const recurrenceTargetSchema = z.object({
    seriesId: z.uuid(),
    occurrenceDate: civilDateSchema,
});

export type LoginInput = z.input<typeof loginSchema>;
export type TransactionFormInput = z.input<typeof transactionSchema>;
export type TransactionInput = z.output<typeof transactionSchema>;
export type SettingsInput = z.output<typeof settingsSchema>;
export type TransactionFilters = z.output<typeof transactionFiltersSchema>;
export type ExportParameters = z.output<typeof exportParametersSchema>;
