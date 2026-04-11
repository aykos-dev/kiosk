import { useI18n } from "../hooks/useI18n.js";
import { usePaymentQrDataUrl } from "../hooks/usePaymentQrDataUrl.js";
import { IconArrowLeft } from "./icons.jsx";

import rahmatIcon from "../../assets/images/qr-screen/rahmat-icon.png";
import phoneHero from "../../assets/images/qr-screen/Phone.png";
import paymeImg from "../../assets/images/payment-types/payme.png";
import clickImg from "../../assets/images/payment-types/click.png";
import uzumImg from "../../assets/images/payment-types/uzum-bank.png";
import humoImg from "../../assets/images/payment-types/Humo.png";
import bellissimoLogoImg from "../../assets/images/bellissimo-logo-updated.png";

function BellissimoWordmark({ className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0 ${className}`}
    >
      <img
        src={bellissimoLogoImg}
        alt=""
        className="h-16 w-[296px] object-cover"
      />
    </div>
  );
}

const DEFAULT_QR_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_PAYMENT_QR_URL
    ? String(import.meta.env.VITE_PAYMENT_QR_URL)
    : "https://bellissimo.uz/kiosk/payment";

/**
 * QR payment instructions (Figma 4287:26417).
 * @param {object} props
 * @param {() => void} props.onBack
 * @param {string} [props.qrUrl] - URL or string encoded into the QR (defaults to VITE_PAYMENT_QR_URL or a Bellissimo placeholder).
 */
export function PaymentQrScreen({ onBack, qrUrl = DEFAULT_QR_URL }) {
  const { t } = useI18n();
  const { dataUrl, size } = usePaymentQrDataUrl(qrUrl);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#00501f]">
      {/* Top glow (Figma ellipse) */}
      <div
        className="pointer-events-none absolute -right-32 -top-48 h-[520px] w-[520px] rounded-full bg-white/[0.12] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-32 h-[380px] w-[380px] rounded-full bg-white/[0.06]"
        aria-hidden
      />

      <header className="relative z-10 grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-2 px-6 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 w-[72px] shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] transition hover:bg-neutral-200"
          aria-label={t("paymentQr.backAria")}
        >
          <IconArrowLeft className="h-8 w-8 text-ink" />
        </button>
        <div className="flex min-w-0 justify-center">
          <BellissimoWordmark />
        </div>
        <div className="w-[72px]" aria-hidden />
      </header>

      <div className="relative z-10 mx-auto mt-8 flex w-full max-w-[532px] flex-col items-center gap-8 px-6">
        <div className="rounded-3xl bg-white p-8 shadow-[0px_3px_10px_rgba(0,0,0,0.15)]">
          <div
            className="relative inline-flex"
            style={{ width: size, height: size }}
          >
            {dataUrl ? (
              <img
                src={dataUrl}
                alt=""
                width={size}
                height={size}
                className="block max-w-none"
                style={{ width: size, height: size }}
              />
            ) : (
              <div
                className="flex items-center justify-center bg-neutral-100 text-[14px] text-neutral-500"
                style={{ width: size, height: size }}
              >
                …
              </div>
            )}
            {/* Center logo: high EC level (H) keeps QR scannable with a covered area */}
            <div className="absolute left-1/2 top-1/2 flex h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-md ring-2 ring-white">
              <img
                src={rahmatIcon}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            </div>
          </div>
        </div>

        <p className="text-center font-inter text-[24px] leading-8 text-white">
          <span className="font-bold">{t("paymentQr.scanTitle")}</span>
          <span className="font-medium">{t("paymentQr.scanRest")}</span>
        </p>
      </div>

      <div className="relative z-10 mx-auto mt-4 flex w-full max-w-[640px] flex-1 flex-col items-center justify-end px-4 pb-6">
        <div className="relative w-[min(92vw,420px)] -rotate-6 select-none">
          <img
            src={phoneHero}
            alt=""
            className="h-auto w-full object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex flex-wrap justify-end gap-2.5 px-6 pb-8 pt-4">
        {[
          { src: paymeImg, w: "w-[98px]", label: "Payme" },
          { src: clickImg, w: "w-[98px]", label: "Click" },
          { src: uzumImg, w: "w-[98px]", label: "Uzum" },
          { src: humoImg, w: "w-[52px]", label: "Humo" },
        ].map(({ src, w, label }) => (
          <div
            key={label}
            className="flex flex-col items-start rounded-xl bg-white p-2 shadow-sm"
          >
            <img
              src={src}
              alt=""
              className={`h-8 ${w} object-contain object-left`}
            />
          </div>
        ))}
        <div className="flex h-12 items-center rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-ink shadow-sm">
          MC
        </div>
      </div>
    </div>
  );
}
