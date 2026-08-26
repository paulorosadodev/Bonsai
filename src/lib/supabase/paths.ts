const publicExactPaths = new Set(["/login"]);

export function isPublicPath(pathname: string): boolean {
    return publicExactPaths.has(pathname);
}

export function getSafePath(next: string | null | undefined, fallback = "/"): string {
    if (!next) {
        return fallback;
    }

    if (!next.startsWith("/") || next.startsWith("//") || next.includes("://") || next.includes("\\")) {
        return fallback;
    }

    return next;
}
