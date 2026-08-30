import { NextResponse } from "next/server";

type RegisterResponse = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function POST(request: Request) {
  let body: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    password_confirmation?: unknown;
    terms_accepted?: unknown;
    remember?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Permintaan registrasi tidak valid.",
      },
      { status: 400 },
    );
  }

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  const passwordConfirmation =
    typeof body.password_confirmation === "string"
      ? body.password_confirmation
      : "";

  if (
    !name ||
    !email ||
    !password ||
    !passwordConfirmation
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Semua kolom wajib diisi.",
      },
      { status: 422 },
    );
  }

  const apiUrl =
    process.env.NEXAPA_API_INTERNAL_URL?.replace(
      /\/+$/,
      "",
    );

  if (!apiUrl) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Konfigurasi registrasi Nexapa belum tersedia.",
      },
      { status: 503 },
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiUrl}/api/v1/auth/register`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation:
            passwordConfirmation,
          terms_accepted:
            body.terms_accepted === true,
          remember: body.remember === true,
          verification_destination: "crm",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Layanan registrasi Nexapa tidak dapat dihubungi.",
      },
      { status: 503 },
    );
  }

  let result: RegisterResponse = {};

  try {
    result =
      (await response.json()) as RegisterResponse;
  } catch {
    result = {};
  }

  if (!response.ok || !result.success) {
    const validationMessage =
      result.errors &&
      Object.values(result.errors)
        .flat()
        .find(
          (message) =>
            typeof message === "string",
        );

    return NextResponse.json(
      {
        success: false,
        message:
          validationMessage ??
          result.message ??
          "Registrasi akun gagal.",
      },
      {
        status:
          response.status >= 400
            ? response.status
            : 502,
      },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message:
        "Registration successful. Please verify your email.",
    },
    { status: 201 },
  );
}
