import { z } from "zod";
import { paymentMethods } from "./catalog";
import { parseBrlToCents } from "./money";

const civilDateSchema = z
    .string({ message: "Informe uma data válida" })
    .min(1, "Informe a data da compra")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida")
    .refine((value) => {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(0);
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCFullYear(year, month - 1, day);
        return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }, "Informe uma data válida");

const monthSchema = z
    .string({ message: "Informe uma competência válida" })
    .regex(/^\d{4}-\d{2}$/, "Informe uma competência válida")
    .refine((value) => {
        const [year, month] = value.split("-").map(Number);
        return year >= 1000 && month >= 1 && month <= 12;
    }, "Informe uma competência válida");

const cycleDaySchema = z.coerce.number({ message: "Informe um dia válido" }).int("Informe um dia válido").min(1, "O dia deve ser entre 1 e 28").max(28, "O dia deve ser entre 1 e 28");

const booleanParameterSchema = z.preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
}, z.boolean());

export const loginSchema = z.object({
    email: z.string({ message: "Informe o e-mail" }).trim().email("Informe um e-mail válido").max(254, "O e-mail deve ter no máximo 254 caracteres"),
    password: z.string({ message: "Informe a senha" }).min(1, "Informe a senha").max(128, "A senha deve ter no máximo 128 caracteres"),
});

const optionalCivilDateSchema = z
    .union([civilDateSchema, z.literal("")])
    .nullable()
    .optional();

export const transactionSchema = z
    .object({
        name: z.string({ message: "Informe o nome" }).trim().min(1, "Informe o nome").max(120, "O nome deve ter no máximo 120 caracteres"),
        description: z.string().trim().max(500, "A descrição deve ter no máximo 500 caracteres").optional().or(z.literal("")),
        amount: z.string({ message: "Informe o valor" }).transform((value, context) => {
            if (!value || !value.trim()) {
                context.addIssue({ code: "custom", message: "Informe o valor" });
                return z.NEVER;
            }

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
        paymentMethod: z.enum(paymentMethods, { message: "Selecione a forma de pagamento" }),
        installmentCount: z.coerce.number({ message: "Informe o número de parcelas" }).int("O número de parcelas deve ser um número inteiro").min(1, "O número de parcelas deve ser no mínimo 1").max(60, "O número de parcelas deve ser no máximo 60"),
        isRecurring: z.boolean().optional().default(false),
        recurringEndDate: optionalCivilDateSchema,
        category: z.string({ message: "Selecione uma categoria" }).uuid("Categoria inválida"),
        generalTags: z
            .array(z.string().uuid("Tag inválida"))
            .max(20, "Número de tags excedido")
            .refine((tags) => new Set(tags).size === tags.length, "Não repita tags"),
        specificTag: z.string().uuid("Tag específica inválida").nullable().optional(),
        locationId: z.string().uuid("Localidade inválida").nullable().optional(),
    })
    .superRefine((transaction, context) => {
        if (transaction.name.trim().toLowerCase() === "uber" && !transaction.locationId) {
            context.addIssue({
                code: "custom",
                path: ["locationId"],
                message: "Selecione uma localidade para a transação Uber",
            });
        }

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

        if (transaction.isRecurring && transaction.recurringEndDate && transaction.recurringEndDate.trim() !== "") {
            if (transaction.recurringEndDate < transaction.purchaseDate) {
                context.addIssue({
                    code: "custom",
                    path: ["recurringEndDate"],
                    message: "A data de término deve ser igual ou posterior à data de início",
                });
            }
        }
    });

export function createTransactionSchema(_today?: string) {
    return transactionSchema;
}

export const settingsSchema = z.object({
    closingDay: cycleDaySchema,
    dueDay: cycleDaySchema,
});

export const transactionSortSchema = z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]);
export type TransactionSort = z.infer<typeof transactionSortSchema>;

export const transactionFiltersSchema = z.object({
    month: monthSchema.optional(),
    category: z.string().uuid("Categoria inválida").optional(),
    paymentMethod: z.enum(paymentMethods, { message: "Forma de pagamento inválida" }).optional(),
    generalTag: z.string().uuid("Tag geral inválida").optional(),
    specificTag: z.string().uuid("Tag específica inválida").optional(),
    includeReimbursements: booleanParameterSchema.default(false),
    search: z.string().trim().max(100).optional(),
    sort: transactionSortSchema.default("date_desc").optional(),
});

export const exportParametersSchema = z
    .object({
        from: civilDateSchema.optional(),
        to: civilDateSchema.optional(),
        category: z.string().uuid("Categoria inválida").optional(),
        paymentMethod: z.enum(paymentMethods, { message: "Forma de pagamento inválida" }).optional(),
        includeReimbursements: booleanParameterSchema.default(false),
    })
    .refine(({ from, to }) => !from || !to || from <= to, {
        path: ["to"],
        message: "A data final deve ser igual ou posterior à inicial",
    });

export const recurrenceTargetSchema = z.object({
    seriesId: z.string().uuid("ID de série inválido"),
    occurrenceDate: civilDateSchema,
});

// Category and Tag CRUD schemas
export const categoryCreateSchema = z.object({
    name: z.string({ message: "Informe o nome" }).trim().min(1, "Informe o nome").max(50, "O nome deve ter no máximo 50 caracteres"),
    color: z.string({ message: "Informe a cor" }).regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato hexadecimal inválido (#RRGGBB)"),
    icon: z.string({ message: "Selecione o ícone" }).trim().min(1, "Selecione o ícone").max(50, "Nome do ícone inválido"),
});

export const categoryUpdateSchema = z.object({
    name: z.string().trim().min(1, "Informe o nome").max(50, "O nome deve ter no máximo 50 caracteres").optional(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato hexadecimal inválido (#RRGGBB)")
        .optional(),
    icon: z.string().trim().min(1, "Selecione o ícone").max(50, "Nome do ícone inválido").optional(),
});

export const generalTagCreateSchema = z.object({
    name: z.string({ message: "Informe o nome" }).trim().min(1, "Informe o nome").max(50, "O nome deve ter no máximo 50 caracteres"),
    color: z.string({ message: "Informe a cor" }).regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato hexadecimal inválido (#RRGGBB)"),
    icon: z.string().trim().max(50, "Nome do ícone inválido").nullable().optional(),
});

export const generalTagUpdateSchema = z.object({
    name: z.string().trim().min(1, "Informe o nome").max(50, "O nome deve ter no máximo 50 caracteres").optional(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato hexadecimal inválido (#RRGGBB)")
        .optional(),
    icon: z.string().trim().max(50, "Nome do ícone inválido").nullable().optional(),
});

export const specificTagCreateSchema = z.object({
    categoryId: z.string({ message: "Selecione a categoria" }).uuid("Categoria inválida"),
    name: z.string({ message: "Informe o nome" }).trim().min(1, "Informe o nome").max(50, "O nome deve ter no máximo 50 caracteres"),
    color: z.string({ message: "Informe a cor" }).regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato hexadecimal inválido (#RRGGBB)"),
    icon: z.string().trim().max(50, "Nome do ícone inválido").nullable().optional(),
});

export const specificTagUpdateSchema = z.object({
    name: z.string().trim().min(1, "Informe o nome").max(50, "O nome deve ter no máximo 50 caracteres").optional(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Cor em formato hexadecimal inválido (#RRGGBB)")
        .optional(),
    icon: z.string().trim().max(50, "Nome do ícone inválido").nullable().optional(),
});

export const locationCreateSchema = z.object({
    name: z.string({ message: "Informe o nome da localidade" }).trim().min(1, "Informe o nome da localidade").max(100, "O nome deve ter no máximo 100 caracteres"),
});

export const locationUpdateSchema = z.object({
    name: z.string({ message: "Informe o nome da localidade" }).trim().min(1, "Informe o nome da localidade").max(100, "O nome deve ter no máximo 100 caracteres"),
});

export type LoginInput = z.input<typeof loginSchema>;
export type TransactionFormInput = z.input<typeof transactionSchema>;
export type TransactionInput = z.output<typeof transactionSchema>;
export type SettingsInput = z.output<typeof settingsSchema>;
export type TransactionFilters = z.output<typeof transactionFiltersSchema>;
export type ExportParameters = z.output<typeof exportParametersSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type GeneralTagCreateInput = z.infer<typeof generalTagCreateSchema>;
export type GeneralTagUpdateInput = z.infer<typeof generalTagUpdateSchema>;
export type SpecificTagCreateInput = z.infer<typeof specificTagCreateSchema>;
export type SpecificTagUpdateInput = z.infer<typeof specificTagUpdateSchema>;
export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
