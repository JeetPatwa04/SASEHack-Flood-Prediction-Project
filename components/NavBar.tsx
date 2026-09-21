"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "HOME" },
  { href: "/dashboard", label: "DASHBOARD" },
  { href: "/map", label: "INTERACTIVE MAP" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 w-full bg-skyblue/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-[22px]">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-pill flex-1 max-w-[330px] rounded-blob py-[15px] text-center font-potta text-[20px] tracking-wide ${
                active ? "bg-white text-navy" : "bg-white/90 text-navy"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}