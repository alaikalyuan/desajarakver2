"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dashboardUrl, ROLE_NAMES, type UserRole } from "@/lib/auth";

interface UserMenuProps {
  name: string;
  role: UserRole;
  onLogout: () => void;
  onNavigate?: () => void;
}

/** Profile button with its dropdown, shared by the navbar and the dashboards. */
export function UserMenu({ name, role, onLogout, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const displayName = name.trim() || "Pengguna";
  const roleName = ROLE_NAMES[role] || role;

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menuRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      setOpen(false);
    }
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={`user-menu ${open ? "open" : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        className="user-profile-btn"
        aria-label={`Menu akun ${displayName}, ${roleName}`}
        aria-expanded={open}
        aria-controls="user-dropdown"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="user-avatar" aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="user-info">
          <strong>{displayName}</strong>
          <small>{roleName}</small>
        </span>
        <span className="dropdown-arrow" aria-hidden="true">
          ▼
        </span>
      </button>

      <div className="user-dropdown" id="user-dropdown">
        <Link
          href={dashboardUrl(role)}
          onClick={() => {
            setOpen(false);
            onNavigate?.();
          }}
        >
          Halaman Saya
        </Link>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onLogout();
          }}
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
