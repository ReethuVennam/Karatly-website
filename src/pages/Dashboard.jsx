import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, BadgeIndianRupee, CircleDollarSign, WalletCards } from "lucide-react";
import { clearAuthSession, getUserProfile } from "../api/authApi";
import { loadUserDashboardData } from "../utils/userDashboard";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

function Header() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const userProfile = getUserProfile() || {};
  const displayName = userProfile.fullName || userProfile.name || "User";
  const displayEmail = userProfile.email || "No email available";
  const userInitial = (displayName || displayEmail || "U").charAt(0).toUpperCase();

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
    window.location.reload();
  };

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-7">
      <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
        <img src="/images/karataly-logo.png" alt="Karatly" className="h-9 w-9 rounded-md object-cover" />
        <div className="leading-none">
          <p className="text-sm font-semibold">Karatly</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">Premium Gold</p>
        </div>
      </button>
      <nav className="hidden items-center gap-10 md:flex">
        {[
          ["Home", "/"],
          ["Dashboard", "/dashboard"],
          ["Market", "/products"],
          ["Order", "/orders"],
        ].map(([label, path]) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(path)}
            className={`border-b-2 pb-1 text-sm transition ${label === "Dashboard" ? "border-yellow-400 text-yellow-300" : "border-transparent text-white hover:text-yellow-300"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((current) => !current)}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#f5a400] font-bold text-black"
        >
          {userInitial}
        </button>

        {profileOpen ? (
          <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-lg border border-white/10 bg-[#101514] text-left shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-base font-bold uppercase text-white">{displayName}</p>
              <p className="mt-2 truncate text-sm text-white/45">{displayEmail}</p>
            </div>
            {[
              ["My Profile", "/profile"],
              ["My Orders", "/orders"],
              ["Settings", "/settings"],
              ["Help & Support", "/help"],
            ].map(([label, path]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  navigate(path);
                }}
                className="block w-full px-5 py-3 text-left text-sm text-white/75 hover:bg-white/5 hover:text-white"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full border-t border-white/10 px-5 py-3 text-left text-sm text-red-400 hover:bg-white/5"
            >
              Sign Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

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
      try {
        const dash = await loadUserDashboardData({ forceRates: true });
        setGold(dash.passbook.goldGrams);
        setValue(dash.portfolio.portfolioValue);
        setInvested(dash.portfolio.invested);
      } catch (error) {
        console.error("Dashboard load error:", error);
      }
    };

    loadPortfolioSnapshot();
    window.addEventListener("goldBalanceUpdated", loadPortfolioSnapshot);
    return () => window.removeEventListener("goldBalanceUpdated", loadPortfolioSnapshot);
  }, []);

  const products = [
    ["1G Gold", "Starter unit for disciplined investing"],
    ["5G Gold", "Balanced accumulation for growing wealth"],
    ["10G Gold", "Premium Holding for serious investors"],
    ["Custom", "Choose the amount that fits your goal"],
  ];

  return (
    <div className="karatly-shell min-h-screen text-white">
      <Header />
      <main className="mx-auto max-w-6xl px-5 pb-12">
        <section className="rounded-lg border border-yellow-500/70 bg-[#120f08] px-7 py-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-yellow-300">Powered by Augmont Gold</p>
          <h1 className="mt-3 text-3xl font-bold">
            Welcome to <span className="text-yellow-300">Karatly</span>
          </h1>
          <div className="mx-auto mt-5 grid max-w-xl gap-4 md:grid-cols-2">
            <button onClick={() => navigate("/portfolio?tab=buy")} className="karatly-gold-button rounded-xl py-3 text-sm font-bold">
              Buy Gold
            </button>
            <button onClick={() => navigate("/portfolio")} className="rounded-xl border border-yellow-500/50 py-3 text-sm font-bold text-white/80">
              View Portfolio
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["Portfolio", formatCurrency(value), BadgeIndianRupee],
            ["Gold Holding", `${gold.toFixed(3)}g`, ArrowUpRight],
            ["Total Invested", formatCurrency(invested), WalletCards],
          ].map(([label, amount, Icon]) => (
            <div key={label} className="karatly-card rounded-md p-7 text-center">
              <div className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-full bg-yellow-500/20 text-yellow-300">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/45">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{amount}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <p className="text-sm uppercase text-yellow-300">Quick Actions</p>
          <h2 className="text-lg font-semibold">Move faster with one click</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {[
              ["Instant", "Buy Gold", "/portfolio?tab=buy", ArrowUpRight],
              ["Anytime", "Sell Gold", "/portfolio?tab=sell", ArrowDownRight],
            ].map(([eyebrow, label, path, Icon]) => (
              <button key={label} type="button" onClick={() => navigate(path)} className="karatly-card flex items-center justify-between rounded-md p-6 text-left">
                <span>
                  <span className="block text-xs text-white/45">{eyebrow}</span>
                  <span className="text-2xl font-bold">{label}</span>
                </span>
                <span className="grid h-14 w-14 place-items-center rounded-full bg-yellow-400 text-black">
                  <Icon className="h-7 w-7" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-yellow-500/70 bg-black/50 p-8 text-center">
          <h2 className="text-2xl font-bold"><span className="text-yellow-300">Karatly</span> Gold Platform</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/55">A premium digital gold experience - own, store and trade 24K gold in seconds.</p>
          <div className="mx-auto mt-6 grid max-w-lg gap-4 text-sm md:grid-cols-2">
            {["24K Digital Gold", "Secure Vault Storage", "Buy/Sell Anytime", "Instant Liquidity"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-left">
                <CircleDollarSign className="h-5 w-5 text-yellow-300" />
                {item}
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/gold-platform")} className="karatly-gold-button mt-7 w-full max-w-md rounded-lg py-3 text-sm font-bold">
            Explore Platform
          </button>
        </section>

        <section className="mt-10">
          <p className="text-sm uppercase text-yellow-300">Producta</p>
          <h2 className="text-lg font-semibold">Explore Our Products</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {products.map(([title, sub]) => (
              <button key={title} type="button" onClick={() => navigate("/products")} className="karatly-card rounded-md p-6 text-left">
                <p className="text-3xl font-bold">{title}</p>
                <p className="mt-2 text-sm text-white/55">{sub}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
