import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship dashboard",
  description: "Track internship opportunities, deadlines, and applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
