import { useState } from "react";
import {
  ChevronRight,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Search
} from "lucide-react";
import AppSubpageLayout, { AppPageBack } from "../components/AppSubpageLayout";

const SUPPORT_CHANNELS = [
  { icon: MessageCircle, title: "Live Chat", sub: "Avg 2 min" },
  { icon: Phone, title: "Call Us", sub: "1800-123-4567" },
  { icon: Mail, title: "Email", sub: "help@karatly.in" }
];

const TOPICS = [
  "How is gold price calculated?",
  "When does SIP debit happen?",
  "How to redeem physical gold",
  "What are storage fee?",
  "How do i withdraw funds?"
];

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filteredTopics = TOPICS.filter((topic) =>
    topic.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <AppSubpageLayout>
      <AppPageBack title="Help Center" />

      <section className="karatly-subpage-hero rounded-2xl p-6 text-center sm:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-yellow-400/15 text-yellow-400">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">How can we help?</h1>
        <div className="relative mx-auto mt-5 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="karatly-input w-full rounded-full py-3 pl-11 pr-4 text-sm"
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] text-white/80">GET IN TOUCH</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SUPPORT_CHANNELS.map(({ icon: Icon, title, sub }) => (
            <button
              key={title}
              type="button"
              className="karatly-subpage-panel rounded-2xl p-5 text-left transition hover:bg-white/[0.03]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-yellow-400/15 text-yellow-400">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-white/45">{sub}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] text-white/80">POPULAR TOPICS</h2>
        <div className="karatly-subpage-panel overflow-hidden rounded-2xl">
          {(filteredTopics.length ? filteredTopics : TOPICS).map((topic) => (
            <button
              key={topic}
              type="button"
              className="flex w-full items-center justify-between border-b border-white/8 px-5 py-4 text-left text-sm last:border-b-0 hover:bg-white/[0.03]"
            >
              <span>{topic}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
            </button>
          ))}
        </div>
      </section>
    </AppSubpageLayout>
  );
}
