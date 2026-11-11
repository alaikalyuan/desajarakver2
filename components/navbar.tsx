"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { dashboardUrl, ROLE_NAMES, type UserProfile } from "@/lib/auth";

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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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
    function handleOutsideClick(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
    setLoggedOut(true);
    setUserDropdownOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const closeMenu = () => setMenuOpen(false);
  const initialLetter = (user?.fullName || "P").trim().charAt(0).toUpperCase();

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
          <Link href="/" className={pathname === "/" ? "active" : ""} onClick={closeMenu}>
            BERANDA
          </Link>
          <Link
            href="/direktori"
            className={pathname?.startsWith("/direktori") ? "active" : ""}
            onClick={closeMenu}
          >
            DIREKTORI USAHA
          </Link>
          <Link
            href="/cara-kerja"
            className={pathname?.startsWith("/cara-kerja") ? "active" : ""}
            onClick={closeMenu}
          >
            CARA KERJA
          </Link>

          {!user ? (
            <>
              <Link
                href="/masuk"
                className={pathname?.startsWith("/masuk") ? "active" : ""}
                onClick={closeMenu}
              >
                MASUK
              </Link>
              <Link href="/daftar" className="nav-cta" onClick={closeMenu}>
                DAFTAR
              </Link>
            </>
          ) : (
            <div ref={userMenuRef} className={`user-menu ${userDropdownOpen ? "open" : ""}`}>
              <button
                type="button"
                className="user-profile-btn"
                aria-expanded={userDropdownOpen}
                aria-controls="user-dropdown"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
              >
                <span className="user-avatar" aria-hidden="true">
                  {initialLetter}
                </span>
                <span className="user-info">
                  <strong>{user.fullName || "Pengguna"}</strong>
                  <small>{ROLE_NAMES[user.role] || user.role}</small>
                </span>
                <span className="dropdown-arrow" aria-hidden="true">
                  ▼
                </span>
              </button>

              <div className="user-dropdown" id="user-dropdown">
                <Link
                  href={dashboardUrl(user.role)}
                  onClick={() => {
                    setUserDropdownOpen(false);
                    closeMenu();
                  }}
                >
                  Halaman Saya
                </Link>
                <button type="button" onClick={handleLogout}>
                  Keluar
                </button>
              </div>
            </div>
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
