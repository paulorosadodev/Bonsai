import { NextResponse, type NextRequest } from "next/server";
import { getSafePath, isPublicPath } from "@/lib/supabase/paths";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
    const { response, hasSession, copySessionCookies } = await updateSession(request);
    const { pathname, search } = request.nextUrl;
    const publicPath = isPublicPath(pathname);

    if (!hasSession && !publicPath && !pathname.startsWith("/api/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        url.searchParams.set("next", getSafePath(`${pathname}${search}`));
        return copySessionCookies(response, NextResponse.redirect(url));
    }

    if (hasSession && (pathname === "/login" || pathname.startsWith("/login/"))) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return copySessionCookies(response, NextResponse.redirect(url));
    }

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
