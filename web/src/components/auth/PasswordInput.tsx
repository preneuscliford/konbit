"use client";

import { useState } from "react";

export const MIN_PASSWORD = 8;

// Mots de passe trop courants : refusés comme « faibles » même s'ils sont longs
// (même règle que l'app).
const COMMON = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "87654321",
  "password",
  "password1",
  "motdepasse",
  "azertyuiop",
  "qwertyuiop",
  "konbit509",
  "haiti509",
  "ayiti509",
  "00000000",
  "11111111",
]);

type Strength = "short" | "weak" | "medium" | "strong";

export function passwordStrength(password: string): Strength {
  if (password.length < MIN_PASSWORD) return "short";
  if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password))
    return "weak";
  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score >= 3 ? "strong" : score === 2 ? "medium" : "weak";
}

const LEVEL: Record<Strength, { bars: number; color: string; label: string }> =
  {
    short: { bars: 0, color: "bg-red-600", label: "" },
    weak: { bars: 1, color: "bg-red-600", label: "Fèb" },
    medium: { bars: 2, color: "bg-amber-500", label: "Mwayen" },
    strong: { bars: 3, color: "bg-emerald-600", label: "Solid" },
  };

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-surface px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand focus:ring-2 focus:ring-brand/15";

// Champ mot de passe avec bouton œil et, à l'inscription, la force du mot de passe.
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  showStrength = false,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  showStrength?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  const level = LEVEL[strength];

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Kache modpas la" : "Montre modpas la"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-stone-500 hover:text-stone-800"
        >
          {visible ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a17.7 17.7 0 0 1-2.2 3.4M6.6 6.6C3.6 8.6 2 12 2 12s3 8 10 8a10 10 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < level.bars ? level.color : "bg-stone-200"}`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-500">
            {strength === "short"
              ? `Omwen ${MIN_PASSWORD} karaktè (${value.length}/${MIN_PASSWORD})`
              : strength === "strong"
                ? level.label
                : `${level.label} · Pou l pi solid: mete lèt majiskil, chif ak senbòl (!?#…), oswa fè l pi long.`}
          </p>
        </div>
      )}
    </div>
  );
}
