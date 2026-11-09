"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="relative w-full bg-[#1b4332] text-white z-40">
      <div className="flex justify-between items-center px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden text-white p-1"
            aria-label="Buka menu sidebar"
          >
            <Menu className="w-7 h-7" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 md:gap-3 flex-shrink-0"
          >
            <img
              src="/logo-desa.png"
              alt="Logo Desa Jarak"
              width={38}
              height={38}
              className="object-contain w-8 h-8 md:w-10 md:h-10"
            />
            <div className="text-lg md:text-2xl tracking-wide whitespace-nowrap">
              <span className="font-bold text-white">Desa </span>
              <span className="font-bold text-[#74c69d]">Jarak</span>
            </div>
          </Link>
        </div>

        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-gray-200">
          <Link
            href="/"
            className="hover:text-[#74c69d] transition-colors whitespace-nowrap"
          >
            BERANDA
          </Link>
          <Link
            href="/direktori"
            className="hover:text-[#74c69d] transition-colors whitespace-nowrap"
          >
            DIREKTORI USAHA
          </Link>
          <Link
            href="/usaha"
            className="hover:text-[#74c69d] transition-colors whitespace-nowrap"
          >
            DASHBOARD USAHA
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="xl:hidden text-2xl md:text-3xl text-white focus:outline-none hover:text-[#74c69d] transition-colors p-1.5 flex-shrink-0"
          aria-label="Toggle Menu"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {isOpen && (
        <nav className="absolute top-full left-0 w-full bg-[#1b4332] shadow-lg border-t border-white/10 z-50 xl:hidden max-h-[80vh] overflow-y-auto">
          <ul className="flex flex-col">
            <li>
              <Link
                href="/"
                className="block px-5 py-3.5 text-sm text-white hover:bg-[#2d6a4f] border-b border-white/10"
              >
                BERANDA
              </Link>
            </li>
            <li>
              <Link
                href="/direktori"
                className="block px-5 py-3.5 text-sm text-white hover:bg-[#2d6a4f] border-b border-white/10"
              >
                DIREKTORI USAHA
              </Link>
            </li>
            <li>
              <Link
                href="/usaha"
                className="block px-5 py-3.5 text-sm text-white hover:bg-[#2d6a4f] border-b border-white/10"
              >
                DASHBOARD USAHA
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
