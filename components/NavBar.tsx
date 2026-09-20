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
    <nav className="sticky top-0 z-50 w-full bg-[#48b3ff]/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-6 px-8 py-[22px]">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 max-w-[330px] rounded-[40px] py-[10px] text-center font-potta text-[15px] tracking-wide transition-colors ${
                active ? "bg-white text-[#17496c]" : "bg-white/90 text-[#17496c] hover:bg-white"
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