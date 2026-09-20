import type { Metadata } from "next";
import { Potta_One, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const pottaOne = Potta_One({ weight: "400", subsets: ["latin"], variable: "--font-potta" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FloodWatch – ML-Powered River Level Forecasting",
  description: "Real-time flood risk monitoring powered by USGS data and machine learning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pottaOne.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-[#17496c] text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}