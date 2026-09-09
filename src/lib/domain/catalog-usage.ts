import type { CategoryOption, GeneralTagOption, SpecificTagOption } from "./catalog";

export interface CatalogUsageSource {
    categories?: CategoryOption[];
    generalTags?: GeneralTagOption[];
    specificTags?: SpecificTagOption[];
    excludeId?: string | null;
}

/**
 * Cria um mapa de cores (HEX normalizado em minúsculas) para os nomes de quem já as utiliza,
 * comparando apenas entre categorias e tags gerais (e não tags específicas).
 */
export function buildColorUsageMap({ categories = [], generalTags = [], excludeId = null }: CatalogUsageSource): Record<string, string[]> {
    const map: Record<string, string[]> = {};

    function add(color: string | null | undefined, name: string) {
        if (!color) return;
        const normalized = color.toLowerCase().trim();
        if (!map[normalized]) {
            map[normalized] = [];
        }
        if (!map[normalized].includes(name)) {
            map[normalized].push(name);
        }
    }

    for (const cat of categories) {
        if (cat.id !== excludeId && cat.color) {
            add(cat.color, cat.name);
        }
    }

    for (const tag of generalTags) {
        if (tag.id !== excludeId && tag.color) {
            add(tag.color, tag.name);
        }
    }

    return map;
}

/**
 * Cria um mapa de ícones (nome exato) para os nomes de quem já os utiliza,
 * comparando apenas entre categorias e tags gerais (e não tags específicas).
 */
export function buildIconUsageMap({ categories = [], generalTags = [], excludeId = null }: CatalogUsageSource): Record<string, string[]> {
    const map: Record<string, string[]> = {};

    function add(icon: string | null | undefined, name: string) {
        if (!icon) return;
        const normalized = icon.trim();
        if (!map[normalized]) {
            map[normalized] = [];
        }
        if (!map[normalized].includes(name)) {
            map[normalized].push(name);
        }
    }

    for (const cat of categories) {
        if (cat.id !== excludeId && cat.icon) {
            add(cat.icon, cat.name);
        }
    }

    for (const tag of generalTags) {
        if (tag.id !== excludeId && tag.icon) {
            add(tag.icon, tag.name);
        }
    }

    return map;
}

/**
 * Cria um mapa de ícones em uso entre as tags específicas de uma mesma categoria.
 */
export function buildSpecificTagIconUsageMap({ specificTags = [], excludeId = null }: { specificTags?: SpecificTagOption[]; excludeId?: string | null }): Record<string, string[]> {
    const map: Record<string, string[]> = {};

    for (const tag of specificTags) {
        if (tag.id !== excludeId && tag.icon) {
            const normalized = tag.icon.trim();
            if (!map[normalized]) {
                map[normalized] = [];
            }
            if (!map[normalized].includes(tag.name)) {
                map[normalized].push(tag.name);
            }
        }
    }

    return map;
}
