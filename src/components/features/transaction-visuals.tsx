import { createElement, type CSSProperties, type ComponentType } from "react";
import * as LucideIcons from "lucide-react";
import type { PaymentMethod } from "@/lib/domain/catalog";

export type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean; style?: CSSProperties }>;

export type TransactionVisual = {
    color: string;
    icon: IconComponent;
};

export const paymentVisuals: Record<PaymentMethod, TransactionVisual> = {
    pix: { color: "#5EEAD4", icon: LucideIcons.QrCode },
    credit: { color: "#7DD3FC", icon: LucideIcons.CreditCard },
};

export const recurringVisual: TransactionVisual = {
    color: "#E879F9",
    icon: LucideIcons.Repeat,
};

function toPascalCase(str: string): string {
    return str.replace(/[-_ ]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^(.)/, (c) => c.toUpperCase());
}

export function getLucideIcon(iconName?: string | null): IconComponent {
    if (!iconName) {
        return LucideIcons.Tag;
    }

    const icons = LucideIcons as Record<string, unknown>;

    // Direct match
    if (typeof icons[iconName] === "function" || (typeof icons[iconName] === "object" && icons[iconName] !== null)) {
        return icons[iconName] as IconComponent;
    }

    // PascalCase normalization (e.g. "receipt-text" -> "ReceiptText")
    const pascal = toPascalCase(iconName);
    if (typeof icons[pascal] === "function" || (typeof icons[pascal] === "object" && icons[pascal] !== null)) {
        return icons[pascal] as IconComponent;
    }

    return LucideIcons.Tag;
}

export function DynamicIcon({ name, className, style }: { name?: string | null; className?: string; style?: CSSProperties }) {
    const Component = getLucideIcon(name);
    return createElement(Component, { className, style, "aria-hidden": true });
}

export function getItemVisual(item?: { color?: string; icon?: string | null } | null, fallbackColor = "#94A3B8"): TransactionVisual {
    return {
        color: item?.color || fallbackColor,
        icon: getLucideIcon(item?.icon),
    };
}

export function visualStyle(visual: TransactionVisual): CSSProperties {
    return { "--choice-color": visual.color } as CSSProperties;
}
