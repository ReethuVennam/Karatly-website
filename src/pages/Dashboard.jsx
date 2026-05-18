import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLiveGoldRateSnapshot } from "../api/augmontApi";
import KycStatusBanner from "../components/KycStatusBanner";

const quickActions = [
  {
    label: "Buy Gold",
    description: "Start investing in 24K digital gold instantly.",
    onClickPath: "/portfolio?tab=buy",
  },
  {
    label: "Sell Gold",
    description: "Liquidate your holdings with fast access to value.",
    onClickPath: "/portfolio?tab=sell",
  },
  {
    label: "Portfolio",
    description: "Review your holdings, value, and investment journey.",
    onClickPath: "/portfolio",
  },
];

const platformFeatures = [
  "24K Digital Gold",
  "Secure Vault Storage",
  "Buy/Sell Anytime",
  "Instant Liquidity",
];

const productCards = [
  { title: "1g Gold", subtitle: "Starter unit for disciplined investing" },
  { title: "5g Gold", subtitle: "Balanced accumulation for growing wealth" },
  { title: "10g Gold", subtitle: "Premium holding for serious investors" },
  { title: "Custom", subtitle: "Choose the amount that fits your goal" },
];

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

export default function Dashboard() {
  const navigate = useNavigate();

  const [gold, setGold] = useState(0);
  const [value, setValue] = useState(0);
  const [invested, setInvested] = useState(0);

  useEffect(() => {
    const logged = localStorage.getItem("isLoggedIn");
    if (!logged) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const loadPortfolioSnapshot = async () => {
      const stored = Number(localStorage.getItem("goldBalance") || 0);
      setGold(stored);

      try {
        const rates = await fetchLiveGoldRateSnapshot({ allowNetwork: false });
        const price = Number(rates?.snapshot?.buyPrice || 0);

        if (price > 0) {
          localStorage.setItem("goldPrice", String(price));
          setValue(stored * price);
          setInvested(stored * price * 0.9);
        }
      } catch (error) {
        console.error("Dashboard rate load error:", error);
      }
    };

    loadPortfolioSnapshot();
    window.addEventListener("goldBalanceUpdated", loadPortfolioSnapshot);

    return () =>
      window.removeEventListener("goldBalanceUpdated", loadPortfolioSnapshot);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("karatly_token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBBF24] text-lg font-bold text-black">
              K
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                Premium Gold
              </p>
              <h1 className="text-xl font-semibold">
                <span className="text-white">Karat</span>
                <span className="text-[#FBBF24]">ly</span>
              </h1>
            </div>
          </button>

          {/* TC1: Powered by Augmont — header */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-xs text-white/35">Powered by</span>
            <img
              src="/images/augmont-logo.png"
              alt="Augmont Gold For All"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                // Fallback to text badge if image not found
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
            {/* Text fallback */}
            <span
              className="hidden items-center gap-1 rounded-full border border-yellow-500/30 px-2.5 py-0.5 text-xs font-semibold text-yellow-400"
            >
              AUGMONT
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-white/75 transition hover:border-[#FBBF24]/50 hover:text-white"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate("/gold-platform")}
              className="rounded-full border border-[#FBBF24]/30 px-5 py-2 text-sm text-[#FBBF24] transition hover:bg-[#FBBF24]/10"
            >
              Gold Platform
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-[#FBBF24] px-5 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <KycStatusBanner />
        {/* Hero */}
        <section className="overflow-hidden rounded-[2rem] border border-[#FBBF24]/20 bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.18),transparent_30%),linear-gradient(120deg,#1a1307_0%,#0a0a0a_48%,#050505_100%)]">
          <div className="flex flex-col items-center gap-10 px-8 py-12 text-center md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-14 lg:text-left">
            <div className="max-w-2xl space-y-5">
              <h2 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Welcome to{" "}
                <span className="text-[#FBBF24]">Karatly</span>{" "}
                <span className="inline-block">✨</span>
              </h2>
              <p className="max-w-xl text-base leading-7 text-white/65 md:text-lg">
                Track. Invest. Grow your digital gold wealth.
              </p>

              {/* TC1: Powered by Augmont — hero section (mobile visible) */}
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <span className="text-xs text-white/40">Powered by</span>
                <img
                  src="/images/augmont-logo.png"
                  alt="Augmont Gold For All"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "inline-flex";
                  }}
                />
                <span className="hidden items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold tracking-widest text-yellow-400">
                  AUGMONT
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                <button
                  type="button"
                  onClick={() => navigate("/portfolio?tab=buy")}
                  className="rounded-full bg-[#FBBF24] px-7 py-3 text-sm font-semibold text-black transition hover:scale-[1.03] hover:bg-[#f5c84c]"
                >
                  Buy Gold
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/portfolio")}
                  className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white transition hover:border-[#FBBF24]/45 hover:text-[#FCD34D]"
                >
                  View Portfolio
                </button>
              </div>
            </div>

            <div className="relative hidden lg:flex lg:w-[42%] lg:justify-end">
              <div className="absolute right-10 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-[#FBBF24]/20 blur-3xl" />
              <div className="group relative w-full max-w-md rounded-[2rem] border border-[#FBBF24]/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.55)] transition duration-300 hover:scale-[1.03]">
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_48%)]" />
                <img
                  src="/images/gold-bar.png"
                  alt="Gold bars"
                  className="relative z-10 mx-auto w-full rounded-[1.5rem] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio stats */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-white/45">
              Portfolio Value
            </p>
            <h3 className="mt-4 text-3xl font-semibold text-[#FBBF24]">
              {formatCurrency(value)}
            </h3>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-white/45">
              Gold Holding
            </p>
            <h3 className="mt-4 text-3xl font-semibold text-white">
              {gold.toFixed(3)} gms
            </h3>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-white/45">
              Total Invested
            </p>
            <h3 className="mt-4 text-3xl font-semibold text-white">
              {formatCurrency(invested)}
            </h3>
          </div>
        </section>

        {/* Quick actions */}
        <section className="rounded-[1.75rem] border border-white/10 bg-[#0d0d0d] p-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.22em] text-white/45">
              Quick Actions
            </p>
            <h3 className="text-2xl font-semibold text-white">
              Move faster with one-click actions
            </h3>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.onClickPath)}
                className="group rounded-[1.35rem] border border-white/10 bg-white/[0.02] p-5 text-left transition hover:-translate-y-1 hover:border-[#FBBF24]/40 hover:bg-[#FBBF24]/[0.05]"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    {action.label}
                  </h4>
                  <span className="text-[#FBBF24] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Platform features + Market Pulse */}
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.75rem] border border-[#FBBF24]/15 bg-[linear-gradient(135deg,#151007_0%,#0b0b0b_55%,#141006_100%)] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-[#FCD34D]/70">
              Gold Platform
            </p>
            <h3 className="mt-3 text-3xl font-semibold text-white">
              Karatly Gold Platform
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">
              A premium digital gold experience designed for modern investors who
              want secure accumulation, transparent pricing, and instant
              liquidity.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {platformFeatures.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/80"
                >
                  <span className="mr-2 text-[#FBBF24]">✔</span>
                  {feature}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/gold-platform")}
              className="mt-6 rounded-full bg-[#FBBF24] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Explore Platform
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-white/45">
              Market Pulse
            </p>
            <h3 className="mt-3 text-3xl font-semibold text-white">
              Premium digital gold, simplified
            </h3>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-white/50">Live portfolio snapshot</p>
                <p className="mt-2 text-2xl font-semibold text-[#FBBF24]">
                  {formatCurrency(value)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-white/50">Current holding</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {gold.toFixed(3)} gms
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-white/50">Accumulated investment</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCurrency(invested)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="rounded-[1.75rem] border border-white/10 bg-[#0d0d0d] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/45">
                Products
              </p>
              <h3 className="text-2xl font-semibold text-white">
                Explore Gold Products
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="text-sm font-semibold text-[#FBBF24] transition hover:text-[#FCD34D]"
            >
              View all products
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {productCards.map((product) => (
              <button
                key={product.title}
                type="button"
                onClick={() => navigate("/products")}
                className="group rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,#151515_0%,#0d0d0d_100%)] p-5 text-left transition hover:-translate-y-1 hover:border-[#FBBF24]/45"
              >
                <div className="flex h-28 items-end rounded-[1.15rem] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.28),transparent_45%),linear-gradient(135deg,#2b210e_0%,#17120a_45%,#0d0d0d_100%)] p-4">
                  <div className="rounded-full border border-[#FBBF24]/20 bg-[#FBBF24]/10 px-3 py-1 text-xs font-semibold text-[#FCD34D]">
                    Karatly
                  </div>
                </div>
                <h4 className="mt-5 text-lg font-semibold text-white">
                  {product.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {product.subtitle}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* TC1: Powered by Augmont — page footer */}
        <footer className="flex items-center justify-center gap-3 border-t border-white/10 py-6">
          <span className="text-xs text-white/35">Powered by</span>
          <img
            src="/images/augmont-logo.png"
            alt="Augmont Gold For All"
            className="h-16 w-auto object-contain opacity-80"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "inline-flex";
            }}
          />
          <span className="hidden items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold tracking-widest text-yellow-400">
            AUGMONT · GOLD FOR ALL
          </span>
          <span className="text-xs text-white/25">
            © {new Date().getFullYear()} Karatly. All rights reserved.
          </span>
        </footer>
      </main>
    </div>
  );
}
