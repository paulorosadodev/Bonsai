export function parseBrlToCents(input: string): number {
    const normalized = input
        .trim()
        .replace(/^R\$\s?/, "")
        .replace(/\s/g, "");

    if (!/^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/.test(normalized)) {
        throw new Error("Valor monetário inválido");
    }

    const [wholePart, decimalPart = ""] = normalized.split(",");
    const cents = BigInt(wholePart.replace(/\./g, "")) * 100n + BigInt(decimalPart.padEnd(2, "0"));

    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Valor monetário excede o limite seguro");
    }

    return Number(cents);
}

export function formatBrl(cents: number): string {
    if (!Number.isSafeInteger(cents)) {
        throw new Error("Centavos devem ser um inteiro seguro");
    }

    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    const whole = Math.floor(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, "0");
    const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}R$ ${grouped},${fraction}`;
}

export function formatChartValue(cents: number): string {
    if (!Number.isSafeInteger(cents) || cents <= 0) return "R$ 0";
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    const whole = Math.floor(absolute / 100);
    const fraction = absolute % 100;
    const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return fraction > 0 ? `${sign}R$ ${grouped},${String(fraction).padStart(2, "0")}` : `${sign}R$ ${grouped}`;
}
