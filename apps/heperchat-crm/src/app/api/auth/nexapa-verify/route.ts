import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: {
    verify_url?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Permintaan verifikasi tidak valid.",
      },
      { status: 400 },
    );
  }

  if (typeof body.verify_url !== "string") {
    return NextResponse.json(
      {
        success: false,
        message: "Tautan verifikasi tidak tersedia.",
      },
      { status: 422 },
    );
  }

  let verifyUrl: URL;

  try {
    verifyUrl = new URL(body.verify_url);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Tautan verifikasi tidak valid.",
      },
      { status: 422 },
    );
  }

  const allowed =
    verifyUrl.protocol === "https:" &&
    verifyUrl.hostname === "api.nexapa.app" &&
    verifyUrl.port === "" &&
    verifyUrl.pathname.startsWith(
      "/api/v1/auth/email/verify/",
    );

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        message: "Tujuan verifikasi tidak diizinkan.",
      },
      { status: 403 },
    );
  }

  let response: Response;

  try {
    response = await fetch(
      verifyUrl.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Layanan verifikasi Nexapa tidak dapat dihubungi.",
      },
      { status: 503 },
    );
  }

  let result: {
    success?: boolean;
    message?: string;
  } = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  return NextResponse.json(
    {
      success: result.success === true,
      message:
        result.message ??
        "Respons verifikasi tidak valid.",
    },
    {
      status:
        response.status >= 400
          ? response.status
          : 200,
    },
  );
}
