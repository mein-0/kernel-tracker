import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";
import { serialize } from "cookie";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!username || !password || password.length < 4) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [username],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Username taken" }, { status: 409 });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = await db.execute({
    sql: "INSERT INTO users (username, password) VALUES (?, ?)",
    args: [username, hash],
  });

  const token = signToken({
    id: Number(result.lastInsertRowid),
    username,
    role: "researcher",
  });

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
