"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import type { UserProfile } from "@/lib/auth";

interface NavbarProps {
  /**
   * The signed-in user as the server saw it (null when logged out). Pages that
   * pass it never load the Supabase client for the navbar, which keeps the
   * home page light. Leave it out to look the user up in the browser.
   */
  initialUser?: UserProfile | null;
}

async function loadSupabase() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

export function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const knowsUser = initialUser !== undefined;
  const user = loggedOut ? null : knowsUser ? (initialUser ?? null) : fetchedUser;

  // Only pages that did not pass the user (client-rendered pages such as
  // /masuk) look it up here.
  useEffect(() => {
    if (knowsUser) return;
    let active = true;
    loadSupabase().then(async (supabase) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active || !session?.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_name, phone, role")
        .eq("id", session.user.id)
        .single();
      if (active && profile) {
        setFetchedUser({
          id: session.user.id,
          email: session.user.email,
          fullName: profile.full_name,
          businessName: profile.business_name,
          phone: profile.phone,
          role: profile.role,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [knowsUser]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleLogout() {
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
    setLoggedOut(true);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const closeMenu = () => setMenuOpen(false);
  const linkProps = (active: boolean) => ({
    className: active ? "active" : "",
    "aria-current": active ? ("page" as const) : undefined,
    onClick: closeMenu,
  });

  return (
    <header className="header">
      <nav className="navbar" aria-label="Navigasi utama">
        <Link href="/" className="brand">
          <img
            src="/assets/logo-desa-jarak-96.png"
            alt="Logo Desa Jarak"
            className="brand-logo"
            width={36}
            height={36}
          />
          <span className="brand-name">
            Desa <span>Jarak</span>
          </span>
        </Link>

        <div id="nav-menu" className={`nav-menu ${menuOpen ? "open show" : ""}`}>
          <Link href="/" {...linkProps(pathname === "/")}>
            BERANDA
          </Link>
          <Link href="/direktori" {...linkProps(Boolean(pathname?.startsWith("/direktori")))}>
            DIREKTORI USAHA
          </Link>
          <Link href="/cara-kerja" {...linkProps(Boolean(pathname?.startsWith("/cara-kerja")))}>
            CARA KERJA
          </Link>

          {!user ? (
            <>
              <Link href="/masuk" {...linkProps(Boolean(pathname?.startsWith("/masuk")))}>
                MASUK
              </Link>
              <Link href="/daftar" className="nav-cta" onClick={closeMenu}>
                DAFTAR
              </Link>
            </>
          ) : (
            <UserMenu
              name={user.fullName}
              role={user.role}
              onLogout={handleLogout}
              onNavigate={closeMenu}
            />
          )}
        </div>

        <button
          type="button"
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    </header>
  );
}
