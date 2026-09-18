import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LaravelLoginResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  token_hash?: string;
  crm_user_id?: string;
};

export async function POST(request: Request) {
  let body: {
    email?: unknown;
    password?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Permintaan login tidak valid.",
      },
      { status: 400 },
    );
  }

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (!email || !password) {
    return NextResponse.json(
      {
        success: false,
        message: "Email dan password wajib diisi.",
      },
      { status: 422 },
    );
  }

  const apiUrl =
    process.env.NEXAPA_API_INTERNAL_URL?.replace(
      /\/+$/,
      "",
    );

  const authKey =
    process.env.NEXAPA_CRM_AUTH_KEY;

  if (!apiUrl || !authKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Konfigurasi login CRM belum lengkap.",
      },
      { status: 503 },
    );
  }

  let laravelResponse: Response;

  try {
    laravelResponse = await fetch(
      `${apiUrl}/api/internal/crm-login`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Nexapa-Crm-Auth-Key": authKey,
        },
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Layanan autentikasi Nexapa tidak dapat dihubungi.",
      },
      { status: 503 },
    );
  }

  let loginResult: LaravelLoginResponse = {};

  try {
    loginResult =
      (await laravelResponse.json()) as LaravelLoginResponse;
  } catch {
    loginResult = {};
  }

  if (
    !laravelResponse.ok ||
    !loginResult.token_hash ||
    !loginResult.crm_user_id
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          loginResult.message ??
          "Login Nexapa gagal.",
        code: loginResult.code,
      },
      {
        status:
          laravelResponse.status >= 400
            ? laravelResponse.status
            : 502,
      },
    );
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.auth.verifyOtp({
    token_hash: loginResult.token_hash,
    type: "email",
  });

  if (error || !data.user) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sesi CRM tidak dapat dibuat. Silakan coba lagi.",
      },
      { status: 401 },
    );
  }

  if (data.user.id !== loginResult.crm_user_id) {
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        success: false,
        message:
          "Akun CRM tidak sesuai dengan akun Nexapa.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    destination: "/dashboard",
  });
}
