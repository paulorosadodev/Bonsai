import type { PaymentMethod } from "./catalog";

export const businessTimeZone = "America/Sao_Paulo";

export type CivilDate = `${number}-${number}-${number}`;

export type BillingEntry = {
    installmentNumber: number;
    installmentCount: number;
    amountCents: number;
    competenceDate: CivilDate;
    invoiceDueDate: CivilDate | null;
};

type BillingCycleInput = {
    purchaseDate: CivilDate;
    paymentMethod: PaymentMethod;
    amountCents: number;
    installmentCount: number;
    closingDay: number;
    dueDay: number;
};

export type CivilDateParts = {
    year: number;
    month: number;
    day: number;
};

function assertCycleDay(day: number): void {
    if (!Number.isInteger(day) || day < 1 || day > 28) {
        throw new Error("Dia do ciclo deve estar entre 1 e 28");
    }
}

export function parseCivilDate(value: CivilDate): CivilDateParts {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        throw new Error("Data civil inválida");
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error("Data civil inválida");
    }

    return { year, month, day };
}

export function createCivilDate(year: number, month: number, day: number): CivilDate {
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}` as CivilDate;
}

export function addMonths(year: number, month: number, offset: number): Pick<CivilDateParts, "year" | "month"> {
    const absoluteMonth = year * 12 + month - 1 + offset;

    return {
        year: Math.floor(absoluteMonth / 12),
        month: (absoluteMonth % 12) + 1,
    };
}

export function lastDayOfMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function occurrenceDateInMonth(year: number, month: number, monthlyDay: number): CivilDate {
    if (!Number.isInteger(monthlyDay) || monthlyDay < 1 || monthlyDay > 31) {
        throw new Error("Dia mensal deve estar entre 1 e 31");
    }

    return createCivilDate(year, month, Math.min(monthlyDay, lastDayOfMonth(year, month)));
}

export function civilMonth(value: CivilDate): string {
    return value.slice(0, 7);
}

export function startOfCivilDate(value: CivilDate): Date {
    const { year, month, day } = parseCivilDate(value);
    let utc = Date.UTC(year, month - 1, day, 12, 0, 0);

    while (toSaoPauloCivilDate(new Date(utc)) === value) {
        utc -= 60 * 60 * 1000;
    }

    return new Date(utc + 60 * 60 * 1000);
}

export function toSaoPauloCivilDate(date: Date): CivilDate {
    if (Number.isNaN(date.getTime())) {
        throw new Error("Data inválida");
    }

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: businessTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

    return `${values.year}-${values.month}-${values.day}` as CivilDate;
}

export function getPurchaseInvoiceCycle(purchaseDate: CivilDate, closingDay: number, dueDay: number): { closingDate: CivilDate; dueDate: CivilDate } {
    assertCycleDay(closingDay);
    assertCycleDay(dueDay);

    const purchase = parseCivilDate(purchaseDate);
    const closingMonthOffset = purchase.day >= closingDay ? 1 : 0;
    const dueMonthOffset = dueDay <= closingDay ? 1 : 0;
    const closingMonth = addMonths(purchase.year, purchase.month, closingMonthOffset);
    const dueMonth = addMonths(purchase.year, purchase.month, closingMonthOffset + dueMonthOffset);

    return {
        closingDate: createCivilDate(closingMonth.year, closingMonth.month, closingDay),
        dueDate: createCivilDate(dueMonth.year, dueMonth.month, dueDay),
    };
}

export function getInvoiceDueDate(purchaseDate: CivilDate, closingDay: number, dueDay: number): CivilDate {
    return getPurchaseInvoiceCycle(purchaseDate, closingDay, dueDay).dueDate;
}

export function splitCents(amountCents: number, installmentCount: number): number[] {
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        throw new Error("Valor deve ser um inteiro positivo em centavos");
    }

    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 60) {
        throw new Error("Parcelamento deve estar entre 1 e 60");
    }

    const baseAmount = Math.floor(amountCents / installmentCount);
    const remainder = amountCents % installmentCount;

    return Array.from({ length: installmentCount }, (_, index) => baseAmount + (index < remainder ? 1 : 0));
}

export function createBillingEntries(input: BillingCycleInput): BillingEntry[] {
    const purchase = parseCivilDate(input.purchaseDate);

    if (input.paymentMethod === "pix") {
        if (input.installmentCount !== 1) {
            throw new Error("PIX deve ter uma parcela");
        }

        return [
            {
                installmentNumber: 1,
                installmentCount: 1,
                amountCents: splitCents(input.amountCents, 1)[0],
                competenceDate: createCivilDate(purchase.year, purchase.month, 1),
                invoiceDueDate: null,
            },
        ];
    }

    const firstDueDate = getInvoiceDueDate(input.purchaseDate, input.closingDay, input.dueDay);
    const firstDue = parseCivilDate(firstDueDate);
    const installmentAmounts = splitCents(input.amountCents, input.installmentCount);

    return installmentAmounts.map((amountCents, index) => {
        const dueMonth = addMonths(firstDue.year, firstDue.month, index);
        const invoiceDueDate = createCivilDate(dueMonth.year, dueMonth.month, input.dueDay);

        return {
            installmentNumber: index + 1,
            installmentCount: input.installmentCount,
            amountCents,
            competenceDate: createCivilDate(dueMonth.year, dueMonth.month, 1),
            invoiceDueDate,
        };
    });
}
