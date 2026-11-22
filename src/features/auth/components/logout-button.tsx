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
      className="min-h-11 rounded-control px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
