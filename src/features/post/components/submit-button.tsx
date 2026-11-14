"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
  tone?: "primary" | "danger";
}

const TONES = {
  primary: "bg-stone-900 text-white hover:bg-black",
  danger: "bg-red-700 text-white hover:bg-red-800",
} as const;

/** Must render inside the form it submits: useFormStatus reads that form. */
export function SubmitButton({
  label,
  pendingLabel,
  tone = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`min-h-11 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${TONES[tone]}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
