"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
  tone?: "primary" | "secondary" | "danger";
  /**
   * Submitted as the `intent` field. Lets one form carry several submit
   * buttons; the action reads which one was pressed.
   */
  intent?: string;
}

const TONES = {
  primary: "bg-stone-900 text-white hover:bg-black",
  secondary: "border border-stone-300 bg-white hover:bg-stone-100",
  danger: "bg-red-700 text-white hover:bg-red-800",
} as const;

/** Must render inside the form it submits: useFormStatus reads that form. */
export function SubmitButton({
  label,
  pendingLabel,
  tone = "primary",
  intent,
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  // Every button is disabled during a submission, but only the pressed one
  // shows its pending label.
  const pressed = pending && (data?.get("intent") ?? null) === (intent ?? null);

  return (
    <button
      className={`min-h-11 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${TONES[tone]}`}
      disabled={pending}
      name={intent === undefined ? undefined : "intent"}
      type="submit"
      value={intent}
    >
      {pressed ? pendingLabel : label}
    </button>
  );
}
