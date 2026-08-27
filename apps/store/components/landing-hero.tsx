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
      className="w-full rounded-xl bg-background py-3.5 text-sm font-bold text-foreground transition-opacity disabled:opacity-60"
    >
      {pending ? "جارٍ الإرسال..." : "أرسل الآن"}
    </button>
  );
}

export function LandingHero({ heroKicker, heroTitle }: { heroKicker: string; heroTitle: string }) {
  const [state, formAction] = useFormState(submitStoreLeadAction, initialState);

  return (
    <main className="relative min-h-screen overflow-hidden bg-foreground text-background">
      {/* فيديو خلفية متكرر (loop) بأعلى الصفحة — object-cover يضمن تغطية الشاشة
          كاملة بلا تشوّه سواء على الجوال (عمودي) أو الكمبيوتر (أفقي). */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/landing-hero-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/85 via-foreground/50 to-foreground/85" />

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
                <div className="flex overflow-hidden rounded-xl border border-background/20">
                  <span dir="ltr" className="flex items-center bg-background/10 px-3 text-sm text-background/70">
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
                    className="w-full bg-transparent px-3 py-3 text-sm text-background placeholder:text-background/40 focus:outline-none"
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
                  className="w-full rounded-xl border border-background/20 bg-transparent px-3 py-3 text-sm text-background placeholder:text-background/40 focus:outline-none"
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
