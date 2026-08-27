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
      aria-label="أرسل"
      className="absolute bottom-3 end-3 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-opacity hover:bg-foreground/15 disabled:opacity-50"
    >
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

export function LandingHero() {
  const [state, formAction] = useFormState(submitStoreLeadAction, initialState);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#006B6B] text-background">
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-5 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-[28px] font-black leading-[1.25] lg:text-[36px]">وش تتمنى يكون عندنا؟ 👀</h1>
          <p className="mt-3 text-sm leading-relaxed text-background/70">
            شيء جديد جاي للمنطقة…
            <br />
            لكن قبل ما نكشفه، وش تتمنى تشوف عندنا؟
          </p>

          {state.success ? (
            <p className="mt-8 rounded-xl bg-background/10 p-4 text-sm">
              تم استلام طلبك بنجاح — سنتواصل معك قريبًا. شكرًا لك!
            </p>
          ) : (
            <form action={formAction} className="mt-8 space-y-4">
              <div>
                <label htmlFor="phoneNumber" className="mb-1.5 block text-sm text-background/70">
                  رقمك
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="9665XXXXXXXX"
                  pattern="9665[0-9]{8}"
                  className="w-full rounded-full bg-background px-4 py-3.5 text-sm text-foreground shadow-lg placeholder:text-foreground/35 focus:outline-none"
                />
              </div>
              <div className="relative">
                <label htmlFor="desiredStore" className="mb-1.5 block text-sm text-background/70">
                  وش تتمنى نفتح؟
                </label>
                <textarea
                  id="desiredStore"
                  name="desiredStore"
                  required
                  rows={3}
                  placeholder="اكتب أمنيتك.."
                  className="w-full rounded-3xl bg-background px-4 py-3.5 pe-14 text-sm text-foreground placeholder:text-foreground/35 shadow-lg focus:outline-none"
                />
                <SubmitButton />
              </div>
              {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
