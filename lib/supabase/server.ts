import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client";
import type { UserProfile, UserRole } from "@/lib/auth";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where setting cookies is not allowed.
        }
      },
    },
  });
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, business_name, phone, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: profile.full_name || "",
      businessName: profile.business_name || "",
      phone: profile.phone || "",
      role: profile.role as UserRole,
    };
  } catch {
    return null;
  }
}
