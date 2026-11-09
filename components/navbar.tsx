"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dashboardUrl, ROLE_NAMES, type UserProfile } from "@/lib/auth";

interface NavbarProps {
  initialUser?: UserProfile | null;
}

export function Navbar({ initialUser = null }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const supabase = createClient();

    async function syncUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_name, phone, role")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          fullName: profile.full_name,
          businessName: profile.business_name,
          phone: profile.phone,
          role: profile.role,
        });
      }
    }

    syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
      } else {
        syncUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("jarakConnectDemoUser");
    }
    setUser(null);
    setUserDropdownOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const initialLetter = (user?.fullName || "P").trim().charAt(0).toUpperCase();

  return (
    <header className="header">
      <nav className="navbar" aria-label="Navigasi Utama">
        <Link href="/" className="brand">
          <img
            src="/assets/Logo Desa Jarak.png"
            alt="Logo Desa Jarak"
            className="brand-logo"
            width={36}
            height={36}
          />
          <span className="brand-name">
            Desa <span>Jarak</span>
          </span>
        </Link>

        <div className={`nav-menu ${menuOpen ? "open show" : ""}`}>
          <Link
            href="/"
            className={pathname === "/" ? "active" : ""}
            onClick={() => setMenuOpen(false)}
          >
            BERANDA
          </Link>
          <Link
            href="/direktori"
            className={pathname?.startsWith("/direktori") ? "active" : ""}
            onClick={() => setMenuOpen(false)}
          >
            DIREKTORI USAHA
          </Link>

          {!user ? (
            <Link
              href="/masuk"
              id="navLogin"
              className={
                pathname?.startsWith("/masuk") || pathname?.startsWith("/daftar")
                  ? "active"
                  : ""
              }
              onClick={() => setMenuOpen(false)}
            >
              MASUK
            </Link>
          ) : (
            <div
              ref={userMenuRef}
              id="userMenu"
              className={`user-menu ${userDropdownOpen ? "open" : ""}`}
            >
              <button
                type="button"
                className="user-profile-btn"
                id="userProfileBtn"
                aria-expanded={userDropdownOpen}
                onClick={() => setUserDropdownOpen((prev) => !prev)}
              >
                <span className="user-avatar" aria-hidden="true">
                  {initialLetter}
                </span>
                <span className="user-info">
                  <strong id="navUserName">
                    {user.fullName || "Pengguna"}
                  </strong>
                  <small id="navUserRole">
                    {ROLE_NAMES[user.role] || user.role}
                  </small>
                </span>
                <span className="dropdown-arrow" aria-hidden="true">
                  ▼
                </span>
              </button>

              <div className="user-dropdown" id="userDropdown">
                <Link
                  href={dashboardUrl(user.role)}
                  id="profileLink"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setMenuOpen(false);
                  }}
                >
                  Dashboard Saya
                </Link>
                <button
                  type="button"
                  id="logoutButton"
                  onClick={handleLogout}
                >
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="menu-toggle"
          id="menuToggle"
          aria-label="Buka menu navigasi"
          aria-expanded={menuOpen}
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
