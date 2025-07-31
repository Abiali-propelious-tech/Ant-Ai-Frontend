"use client";
import { useState } from "react";
import { useJwt } from "../context/JwtContext";
import Link from "next/link";

export default function Sidebar() {
  const { jwt, setJwt } = useJwt();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await fetch(
        "https://transcriptionclient2api.datagainservices.com/api/Account/Login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "*/*",
          },
          body: JSON.stringify({
            email: "ant_client@datagainservices.com",
            password: "Welcome@123",
          }),
        }
      );
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      setJwt(data?.value?.token || null);
      alert("Login successful!");
    } catch (e) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="w-64 bg-gray-100 p-4 flex flex-col gap-4">
      <nav className="flex flex-col gap-2 mb-4">
        <Link href="/settings" className="text-blue-700 hover:underline">
          Admin Settings
        </Link>
        <Link href="/chat" className="text-blue-700 hover:underline">
          Chat
        </Link>
        <Link href="/projects" className="text-blue-700 hover:underline">
          Projects
        </Link>
      </nav>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Logging in..." : jwt ? "Logged In" : "Login"}
      </button>
      <button
        onClick={async () => {
          if (jwt) {
            await navigator.clipboard.writeText(jwt);
            alert("JWT token copied to clipboard!");
          }
        }}
        className={`${
          jwt ? "bg-blue-600" : "bg-gray-700"
        } text-white px-4 py-2 rounded`}
        disabled={!jwt}
      >
        Copy JWT Token
      </button>
      {jwt && (
        <div className="break-all text-xs text-green-700">
          <strong>JWT:</strong> {jwt.slice(0, 50)}...
        </div>
      )}
    </aside>
  );
}
