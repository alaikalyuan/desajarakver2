export type UserRole = "mitra" | "usaha" | "bumdes";

export interface UserProfile {
  id: string;
  email: string | undefined;
  fullName: string;
  businessName: string;
  phone: string;
  role: UserRole;
}

export const ROLE_NAMES: Record<UserRole, string> = {
  mitra: "Mitra",
  usaha: "Pelaku Usaha",
  bumdes: "BUMDes/KDMP",
};

export function dashboardUrl(role: UserRole | string): string {
  return role === "mitra" ? "/mitra" : "/usaha";
}

/** Same rule on register, login and reset. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Passwords are trimmed everywhere before they reach Supabase, so a space
 * typed by accident at either end never locks anyone out.
 */
export function cleanPassword(password: string): string {
  return password.trim();
}
