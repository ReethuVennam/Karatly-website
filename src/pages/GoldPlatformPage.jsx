import { useState } from "react";
import Navbar from "../components/Navbar";
import { getUserProfile } from "../api/authApi";
import { createAugmontTransferOrder } from "../api/augmontApi";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50";

const selectClassName =
  "w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50 [color-scheme:dark]";

const actionButtonClassName =
  "rounded-xl border border-white/10 px-4 py-3 text-sm text-white transition hover:border-yellow-400/30 hover:bg-yellow-500/5 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/60">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}

function JsonPanel({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/6 bg-[#0a0a0a] p-4 text-xs leading-6 text-white/70">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </div>
  );
}

export default function GoldPlatformPage() {
  const profile = getUserProfile() || {};
  const senderUniqueId = profile?.uniqueId || profile?.customerMappedId || "";

  const [metalType, setMetalType] = useState("gold");
  const [receiverUniqueId, setReceiverUniqueId] = useState("");
  const [quantity, setQuantity] = useState("0.0100");
  const [merchantTransactionId, setMerchantTransactionId] = useState("");
  const [transferResult, setTransferResult] = useState({});
  const [transferError, setTransferError] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const generateMerchantTransactionId = () =>
    `AUGTRF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const handleTransferCreate = async () => {
    setTransferLoading(true);
    setTransferError("");
    setTransferResult({});

    const nextMerchantTransactionId = String(
      merchantTransactionId || generateMerchantTransactionId()
    ).trim();

    if (!senderUniqueId) {
      setTransferLoading(false);
      setTransferError("Sender uniqueId is missing for this account.");
      return;
    }

    if (!receiverUniqueId.trim()) {
      setTransferLoading(false);
      setTransferError("Receiver uniqueId is required.");
      return;
    }

    if (!quantity.trim()) {
      setTransferLoading(false);
      setTransferError("Quantity is required.");
      return;
    }

    const response = await createAugmontTransferOrder({
      request: {
        senderUniqueId,
        receiverUniqueId: receiverUniqueId.trim(),
        metalType,
        quantity: quantity.trim(),
        merchantTransactionId: nextMerchantTransactionId
      }
    });

    setTransferLoading(false);

    if (!response?.ok) {
      setTransferError(response?.message || "Unable to create transfer.");
      return;
    }

    setMerchantTransactionId(nextMerchantTransactionId);
    setTransferResult(response.order || {});
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_26%),linear-gradient(180deg,#040404_0%,#090806_45%,#040404_100%)] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl space-y-8 px-6 pb-14 pt-28">
        <div className="overflow-hidden rounded-[2.25rem] border border-yellow-500/15 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
          <p className="text-sm uppercase tracking-[0.24em] text-yellow-300">Goldplatform Workspace</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Transfer Create</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
            This page now shows only the Augmont transfer-create flow.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <div className="border-b border-white/8 pb-4">
              <p className="text-base font-semibold text-white">Transfer Order</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                Enter only the receiver, quantity, and metal type. Sender uniqueId and merchant transaction id are handled automatically.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Receiver uniqueId">
                <input
                  value={receiverUniqueId}
                  onChange={(event) => setReceiverUniqueId(event.target.value)}
                  placeholder="AUG-USER-2002"
                  className={inputClassName}
                />
              </Field>

              <Field label="Quantity">
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="0.0100"
                  className={inputClassName}
                />
              </Field>

              <Field label="Metal type">
                <select
                  value={metalType}
                  onChange={(event) => setMetalType(event.target.value)}
                  className={selectClassName}
                >
                  <option value="gold" className="bg-[#0b0b0b] text-white">
                    gold
                  </option>
                  <option value="silver" className="bg-[#0b0b0b] text-white">
                    silver
                  </option>
                </select>
              </Field>

              <Field
                label="Merchant txId"
                hint="Optional. If left blank, one will be generated automatically."
              >
                <input
                  value={merchantTransactionId}
                  onChange={(event) => setMerchantTransactionId(event.target.value)}
                  placeholder="Optional merchant txId"
                  className={inputClassName}
                />
              </Field>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleTransferCreate}
                disabled={transferLoading}
                className={`${actionButtonClassName} w-full`}
              >
                {transferLoading ? "Submitting..." : "Create Transfer"}
              </button>
            </div>

            {transferError ? (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                {transferError}
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <div className="border-b border-white/8 pb-4">
              <p className="text-base font-semibold text-white">Transfer Result</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                The latest response from <code>/api/v1/orders/transfer/create</code>.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <JsonPanel title="Augmont Transfer Response" value={transferResult} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
