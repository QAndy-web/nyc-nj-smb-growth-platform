import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYC + NJ SMB Growth Platform",
  description: "Discover and prioritize local businesses with digital growth opportunities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
