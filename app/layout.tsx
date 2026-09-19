import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FloodWatch – ML-Powered River Level Forecasting",
  description: "Real-time flood risk monitoring powered by USGS data and machine learning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f1623] text-white antialiased">
        {children}
      </body>
    </html>
  );
}