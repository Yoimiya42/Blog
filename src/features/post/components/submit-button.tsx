"use client";

import { useFormStatus } from "react-dom";

import { buttonVariants } from "@/components/ui/button";

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
  tone?: "primary" | "secondary" | "danger";
  /**
   * Submitted as the `intent` field. Lets one form carry several submit
   * buttons; the action reads which one was pressed.
   */
  intent?: string;
  /** Id of the form, for a button rendered outside it, as in a dialog. */
  form?: string;
}

const TONES = {
  primary: "default",
  secondary: "outline",
  danger: "destructive",
} as const;

/**
 * Must render inside the form's React tree: useFormStatus reads that form. A
 * portal, such as a dialog, keeps the tree; `form` then ties the DOM button.
 */
export function SubmitButton({
  label,
  pendingLabel,
  tone = "primary",
  intent,
  form,
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  // Every button is disabled during a submission, but only the pressed one
  // shows its pending label.
  const pressed = pending && (data?.get("intent") ?? null) === (intent ?? null);

  return (
    <button
      className={buttonVariants({ variant: TONES[tone] })}
      disabled={pending}
      form={form}
      name={intent === undefined ? undefined : "intent"}
      type="submit"
      value={intent}
    >
      {pressed ? pendingLabel : label}
    </button>
  );
}
