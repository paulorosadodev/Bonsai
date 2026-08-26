import { categories, generalTags, paymentMethods, type Category, type GeneralTag, type PaymentMethod } from "@/lib/domain/catalog";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";

export function currentCivilDate() {
    return toSaoPauloCivilDate(new Date());
}

export function currentMonth() {
    return currentCivilDate().slice(0, 7);
}

export function isMonth(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month] = value.split("-").map(Number);
    return year >= 1000 && month >= 1 && month <= 12;
}

export function shiftMonth(month: string, delta: number) {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;
const monthShortLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

export function formatMonthLabel(month: string) {
    const [year, monthNumber] = month.split("-").map(Number);
    return `${monthLabels[monthNumber - 1]} de ${year}`;
}

export function formatShortMonth(month: string) {
    const [year, monthNumber] = month.split("-").map(Number);
    return `${monthShortLabels[monthNumber - 1]}/${String(year).slice(2)}`;
}

export function formatAxisMonth(month: string) {
    return formatShortMonth(month).toLocaleUpperCase("pt-BR");
}

export function formatDayMonth(civilDate: string) {
    const [, month, day] = civilDate.split("-");
    return `${day}/${month}`;
}

export function formatCivilDate(value: string) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

export function readParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
}

export function searchHref(path: string, params: Record<string, string | boolean | undefined | null>) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === true) {
            search.set(key, "true");
        } else if (typeof value === "string" && value.length > 0) {
            search.set(key, value);
        }
    }

    const query = search.toString();
    return query ? `${path}?${query}` : path;
}

export function isFinancePath(pathname: string) {
    return pathname === "/" || pathname.startsWith("/invoice");
}

export function financeSearchHref(path: string, searchParams: Pick<URLSearchParams, "get">) {
    const month = searchParams.get("month");
    return searchHref(path, {
        month: month && isMonth(month) ? month : undefined,
        includeReimbursements: searchParams.get("includeReimbursements") === "true",
    });
}

export function parseMonthParam(searchParams: Record<string, string | string[] | undefined>, fallback = currentMonth()) {
    const month = readParam(searchParams, "month");
    return month && isMonth(month) ? month : fallback;
}

export function parseIncludeReimbursements(searchParams: Record<string, string | string[] | undefined>) {
    return readParam(searchParams, "includeReimbursements") === "true";
}

export function parseTransactionListParams(searchParams: Record<string, string | string[] | undefined>) {
    const month = parseMonthParam(searchParams);
    const categoryValue = readParam(searchParams, "category");
    const paymentValue = readParam(searchParams, "paymentMethod");
    const tagValue = readParam(searchParams, "generalTag");
    const category = categoryValue && (categories as readonly string[]).includes(categoryValue) ? (categoryValue as Category) : undefined;
    const paymentMethod = paymentValue && (paymentMethods as readonly string[]).includes(paymentValue) ? (paymentValue as PaymentMethod) : undefined;
    const generalTag = tagValue && (generalTags as readonly string[]).includes(tagValue) ? (tagValue as GeneralTag) : undefined;

    return { month, category, paymentMethod, generalTag, includeReimbursements: true };
}
