export const paymentMethods = ["credit", "pix"] as const;

export const paymentMethodLabels = {
    pix: "PIX",
    credit: "Cartão",
} satisfies Record<PaymentMethod, string>;

export type PaymentMethod = (typeof paymentMethods)[number];

export interface UserCategory {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserGeneralTag {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface UserSpecificTag {
    id: string;
    user_id: string;
    category_id: string;
    name: string;
    color: string;
    icon?: string | null;
    created_at?: string;
    updated_at?: string;
}

export type CategoryOption = {
    id: string;
    name: string;
    color: string;
    icon: string;
};

export type GeneralTagOption = {
    id: string;
    name: string;
    color: string;
    icon: string | null;
};

export type SpecificTagOption = {
    id: string;
    categoryId: string;
    name: string;
    color: string;
    icon: string | null;
};

// Curated aesthetic colors for categories and tags
export const PRESET_COLORS = [
    { label: "Violeta", value: "#A78BFA" },
    { label: "Púrpura", value: "#C084FC" },
    { label: "Fúcsia", value: "#E879F9" },
    { label: "Rosa", value: "#F472B6" },
    { label: "Coral", value: "#FB7185" },
    { label: "Laranja", value: "#FB923C" },
    { label: "Âmbar", value: "#FBBF24" },
    { label: "Amarelo", value: "#F5C451" },
    { label: "Lima", value: "#A3E635" },
    { label: "Esmeralda", value: "#34D399" },
    { label: "Menta", value: "#2DD4BF" },
    { label: "Ciano", value: "#38BDF8" },
    { label: "Azul", value: "#60A5FA" },
    { label: "Índigo", value: "#818CF8" },
    { label: "Neutro", value: "#94A3B8" },
    { label: "Zinco", value: "#71717A" },
] as const;

// Curated Lucide icon identifiers for categories and tags
export const PRESET_ICONS = [
    // Finance & Bills
    "ReceiptText",
    "Wallet",
    "DollarSign",
    "HandCoins",
    "CreditCard",
    "QrCode",
    // Food & Dining
    "Utensils",
    "Coffee",
    "ShoppingBasket",
    // Living & Home
    "House",
    "Bolt",
    "Wifi",
    "Sparkles",
    // Transportation
    "Car",
    "BusFront",
    "Plane",
    "Fuel",
    // Health & Fitness
    "HeartPulse",
    "Dumbbell",
    "Pill",
    "Stethoscope",
    // Leisure & Fun
    "PartyPopper",
    "Ticket",
    "Gamepad2",
    "Tv",
    // Shopping & Style
    "Shirt",
    "Gift",
    "Smartphone",
    "Tag",
    // People & Family
    "UserRound",
    "UsersRound",
    "Handshake",
    "Baby",
    "Dog",
    // Work & Education
    "Briefcase",
    "GraduationCap",
    "CircleEllipsis",
] as const;

export type PresetIconName = (typeof PRESET_ICONS)[number];

// Legacy type aliases for transitional compatibility
export type Category = string;
export type GeneralTag = string;
export type SpecificTag = string;
