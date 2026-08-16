"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, isPrinterSupported,
  printReceipt, type ReceiptData,
} from "@/lib/printer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Variant = { id: string; sku?: string; barcode?: string; price: number; stock_qty: number; attributes: any };
type Product = { id: string; name: string; slug: string; variants: Variant[] };
type CartItem = { variant_id: string; name: string; color: string; size: string; price: number; qty: number; sku?: string };

// Thermal receipt RIZZ logo (SVG inline, matches the black+white R brand mark)
function RizzLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="black" />
      {/* Stylised R */}
      <path d="M28 20 L28 80 M28 20 L58 20 Q78 20 78 40 Q78 55 60 58 L78 80" stroke="white" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Diagonal accent lines below R leg */}
      <line x1="40" y1="80" x2="52" y2="65" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="80" x2="62" y2="65" stroke="white" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function EscPosButton({ receipt }: { receipt: any }) {
  const [connected, setConnected] = useState(isPrinterConnected());
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const supported = isPrinterSupported();

  if (!supported) return null;

  async function connect() {
    try {
      await connectPrinter();
      setConnected(true);
      setStatus("✅ Connected");
    } catch (e: any) {
      setStatus(`❌ ${e.message ?? "Failed"}`);
    }
  }

  async function handlePrint() {
    if (!connected) { await connect(); return; }
    setPrinting(true); setStatus(null);
    try {
      const subtotal = receipt.subtotal ?? 0;
      const itemDiscount = receipt.discount_amount ?? 0;
      const netPayable = receipt.total ?? (subtotal - itemDiscount);
      const paid = (receipt.payment_cash ?? 0) + (receipt.payment_card ?? 0) + (receipt.payment_mobile ?? 0);
      const date = new Date(receipt.created_at);
      const dateStr = `${date.getDate().toString().padStart(2,"0")}.${(date.getMonth()+1).toString().padStart(2,"0")}.${date.getFullYear()} ${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")}`;

      const data: ReceiptData = {
        shop_name: "RIZZ LEATHER",
        shop_address: "Shop-345, 3F Afmi Plaza, Chattagram",
        shop_phone: "01627472686",
        invoice_no: receipt.tx_number,
        date: dateStr,
        cashier: receipt.cashier_name,
        items: (receipt.items ?? []).map((it: any) => ({
          name: `${it.name}${it.size ? ` (${it.size}/${it.color})` : ""}`,
          qty: it.qty,
          price: it.price,
          total: it.price * it.qty,
        })),
        item_total: subtotal,
        item_discount: itemDiscount || undefined,
        subtotal: subtotal - itemDiscount,
        net_payable: netPayable,
        paid,
        change: Math.max(0, paid - netPayable),
        payment_cash: receipt.payment_cash,
        payment_card: receipt.payment_card,
        payment_mobile: receipt.payment_mobile,
      };
      await printReceipt(data);
      setStatus("✅ Printed via ESC/POS");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    } finally { setPrinting(false); }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handlePrint}
        disabled={printing}
        className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {printing ? "Printing…" : connected ? "🖨 ESC/POS Print" : "🔌 Connect & Print"}
      </button>
      {status && <p className="text-[11px] text-center text-slate-500">{status}</p>}
    </div>
  );
}

function Receipt({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  const subtotal = receipt.subtotal ?? 0;
  const itemDiscount = receipt.discount_amount ?? 0;
  const otherDiscount = 0;
  const specialDiscount = 0;
  const subTotal = subtotal - itemDiscount;
  const netPayable = receipt.total ?? subTotal;
  const paid = (receipt.payment_cash ?? 0) + (receipt.payment_card ?? 0) + (receipt.payment_mobile ?? 0);
  const change = paid - netPayable;
  const date = new Date(receipt.created_at);
  const dateStr = `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")} ${date.getHours() >= 12 ? "PM" : "AM"}`;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          * { visibility: hidden !important; }
          #receipt-print-root, #receipt-print-root * { visibility: visible !important; }
          #receipt-print-root { position: fixed !important; top: 0 !important; left: 0 !important; width: 80mm !important; background: white !important; }
        }
        @media screen {
          #receipt-print-root { max-width: 340px; }
        }
        .receipt-font { font-family: 'Courier New', Courier, monospace; }
        .receipt-divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .receipt-row { display: flex; justify-content: space-between; font-size: 12px; line-height: 1.6; }
        .receipt-row-bold { font-weight: 700; font-size: 13px; }
      `}</style>

      <div id="receipt-print-root" className="mx-auto bg-white text-black receipt-font p-4 shadow-xl" style={{ maxWidth: 340 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <RizzLogo />
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>
            <div>Shop-345, 3rd Floor (Lift-3), Afmi Plaza</div>
            <div>Panchlaish, Chattagram</div>
            <div>Call: 01627472686</div>
          </div>
        </div>

        <hr className="receipt-divider" />

        {/* Invoice meta */}
        <div style={{ fontSize: 11, lineHeight: 1.7 }}>
          <div className="receipt-row"><span>Date</span><span>{dateStr}</span></div>
          <div className="receipt-row"><span>Counter No</span><span>1</span></div>
          <div className="receipt-row"><span>Invoice</span><span style={{ fontWeight: 700 }}>{receipt.tx_number}</span></div>
          <div className="receipt-row"><span>Cust. Name</span><span>{receipt.customer_name || "—"}</span></div>
          <div className="receipt-row"><span>Phone</span><span>{receipt.customer_phone || "—"}</span></div>
        </div>

        <hr className="receipt-divider" />

        {/* Items table */}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
          <span>Item / Description</span>
          <span>Amount</span>
        </div>
        {(receipt.items || []).map((item: any, i: number) => {
          const itemTotal = item.price * item.qty;
          const desc = [item.color, item.size].filter(Boolean).join(" / ");
          return (
            <div key={i} style={{ marginBottom: 4, fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ flex: 1, paddingRight: 8 }}>
                  {item.name}{desc ? ` (${desc})` : ""} ×{item.qty} @ ৳{item.price}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>৳{itemTotal.toLocaleString()}</span>
              </div>
            </div>
          );
        })}

        <hr className="receipt-divider" />

        {/* Totals */}
        <div style={{ fontSize: 12 }}>
          <div className="receipt-row"><span>Item Total</span><span>৳{subtotal.toLocaleString()}</span></div>
          <div className="receipt-row"><span>Item Discount</span><span>৳{itemDiscount.toLocaleString()}</span></div>
          <div className="receipt-row"><span>Other Discount</span><span>৳{otherDiscount.toFixed(2)}</span></div>
          <div className="receipt-row"><span>Special Discount</span><span>৳{specialDiscount.toFixed(2)}</span></div>
          <div className="receipt-row" style={{ fontWeight: 600 }}><span>Sub Total</span><span>৳{subTotal.toLocaleString()}</span></div>
        </div>

        <hr className="receipt-divider" />

        <div style={{ fontSize: 13 }}>
          <div className="receipt-row receipt-row-bold"><span>Net Payable</span><span>৳{netPayable.toLocaleString()}</span></div>
          <div className="receipt-row receipt-row-bold"><span>Paid</span><span>৳{paid.toLocaleString()}</span></div>
          <div className="receipt-row receipt-row-bold"><span>Change</span><span>৳{Math.max(0, change).toLocaleString()}</span></div>
        </div>

        {/* Payment method breakdown */}
        {(receipt.payment_cash > 0 || receipt.payment_card > 0 || receipt.payment_mobile > 0) && (
          <>
            <hr className="receipt-divider" />
            <div style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Payment Name</span><span>Amount</span>
              </div>
            </div>
            {receipt.payment_cash > 0 && <div className="receipt-row" style={{ fontSize: 11 }}><span>Cash</span><span>৳{Number(receipt.payment_cash).toLocaleString()}</span></div>}
            {receipt.payment_card > 0 && <div className="receipt-row" style={{ fontSize: 11 }}><span>Card</span><span>৳{Number(receipt.payment_card).toLocaleString()}</span></div>}
            {receipt.payment_mobile > 0 && <div className="receipt-row" style={{ fontSize: 11 }}><span>Mobile (bKash/Nagad)</span><span>৳{Number(receipt.payment_mobile).toLocaleString()}</span></div>}
          </>
        )}

        <hr className="receipt-divider" />

        {/* Footer */}
        <div style={{ fontSize: 10, textAlign: "center", lineHeight: 1.6, marginTop: 4 }}>
          <p>Please bring this invoice if you want to change the product within 7 days.</p>
          <p>No exchange will be available without invoice.</p>
          <p style={{ fontWeight: 700, marginTop: 4 }}>Thank you for Shopping At RIZZ!</p>
          <p style={{ marginTop: 6, fontSize: 9 }}>rizzleather.com</p>
        </div>

        {/* Barcode placeholder (tx_number) */}
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: "monospace", fontSize: 10, letterSpacing: 2 }}>
          ||| {receipt.tx_number} |||
        </div>
      </div>

      {/* Action buttons (screen only) */}
      <div className="flex gap-3 mt-4 no-print" style={{ maxWidth: 340, margin: "16px auto 0" }}>
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
        >
          🖨 Browser Print
        </button>
        <EscPosButton receipt={receipt} />
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-600"
        >
          New Sale
        </button>
      </div>
    </>
  );
}

export default function PosPage() {
  const router = useRouter();
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

  function loadProducts() {
    return fetch(`${API}/products?limit=200`).then((r) => r.json()).then((d) => {
      setProducts(Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : []);
    });
  }

  useEffect(() => { loadProducts(); }, []);

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

  function getVariantStock(variantId: string): number {
    for (const p of products) {
      const v = p.variants.find((v) => v.id === variantId);
      if (v) return v.stock_qty;
    }
    return 0;
  }

  function addToCart(p: Product, v: Variant) {
    if (v.stock_qty <= 0) return; // out of stock, don't add
    const existing = cart.findIndex((c) => c.variant_id === v.id);
    if (existing >= 0) {
      const newQty = cart[existing].qty + 1;
      if (newQty > v.stock_qty) {
        alert(`Only ${v.stock_qty} in stock for ${p.name}${v.attributes?.color ? ` (${v.attributes.color})` : ""}`);
        return;
      }
      setCart(cart.map((c, i) => i === existing ? { ...c, qty: newQty } : c));
    } else {
      setCart([...cart, { variant_id: v.id, name: p.name, color: v.attributes?.color || "", size: v.attributes?.size || "", price: v.price, qty: 1, sku: v.sku }]);
    }
    setSearch("");
    searchRef.current?.focus();
  }

  function updateQty(i: number, qty: number) {
    if (qty <= 0) { setCart(cart.filter((_, idx) => idx !== i)); return; }
    const stock = getVariantStock(cart[i].variant_id);
    if (qty > stock) {
      alert(`Only ${stock} in stock for ${cart[i].name}`);
      return;
    }
    setCart(cart.map((c, idx) => idx === i ? { ...c, qty } : c));
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = discount.type === "percent" ? Math.round(subtotal * discount.amount / 100) : Number(discount.amount);
  const total = Math.max(0, subtotal - discountAmt);
  const totalPaid = Number(payment.cash) + Number(payment.card) + Number(payment.mobile);
  const change = totalPaid - total;

  async function handleCheckout(status: "completed" | "draft") {
    if (cart.length === 0) return;
    // Frontend stock validation before sending to server
    if (status === "completed") {
      for (const item of cart) {
        const stock = getVariantStock(item.variant_id);
        if (item.qty > stock) {
          alert(`Insufficient stock! "${item.name}" has only ${stock} left but you're trying to sell ${item.qty}.`);
          return;
        }
      }
    }
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
        router.refresh();
        loadProducts(); // re-fetch stock so next sale shows updated quantities
      } else {
        alert("Draft saved: " + data.tx_number);
      }
    }
  }

  if (receipt) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-white mb-4 no-print">Receipt — {receipt.tx_number}</h1>
        <Receipt receipt={receipt} onClose={() => setReceipt(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
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
              {["TX #", "Customer", "Phone", "Items", "Total", "Cash", "Card", "Mobile", "Status", "Date"].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {history.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setReceipt(tx)}>
                  <td className="px-4 py-2 font-mono text-teal-400 text-xs">{tx.tx_number}</td>
                  <td className="px-4 py-2 text-slate-300">{tx.customer_name || "—"}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{tx.customer_phone || "—"}</td>
                  <td className="px-4 py-2 text-slate-400">{Array.isArray(tx.items) ? tx.items.length : 0}</td>
                  <td className="px-4 py-2 text-white font-medium">৳{tx.total?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-400">৳{tx.payment_cash || 0}</td>
                  <td className="px-4 py-2 text-slate-400">৳{tx.payment_card || 0}</td>
                  <td className="px-4 py-2 text-slate-400">৳{tx.payment_mobile || 0}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${tx.status === "completed" ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"}`}>{tx.status}</span></td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No transactions</td></tr>}
            </tbody>
          </table>
          <p className="text-xs text-slate-600 px-4 py-2">Click any row to view / reprint receipt</p>
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
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400"><span>Item Total</span><span>৳{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-slate-400"><span>Item Discount</span><span>-৳{discountAmt.toLocaleString()}</span></div>
              <div className="flex justify-between text-slate-400"><span>Other Discount</span><span>৳0</span></div>
              <div className="flex justify-between text-slate-400"><span>Special Discount</span><span>৳0</span></div>
              <div className="flex justify-between text-slate-300 font-medium border-t border-white/10 pt-1.5"><span>Sub Total</span><span>৳{(subtotal - discountAmt).toLocaleString()}</span></div>
              <div className="flex justify-between text-white font-bold text-base"><span>Net Payable</span><span>৳{total.toLocaleString()}</span></div>
              <div className="flex justify-between text-slate-400"><span>Paid</span><span>৳{totalPaid.toLocaleString()}</span></div>
              {change > 0 && <div className="flex justify-between text-emerald-400 font-medium"><span>Change</span><span>৳{change.toLocaleString()}</span></div>}
              {change < 0 && <div className="flex justify-between text-rose-400 font-medium"><span>Remaining</span><span>৳{Math.abs(change).toLocaleString()}</span></div>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleCheckout("completed")} disabled={saving || cart.length === 0} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-50">
                {saving ? "Processing…" : "Checkout & Print"}
              </button>
              <button onClick={() => handleCheckout("draft")} disabled={saving || cart.length === 0} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50">
                Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
