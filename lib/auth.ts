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
