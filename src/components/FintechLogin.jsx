
import { Lock, User, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";

export default function FintechLogin() {
  const [showSignup, setShowSignup] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupError, setSignupError] = useState("");

  // Gold coin animation
  const goldCoins = Array.from({ length: 8 });

  const handleLogin = (e) => {
    e.preventDefault();
    // Demo login
    if (loginEmail === "rahulsharma@gmail.com" && loginPassword === "123456") {
      localStorage.setItem("isLoggedIn", "true");
      window.location.href = "/";
    } else {
      alert("Invalid email or password");
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      setSignupError("Password does not match");
      return;
    }
    setSignupError("");
    // Demo signup
    alert("Account created successfully!");
    setShowSignup(false);
    setSignupEmail("");
    setSignupMobile("");
    setSignupPassword("");
    setSignupConfirm("");
  };

  return (
    <div className="min-h-screen font-sans text-white" style={{ background: "radial-gradient(circle at 60% 40%, #2a2100 0%, #000 100%)" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-transparent md:flex-row">
        {/* Left visual panel with gold coin animation */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-8 py-16 md:px-12">
          {/* 3D Gold coins and bars animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Gold coins */}
            {goldCoins.map((_, i) => (
              <div
                key={i}
                className="absolute animate-fallCoin3D"
                style={{
                  left: `${8 + i * 12}%`,
                  top: `-${30 + i * 10}px`,
                  animationDelay: `${i * 0.6}s`,
                  width: "48px",
                  height: "48px",
                  zIndex: 2,
                }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <ellipse cx="24" cy="24" rx="22" ry="18" fill="#FFD700" stroke="#FFC700" strokeWidth="2" filter="url(#coinShadow)" />
                  <defs>
                    <filter id="coinShadow" x="0" y="0" width="48" height="48">
                      <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#bfa600"/>
                    </filter>
                  </defs>
                  <text x="24" y="29" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">G</text>
                </svg>
              </div>
            ))}
            {/* Gold bars */}
            {[0,1,2].map((i) => (
              <div
                key={i}
                className="absolute animate-riseBar"
                style={{
                  left: `${18 + i * 18}%`,
                  bottom: "10%",
                  animationDelay: `${i * 0.8}s`,
                  width: "60px",
                  height: "32px",
                  zIndex: 1,
                }}
              >
                <svg width="60" height="32" viewBox="0 0 60 32">
                  <rect x="6" y="8" width="48" height="16" rx="4" fill="#FFD700" stroke="#FFC700" strokeWidth="2" filter="url(#barShadow)" />
                  <defs>
                    <filter id="barShadow" x="0" y="0" width="60" height="32">
                      <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#bfa600"/>
                    </filter>
                  </defs>
                  <text x="30" y="22" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="bold">Au</text>
                </svg>
              </div>
            ))}
            {/* Glow effect */}
            <div className="absolute left-1/2 top-1/2 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 bg-yellow-400 opacity-10 blur-[120px] rounded-full" />
          </div>

          <div className="relative flex w-full max-w-sm flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_12px_30px_rgba(251,191,36,0.25)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Secure Gold Vault</h2>
              <p className="text-md text-yellow-200">Access your portfolio with bank-grade security.</p>
            </div>

            <div className="relative flex w-full items-center justify-center">
              <div className="relative flex h-36 w-56 flex-col gap-2 rounded-3xl bg-gradient-to-br from-amber-200/40 via-yellow-200/25 to-amber-100/20 p-4 shadow-inner">
                <div className="h-3 w-16 rounded-full bg-yellow-300/70" />
                <div className="flex gap-2">
                  <div className="h-12 w-16 rounded-2xl bg-yellow-300/70 shadow-md" />
                  <div className="h-12 w-16 rounded-2xl bg-yellow-300/70 shadow-md" />
                  <div className="h-12 w-16 rounded-2xl bg-yellow-300/70 shadow-md" />
                </div>
                <div className="mt-2 h-3 w-10 rounded-full bg-yellow-300/70" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-50/80 via-transparent to-transparent" />
            </div>

            <p className="text-xs text-slate-500">
              Minimal interface, maximum trust. All data is encrypted and stored securely.
            </p>
          </div>
        </div>

        {/* Right form panel: Login or Signup */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-12">
          <div className="mx-auto w-full max-w-md rounded-3xl bg-black bg-opacity-80 p-10 shadow-xl">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {showSignup ? "Create Account" : "Login or Sign-Up"}
              </h1>
              <p className="text-md text-yellow-200">
                Continue to your SabPe Gold account.
              </p>
            </div>

            {!showSignup ? (
              <form className="mt-10 space-y-6" onSubmit={handleLogin}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-yellow-200" htmlFor="loginEmail">
                    Email address
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200" />
                    <input
                      id="loginEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full rounded-xl border border-yellow-700 bg-black bg-opacity-60 py-3 pl-10 pr-4 text-sm text-white shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-yellow-200" htmlFor="loginPassword">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200" />
                    <input
                      id="loginPassword"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full rounded-xl border border-yellow-700 bg-black bg-opacity-60 py-3 pl-10 pr-4 text-sm text-white shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-300" />
                    Remember me
                  </label>
                  <button type="button" className="font-semibold text-amber-600 hover:text-amber-700 transition">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-yellow-400 px-6 py-3 text-lg font-bold text-black shadow-sm transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                >
                  Sign in
                </button>

                <div className="text-center text-xs text-yellow-200 mt-4">
                  Not registered?{' '}
                  <button
                    type="button"
                    className="font-semibold text-yellow-400 hover:text-yellow-300"
                    onClick={() => setShowSignup(true)}
                  >
                    Sign up
                  </button>
                </div>
              </form>
            ) : (
              <form className="mt-10 space-y-6" onSubmit={handleSignup}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-yellow-200" htmlFor="signupEmail">
                    Email address
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200" />
                    <input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full rounded-xl border border-yellow-700 bg-black bg-opacity-60 py-3 pl-10 pr-4 text-sm text-white shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-yellow-200" htmlFor="signupMobile">
                    Mobile number
                  </label>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200" />
                    <input
                      id="signupMobile"
                      type="tel"
                      placeholder="Enter mobile number"
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value)}
                      className="w-full rounded-xl border border-yellow-700 bg-black bg-opacity-60 py-3 pl-10 pr-4 text-sm text-white shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-yellow-200" htmlFor="signupPassword">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200" />
                    <input
                      id="signupPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full rounded-xl border border-yellow-700 bg-black bg-opacity-60 py-3 pl-10 pr-4 text-sm text-white shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-yellow-200" htmlFor="signupConfirm">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200" />
                    <input
                      id="signupConfirm"
                      type="password"
                      placeholder="Confirm password"
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      className="w-full rounded-xl border border-yellow-700 bg-black bg-opacity-60 py-3 pl-10 pr-4 text-sm text-white shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </div>

                {signupError && (
                  <div className="text-xs text-red-500 font-semibold">{signupError}</div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-yellow-400 px-6 py-3 text-lg font-bold text-black shadow-sm transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                >
                  Create account
                </button>

                <div className="text-center text-xs text-yellow-200 mt-4">
                  Already registered?{' '}
                  <button
                    type="button"
                    className="font-semibold text-yellow-400 hover:text-yellow-300"
                    onClick={() => setShowSignup(false)}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Gold coin and bar animation CSS */}
      <style>{`
        @keyframes fallCoin3D {
          0% { top: -40px; opacity: 0.7; transform: scale(1) rotate(0deg); }
          40% { opacity: 1; transform: scale(1.1) rotate(20deg); }
          70% { opacity: 1; transform: scale(1) rotate(-10deg); }
          100% { top: 90%; opacity: 0.2; transform: scale(0.9) rotate(0deg); }
        }
        .animate-fallCoin3D {
          animation: fallCoin3D 2.8s linear infinite;
        }
        @keyframes riseBar {
          0% { bottom: 0%; opacity: 0.5; }
          40% { opacity: 1; }
          100% { bottom: 10%; opacity: 1; }
        }
        .animate-riseBar {
          animation: riseBar 2.5s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}