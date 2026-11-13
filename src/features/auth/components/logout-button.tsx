"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "../auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);

    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className="min-h-11 rounded-xl px-3 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60"
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
