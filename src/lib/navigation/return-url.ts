/**
 * Utilities for tracking and returning to the previous view/state
 * when editing, viewing, or canceling transaction operations.
 */

export function sanitizeReturnUrl(url?: string | null, fallback = "/transacoes"): string {
    if (!url || typeof url !== "string") {
        return fallback;
    }

    const trimmed = url.trim();
    // Must start with '/' and not with '//' (to prevent protocol-relative open redirects)
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return fallback;
    }

    // Do not allow javascript: or data: or full URLs disguised after slashes
    if (trimmed.includes(":") && trimmed.indexOf(":") < trimmed.indexOf("/")) {
        return fallback;
    }

    return trimmed;
}

export function withReturnUrl(href: string, returnUrl?: string | null): string {
    if (!returnUrl) {
        return href;
    }

    const cleanReturn = sanitizeReturnUrl(returnUrl, "");
    if (!cleanReturn) {
        return href;
    }

    const [pathname, search] = href.split("?");
    const params = new URLSearchParams(search ?? "");
    params.set("returnUrl", cleanReturn);

    return `${pathname}?${params.toString()}`;
}

export function getReturnUrl(searchParamsReturnUrl?: string | null, fallback = "/transacoes"): string {
    if (searchParamsReturnUrl) {
        return sanitizeReturnUrl(searchParamsReturnUrl, fallback);
    }

    if (typeof window !== "undefined" && document.referrer) {
        try {
            const referrerUrl = new URL(document.referrer);
            if (referrerUrl.origin === window.location.origin) {
                const target = `${referrerUrl.pathname}${referrerUrl.search}`;
                // Avoid redirecting back into an edit page or auth page
                if (!target.includes("/edit") && !target.includes("/editar") && !target.includes("/login") && !target.includes("/entrar")) {
                    return sanitizeReturnUrl(target, fallback);
                }
            }
        } catch {
            // Ignore malformed referrer
        }
    }

    return fallback;
}
