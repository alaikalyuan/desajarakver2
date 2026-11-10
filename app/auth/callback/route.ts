import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dashboardUrl, type UserRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDesc = searchParams.get("error_description") || "";
  const errorCode = searchParams.get("error_code") || "";
  const selectedRole = searchParams.get("role") as UserRole | null;
  const nextParam = searchParams.get("next");

  if (
    /Database error saving new user/i.test(errorDesc) ||
    errorCode === "unexpected_failure"
  ) {
    return NextResponse.redirect(
      new URL("/masuk?error=google_not_registered", origin)
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session?.user) {
      return NextResponse.redirect(
        new URL("/masuk?error=oauth_failed", origin)
      );
    }

    if (nextParam === "/reset-password") {
      return NextResponse.redirect(new URL("/reset-password", origin));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

    if (!profile?.role) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/masuk?error=google_not_registered", origin)
      );
    }

    if (selectedRole && profile.role !== selectedRole) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/masuk", origin);
      loginUrl.searchParams.set("error", "role_mismatch");
      loginUrl.searchParams.set("actualRole", profile.role);
      loginUrl.searchParams.set("selectedRole", selectedRole);
      return NextResponse.redirect(loginUrl);
    }

    const targetUrl = safeSameOriginUrl(nextParam, origin);
    if (targetUrl) {
      searchParams.forEach((value, key) => {
        if (
          key !== "code" &&
          key !== "next" &&
          key !== "role" &&
          key !== "state" &&
          !targetUrl.searchParams.has(key)
        ) {
          targetUrl.searchParams.set(key, value);
        }
      });
      return NextResponse.redirect(targetUrl);
    }

    return NextResponse.redirect(
      new URL(dashboardUrl(profile.role as UserRole), origin)
    );
  }

  return NextResponse.redirect(new URL("/masuk", origin));
}

// Browsers treat "\" like "/", so "/\evil.test" resolves off-site.
// Only accept a path that still resolves to our own origin.
function safeSameOriginUrl(next: string | null, origin: string): URL | null {
  if (!next || !next.startsWith("/") || next.includes("\\")) return null;
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url : null;
  } catch {
    return null;
  }
}
