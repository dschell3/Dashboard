import type { Metadata } from "next";
import Toaster from "@/components/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship dashboard",
  description: "Track internship opportunities, deadlines, and applications.",
};

// Runs before paint: applies the stored theme (or the system preference on
// first visit) so a dark-mode user never sees a white flash. The CSP permits
// inline scripts, so this is safe under the current policy.
const themeInit = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
