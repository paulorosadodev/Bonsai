import type { NextConfig } from "next";

const securityHeaders = [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" }, { key: "X-Frame-Options", value: "DENY" }, ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : [])];

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
    async redirects() {
        return [
            { source: "/invoice", destination: "/fatura", permanent: true },
            { source: "/transactions", destination: "/transacoes", permanent: true },
            { source: "/transactions/new", destination: "/transacoes/nova", permanent: true },
            { source: "/transactions/:id/edit", destination: "/transacoes/:id/editar", permanent: true },
            { source: "/transactions/recurring/:seriesId/:occurrenceDate/edit", destination: "/transacoes/recorrentes/:seriesId/:occurrenceDate/editar", permanent: true },
            { source: "/settings", destination: "/ajustes", permanent: true },
            { source: "/configuracoes", destination: "/ajustes", permanent: true },
        ];
    },
};

export default nextConfig;
