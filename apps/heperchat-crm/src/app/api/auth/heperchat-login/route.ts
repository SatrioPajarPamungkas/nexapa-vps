import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan login tidak valid." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ success: false, message: "Email dan password wajib diisi." }, { status: 422 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { success: false, message: error?.message === "Email not confirmed" ? "Email belum diverifikasi." : "Email atau password salah." },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true, destination: "/dashboard" });
}
