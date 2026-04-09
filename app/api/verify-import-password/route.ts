import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim();

    if (!password) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const correctPassword = process.env.IMPORT_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json({ valid: false }, { status: 503 });
    }

    return NextResponse.json({ valid: password === correctPassword });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
