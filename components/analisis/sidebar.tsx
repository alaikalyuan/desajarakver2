"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  LayoutDashboard,
  Leaf,
  LogOut,
  Phone,
  ShoppingCart,
  Sprout,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { helpWhatsAppUrl } from "@/lib/contact";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const menuItems = [
    { name: "Dashboard Analisis", href: "/usaha/analisis", icon: LayoutDashboard },
    {
      name: "Input Transaksi",
      href: "/usaha/analisis/input-harga",
      icon: ShoppingCart,
    },
    { name: "Produksi", href: "/usaha/analisis/produksi", icon: Sprout },
  ];

  const helpUrl = helpWhatsAppUrl(
    "Halo Admin Desa Jarak, saya butuh bantuan terkait dashboard."
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#1b4332] text-white flex flex-col h-full flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
      `}
      >
        <div className="p-4 lg:p-6 flex items-center justify-between gap-3 border-b border-white/10 flex-shrink-0">
          <Link
            href="/usaha/analisis"
            onClick={onClose}
            className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
          >
            <Leaf className="text-[#74c69d] w-7 h-7 lg:w-8 lg:h-8 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-xs lg:text-sm text-[#74c69d] whitespace-nowrap">
                ANALISIS DESA
              </h2>
              <p className="text-[10px] lg:text-xs text-gray-300 whitespace-nowrap">
                PELAKU USAHA
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
            aria-label="Tutup sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 lg:px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#2d6a4f] text-white"
                    : "text-gray-300 hover:bg-[#2d6a4f]/50 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/usaha"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs lg:text-sm font-medium text-gray-300 hover:bg-[#2d6a4f]/50 hover:text-white transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="truncate">Kembali ke Dashboard Usaha</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg text-xs lg:text-sm font-medium text-gray-300 hover:bg-[#2d6a4f]/50 hover:text-white transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="truncate">Keluar dari Akun</span>
            </button>
          </div>
        </nav>

        {helpUrl && (
        <div className="p-3 mt-auto flex-shrink-0">
          <div className="bg-[#2d6a4f] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5 text-white">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-xs whitespace-nowrap">
                Butuh Bantuan?
              </span>
            </div>
            <p className="text-[10px] text-gray-200 mb-2 leading-tight">
              Hubungi admin desa untuk informasi lebih lanjut.
            </p>
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white text-[#1b4332] py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
            >
              <Phone className="w-3 h-3" />
              Hubungi Kami
            </a>
          </div>
        </div>
        )}
      </aside>
    </>
  );
}
