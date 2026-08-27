"use client";

import localFont from "next/font/local";
import { useFormState, useFormStatus } from "react-dom";
import { submitStoreLeadAction, type SubmitLeadState } from "../app/actions";

// خط "ثمانية" الخاص بصفحة الهبوط فقط (حملة تسويقية منفصلة عن هوية المتجر
// العامة التي تستخدم Cairo) — مصدره ملف رفعه المستخدم لجذر المستودع.
const thmanyahSans = localFont({
  src: [
    { path: "../app/fonts/thmanyah/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
});

const initialState: SubmitLeadState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="أرسل"
      className="absolute bottom-2.5 end-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-opacity hover:bg-foreground/15 disabled:opacity-50 lg:bottom-3 lg:end-3 lg:h-9 lg:w-9"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true">
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
    <main className={`relative min-h-screen overflow-hidden bg-[#006B6B] text-background ${thmanyahSans.className}`}>
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-5 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-black leading-[1.25] lg:text-[36px]">وش تتمنى يكون عندنا؟ 👀</h1>
          <p className="mt-2.5 text-xs leading-relaxed text-background/70 lg:mt-3 lg:text-sm">
            شيء جديد جاي للمنطقة…
            <br />
            لكن قبل ما نكشفه، وش تتمنى تشوف عندنا؟
          </p>

          {state.success ? (
            <p className="mt-6 rounded-xl bg-background/10 p-3.5 text-xs lg:mt-8 lg:p-4 lg:text-sm">
              تم استلام طلبك بنجاح — سنتواصل معك قريبًا. شكرًا لك!
            </p>
          ) : (
            <form action={formAction} className="mt-6 space-y-3 lg:mt-8 lg:space-y-4">
              <div>
                <label htmlFor="phoneNumber" className="mb-1 block text-xs text-background/70 lg:mb-1.5 lg:text-sm">
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
                  className="w-full rounded-full bg-background px-3.5 py-2.5 text-xs text-foreground shadow-lg placeholder:text-foreground/35 focus:outline-none lg:px-4 lg:py-3.5 lg:text-sm"
                />
              </div>
              <div className="relative">
                <label htmlFor="desiredStore" className="mb-1 block text-xs text-background/70 lg:mb-1.5 lg:text-sm">
                  وش تتمنى نفتح؟
                </label>
                <textarea
                  id="desiredStore"
                  name="desiredStore"
                  required
                  rows={3}
                  placeholder="اكتب أمنيتك.."
                  className="w-full rounded-3xl bg-background px-3.5 py-2.5 pe-12 text-xs text-foreground placeholder:text-foreground/35 shadow-lg focus:outline-none lg:px-4 lg:py-3.5 lg:pe-14 lg:text-sm"
                />
                <SubmitButton />
              </div>
              {state.error ? <p className="text-xs text-red-400 lg:text-sm">{state.error}</p> : null}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
