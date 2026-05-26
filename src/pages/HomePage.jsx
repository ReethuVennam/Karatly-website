import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Gem,
  History,
  Repeat2,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import Navbar from "../components/Navbar";
import LiveMetalChart from "../components/LiveMetalChart";
import { isAuthenticated } from "../api/authApi";
import { fetchAugmontBuyOrders } from "../api/augmontApi";
import { loadUserDashboardData, resolveUniqueId } from "../utils/userDashboard";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

function SplashIntro({ onComplete }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3600);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <section className="karatly-splash">
      <div className="karatly-splash-mark">
        <img src="/images/karataly-logo.png" alt="Karatly" />
        <span>Karatly</span>
      </div>
    </section>
  );
}

function OnboardingHeader({ step, onBack, onSkip }) {
  return (
    <div className="flex items-center justify-between text-sm text-white/75">
      {step === 0 ? (
        <span />
      ) : (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 font-medium hover:text-white">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/45 text-sm">←</span>
          Back
        </button>
      )}
      <button type="button" onClick={onSkip} className="font-medium hover:text-white">
        Skip
      </button>
    </div>
  );
}

function OnboardingBadge({ children, bordered = false }) {
  return (
    <div
      className={`karatly-onboarding-badge inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-yellow-100/90 sm:text-sm ${
        bordered ? "karatly-onboarding-badge--bordered" : ""
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
      {children}
    </div>
  );
}

function AuthActions({ navigate, layout = "inline" }) {
  const stacked = layout === "stacked";

  return (
    <div className={`mt-4 ${stacked ? "flex max-w-md flex-col gap-3" : "flex flex-wrap items-center gap-3"}`}>
      <button
        type="button"
        onClick={() => navigate("/signup")}
        className={`karatly-gold-button inline-flex items-center justify-center gap-2 rounded-full font-semibold ${
          stacked ? "w-full px-6 py-3.5 text-sm sm:text-base" : "px-5 py-2.5 text-sm"
        }`}
      >
        Create Account
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => navigate("/login")}
        className={`inline-flex items-center justify-center rounded-full border border-yellow-500/75 font-semibold text-white/90 transition hover:bg-white/5 ${
          stacked ? "w-full px-6 py-3.5 text-sm sm:text-base" : "px-5 py-2.5 text-sm"
        }`}
      >
        Login
      </button>
    </div>
  );
}

const METAL_RATES = [
  { label: "GOLD 24K", price: "₹73,420", change: "+1.24%", positive: true, tone: "gold" },
  { label: "SILVER", price: "₹92,180", change: "+0.82%", positive: true, tone: "silver" },
  { label: "DIAMOND", price: "₹2,45,000", change: "-0.31%", positive: false, tone: "diamond" }
];

function MetalIcon({ tone }) {
  if (tone === "gold") {
    return (
      <div className="h-8 w-11 shrink-0 rounded-sm bg-gradient-to-br from-[#ffe08a] via-[#f0b429] to-[#9a6610] shadow-[0_4px_12px_rgba(245,164,0,0.3)] sm:h-9 sm:w-12" />
    );
  }
  if (tone === "silver") {
    return (
      <div className="h-8 w-11 shrink-0 rounded-sm bg-gradient-to-br from-[#f5f7fa] via-[#b8c0cc] to-[#6f7886] shadow-[0_4px_12px_rgba(180,190,205,0.25)] sm:h-9 sm:w-12" />
    );
  }
  return <Gem className="h-7 w-7 shrink-0 text-cyan-200 drop-shadow-[0_0_12px_rgba(94,230,255,0.4)] sm:h-8 sm:w-8" />;
}

function OnboardingSlideWelcome({ onNext, onSkip }) {
  return (
    <section
      className="karatly-onboarding karatly-onboarding-image karatly-onboarding-gold"
      style={{ backgroundImage: "url(/images/slide1.png)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 sm:px-10 lg:px-14">
        <OnboardingHeader step={0} onSkip={onSkip} />
        <div className="flex flex-1 items-center py-10">
          <div className="max-w-xl">
            <OnboardingBadge>Welcome Karatly</OnboardingBadge>
            <h1 className="mt-5 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Invest in <span>Timeless</span> value
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
              Buy and invest in certified gold, silver, and diamonds with complete trust and transparency.
            </p>
            <button
              type="button"
              onClick={onNext}
              className="karatly-gold-button mt-8 inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold sm:text-base"
            >
              Explore Now
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-6 text-sm text-white/85">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-yellow-400 hover:text-yellow-300">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OnboardingSlideRates({ onNext, onBack, onSkip }) {
  return (
    <section className="karatly-onboarding karatly-onboarding-rates relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-16 -top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(232,168,48,0.38),transparent_68%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-7">
        <OnboardingHeader step={1} onBack={onBack} onSkip={onSkip} />

        <div className="mt-5 flex flex-1 flex-col sm:mt-6">
          <div className="relative max-w-2xl pr-20 sm:pr-28">
            <OnboardingBadge bordered>Live Market</OnboardingBadge>
            <h1 className="mt-3 font-serif text-2xl font-bold leading-tight sm:mt-4 sm:text-3xl md:text-4xl">
              Real Time <span>Metal</span> Prices
            </h1>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-white/75 sm:text-sm">
              Track live gold, silver, and diamond rates updated instantly—so you always buy at the right time.
            </p>
            <div
              className="karatly-onboarding-coin pointer-events-none absolute -right-2 top-6 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full sm:-right-4 sm:top-4 sm:h-20 sm:w-20 md:h-24 md:w-24"
              aria-hidden="true"
            >
              <span className="text-center text-[8px] font-bold tracking-[0.18em] text-[#5a3d08] sm:text-[9px]">
                KARATLY
              </span>
            </div>
          </div>

          <div className="karatly-slide-panel mt-5 p-4 sm:mt-6 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 sm:text-xs">
                  Live Gold 24K
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <p className="text-2xl font-bold sm:text-3xl">₹73,420</p>
                  <p className="text-xs font-semibold text-green-400 sm:text-sm">↗ +1.24%</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 text-[11px] font-bold sm:gap-3 sm:text-xs">
                <span className="text-white/45">1D</span>
                <span className="rounded-full bg-[#e4b23d] px-2.5 py-0.5 text-[#1a1204] sm:px-3 sm:py-1">1W</span>
                <span className="text-white/45">1M</span>
              </div>
            </div>
            <div className="karatly-area-chart mt-4 h-28 sm:mt-5 sm:h-32" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
            {METAL_RATES.map((metal) => (
              <div key={metal.label} className="karatly-metal-card flex items-center gap-2.5 p-3 sm:gap-3 sm:p-3.5">
                <MetalIcon tone={metal.tone} />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-white/45 sm:text-[10px]">
                    {metal.label}
                  </p>
                  <p className="text-sm font-bold sm:text-base">{metal.price}</p>
                  <p className={`text-[10px] font-semibold sm:text-xs ${metal.positive ? "text-green-400" : "text-red-400"}`}>
                    {metal.positive ? "↗" : "↘"} {metal.change}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex justify-center pt-6 pb-2 sm:pt-8">
            <button
              type="button"
              onClick={onNext}
              className="karatly-gold-button inline-flex w-full max-w-lg items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OnboardingSlideJourney({ onBack, onSkip }) {
  const navigate = useNavigate();

  return (
    <section
      className="karatly-onboarding karatly-onboarding-image karatly-onboarding-journey"
      style={{ backgroundImage: "url(/images/slide3.png)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/15" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 sm:px-10 lg:px-14">
        <OnboardingHeader step={2} onBack={onBack} onSkip={onSkip} />
        <div className="flex flex-1 items-center py-10">
          <div className="max-w-lg">
            <OnboardingBadge bordered>Final Step</OnboardingBadge>
            <h1 className="mt-5 font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Start Your <span>Golden</span> Journey
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
              Join thousands of customers investing in precious metals with confidence.
            </p>
            <AuthActions navigate={navigate} layout="stacked" />
          </div>
        </div>
        <div className="pointer-events-none absolute right-8 top-28 hidden rounded-lg border border-yellow-500/60 bg-black/40 px-6 py-4 text-center lg:block xl:right-16 xl:top-32">
          <p className="text-yellow-300">★★★★★</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/60">Trusted by</p>
          <p className="font-serif text-2xl font-bold text-yellow-300">50k +</p>
        </div>
      </div>
    </section>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const goNext = () => setStep((current) => Math.min(current + 1, 2));
  const goBack = () => setStep((current) => Math.max(current - 1, 0));
  const skip = () => navigate("/login");

  if (step === 0) {
    return <OnboardingSlideWelcome onNext={goNext} onSkip={skip} />;
  }

  if (step === 1) {
    return <OnboardingSlideRates onNext={goNext} onBack={goBack} onSkip={skip} />;
  }

  return <OnboardingSlideJourney onBack={goBack} onSkip={skip} />;
}

function MiniChart({ variant = "wide" }) {
  const path =
    variant === "wide"
      ? "0,130 90,112 180,112 270,92 360,98 450,76 540,82 630,58 720,64 810,50 900,18"
      : "0,60 18,46 36,46 54,28 72,32 90,10 108,16";

  return (
    <svg viewBox={variant === "wide" ? "0 0 900 150" : "0 0 108 70"} className="h-full w-full" aria-hidden="true">
      <polyline points={path} fill="none" stroke="#5ee6ff" strokeWidth={variant === "wide" ? 4 : 3} strokeLinecap="round" />
      <polygon
        points={`${path} ${variant === "wide" ? "900,150 0,150" : "108,70 0,70"}`}
        fill="url(#homeChartFill)"
        opacity="0.55"
      />
      <defs>
        <linearGradient id="homeChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f3c849" />
          <stop offset="100%" stopColor="#101512" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LoggedInHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const uniqueId = resolveUniqueId();
    loadUserDashboardData({ uniqueId, forceRates: true })
      .then(async (data) => {
        setDash(data);
        if (uniqueId) {
          const ordersRes = await fetchAugmontBuyOrders({ uniqueId });
          const recent = (ordersRes?.orders || []).slice(0, 4).map((order) => {
            const grams = Number(order.gold ?? order.quantity ?? 0).toFixed(2);
            const amount = formatCurrency(order.amount);
            const date = order.date || order.createdAt || "";
            return [
              "Gold",
              String(order.type || "BUY").toUpperCase(),
              `${grams}g · ${amount} · ${date ? new Date(date).toLocaleString("en-IN") : "—"}`,
              amount
            ];
          });
          setTransactions(recent);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const portfolioValue = dash?.portfolio?.portfolioValue || 0;
  const profit = dash?.portfolio?.profit || 0;
  const profitPct = dash?.portfolio?.profitPercent || 0;

  const assets = [
    ["Gold Holdings", `${(dash?.passbook?.goldGrams || 0).toFixed(2)}g`, "", "gold"],
    ["Silver Holdings", `${(dash?.passbook?.silverGrams || 0).toFixed(1)}g`, "", "cyan"],
    ["Invested", formatCurrency(dash?.portfolio?.invested || 0), "", "gold"],
    ["Total Profit", formatCurrency(profit), `${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(1)}%`, "cyan"]
  ];

  if (loading) {
    return (
      <div className="karatly-shell flex min-h-screen items-center justify-center text-white/50">
        Loading your portfolio…
      </div>
    );
  }

  return (
    <div className="karatly-shell min-h-screen text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-28">
        <section className="karatly-panel rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Portfolio Value</p>
              <h1 className="mt-2 text-4xl font-bold text-yellow-300">{formatCurrency(portfolioValue)}</h1>
              <p className="mt-3 text-xs text-white/65">
                <span className={`mr-2 rounded-full px-2 py-1 ${profit >= 0 ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                  {profit >= 0 ? "↗" : "↘"} {formatCurrency(Math.abs(profit))}
                </span>
                P&L {profitPct >= 0 ? "+" : ""}
                {profitPct.toFixed(2)}%
              </p>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-full bg-yellow-400 text-sm font-bold text-yellow-900 shadow-[0_0_35px_rgba(250,204,21,0.35)]">
              KARATLY
            </div>
          </div>
          <div className="mt-5">
            <LiveMetalChart data={dash?.history?.gold} metalLabel="Gold" />
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-4">
          {[
            [ShoppingCart, "Buy Gold", "/portfolio?tab=buy"],
            [WalletCards, "Sell Gold", "/portfolio?tab=sell"],
            [Repeat2, "SIP", "/products"],
            [History, "History", "/orders"]
          ].map(([Icon, label, path], index) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className={`karatly-card rounded-lg p-5 text-center transition hover:border-yellow-400/60 ${index % 2 ? "bg-cyan-950/45" : ""}`}
            >
              <Icon className={`mx-auto h-8 w-8 ${index % 2 ? "text-cyan-300" : "text-yellow-300"}`} />
              <p className="mt-3 text-sm font-semibold">{label}</p>
            </button>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold">Asset Overview</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-4">
            {assets.map(([label, value, change, color]) => (
              <div key={label} className="karatly-card rounded-lg p-4">
                <div className={`grid h-12 w-12 place-items-center rounded-full ${color === "cyan" ? "bg-cyan-400/20 text-cyan-300" : "bg-yellow-400/20 text-yellow-300"}`}>
                  {color === "cyan" ? <Gem className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/55">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                  <div>
                    <p className="text-right text-xs font-bold text-green-400">{change}</p>
                    <div className="mt-2 h-12 w-24">
                      <MiniChart variant="small" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="karatly-card mt-10 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Rate Analytics</h2>
              <p className="text-sm text-white/50">Buy & Sell rate trend</p>
            </div>
            <div className="rounded-full bg-yellow-950/50 p-1 text-sm">
              <span className="rounded-full bg-yellow-400 px-6 py-2 text-black">Gold</span>
              <span className="px-6 py-2 text-white/55">Silver</span>
            </div>
          </div>
          <div className="mt-8 flex justify-around text-sm text-white/45">
            {["1D", "1W", "1M", "3M", "1Y"].map((item) => (
              <span key={item} className={item === "1M" ? "rounded-full border border-yellow-500/60 px-14 py-1 text-yellow-300" : ""}>
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8">
            <LiveMetalChart data={dash?.history?.gold} metalLabel="Gold" accent="#31d7ff" />
          </div>
        </section>

        <section className="karatly-panel mt-10 flex items-center gap-5 rounded-lg p-6">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-yellow-400 text-black">
            <Sparkles className="h-9 w-9" />
          </div>
          <div>
            <p className="text-xs uppercase text-yellow-300">AI Insight <span className="ml-3 text-white/45">Updated 2m ago</span></p>
            <h2 className="mt-2 text-2xl font-bold">Gold prices expected to rise</h2>
            <p className="mt-1 text-yellow-300">2.4% this week</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold">Recent Transaction</h2>
          <div className="mt-4 space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-white/45">No recent transactions yet.</p>
            ) : null}
            {transactions.map(([name, type, meta, amount]) => (
              <div key={`${type}-${meta}`} className="karatly-card flex items-center justify-between rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-full ${type === "SELL" ? "bg-cyan-400/20 text-cyan-300" : "bg-yellow-400/20 text-yellow-300"}`}>
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {name} <span className="ml-2 rounded bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-300">{type}</span>
                    </p>
                    <p className="text-sm text-white/45">{meta}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{amount}</p>
                  <p className="text-xs font-semibold text-green-400">Completed</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function HomePage() {
  const [introDone, setIntroDone] = useState(() => sessionStorage.getItem("karatlyIntroSeen") === "1");
  const loggedIn = isAuthenticated();

  if (loggedIn) return <LoggedInHome />;

  if (!introDone) {
    return (
      <SplashIntro
        onComplete={() => {
          sessionStorage.setItem("karatlyIntroSeen", "1");
          setIntroDone(true);
        }}
      />
    );
  }

  return <Onboarding />;
}
