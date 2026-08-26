import { formatBrl } from "@/lib/domain/money";

const formulaPrefix = /^[=+\-@\t\r]/;

function escapeCell(value: string): string {
    let cell = value;

    if (formulaPrefix.test(cell)) {
        cell = `'${cell}`;
    }

    return `"${cell.replaceAll('"', '""')}"`;
}

function cell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
        return '""';
    }

    if (typeof value === "number") {
        return String(value);
    }

    return escapeCell(value);
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
    const lines = [headers.map((header) => escapeCell(header)).join(","), ...rows.map((row) => row.map(cell).join(","))];
    return `${lines.join("\r\n")}\r\n`;
}

export function serializeTags(tags: string[] | null | undefined): string {
    return tags?.join("|") ?? "";
}

export function amountBrl(cents: number): string {
    return formatBrl(cents);
}

export function csvResponse(filename: string, csv: string): Response {
    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}
