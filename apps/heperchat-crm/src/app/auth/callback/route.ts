import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLocalPath } from "@/lib/safe-local-path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeLocalPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_confirmation_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=email_confirmation_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
