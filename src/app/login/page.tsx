import type { Metadata } from "next";

import { LoginPanel } from "@/features/auth";

export const metadata: Metadata = {
  title: "Owner sign in",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-100 px-5 py-10">
      <LoginPanel />
    </main>
  );
}
