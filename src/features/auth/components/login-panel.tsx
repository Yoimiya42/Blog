"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "../auth-client";

export function LoginPanel() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function sendCode() {
    setError(undefined);
    setPending(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (result.error) {
        setError("Could not send the code. Try again.");
        return;
      }

      setStep("code");
    } catch {
      setError("Could not send the code. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(code: string) {
    setError(undefined);
    setPending(true);

    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp: code,
      });

      if (result.error) {
        setError("The code is invalid or expired.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("The code is invalid or expired.");
    } finally {
      setPending(false);
    }
  }

  let content = (
    <EmailStep
      email={email}
      error={error}
      onContinue={sendCode}
      onEmailChange={setEmail}
      pending={pending}
    />
  );

  if (step === "code") {
    content = (
      <CodeStep
        error={error}
        onBack={() => {
          setError(undefined);
          setStep("email");
        }}
        onVerify={verifyCode}
        pending={pending}
      />
    );
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
    </section>
  );
}

interface EmailStepProps {
  email: string;
  error?: string;
  onContinue: () => Promise<void>;
  onEmailChange: (email: string) => void;
  pending: boolean;
}

function EmailStep({
  email,
  error,
  onContinue,
  onEmailChange,
  pending,
}: EmailStepProps) {
  return (
    <div className="mt-10">
      <p className="text-sm font-medium text-stone-500">Admin</p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Welcome back.
      </h1>

      <form
        className="mt-8"
        onSubmit={async (event) => {
          event.preventDefault();
          await onContinue();
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
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="mt-4 h-12 w-full rounded-2xl bg-stone-900 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Sending…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

interface CodeStepProps {
  error?: string;
  onBack: () => void;
  onVerify: (code: string) => Promise<void>;
  pending: boolean;
}

function CodeStep({ error, onBack, onVerify, pending }: CodeStepProps) {
  const [code, setCode] = useState("");

  return (
    <div className="mt-10">
      <button
        className="text-sm font-medium text-stone-600 hover:text-stone-900"
        disabled={pending}
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
        onSubmit={async (event) => {
          event.preventDefault();
          await onVerify(code);
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
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 6);

            setCode(digits);
          }}
          pattern="[0-9]{6}"
          placeholder="000000"
          required
          type="text"
          value={code}
        />

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="mt-4 h-12 w-full rounded-2xl bg-stone-900 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
