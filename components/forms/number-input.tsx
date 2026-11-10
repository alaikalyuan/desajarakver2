"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { formatNumber, parseDecimal, positiveNumberError } from "@/lib/format";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Error from the parent (e.g. after a submit attempt). Wins over the field's own check. */
  error?: string | null;
  /** Render the error text under the field. Turn off when a wrapper already shows it. */
  showMessage?: boolean;
};

/**
 * Number field that works with Indonesian keyboards: accepts "2,5" as 2.5,
 * refuses empty, zero and negative values with "Masukkan angka lebih dari 0".
 * The value stays a string; read it with `parseDecimal()`.
 */
export function NumberInput({
  value,
  onValueChange,
  error,
  showMessage = true,
  className,
  id,
  onBlur,
  ...rest
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [touched, setTouched] = useState(false);

  const ownError = touched ? positiveNumberError(value) : null;
  const shownError = error || ownError;

  return (
    <>
      <input
        {...rest}
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={(e) => {
          setTouched(true);
          // Tidy what was typed: "1.000" -> "1000", "2,50" -> "2,5".
          const n = parseDecimal(value);
          if (n !== null && n > 0) {
            const tidy = formatNumber(n, 6).replace(/\./g, "");
            if (tidy !== value) onValueChange(tidy);
          }
          onBlur?.(e);
        }}
        aria-invalid={shownError ? true : undefined}
        aria-describedby={shownError && showMessage ? errorId : rest["aria-describedby"]}
        className={cn(className, shownError && "border-red-500")}
      />
      {shownError && showMessage && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {shownError}
        </p>
      )}
    </>
  );
}
