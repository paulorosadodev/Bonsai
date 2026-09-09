import type { Metadata, Viewport } from "next";
import { Inter, Ma_Shan_Zheng } from "next/font/google";
import type { ReactNode } from "react";
import logo1 from "@/assets/logo.png";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const slacksideOne = Ma_Shan_Zheng({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-logo",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Bonsai - Meus gastos",
    description: "App de finanças pessoais",
    icons: {
        icon: [{ url: logo1.src, type: "image/png" }],
        apple: [{ url: logo1.src }],
    },
};

export const viewport: Viewport = {
    colorScheme: "dark",
    themeColor: "#100B1E",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="pt-BR" className={`${inter.variable} ${slacksideOne.variable}`}>
            <body className={`${inter.className} relative isolate min-h-dvh bg-ink text-text antialiased`}>
                <AmbientBackground />
                <div className="relative z-10 min-h-dvh">{children}</div>
                <Toaster />
            </body>
        </html>
    );
}
