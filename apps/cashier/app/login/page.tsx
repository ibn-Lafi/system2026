"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card } from "@system2026/ui";
import { verifyPinAction, type LoginActionState } from "./actions";

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "مسح", "0", "⌫"];
const MAX_PIN_LENGTH = 6;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ التحقق..." : "دخول"}
    </Button>
  );
}

export default function CashierLoginPage() {
  const [state, formAction] = useFormState<LoginActionState, FormData>(verifyPinAction, {});
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (state.error) setPin("");
  }, [state]);

  function handleKeyPress(key: string) {
    if (key === "مسح") return setPin("");
    if (key === "⌫") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length >= MAX_PIN_LENGTH ? p : p + key));
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xs text-center">
        <h1 className="mb-1 text-xl font-bold">كاشير سبعة</h1>
        <p className="mb-6 text-sm text-foreground/60">أدخل رمز PIN الخاص بالجهاز</p>

        <form action={formAction}>
          <input name="pin" type="password" hidden readOnly value={pin} />
          <div className="flex justify-center gap-2">
            {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full ${i < pin.length ? "bg-foreground" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {PAD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="flex h-14 items-center justify-center rounded-xl border border-border text-lg font-semibold transition-colors hover:bg-muted active:scale-95"
              >
                {key}
              </button>
            ))}
          </div>
          {state.error ? <p className="mt-4 text-sm text-destructive">{state.error}</p> : null}
          <div className="mt-4">
            <SubmitButton />
          </div>
        </form>
      </Card>
    </main>
  );
}
