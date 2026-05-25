import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateToken } from "../api/authApi";
import {
  Bell,
  Box,
  Gift,
  Shield,
  TrendingUp
} from "lucide-react";
import AppSubpageLayout, { AppPageBack } from "../components/AppSubpageLayout";

const TABS = ["All", "Prices", "Orders", "Rewards", "Accounts"];

const NOTIFICATIONS = {
  TODAY: [
    {
      icon: TrendingUp,
      title: "Gold up 1.8% today",
      unread: true,
      body: "₹15,121/g · Your portfolio gained ₹2,840.",
      time: "4:32 PM"
    },
    {
      icon: Box,
      title: "Order confirmed",
      unread: true,
      body: "0.82g gold purchased · Order #KG-2841",
      time: "2:15 PM"
    },
    {
      icon: Gift,
      title: "Referral reward earned",
      unread: false,
      body: "₹500 credited for inviting Priya S.",
      time: "11:00 AM"
    }
  ],
  YESTERDAY: [
    {
      icon: TrendingUp,
      title: "Silver rate alert",
      unread: false,
      body: "Silver crossed ₹92,000/ kg threshold.",
      time: "6:45 PM"
    },
    {
      icon: Box,
      title: "SIP executed",
      unread: false,
      body: "₹2,500 debited · 0.16g gold added.",
      time: "9:00 AM"
    }
  ],
  EARLIER: [
    {
      icon: Shield,
      title: "KYC Verified",
      unread: false,
      body: "Your account is fully verified. Unlimited limits unlocked.",
      time: "May 13"
    },
    {
      icon: Shield,
      title: "New login detected",
      unread: false,
      body: "Login from Chrome · Mumbai, India.",
      time: "May 10"
    }
  ]
};

function NotificationRow({ item }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-4 border-b border-white/8 px-5 py-4 last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/8 text-white/55">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{item.title}</p>
          {item.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /> : null}
        </div>
        <p className="mt-1 text-xs text-white/45">{item.body}</p>
      </div>
      <p className="shrink-0 text-xs text-white/40">{item.time}</p>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    validateToken().then((auth) => {
      if (!auth?.ok) navigate("/login");
    });
  }, [navigate]);

  return (
    <AppSubpageLayout>
      <AppPageBack title="Notifications" />

      <section className="karatly-subpage-hero flex items-center gap-4 rounded-2xl p-6 sm:p-7">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-yellow-400 text-black">
          <Bell className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Stay in Loop</h1>
          <p className="mt-1 text-sm text-white/50">Prices moves, Orders, Rewards & Security</p>
        </div>
      </section>

      <div className="mt-6 inline-flex w-full max-w-xl flex-wrap gap-1 rounded-full border border-white/10 bg-[#101514] p-1 sm:flex-nowrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              activeTab === tab ? "bg-yellow-400 text-black" : "text-white/55 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {Object.entries(NOTIFICATIONS).map(([group, items]) => (
          <section key={group}>
            <h2 className="mb-3 text-xs font-bold tracking-[0.2em] text-white/45">{group}</h2>
            <div className="karatly-subpage-panel overflow-hidden rounded-2xl">
              {items.map((item) => (
                <NotificationRow key={`${group}-${item.title}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppSubpageLayout>
  );
}
