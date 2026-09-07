"use client";

import { useState } from "react";

export function LoginPanel() {
  const [step, setStep] = useState<"email" | "code">("email");

  let content = <EmailStep onContinue={() => setStep("code")} />;

  if (step === "code") {
    content = <CodeStep onBack={() => setStep("email")} />;
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-xl sm:p-8">
      <header className="flex items-center justify-between">
        <span className="text-sm font-bold">FM</span>

        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
          Owner access
        </span>
      </header>

      {content}

      <p className="mt-8 border-t border-black/10 pt-5 text-center text-xs leading-5 text-stone-500">
        Owner-only access. Authentication will be connected later.
      </p>
    </section>
  );
}

function EmailStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mt-10">
      <p className="text-sm font-medium text-stone-500">Admin</p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Welcome back.
      </h1>

      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>

        <input
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 outline-none focus:border-stone-900 focus:ring-4 focus:ring-black/5"
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />

        <button
          className="mt-4 h-12 w-full rounded-2xl bg-stone-900 text-sm font-semibold text-white hover:bg-black"
          type="submit"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

function CodeStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="mt-10">
      <button
        className="text-sm font-medium text-stone-600 hover:text-stone-900"
        onClick={onBack}
        type="button"
      >
        ← Change email
      </button>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Enter your code.
      </h1>

      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label className="block text-sm font-medium" htmlFor="code">
          Verification code
        </label>

        <input
          autoComplete="one-time-code"
          autoFocus
          className="mt-2 h-14 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-stone-900 focus:ring-4 focus:ring-black/5"
          id="code"
          inputMode="numeric"
          maxLength={6}
          name="code"
          pattern="[0-9]{6}"
          placeholder="000000"
          required
          type="text"
        />

        <button
          className="mt-4 h-12 w-full rounded-2xl bg-stone-900 text-sm font-semibold text-white hover:bg-black"
          type="submit"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
