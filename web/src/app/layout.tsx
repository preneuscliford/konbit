import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { THEME_SCRIPT } from "@/components/theme/theme";
import Toaster from "@/components/Toaster";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Konbit 509 – Aplikasyon kominote ayisyen an",
    template: "%s · Konbit 509",
  },
  description:
    "Pataje lide, pwojè ak diskisyon ak kominote ayisyen an, an Ayiti kou nan dyaspora a. Gratis, an kreyòl ak an fransè.",
  openGraph: { siteName: "Konbit 509", locale: "ht_HT", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ht"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
