import assert from "node:assert/strict";
import { createBillingEntries, getInvoiceDueDate, getPurchaseInvoiceCycle, occurrenceDateInMonth, splitCents, toSaoPauloCivilDate } from "../src/lib/domain/billing-cycle";
import { formatBrl, parseBrlToCents } from "../src/lib/domain/money";
import { parsePastedCurrency } from "../src/components/ui/currency-input";
import { effectiveFromForOccurrence, isEligibleForRecurrence, nextEditableEffectiveFrom, projectSeriesOccurrences, settingsAt, versionAt } from "../src/lib/domain/recurrence";
import { getReturnUrl, sanitizeReturnUrl, withReturnUrl } from "../src/lib/navigation/return-url";

assert.equal(getInvoiceDueDate("2026-08-13", 14, 20), "2026-08-20");
assert.equal(getInvoiceDueDate("2026-08-14", 14, 20), "2026-09-20");
assert.equal(getInvoiceDueDate("2026-08-15", 14, 20), "2026-09-20");
assert.deepEqual(getPurchaseInvoiceCycle("2026-08-10", 14, 20), { closingDate: "2026-08-14", dueDate: "2026-08-20" });
assert.deepEqual(getPurchaseInvoiceCycle("2026-08-26", 14, 20), { closingDate: "2026-09-14", dueDate: "2026-09-20" });
assert.deepEqual(getPurchaseInvoiceCycle("2026-09-16", 14, 20), { closingDate: "2026-10-14", dueDate: "2026-10-20" });
assert.deepEqual(getPurchaseInvoiceCycle("2026-08-10", 25, 5), { closingDate: "2026-08-25", dueDate: "2026-09-05" });
assert.deepEqual(splitCents(1000, 3), [334, 333, 333]);
assert.equal(parseBrlToCents("R$ 1.250,27"), 125027);
assert.equal(formatBrl(125027), "R$ 1.250,27");
assert.equal(formatBrl(0), "R$ 0,00");
assert.equal(parsePastedCurrency("150"), "R$ 150,00");
assert.equal(parsePastedCurrency("150,50"), "R$ 150,50");
assert.equal(parsePastedCurrency("150.50"), "R$ 150,50");
assert.equal(parsePastedCurrency("R$ 1.250,27"), "R$ 1.250,27");
assert.equal(parsePastedCurrency("0"), "");
assert.equal(parsePastedCurrency(""), "");
assert.equal(toSaoPauloCivilDate(new Date("2026-08-14T02:30:00Z")), "2026-08-13");
assert.deepEqual(
    createBillingEntries({
        purchaseDate: "2026-08-14",
        paymentMethod: "credit",
        amountCents: 1000,
        installmentCount: 3,
        closingDay: 14,
        dueDay: 20,
    }).map(({ amountCents, competenceDate, invoiceDueDate }) => ({ amountCents, competenceDate, invoiceDueDate })),
    [
        { amountCents: 334, competenceDate: "2026-09-01", invoiceDueDate: "2026-09-20" },
        { amountCents: 333, competenceDate: "2026-10-01", invoiceDueDate: "2026-10-20" },
        { amountCents: 333, competenceDate: "2026-11-01", invoiceDueDate: "2026-11-20" },
    ],
);

assert.equal(occurrenceDateInMonth(2026, 2, 31), "2026-02-28");
assert.equal(occurrenceDateInMonth(2028, 2, 31), "2028-02-29");
assert.equal(occurrenceDateInMonth(2026, 4, 31), "2026-04-30");
assert.equal(isEligibleForRecurrence("pix", 1), true);
assert.equal(isEligibleForRecurrence("credit", 1), true);
assert.equal(isEligibleForRecurrence("credit", 2), false);
assert.equal(nextEditableEffectiveFrom("2026-08-10", 15, 15), "2026-08-15");
assert.equal(nextEditableEffectiveFrom("2026-08-15", 15, 15), "2026-09-15");
assert.equal(nextEditableEffectiveFrom("2026-08-20", 15, 15), "2026-09-15");
assert.equal(nextEditableEffectiveFrom("2026-08-10", 15, 20), "2026-08-20");
assert.equal(nextEditableEffectiveFrom("2026-08-10", 15, 5), "2026-09-05");
assert.equal(nextEditableEffectiveFrom("2026-08-03", 15, 5), "2026-08-05");

// effectiveFromForOccurrence: future occurrence → uses occurrence's month
assert.equal(effectiveFromForOccurrence("2026-09-08", "2026-11-15", 15), "2026-11-15");
assert.equal(effectiveFromForOccurrence("2026-09-08", "2026-10-15", 15), "2026-10-15");
// effectiveFromForOccurrence: future occurrence with day change → adjusts day in occurrence's month
assert.equal(effectiveFromForOccurrence("2026-09-08", "2026-11-15", 20), "2026-11-20");
// effectiveFromForOccurrence: past/today occurrence → falls back to next future occurrence
assert.equal(effectiveFromForOccurrence("2026-09-08", "2026-09-05", 15), "2026-09-15");
assert.equal(effectiveFromForOccurrence("2026-09-08", "2026-08-15", 15), "2026-09-15");
assert.equal(effectiveFromForOccurrence("2026-09-15", "2026-09-15", 15), "2026-10-15");

const series = { id: "11111111-1111-1111-1111-111111111111", startsOn: "2026-08-15" as const, endsBefore: null };
const versions = [
    {
        seriesId: series.id,
        effectiveFrom: "2026-08-15" as const,
        monthlyDay: 15,
        name: "Netflix",
        description: null,
        amountCents: 5500,
        paymentMethod: "credit" as const,
        categoryId: "22222222-2222-2222-2222-222222222222",
        generalTagIds: [],
        specificTagId: "33333333-3333-3333-3333-333333333333",
    },
];
const settingsHistory = [{ effectiveFrom: "1970-01-01T00:00:00.000Z", closingDay: 14, dueDay: 20 }];
const fallback = { closingDay: 14, dueDay: 20 };
const firstCard = projectSeriesOccurrences(series, versions, settingsHistory, "2026-08-01", "2026-09-30", "2026-08-10", fallback);
assert.equal(firstCard.length, 2);
assert.equal(firstCard[0]?.occurrenceDate, "2026-08-15");
assert.equal(firstCard[0]?.entry.competenceDate, "2026-09-01");
assert.equal(firstCard[0]?.entry.invoiceDueDate, "2026-09-20");
assert.equal(firstCard[0]?.isForecast, true);
assert.equal(firstCard[1]?.occurrenceDate, "2026-09-15");

const february = projectSeriesOccurrences({ id: series.id, startsOn: "2026-01-31", endsBefore: null }, [{ ...versions[0], effectiveFrom: "2026-01-31", monthlyDay: 31, paymentMethod: "pix" }], settingsHistory, "2026-02-01", "2026-02-28", "2026-01-15", fallback);
assert.equal(february[0]?.occurrenceDate, "2026-02-28");
assert.equal(february[0]?.entry.competenceDate, "2026-02-01");

const laterVersion = [versions[0], { ...versions[0], effectiveFrom: "2026-09-15" as const, amountCents: 6900 }];
assert.equal(versionAt(laterVersion, "2026-08")?.amountCents, 5500);
assert.equal(versionAt(laterVersion, "2026-09")?.amountCents, 6900);
const versioned = projectSeriesOccurrences(series, laterVersion, settingsHistory, "2026-08-01", "2026-09-30", "2026-08-20", fallback);
assert.equal(versioned[0]?.amountCents, 5500);
assert.equal(versioned[1]?.amountCents, 6900);

const ended = projectSeriesOccurrences({ ...series, endsBefore: "2026-09-15" }, versions, settingsHistory, "2026-08-01", "2026-10-31", "2026-08-10", fallback);
assert.deepEqual(
    ended.map((item) => item.occurrenceDate),
    ["2026-08-15"],
);

const historicSettings = settingsAt(
    [
        { effectiveFrom: "2026-01-01T00:00:00.000Z", closingDay: 14, dueDay: 20 },
        { effectiveFrom: "2026-08-20T15:00:00.000Z", closingDay: 10, dueDay: 18 },
    ],
    "2026-08-15",
    fallback,
);
assert.deepEqual(historicSettings, { closingDay: 14, dueDay: 20 });
const futureSettings = settingsAt(
    [
        { effectiveFrom: "2026-01-01T00:00:00.000Z", closingDay: 14, dueDay: 20 },
        { effectiveFrom: "2026-08-20T15:00:00.000Z", closingDay: 10, dueDay: 18 },
    ],
    "2026-09-15",
    fallback,
);
assert.deepEqual(futureSettings, { closingDay: 10, dueDay: 18 });

const realizedOnly = projectSeriesOccurrences(series, versions, settingsHistory, "2026-08-01", "2026-12-31", "2026-08-20", fallback).filter((item) => item.occurrenceDate <= "2026-08-20");
assert.deepEqual(
    realizedOnly.map((item) => item.occurrenceDate),
    ["2026-08-15"],
);

// Tests for nextCivilDate and previousCivilDate
import { nextCivilDate, previousCivilDate } from "../src/lib/domain/recurrence";
import { getEffectiveAmountCents, transactionSchema } from "../src/lib/domain/schemas";

assert.equal(nextCivilDate("2026-12-15"), "2026-12-16");
assert.equal(nextCivilDate("2026-12-31"), "2027-01-01");
assert.equal(previousCivilDate("2026-12-16"), "2026-12-15");
assert.equal(previousCivilDate("2027-01-01"), "2026-12-31");

// Test recurrence with inclusive end date mapped via nextCivilDate
const endsOnDec15 = projectSeriesOccurrences({ ...series, endsBefore: nextCivilDate("2026-10-15") }, versions, settingsHistory, "2026-08-01", "2026-12-31", "2026-08-10", fallback);
assert.deepEqual(
    endsOnDec15.map((item) => item.occurrenceDate),
    ["2026-08-15", "2026-09-15", "2026-10-15"],
);

// Test transactionSchema validation for recurringEndDate
const validUuid = "22222222-2222-4222-a222-222222222222";

const validNoEnd = transactionSchema.safeParse({
    name: "Netflix",
    amount: "55,00",
    purchaseDate: "2026-08-15",
    paymentMethod: "credit",
    installmentCount: 1,
    isRecurring: true,
    recurringEndDate: "",
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(validNoEnd.success, true);

const validWithEnd = transactionSchema.safeParse({
    name: "Academia",
    amount: "150,00",
    purchaseDate: "2026-08-15",
    paymentMethod: "credit",
    installmentCount: 1,
    isRecurring: true,
    recurringEndDate: "2026-12-15",
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(validWithEnd.success, true);

const invalidEndDateBeforeStart = transactionSchema.safeParse({
    name: "Academia",
    amount: "150,00",
    purchaseDate: "2026-08-15",
    paymentMethod: "credit",
    installmentCount: 1,
    isRecurring: true,
    recurringEndDate: "2026-08-10",
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(invalidEndDateBeforeStart.success, false);

// return-url tests
assert.equal(sanitizeReturnUrl("/transacoes?month=2026-08"), "/transacoes?month=2026-08");
assert.equal(sanitizeReturnUrl("/?view=annual&year=2025"), "/?view=annual&year=2025");
assert.equal(sanitizeReturnUrl("//evil.com"), "/transacoes");
assert.equal(sanitizeReturnUrl("https://evil.com"), "/transacoes");
assert.equal(sanitizeReturnUrl("javascript:alert(1)"), "/transacoes");
assert.equal(sanitizeReturnUrl(null), "/transacoes");
assert.equal(sanitizeReturnUrl(undefined, "/custom-fallback"), "/custom-fallback");

assert.equal(withReturnUrl("/transacoes/123/editar", "/transacoes?month=2026-08"), "/transacoes/123/editar?returnUrl=%2Ftransacoes%3Fmonth%3D2026-08");
assert.equal(withReturnUrl("/transacoes/123/editar?foo=bar", "/transacoes?month=2026-08"), "/transacoes/123/editar?foo=bar&returnUrl=%2Ftransacoes%3Fmonth%3D2026-08");
assert.equal(withReturnUrl("/transacoes/123/editar", null), "/transacoes/123/editar");
assert.equal(withReturnUrl("/transacoes/123/editar", "//evil.com"), "/transacoes/123/editar");

assert.equal(getReturnUrl("/transacoes?month=2026-08"), "/transacoes?month=2026-08");
assert.equal(getReturnUrl("//evil.com"), "/transacoes");
assert.equal(getReturnUrl(null), "/transacoes");

// getEffectiveAmountCents tests
assert.equal(getEffectiveAmountCents(10000, 3000, false), 7000);
assert.equal(getEffectiveAmountCents(10000, 3000, true), 10000);
assert.equal(getEffectiveAmountCents(10000, null, false), 10000);
assert.equal(getEffectiveAmountCents(10000, null, true), 10000);
assert.equal(getEffectiveAmountCents(10000, undefined, false), 10000);
assert.equal(getEffectiveAmountCents(10000, undefined, true), 10000);

// Partial reimbursement transactionSchema tests
const validPartial = transactionSchema.safeParse({
    name: "Almoço com Colegas",
    amount: "300,00",
    reimbursedAmount: "100,00",
    purchaseDate: "2026-09-11",
    paymentMethod: "pix",
    installmentCount: 1,
    isRecurring: false,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(validPartial.success, true);
if (validPartial.success) {
    assert.equal(validPartial.data.amount, 30000);
    assert.equal(validPartial.data.reimbursedAmount, 10000);
}

const validEmptyReimbursed = transactionSchema.safeParse({
    name: "Almoço Integral",
    amount: "300,00",
    reimbursedAmount: "",
    purchaseDate: "2026-09-11",
    paymentMethod: "pix",
    installmentCount: 1,
    isRecurring: false,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(validEmptyReimbursed.success, true);
if (validEmptyReimbursed.success) {
    assert.equal(validEmptyReimbursed.data.reimbursedAmount, null);
}

const invalidPartialOnInstallments = transactionSchema.safeParse({
    name: "Compra Parcelada",
    amount: "300,00",
    reimbursedAmount: "100,00",
    purchaseDate: "2026-09-11",
    paymentMethod: "credit",
    installmentCount: 3,
    isRecurring: false,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(invalidPartialOnInstallments.success, false);

const invalidPartialOnRecurring = transactionSchema.safeParse({
    name: "Assinatura",
    amount: "300,00",
    reimbursedAmount: "100,00",
    purchaseDate: "2026-09-11",
    paymentMethod: "pix",
    installmentCount: 1,
    isRecurring: true,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(invalidPartialOnRecurring.success, false);

const invalidPartialExceedingAmount = transactionSchema.safeParse({
    name: "Compra",
    amount: "300,00",
    reimbursedAmount: "300,00",
    purchaseDate: "2026-09-11",
    paymentMethod: "pix",
    installmentCount: 1,
    isRecurring: false,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(invalidPartialExceedingAmount.success, false);

const invalidPartialGreaterAmount = transactionSchema.safeParse({
    name: "Compra",
    amount: "300,00",
    reimbursedAmount: "350,00",
    purchaseDate: "2026-09-11",
    paymentMethod: "pix",
    installmentCount: 1,
    isRecurring: false,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(invalidPartialGreaterAmount.success, false);

const invalidPartialZero = transactionSchema.safeParse({
    name: "Compra",
    amount: "300,00",
    reimbursedAmount: "0,00",
    purchaseDate: "2026-09-11",
    paymentMethod: "pix",
    installmentCount: 1,
    isRecurring: false,
    category: validUuid,
    generalTags: [],
    specificTag: null,
});
assert.equal(invalidPartialZero.success, false);
