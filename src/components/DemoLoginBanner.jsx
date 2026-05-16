/**
 * src/components/DemoLoginBanner.jsx
 *
 * A prominent demo-mode banner shown on the Login page.
 * Renders only in UAT / non-production environments.
 * 
 * Usage in Login.jsx:
 *   import DemoLoginBanner from '../components/DemoLoginBanner';
 *   // Inside your JSX, before the phone input:
 *   <DemoLoginBanner onDemoSelect={handleDemoSelect} />
 * 
 * handleDemoSelect receives { phone, email } and should pre-fill
 * your form fields, then auto-submit the demo login.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { DEMO_PHONE, DEMO_OTP } from '../api/demoApi';

const IS_UAT = import.meta.env.MODE !== 'production';

export default function DemoLoginBanner({ onDemoSelect }) {
  const [expanded, setExpanded]   = useState(false);
  const [email, setEmail]         = useState('qa@augmont.com');
  const [copied, setCopied]       = useState(null);

  if (!IS_UAT) return null;

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleQuickLogin() {
    onDemoSelect?.({ phone: DEMO_PHONE, email });
  }

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-yellow-500/40">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
          <span className="text-yellow-400 text-sm font-semibold tracking-wide">
            AUGMONT QA · DEMO MODE
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-yellow-500/70" />
          : <ChevronDown className="w-4 h-4 text-yellow-500/70" />
        }
      </button>

      {/* Expandable body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0B0E11] border-t border-yellow-500/20 px-4 py-4 space-y-3">

              {/* Credentials row */}
              <div className="grid grid-cols-2 gap-3">
                <CredentialChip
                  label="Phone"
                  value={DEMO_PHONE}
                  copied={copied === 'phone'}
                  onCopy={() => copyToClipboard(DEMO_PHONE, 'phone')}
                />
                <CredentialChip
                  label="OTP"
                  value={DEMO_OTP}
                  copied={copied === 'otp'}
                  onCopy={() => copyToClipboard(DEMO_OTP, 'otp')}
                />
              </div>

              {/* Email input */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Your demo email (any value)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="qa@augmont.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg
                             px-3 py-2 text-sm text-white placeholder-gray-600
                             focus:outline-none focus:border-yellow-500/60"
                />
              </div>

              {/* Bypass notes */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>✓ OTP verification bypassed</p>
                <p>✓ KYC pre-approved (PAN: DEMOQA001F)</p>
                <p>✓ Bank account pre-linked (SBI ···9999)</p>
                <p>✓ 48-hr sell restriction bypassed</p>
                <p>✓ ₹50L max-cap check bypassed</p>
              </div>

              {/* Quick login button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleQuickLogin}
                className="w-full py-2.5 rounded-xl bg-yellow-500 text-black
                           font-bold text-sm tracking-wide hover:bg-yellow-400
                           transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" fill="currentColor" />
                Login as Demo User
              </motion.button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CredentialChip({ label, value, copied, onCopy }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-mono text-yellow-400">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="text-gray-500 hover:text-yellow-400 transition-colors"
      >
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-400" />
          : <Copy className="w-3.5 h-3.5" />
        }
      </button>
    </div>
  );
}
