"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitStoreLeadAction, type SubmitLeadState } from "../app/actions";

const initialState: SubmitLeadState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-background py-3.5 text-sm font-bold text-foreground shadow-lg transition-opacity disabled:opacity-60"
    >
      {pending ? "جارٍ الإرسال..." : "أرسل الآن"}
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 19V5M12 5L6 11M12 5l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function LandingHero({ heroKicker, heroTitle }: { heroKicker: string; heroTitle: string }) {
  const [state, formAction] = useFormState(submitStoreLeadAction, initialState);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#006B6B] text-background">
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-5 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <span className="text-[12px] font-bold tracking-[0.15em] text-background/60">{heroKicker}</span>
          <h1 className="mt-2.5 text-[28px] font-black leading-[1.25] lg:text-[36px]">{heroTitle}</h1>

          {state.success ? (
            <p className="mt-8 rounded-xl bg-background/10 p-4 text-sm">
              تم استلام طلبك بنجاح — سنتواصل معك قريبًا. شكرًا لك!
            </p>
          ) : (
            <form action={formAction} className="mt-8 space-y-4">
              <div>
                <label htmlFor="phoneNumber" className="mb-1.5 block text-sm text-background/70">
                  رقم الجوال
                </label>
                <div className="flex items-center overflow-hidden rounded-full bg-background shadow-lg">
                  <span dir="ltr" className="flex items-center border-e border-foreground/10 px-4 text-sm text-foreground/50">
                    +966
                  </span>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    dir="ltr"
                    required
                    placeholder="5xxxxxxxx"
                    pattern="5[0-9]{8}"
                    className="w-full bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-foreground/35 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="desiredStore" className="mb-1.5 block text-sm text-background/70">
                  وش تتمنى نفتح؟
                </label>
                <textarea
                  id="desiredStore"
                  name="desiredStore"
                  required
                  rows={3}
                  className="w-full rounded-3xl bg-background px-4 py-3.5 text-sm text-foreground placeholder:text-foreground/35 shadow-lg focus:outline-none"
                />
              </div>
              {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
              <SubmitButton />
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
