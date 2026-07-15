"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Variant = { id: string; sku?: string; barcode?: string; price: number; stock_qty: number; attributes: any };
type Product = { id: string; name: string; slug: string; variants: Variant[] };
type CartItem = { variant_id: string; name: string; color: string; size: string; price: number; qty: number; sku?: string };

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState({ type: "flat", amount: 0 });
  const [payment, setPayment] = useState({ cash: 0, card: 0, mobile: 0 });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [tab, setTab] = useState<"pos" | "history">("pos");
  const [history, setHistory] = useState<any[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/products?limit=200`).then((r) => r.json()).then((d) => {
      setProducts(Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : []);
    });
  }, []);

  useEffect(() => {
    if (tab === "history") {
      fetch(`${API}/pos?limit=50`).then((r) => r.json()).then((d) => setHistory(Array.isArray(d) ? d : []));
    }
  }, [tab]);

  const filtered = search.length < 2 ? [] : products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.includes(search.toLowerCase()) ||
    p.variants.some((v) => v.sku?.toLowerCase().includes(search.toLowerCase()) || v.barcode?.includes(search))
  ).slice(0, 8);

  function addToCart(p: Product, v: Variant) {
    const existing = cart.findIndex((c) => c.variant_id === v.id);
    if (existing >= 0) {
      setCart(cart.map((c, i) => i === existing ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { variant_id: v.id, name: p.name, color: v.attributes?.color || "", size: v.attributes?.size || "", price: v.price, qty: 1, sku: v.sku }]);
    }
    setSearch("");
    searchRef.current?.focus();
  }

  function updateQty(i: number, qty: number) {
    if (qty <= 0) { setCart(cart.filter((_, idx) => idx !== i)); return; }
    setCart(cart.map((c, idx) => idx === i ? { ...c, qty } : c));
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = discount.type === "percent" ? Math.round(subtotal * discount.amount / 100) : Number(discount.amount);
  const total = Math.max(0, subtotal - discountAmt);
  const totalPaid = Number(payment.cash) + Number(payment.card) + Number(payment.mobile);
  const change = totalPaid - total;

  async function handleCheckout(status: "completed" | "draft") {
    if (cart.length === 0) return;
    setSaving(true);
    const res = await fetch(`${API}/pos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customer.name || null,
        customer_phone: customer.phone || null,
        items: cart.map((c) => ({ variant_id: c.variant_id, name: c.name, color: c.color, size: c.size, price: c.price, qty: c.qty })),
        subtotal,
        discount_amount: discountAmt,
        discount_type: discount.type,
        total,
        payment_cash: Number(payment.cash),
        payment_card: Number(payment.card),
        payment_mobile: Number(payment.mobile),
        note,
        status,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      if (status === "completed") {
        setReceipt(data);
        setCart([]);
        setCustomer({ name: "", phone: "" });
        setDiscount({ type: "flat", amount: 0 });
        setPayment({ cash: 0, card: 0, mobile: 0 });
        setNote("");
      } else {
        alert("Draft saved: " + data.tx_number);
      }
    }
  }

  function printReceipt() { window.print(); }

  if (receipt) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center space-y-3">
          <p className="text-teal-400 text-xs font-semibold uppercase tracking-widest">RIZZ Leather</p>
          <p className="text-white font-bold text-lg">Receipt</p>
          <p className="text-slate-400 font-mono text-sm">{receipt.tx_number}</p>
          <p className="text-slate-400 text-xs">{new Date(receipt.created_at).toLocaleString()}</p>
          {receipt.customer_name && <p className="text-slate-300 text-sm">{receipt.customer_name}{receipt.customer_phone ? ` · ${receipt.customer_phone}` : ""}</p>}
          <div className="border-t border-white/10 pt-3 space-y-1 text-left">
            {(receipt.items || []).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">{item.name} {item.color} {item.size} ×{item.qty}</span>
                <span className="text-white">৳{(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>৳{receipt.subtotal?.toLocaleString()}</span></div>
            {receipt.discount_amount > 0 && <div className="flex justify-between text-rose-400"><span>Discount</span><span>-৳{receipt.discount_amount?.toLocaleString()}</span></div>}
            <div className="flex justify-between text-white font-bold text-base pt-1"><span>Total</span><span>৳{receipt.total?.toLocaleString()}</span></div>
            {receipt.payment_cash > 0 && <div className="flex justify-between text-slate-400"><span>Cash</span><span>৳{receipt.payment_cash?.toLocaleString()}</span></div>}
            {receipt.payment_card > 0 && <div className="flex justify-between text-slate-400"><span>Card</span><span>৳{receipt.payment_card?.toLocaleString()}</span></div>}
            {receipt.payment_mobile > 0 && <div className="flex justify-between text-slate-400"><span>Mobile</span><span>৳{receipt.payment_mobile?.toLocaleString()}</span></div>}
          </div>
          <p className="text-slate-500 text-xs pt-2">Thank you for shopping with RIZZ Leather!</p>
        </div>
        <div className="flex gap-3">
          <button onClick={printReceipt} className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">Print Receipt</button>
          <button onClick={() => setReceipt(null)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">New Sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">POS Terminal</h1>
        <div className="flex gap-2">
          {(["pos", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {t === "pos" ? "POS" : "Sales History"}
            </button>
          ))}
        </div>
      </div>

      {tab === "history" && (
        <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
              {["TX #", "Customer", "Items", "Total", "Cash", "Card", "Mobile", "Status", "Date"].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {history.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2 font-mono text-white">{tx.tx_number}</td>
                  <td className="px-4 py-2 text-slate-300">{tx.customer_name || "—"}</td>
                  <td className="px-4 py-2 text-slate-400">{Array.isArray(tx.items) ? tx.items.length : 0}</td>
                  <td className="px-4 py-2 text-white font-medium">৳{tx.total?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-400">৳{tx.payment_cash || 0}</td>
                  <td className="px-4 py-2 text-slate-400">৳{tx.payment_card || 0}</td>
                  <td className="px-4 py-2 text-slate-400">৳{tx.payment_mobile || 0}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${tx.status === "completed" ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"}`}>{tx.status}</span></td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No transactions</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: product search */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative">
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, or scan barcode…" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" autoFocus />
              {filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-white/10 bg-slate-900 shadow-xl overflow-hidden">
                  {filtered.map((p) =>
                    p.variants.map((v) => (
                      <button key={v.id} onClick={() => addToCart(p, v)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/10 transition border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm text-white">{p.name}</p>
                          <p className="text-xs text-slate-400">{v.attributes?.color} · {v.attributes?.size}{v.sku ? ` · ${v.sku}` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">৳{v.price}</p>
                          <p className={`text-xs ${v.stock_qty > 0 ? "text-emerald-400" : "text-rose-400"}`}>{v.stock_qty > 0 ? `${v.stock_qty} in stock` : "Out of stock"}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-4 py-2">
                        <p className="text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.color} · {item.size}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-300">৳{item.price}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(i, item.qty - 1)} className="w-6 h-6 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">-</button>
                          <span className="w-8 text-center text-white">{item.qty}</span>
                          <button onClick={() => updateQty(i, item.qty + 1)} className="w-6 h-6 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">+</button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-white font-medium">৳{(item.price * item.qty).toLocaleString()}</td>
                      <td className="px-4 py-2"><button onClick={() => updateQty(i, 0)} className="text-rose-400 hover:text-rose-300 text-xs">✕</button></td>
                    </tr>
                  ))}
                  {cart.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Cart is empty — search to add products</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: payment panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer */}
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Customer (optional)</h3>
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500" />
            </div>

            {/* Discount */}
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Discount</h3>
              <div className="flex gap-2">
                <select value={discount.type} onChange={(e) => setDiscount({ ...discount, type: e.target.value })} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option value="flat">৳ Flat</option>
                  <option value="percent">% Percent</option>
                </select>
                <input type="number" min="0" value={discount.amount} onChange={(e) => setDiscount({ ...discount, amount: Number(e.target.value) })} className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Payment</h3>
              {[
                { key: "cash", label: "Cash" },
                { key: "card", label: "Card" },
                { key: "mobile", label: "Mobile (bKash/Nagad)" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="w-28 text-xs text-slate-400">{label}</label>
                  <input type="number" min="0" value={(payment as any)[key]} onChange={(e) => setPayment({ ...payment, [key]: Number(e.target.value) })} className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                </div>
              ))}
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500" />
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-rose-400"><span>Discount</span><span>-৳{discountAmt.toLocaleString()}</span></div>}
              <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-white/10"><span>Total</span><span>৳{total.toLocaleString()}</span></div>
              <div className="flex justify-between text-slate-400"><span>Total Paid</span><span>৳{totalPaid.toLocaleString()}</span></div>
              {change > 0 && <div className="flex justify-between text-emerald-400 font-medium"><span>Change</span><span>৳{change.toLocaleString()}</span></div>}
              {change < 0 && <div className="flex justify-between text-rose-400 font-medium"><span>Remaining</span><span>৳{Math.abs(change).toLocaleString()}</span></div>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleCheckout("completed")} disabled={saving || cart.length === 0} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-50">
                {saving ? "Processing…" : "Checkout"}
              </button>
              <button onClick={() => handleCheckout("draft")} disabled={saving || cart.length === 0} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50">
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
