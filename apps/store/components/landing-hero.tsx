"use client";

import localFont from "next/font/local";
import { useState } from "react";
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

function FlyingArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 19V5M12 5L6 11M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 11.37a4 4 0 1 1-3.37-3.37 4 4 0 0 1 3.37 3.37z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17.5 6.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TiktokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82c-.9-.87-1.4-2.07-1.4-3.32h-3.13v13.6a2.7 2.7 0 1 1-1.9-2.58V9.44a5.83 5.83 0 1 0 5.03 5.78V9.7a7.16 7.16 0 0 0 4.4 1.5V8.09a4.28 4.28 0 0 1-3-2.27z" />
    </svg>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: "وش تتمنى يكون عندنا؟",
      text: "شارك رأيك بالشي اللي تتمنى نشوفه بمنطقتك!",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // المستخدم ألغى نافذة المشاركة — لا حاجة لأي إجراء بديل
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // تعذّر الوصول للحافظة — لا يوجد بديل آخر متاح بهذه الحالة
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-xs font-bold text-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-95 lg:mt-5 lg:py-3.5 lg:text-sm"
    >
      {copied ? "تم نسخ الرابط!" : "شارك مع صديق"}
      <FlyingArrowIcon className="h-3.5 w-3.5 animate-bounce lg:h-4 lg:w-4" />
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="أرسل"
      className="absolute bottom-2.5 end-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-opacity hover:bg-foreground/15 disabled:opacity-50 lg:bottom-3 lg:end-3 lg:h-9 lg:w-9"
    >
      <FlyingArrowIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
    </button>
  );
}

export function LandingHero() {
  const [state, formAction] = useFormState(submitStoreLeadAction, initialState);

  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-hidden bg-[#006B6B] text-background ${thmanyahSans.className}`}
    >
      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-black leading-[1.25] lg:text-[36px]">وش تتمنى يكون عندنا؟ 👀</h1>
          <p className="mt-2.5 text-xs leading-relaxed text-background/70 lg:mt-3 lg:text-sm">
            شيء جديد جاي للمنطقة…
            <br />
            لكن قبل ما نكشفه، وش تتمنى تشوف عندنا؟
          </p>

          {state.success ? (
            <div className="mt-6 text-center lg:mt-8">
              <span
                role="img"
                aria-label="سهم يطير"
                className="mx-auto block w-fit animate-bounce text-6xl leading-none lg:text-7xl"
              >
                🚀
              </span>
              <p className="mt-3 text-base font-black lg:text-lg">وصلت أمنيتك 👀</p>
              <p className="mt-1.5 text-xs text-background/70 lg:text-sm">نشوف… يمكن تكون هي اللي بنحققها</p>
              <ShareButton />
            </div>
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

          <div className="mt-6 text-center lg:mt-8">
            <p className="text-xs font-bold text-background/40 lg:text-sm">تابعنا</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <a
                href="https://www.instagram.com/sbaah.sa?igsi=Zzd2ZHh0ZWxoZmIx&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="إنستغرام"
                className="text-background/40 transition-colors hover:text-background/70"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.tiktok.com/@sbaah.sa?_r=1&_t=ZS-99EXjH1nFZt"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تيك توك"
                className="text-background/40 transition-colors hover:text-background/70"
              >
                <TiktokIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
