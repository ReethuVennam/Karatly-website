
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, AlertCircle, Pencil, Loader2, ShieldCheck } from "lucide-react";
import {
  fetchAugmontUserBanks,
  createAugmontUserBank,
  deleteAugmontUserBank,
  updateAugmontUserBank,
} from "../api/augmontApi";

// ── Constants ─────────────────────────────────────────────────
const MAX_BANKS       = 3;   // TC51
const MAX_MODS_PER_ID = 3;   // TC52

// ── IFSC mismatch check (TC50) ────────────────────────────────
// Prevent same account number being paired with a different IFSC
function detectIfscMismatch(existingBanks, newAccountNumber, newIfsc) {
  const match = existingBanks.find(
    b => String(b.accountNumber).replace(/\s/g, "") ===
         String(newAccountNumber).replace(/\s/g, "")
  );
  if (!match) return null;
  if (match.ifscCode.toUpperCase() !== newIfsc.toUpperCase()) {
    return `Account ${newAccountNumber} is already registered with IFSC ${match.ifscCode}. ` +
           `You cannot use a different IFSC code for the same account number.`;
  }
  return null; // same combo — Augmont will return 422 "already exists", handled separately
}

// ── Main component ────────────────────────────────────────────
export default function BankSection({ uniqueId }) {
  const [banks,       setBanks]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editingBank, setEditingBank] = useState(null); // null = add new

  // mod count per bank id, persisted in localStorage (backed by Augmont in prod)
  const getModCount = (bankId) =>
    parseInt(localStorage.getItem(`bank_mods_${bankId}`) || "0", 10);
  const incModCount = (bankId) => {
    const next = getModCount(bankId) + 1;
    localStorage.setItem(`bank_mods_${bankId}`, String(next));
    return next;
  };

  const load = useCallback(async () => {
    if (!uniqueId) return;
    setLoading(true);
    try {
      const res = await fetchAugmontUserBanks(uniqueId);
      const list = res?.banks || res?.data?.banks || res?.data || [];
      setBanks(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Could not load bank accounts.");
    } finally {
      setLoading(false);
    }
  }, [uniqueId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => {
    // TC51 — block 4th bank
    if (banks.length >= MAX_BANKS) {
      toast.error(`Maximum ${MAX_BANKS} bank accounts allowed per customer.`);
      return;
    }
    setEditingBank(null);
    setShowForm(true);
  };

  const handleEdit = (bank) => {
    const count = getModCount(bank.userBankId || bank.bankId);
    // TC52 — block after 3 mods
    if (count >= MAX_MODS_PER_ID) {
      toast.error(`This bank account has reached the maximum of ${MAX_MODS_PER_ID} modifications.`);
      return;
    }
    setEditingBank(bank);
    setShowForm(true);
  };

  const handleDelete = async (bank) => {
    if (!window.confirm(`Remove ${bank.accountName}'s account ending ${String(bank.accountNumber).slice(-4)}?`)) return;
    try {
      const res = await deleteAugmontUserBank({ uniqueId, userBankId: bank.userBankId || bank.bankId });
      if (res?.ok) {
        toast.success("Bank account removed.");
        load();
      } else {
        toast.error(res?.error || "Could not delete bank account.");
      }
    } catch {
      toast.error("Delete failed. Try again.");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Saved Banks</h3>
          <p className="text-xs text-gray-500">{banks.length} of {MAX_BANKS} accounts added</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={banks.length >= MAX_BANKS}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/10
            hover:bg-yellow-400/20 text-yellow-400 text-xs font-semibold transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={13} /> Add Bank
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-yellow-400" />
        </div>
      ) : banks.length === 0 ? (
        <p className="text-center text-gray-600 text-sm py-8">No bank accounts added.</p>
      ) : (
        banks.map(b => {
          const bankId  = b.userBankId || b.bankId;
          const mods    = getModCount(bankId);
          const canEdit = mods < MAX_MODS_PER_ID;
          return (
            <div key={bankId}
              className="bg-[#1C2028] rounded-2xl p-4 border border-[#2B2F36] flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{b.accountName}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  •••• {String(b.accountNumber).slice(-4)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{b.ifscCode} · {b.bankName || "Bank"}</p>
                {/* TC52 — show mod count */}
                <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                  <ShieldCheck size={9} />
                  {mods}/{MAX_MODS_PER_ID} modifications used
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleEdit(b)}
                  disabled={!canEdit}
                  title={canEdit ? "Edit" : "Modification limit reached"}
                  className="p-2 rounded-xl bg-[#2B2F36] hover:bg-[#363A45] text-gray-400
                    hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <BankForm
          uniqueId={uniqueId}
          existingBanks={banks}
          editingBank={editingBank}
          onClose={() => setShowForm(false)}
          onSaved={(bankId) => {
            if (editingBank) incModCount(bankId);
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// ── Add / Edit form ───────────────────────────────────────────
function BankForm({ uniqueId, existingBanks, editingBank, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountName:   editingBank?.accountName   || "",
    accountNumber: editingBank?.accountNumber || "",
    ifscCode:      editingBank?.ifscCode      || "",
    accountType:   editingBank?.accountType   || "savings",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    // basic validation
    if (!form.accountName.trim())                            { toast.error("Account holder name required."); return; }
    if (!/^\d{9,18}$/.test(form.accountNumber.replace(/\s/g, ""))) { toast.error("Enter a valid account number (9–18 digits)."); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase()))  { toast.error("Enter a valid IFSC code (e.g. SBIN0001234)."); return; }

    // TC50 — IFSC mismatch guard (only for new bank, not edit)
    if (!editingBank) {
      const mismatch = detectIfscMismatch(existingBanks, form.accountNumber, form.ifscCode);
      if (mismatch) {
        toast.error(mismatch, { duration: 5_000 });
        return;
      }
    }

    setSaving(true);
    try {
      let res;
      if (editingBank) {
        res = await updateAugmontUserBank({
          uniqueId,
          userBankId:  editingBank.userBankId || editingBank.bankId,
          accountName: form.accountName,
          ifscCode:    form.ifscCode.toUpperCase(),
        });
      } else {
        res = await createAugmontUserBank({
          uniqueId,
          accountName:   form.accountName,
          accountNumber: form.accountNumber.replace(/\s/g, ""),
          ifscCode:      form.ifscCode.toUpperCase(),
          accountType:   form.accountType,
        });
      }

      if (res?.ok) {
        toast.success(editingBank ? "Bank updated." : "Bank account added.");
        onSaved(editingBank?.userBankId || editingBank?.bankId);
      } else {
        // Surface Augmont's own IFSC mismatch error (TC50 backend enforcement)
        const msg = res?.error || res?.data?.message || "Could not save bank account.";
        toast.error(msg, { duration: 5_000 });
      }
    } catch {
      toast.error("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#1C2028] rounded-2xl p-5 w-full max-w-sm border border-[#2B2F36]">
        <h3 className="text-sm font-bold text-white mb-4">
          {editingBank ? "Edit Bank Account" : "Add Bank Account"}
        </h3>

        <div className="space-y-3">
          <Field label="Account Holder Name">
            <input
              value={form.accountName}
              onChange={e => set("accountName", e.target.value)}
              className="w-full bg-[#0B0E11] border border-[#2B2F36] rounded-xl px-3 py-2.5
                text-sm text-white outline-none focus:border-yellow-400/60 transition"
              placeholder="As per bank records"
            />
          </Field>

          {!editingBank && (
            <Field label="Account Number">
              <input
                value={form.accountNumber}
                onChange={e => set("accountNumber", e.target.value.replace(/\D/g, ""))}
                className="w-full bg-[#0B0E11] border border-[#2B2F36] rounded-xl px-3 py-2.5
                  text-sm text-white font-mono outline-none focus:border-yellow-400/60 transition"
                placeholder="Enter account number"
                maxLength={18}
              />
            </Field>
          )}

          <Field label="IFSC Code">
            <input
              value={form.ifscCode}
              onChange={e => set("ifscCode", e.target.value.toUpperCase())}
              className="w-full bg-[#0B0E11] border border-[#2B2F36] rounded-xl px-3 py-2.5
                text-sm text-white font-mono outline-none focus:border-yellow-400/60 transition"
              placeholder="e.g. SBIN0001234"
              maxLength={11}
            />
          </Field>

          {/* TC50 — live IFSC mismatch warning */}
          {!editingBank && form.accountNumber && form.ifscCode.length >= 4 && (() => {
            const warn = detectIfscMismatch(existingBanks, form.accountNumber, form.ifscCode);
            return warn ? (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20
                  rounded-xl px-3 py-2.5 text-xs text-red-400">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {warn}
              </div>
            ) : null;
          })()}

          {!editingBank && (
            <Field label="Account Type">
              <select
                value={form.accountType}
                onChange={e => set("accountType", e.target.value)}
                className="w-full bg-[#0B0E11] border border-[#2B2F36] rounded-xl px-3 py-2.5
                  text-sm text-white outline-none focus:border-yellow-400/60 transition"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </Field>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#2B2F36] text-gray-400 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#F0B90B] disabled:opacity-40
              text-black text-sm font-bold transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
