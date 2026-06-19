import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";
import { serialize } from "cookie";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; password: string; role: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role });

  const cookie = serialize("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true }, {
    headers: { "Set-Cookie": cookie },
  });
}
