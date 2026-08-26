import type { CSSProperties, ComponentType } from "react";
import { Bolt, BusFront, Car, CircleEllipsis, CreditCard, Dumbbell, Gift, HandCoins, Handshake, HeartPulse, House, PartyPopper, Pill, Plane, QrCode, ReceiptText, Repeat, Shirt, ShoppingBasket, Smartphone, Sparkles, Stethoscope, Ticket, Utensils, UserRound, UsersRound, Wifi } from "lucide-react";
import type { Category, GeneralTag, PaymentMethod, SpecificTag } from "@/lib/domain/catalog";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export type TransactionVisual = {
    color: string;
    icon: Icon;
};

export const paymentVisuals = {
    pix: { color: "#5EEAD4", icon: QrCode },
    credit: { color: "#7DD3FC", icon: CreditCard },
} satisfies Record<PaymentMethod, TransactionVisual>;

export const categoryVisuals = {
    fixed_expenses: { color: "#A78BFA", icon: ReceiptText },
    hygiene: { color: "#2DD4BF", icon: Sparkles },
    health: { color: "#FB7185", icon: HeartPulse },
    food: { color: "#F5C451", icon: Utensils },
    transportation: { color: "#60A5FA", icon: BusFront },
    leisure: { color: "#D8B4FE", icon: PartyPopper },
    clothing: { color: "#F9A8D4", icon: Shirt },
    personal: { color: "#A3E635", icon: UserRound },
    gift: { color: "#FDBA74", icon: Gift },
} satisfies Record<Category, TransactionVisual>;

export const generalTagVisuals = {
    reimbursement: { color: "#5EEAD4", icon: HandCoins },
    family: { color: "#F9A8D4", icon: UsersRound },
    friends: { color: "#7DD3FC", icon: Handshake },
} satisfies Record<GeneralTag, TransactionVisual>;

const specificTagIcons = {
    mobile_phone: Smartphone,
    energy: Bolt,
    home: House,
    medicine: Pill,
    doctor: Stethoscope,
    gym: Dumbbell,
    restaurant: Utensils,
    bakery_or_grocery: ShoppingBasket,
    snack: ShoppingBasket,
    uber: Car,
    travel: Plane,
    subscription: Wifi,
    tickets: Ticket,
    other: CircleEllipsis,
} satisfies Record<SpecificTag, Icon>;

export const specificTagCategories = {
    mobile_phone: "fixed_expenses",
    energy: "fixed_expenses",
    home: "fixed_expenses",
    medicine: "health",
    doctor: "health",
    gym: "health",
    restaurant: "food",
    bakery_or_grocery: "food",
    snack: "food",
    uber: "transportation",
    travel: "transportation",
    subscription: "leisure",
    tickets: "leisure",
    other: "leisure",
} satisfies Record<SpecificTag, Category>;

export function specificTagVisual(tag: SpecificTag): TransactionVisual {
    return {
        color: categoryVisuals[specificTagCategories[tag]].color,
        icon: specificTagIcons[tag],
    };
}

export const recurringVisual: TransactionVisual = {
    color: "#E879F9",
    icon: Repeat,
};

export function visualStyle(visual: TransactionVisual): CSSProperties {
    return { "--choice-color": visual.color } as CSSProperties;
}
