import { createElement, type CSSProperties, type ComponentType } from "react";
import { Baby, Bolt, Briefcase, BusFront, Car, Circle, CircleEllipsis, Coffee, CreditCard, Dog, DollarSign, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap, HandCoins, Handshake, HeartPulse, House, PartyPopper, Pill, Plane, QrCode, ReceiptText, Repeat, Shirt, ShoppingBasket, Smartphone, Sparkles, Stethoscope, Tag, Ticket, Tv, UserRound, UsersRound, Utensils, Wallet, Wifi } from "lucide-react";
import type { PaymentMethod } from "@/lib/domain/catalog";

export type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean; style?: CSSProperties }>;

export type TransactionVisual = {
    color: string;
    icon: IconComponent;
};

export const paymentVisuals: Record<PaymentMethod, TransactionVisual> = {
    pix: { color: "#5EEAD4", icon: QrCode },
    credit: { color: "#7DD3FC", icon: CreditCard },
};

export const recurringVisual: TransactionVisual = {
    color: "#E879F9",
    icon: Repeat,
};

const ICON_MAP: Record<string, IconComponent> = {
    Baby,
    Bolt,
    Briefcase,
    BusFront,
    Car,
    Circle,
    CircleEllipsis,
    Coffee,
    CreditCard,
    Dog,
    DollarSign,
    Dumbbell,
    Fuel,
    Gamepad2,
    Gift,
    GraduationCap,
    HandCoins,
    Handshake,
    HeartPulse,
    House,
    PartyPopper,
    Pill,
    Plane,
    QrCode,
    ReceiptText,
    Repeat,
    Shirt,
    ShoppingBasket,
    Smartphone,
    Sparkles,
    Stethoscope,
    Tag,
    Ticket,
    Tv,
    UserRound,
    UsersRound,
    Utensils,
    Wallet,
    Wifi,
};

function toPascalCase(str: string): string {
    return str.replace(/[-_ ]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^(.)/, (c) => c.toUpperCase());
}

export function getLucideIcon(iconName?: string | null): IconComponent {
    if (!iconName) {
        return Tag;
    }

    if (ICON_MAP[iconName]) {
        return ICON_MAP[iconName];
    }

    const pascal = toPascalCase(iconName);
    if (ICON_MAP[pascal]) {
        return ICON_MAP[pascal];
    }

    return Tag;
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
