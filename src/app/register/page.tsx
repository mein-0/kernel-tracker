"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm border border-zinc-800 p-8">
        <h1 className="text-xl font-bold mb-1 text-red-500">REGISTER</h1>
        <p className="text-zinc-500 text-sm mb-6">Join the research team</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 text-sm transition-colors"
          >
            CREATE ACCOUNT
          </button>
        </form>

        <p className="text-zinc-500 text-xs mt-4 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-red-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
