export const categories = ["fixed_expenses", "hygiene", "health", "food", "transportation", "leisure", "clothing", "personal", "gift"] as const;

export const categoryLabels = {
    fixed_expenses: "Contas Fixas",
    hygiene: "Higiene",
    health: "Saúde",
    food: "Alimentação",
    transportation: "Transporte",
    leisure: "Lazer",
    clothing: "Vestuário",
    personal: "Pessoal",
    gift: "Presente",
} satisfies Record<Category, string>;

export const generalTags = ["reimbursement", "family", "friends"] as const;

export const generalTagLabels = {
    reimbursement: "Reembolso",
    family: "Família",
    friends: "Amigos",
} satisfies Record<GeneralTag, string>;

export const specificTagsByCategory = {
    fixed_expenses: ["mobile_phone", "energy", "home"],
    hygiene: [],
    health: ["medicine", "doctor", "gym"],
    food: ["restaurant", "bakery_or_grocery", "snack"],
    transportation: ["uber", "travel"],
    leisure: ["subscription", "tickets", "other"],
    clothing: [],
    personal: [],
    gift: [],
} as const satisfies Record<Category, readonly string[]>;

export const specificTags = ["mobile_phone", "energy", "home", "medicine", "doctor", "gym", "restaurant", "bakery_or_grocery", "snack", "uber", "travel", "subscription", "tickets", "other"] as const;

export const specificTagLabels = {
    mobile_phone: "Celular",
    energy: "Energia",
    home: "Casa",
    medicine: "Remédio",
    doctor: "Médico",
    gym: "Academia",
    restaurant: "Restaurante",
    bakery_or_grocery: "Padaria/Supermercado",
    snack: "Lanche",
    uber: "Uber",
    travel: "Viagem",
    subscription: "Assinatura",
    tickets: "Ingressos",
    other: "Outro",
} satisfies Record<SpecificTag, string>;

export const paymentMethods = ["credit", "pix"] as const;

export const paymentMethodLabels = {
    pix: "PIX",
    credit: "Cartão",
} satisfies Record<PaymentMethod, string>;

export type Category = (typeof categories)[number];
export type GeneralTag = (typeof generalTags)[number];
export type SpecificTag = (typeof specificTags)[number];
export type PaymentMethod = (typeof paymentMethods)[number];

export function isSpecificTagForCategory(category: Category, tag: string): tag is SpecificTag {
    return (specificTagsByCategory[category] as readonly string[]).includes(tag);
}
