import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    password_confirmation?: unknown;
    terms_accepted?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan registrasi tidak valid." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmation = typeof body.password_confirmation === "string" ? body.password_confirmation : "";

  if (!name || !email || !password || !confirmation) {
    return NextResponse.json({ success: false, message: "Semua kolom wajib diisi." }, { status: 422 });
  }
  if (password !== confirmation) {
    return NextResponse.json({ success: false, message: "Konfirmasi password tidak sama." }, { status: 422 });
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, message: "Password minimal 8 karakter." }, { status: 422 });
  }
  if (body.terms_accepted !== true) {
    return NextResponse.json({ success: false, message: "Ketentuan layanan dan kebijakan privasi wajib disetujui." }, { status: 422 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://crm.hepermadi.com").replace(/\/+$/, "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, display_name: name },
      emailRedirectTo: siteUrl + "/auth/callback",
    },
  });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
  if (!data.user) {
    return NextResponse.json({ success: false, message: "Akun tidak dapat dibuat." }, { status: 400 });
  }

  return NextResponse.json(
    { success: true, message: "Registrasi berhasil. Periksa email untuk melakukan verifikasi." },
    { status: 201 },
  );
}
