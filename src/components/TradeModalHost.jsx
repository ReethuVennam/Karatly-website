import { useEffect, useState } from "react";
import BuyGold from "../dashboard/BuyGold";
import SellGold from "../dashboard/SellGold";

export default function TradeModalHost() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("buy");

  useEffect(() => {
    const onOpen = (e) => {
      const t = e?.detail?.type || "buy";
      setMode(t === "sell" ? "sell" : "buy");
      setOpen(true);
      // telemetry
      window.dispatchEvent(new CustomEvent("tradeModalOpened", { detail: { type: t } }));
      // lock body & document scroll
      try {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } catch (err) {}
    };
    const onClose = () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("tradeModalClosed", { detail: { type: mode } }));
      try {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      } catch (err) {}
    };

    window.addEventListener("openTradeModal", onOpen);
    window.addEventListener("closeTradeModal", onClose);
    return () => {
      window.removeEventListener("openTradeModal", onOpen);
      window.removeEventListener("closeTradeModal", onClose);
      try {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      } catch (err) {}
    };
  }, [mode]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("tradeModalClosed", { detail: { type: mode } }));
    try {
      document.body.style.overflow = "";
    } catch (err) {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end px-3 py-2">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/70 hover:border-red-500/30 hover:text-red-200"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(88vh-48px)] overflow-auto px-3 pb-3">
          <div className="mt-1">
            {mode === "buy" ? <BuyGold embedded onClose={close} /> : <SellGold embedded onClose={close} />}
          </div>
        </div>
      </div>
    </div>
  );
}
