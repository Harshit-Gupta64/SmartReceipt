"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Invoices that look premium",
    description:
      "Create polished invoices in seconds and send them without wrestling spreadsheets.",
    accent: "from-cyan-400 to-blue-500",
    glow: "shadow-cyan-500/20",
  },
  {
    icon: Receipt,
    title: "Expense tracking that stays sane",
    description:
      "Capture every expense, attach receipts, and keep everything organized without losing your mind.",
    accent: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/20",
  },
  {
    icon: Package,
    title: "Inventory with real-time alerts",
    description:
      "Track stock levels and get notified before you run out, avoiding last-minute disasters.",
    accent: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: TrendingUp,
    title: "Profit and loss at a glance",
    description:
      "Know exactly where your money is going, what is working, and what is quietly draining your business.",
    accent: "from-violet-400 to-purple-500",
    glow: "shadow-violet-500/20",
  },
  {
    icon: Bot,
    title: "AI business assistant",
    description:
      "Ask questions in plain English and get instant answers about invoices, expenses, and cash flow.",
    accent: "from-pink-400 to-rose-500",
    glow: "shadow-pink-500/20",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    description:
      "Stay on top of overdue payments, low stock, and confirmations without manually checking everything.",
    accent: "from-sky-400 to-indigo-500",
    glow: "shadow-sky-500/20",
  },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Boutique Owner, Mumbai",
    quote:
      "Saved me 10+ hours every week. The whole dashboard feels like it was built by someone who has actually run a business.",
    accent: "from-cyan-500 to-blue-600",
    rotate: -6,
    z: 30,
    top: 20,
    left: 0,
  },
  {
    name: "Rahul Verma",
    role: "Restaurant Owner, Delhi",
    quote:
      "Inventory alerts saved my business. I do not have to panic check stock all day anymore.",
    accent: "from-amber-500 to-orange-600",
    rotate: 5,
    z: 20,
    top: 60,
    left: 40,
  },
  {
    name: "Anita Patel",
    role: "Freelance Designer, Bangalore",
    quote:
      "Invoices take me minutes now. My clients think I have a much bigger setup than I do.",
    accent: "from-emerald-500 to-teal-600",
    rotate: -2,
    z: 40,
    top: 180,
    left: 15,
  },
];

const faqs = [
  {
    question: "Is SmartReceipt free to use?",
    answer:
      "Yes. You can get started for free and use the core tools for invoices, expenses, and inventory without paying upfront.",
  },
  {
    question: "Do I need technical knowledge?",
    answer:
      "No. The interface is designed for business owners, not developers. If you can use WhatsApp, you can use SmartReceipt.",
  },
  {
    question: "Can my team use the same account?",
    answer:
      "Yes. You can collaborate with team members so everyone stays in sync without confusion.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Your data is handled securely with standard protection practices and row-level access control.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes! Export all invoices, expenses and reports as PDF or CSV files at any time with one click.",
  },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-sm font-black text-white ring-2 ring-white/30 shadow-lg">
      {initials}
    </div>
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToFeatures = () => {
    const el = document.getElementById("features");
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#060914] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-60 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute top-40 right-[-12rem] h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/8 bg-[#060914]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">
              Smart<span className="text-cyan-400">Receipt</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <button onClick={scrollToFeatures} className="transition hover:text-white">
              Features
            </button>
            <a href="#stories" className="transition hover:text-white">
              Stories
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/dashboard"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-90"
            >
              Get Started →
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28">
        <div className="mx-auto grid min-h-[92vh] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300"
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              Built for small businesses that want less chaos
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl"
            >
              Run your business.{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Not your spreadsheets.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-6 max-w-xl text-lg leading-8 text-white/60"
            >
              SmartReceipt helps you manage invoices, expenses, inventory, and
              profit in one place. Fast, modern, and actually pleasant to use.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-cyan-500/25 transition hover:opacity-90"
                >
                  Start free <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <button
                  onClick={scrollToFeatures}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/10"
                >
                  See features
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              {[
                { icon: ShieldCheck, text: "Secure by design", color: "text-emerald-400" },
                { icon: Users, text: "Built for teams", color: "text-cyan-400" },
                { icon: BadgeCheck, text: "No credit card", color: "text-amber-400" },
              ].map((badge) => (
                <span
                  key={badge.text}
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-white/60"
                >
                  <badge.icon className={`h-4 w-4 ${badge.color}`} />
                  {badge.text}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Testimonial cards */}
          <div className="relative mx-auto h-[480px] w-full max-w-[520px]">
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/8 bg-white/3 shadow-2xl backdrop-blur-xl" />
            <div className="absolute inset-0 overflow-hidden rounded-[2.5rem]">
              <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
            </div>

            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30, rotate: t.rotate }}
                animate={{ opacity: 1, y: 0, rotate: t.rotate }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                whileHover={{ y: -10, rotate: t.rotate + 2, scale: 1.03, zIndex: 50 }}
                className="absolute w-72 cursor-pointer"
                style={{ top: t.top, left: `${t.left}%`, zIndex: t.z }}
              >
                <div className={`rounded-[1.75rem] bg-gradient-to-br ${t.accent} p-[1.5px] shadow-2xl`}>
                  <div className="rounded-[1.65rem] bg-[#0d1526]/95 p-5 backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar name={t.name} />
                      <div>
                        <p className="text-sm font-bold text-white">{t.name}</p>
                        <p className="text-xs text-white/50">{t.role}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-white/75">"{t.quote}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-28 rounded-b-[2.5rem] bg-gradient-to-t from-[#060914] to-transparent" />
          </div>
        </div>
      </section>

      {/* Problem strip */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/8 bg-white/3 px-8 py-8 backdrop-blur-xl">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { emoji: "😤", title: "Chasing payments", text: "Stop sending reminders manually. Keep your cash flow visible at all times." },
              { emoji: "📊", title: "Messy spreadsheets", text: "Replace endless tabs with one clean dashboard that actually makes sense." },
              { emoji: "😰", title: "Stock surprises", text: "Get notified before you run out and lose sales at the worst possible moment." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 items-start">
                <span className="text-3xl">{item.emoji}</span>
                <div>
                  <p className="font-bold text-white mb-1">{item.title}</p>
                  <p className="text-sm leading-6 text-white/50">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl mb-16">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Features
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                arranged like it makes sense.
              </span>
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/55">
              SmartReceipt gives you the core tools small businesses actually use — with enough style to feel modern.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-6 shadow-xl backdrop-blur-xl transition-all"
              >
                <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${feature.accent}`} />
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl transition group-hover:bg-white/10" />
                <div className="relative z-10 space-y-4">
                  <div className={`flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} shadow-lg ${feature.glow} p-3`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                  <p className="text-sm leading-6 text-white/55">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/8 bg-white/3 p-10 backdrop-blur-xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                How it works
              </p>
              <h2 className="text-4xl font-black tracking-tight">
                Simple enough to use daily.{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Strong enough for real business.
                </span>
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/55">
                You do not need a giant setup or a week of training. Just open it, add your data, and move on.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { step: "01", text: "Create invoices and send them fast", color: "from-cyan-400 to-blue-500" },
                { step: "02", text: "Track expenses and receipts automatically", color: "from-amber-400 to-orange-500" },
                { step: "03", text: "Watch stock and profit without guesswork", color: "from-emerald-400 to-teal-500" },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  whileHover={{ x: 6 }}
                  className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-5 transition"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-sm font-black text-white flex-shrink-0`}>
                    {item.step}
                  </div>
                  <p className="text-sm font-medium text-white/80">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section id="stories" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
              Social proof
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Business owners{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                actually like it
              </span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`rounded-2xl bg-gradient-to-br ${t.accent} p-[1.5px] shadow-xl cursor-pointer`}
              >
                <div className="h-full rounded-[calc(1rem-1.5px)] bg-[#0d1526]/95 p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar name={t.name} />
                    <div>
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-xs text-white/50">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-white/70">"{t.quote}"</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-violet-400">FAQ</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Questions,{" "}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                answered.
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.07 }}
                className="overflow-hidden rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl"
              >
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-white/5"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-white">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-violet-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-white/40" />
                  )}
                </button>
                {openFaq === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-white/8 px-6 py-5 text-sm leading-7 text-white/60"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-violet-500/10 px-8 py-20 text-center backdrop-blur-xl">
            <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <h2 className="mx-auto max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                Ready to make your business{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  actually run itself?
                </span>
              </h2>
              <p className="mx-auto max-w-xl text-lg text-white/55">
                Join thousands of business owners who use SmartReceipt to save time and grow their business.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-cyan-500/25 transition hover:opacity-90"
                  >
                    Get Started Free <ArrowRight className="h-5 w-5" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                  <button
                    onClick={scrollToFeatures}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/10"
                  >
                    See features
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-bold text-white/70">SmartReceipt</p>
          </div>
          <p>© 2026 SmartReceipt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}