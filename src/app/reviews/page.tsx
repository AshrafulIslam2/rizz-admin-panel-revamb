"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Review = {
  id: string;
  productSlug: string;
  productName: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
};

const TABS = ["all", "pending", "approved"];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/reviews`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : (data.data ?? data.reviews ?? [])))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reviews.filter((r) => {
    if (activeTab === "pending") return !r.approved;
    if (activeTab === "approved") return r.approved;
    return true;
  });

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => !r.approved).length,
    approved: reviews.filter((r) => r.approved).length,
  };

  async function approve(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`${API}/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setReviews((prev) => prev.map((rv) => rv.id === id ? { ...rv, approved: true } : rv));
      setMsg("Review approved.");
    } catch {
      setMsg("Failed to approve.");
    } finally {
      setBusy(null);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function reject(id: string) {
    if (!confirm("Delete this review?")) return;
    setBusy(id);
    try {
      const r = await fetch(`${API}/reviews/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`${r.status}`);
      setReviews((prev) => prev.filter((rv) => rv.id !== id));
      setMsg("Review deleted.");
    } catch {
      setMsg("Failed to delete.");
    } finally {
      setBusy(null);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
          <h1 className="mt-1 text-2xl font-semibold">Reviews</h1>
          <p className="mt-1 text-sm text-slate-400">Moderate customer reviews before they appear on product pages.</p>
        </header>

        {msg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                activeTab === t
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t} <span className="ml-1 opacity-60">{counts[t as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white border border-slate-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
            {reviews.length === 0 ? "No reviews yet. Connect the reviews API." : "No reviews in this category."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => (
              <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{review.author}</p>
                      {review.verified && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Verified</span>
                      )}
                      <span className="text-xs text-slate-400">on {review.productName}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
                      ))}
                      <span className="ml-2 text-xs text-slate-400">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    {review.title && <p className="mt-2 text-sm font-semibold text-slate-800">{review.title}</p>}
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{review.body}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {!review.approved && (
                      <button
                        onClick={() => approve(review.id)}
                        disabled={busy === review.id}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => reject(review.id)}
                      disabled={busy === review.id}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
