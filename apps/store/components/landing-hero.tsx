"use client";

import { useState, type FormEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitStoreLeadAction, type SubmitLeadState } from "../app/actions";
import { thmanyahSans } from "../lib/thmanyah-font";
import { BrandLogosSlider } from "./brand-logos-slider";

// يبدأ الحقل بنفس ارتفاع سطر واحد (كحقل "رقمك")، ويتمدد تلقائيًا مع كل
// سطر جديد بدل أن يكون بارتفاع ثابت لعدة أسطر منذ البداية.
function autoGrowTextarea(event: FormEvent<HTMLTextAreaElement>) {
  const textarea = event.currentTarget;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-opacity hover:bg-foreground/15 disabled:opacity-50 lg:h-9 lg:w-9"
    >
      <FlyingArrowIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
    </button>
  );
}

export function LandingHero() {
  const [state, formAction] = useFormState(submitStoreLeadAction, initialState);

  return (
    <main
      style={{ fontFeatureSettings: "normal" }}
      className={`relative flex min-h-dvh flex-col overflow-hidden bg-[#006B6B] text-background ${thmanyahSans.className}`}
    >
      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-4 lg:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-md">
          <div className="-mt-10 mb-10 flex justify-center lg:-mt-6 lg:mb-14">
            <div
              dir="ltr"
              style={{
                ...thmanyahSans.style,
                textShadow:
                  "1px 1px 0 #00595a, 2px 2px 0 #00595a, 3px 3px 0 #003f40, 4px 4px 0 #003f40, 5px 5px 0 #002627, 6px 7px 12px rgba(0,0,0,0.55)",
              }}
              className="inline-block cursor-pointer whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
            >
              <span className="text-3xl font-black lg:text-5xl">SBAAH </span>
              <span className="text-4xl font-black lg:text-6xl">7</span>
              <span className="text-3xl font-black lg:text-5xl"> سـبـعـة</span>
            </div>
          </div>
          <h1 className="text-center text-2xl font-black leading-[1.25] lg:text-[36px]">وش تتمنى يكون عندنا؟ 👀</h1>
          <p className="mt-2.5 text-center text-xs leading-relaxed text-background/70 lg:mt-3 lg:text-sm">
            شيء جديد جاي للجموم…
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

              <div className="mt-5 lg:mt-6">
                <p className="text-xs font-bold text-background/70 lg:text-sm">تابعنا عشان تكون أول من يعرف 👀</p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <a
                    href="https://www.instagram.com/sbaah.sa?igsi=Zzd2ZHh0ZWxoZmIx&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:px-5 lg:py-3 lg:text-sm"
                  >
                    <InstagramIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                    انستغرام
                  </a>
                  <a
                    href="https://www.tiktok.com/@sbaah.sa?_r=1&_t=ZS-99EXjH1nFZt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:px-5 lg:py-3 lg:text-sm"
                  >
                    <TiktokIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                    تيك توك
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form action={formAction} className="mt-4 space-y-3 lg:mt-5 lg:space-y-4">
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
                  placeholder="05XXXXXXXX"
                  pattern="05[0-9]{8}"
                  className="w-full rounded-full bg-background px-3.5 py-2.5 text-right text-xs text-foreground shadow-lg placeholder:text-foreground/35 focus:outline-none lg:px-4 lg:py-3.5 lg:text-sm"
                />
              </div>
              <div>
                <label htmlFor="desiredStore" className="mb-1 block text-xs text-background/70 lg:mb-1.5 lg:text-sm">
                  وش تتمنى نفتح؟
                </label>
                <div className="flex items-end gap-2 rounded-3xl bg-background px-3.5 py-2.5 shadow-lg lg:px-4 lg:py-3.5">
                  <textarea
                    id="desiredStore"
                    name="desiredStore"
                    required
                    rows={1}
                    onInput={autoGrowTextarea}
                    placeholder="اكتب أمنيتك.."
                    className="w-full flex-1 resize-none overflow-hidden bg-transparent text-xs text-foreground placeholder:text-foreground/35 focus:outline-none lg:text-sm"
                  />
                  <SubmitButton />
                </div>
              </div>
              {state.error ? <p className="text-xs text-red-400 lg:text-sm">{state.error}</p> : null}
            </form>
          )}

          {state.success ? null : <BrandLogosSlider className="mt-8 lg:mt-10" />}
        </div>
      </div>

      {state.success ? null : (
        <div className="relative z-10 pb-6 text-center lg:pb-8">
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
      )}
    </main>
  );
}
