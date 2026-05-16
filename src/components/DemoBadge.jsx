/**
 * src/components/DemoBadge.jsx
 *
 * Persistent floating badge shown to demo/QA user during their session.
 * Renders on every page to make the demo context unmistakably clear.
 *
 * Usage — add to your App.jsx or root layout:
 *   import DemoBadge from './components/DemoBadge';
 *   // Inside JSX:
 *   <DemoBadge />
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Info } from 'lucide-react';
import { isCurrentSessionDemo, clearDemoSession } from '../api/demoApi';
import { useNavigate } from 'react-router-dom';

export default function DemoBadge() {
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();

  if (!isCurrentSessionDemo()) return null;

  function handleExit() {
    clearDemoSession();
    navigate('/login');
  }

  return (
    <>
      {/* Fixed badge — bottom left */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="bg-[#161A1F] border border-yellow-500/30 rounded-xl
                         p-3 text-xs text-gray-400 space-y-1 w-52 shadow-xl"
            >
              <p className="text-yellow-400 font-semibold mb-2">Demo Session Active</p>
              <p>Phone: <span className="text-white">9999999999</span></p>
              <p>ID: <span className="text-white font-mono text-[10px]">DEMO-AUG-QA-001</span></p>
              <p>KYC: <span className="text-green-400">Approved</span></p>
              <p>Bank: <span className="text-green-400">Linked</span></p>
              <p>Sell lock: <span className="text-green-400">Bypassed</span></p>
              <button
                onClick={handleExit}
                className="mt-2 w-full text-center text-red-400 hover:text-red-300
                           border border-red-500/30 rounded-lg py-1 transition-colors"
              >
                Exit Demo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowInfo(v => !v)}
          className="flex items-center gap-1.5 bg-yellow-500 text-black
                     text-xs font-bold px-3 py-1.5 rounded-full shadow-lg
                     shadow-yellow-500/30"
        >
          <Zap className="w-3 h-3" fill="currentColor" />
          DEMO MODE
          {showInfo
            ? <X className="w-3 h-3" />
            : <Info className="w-3 h-3" />
          }
        </motion.button>
      </div>
    </>
  );
}
