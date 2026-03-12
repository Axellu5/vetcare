/**
 * @fileoverview Root layout — wraps every page with AuthProvider and AppShell.
 *
 * Keeps metadata export (server component requirement) while delegating
 * all client-side auth logic to AuthProvider and AppShell.
 */

import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import AppShell from "@/app/components/AppShell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "VetCare",
  description: "Veterinary Clinic Management System",
};

/**
 * RootLayout — server component that bootstraps the auth layer.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
