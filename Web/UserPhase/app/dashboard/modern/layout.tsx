import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/modern-components.css";
import "@/app/dashboard/modern/styles.css";

export const metadata: Metadata = {
  title: "FerixCourse - Modern Dashboard Demo",
  description: "FerixCourse modern dashboard proof of concept",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="fc-root">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="fc-body antialiased">
        {children}
      </body>
    </html>
  );
}