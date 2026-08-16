/**
 * Rongta RP80VI Printer Utility
 * - printLabel()   → TSPL commands (label/barcode mode)
 * - printReceipt() → ESC/POS commands (receipt mode)
 * Requires Chrome/Edge with WebUSB support.
 */

// ─── WebUSB Connection ────────────────────────────────────────────────────────

// Common USB vendor IDs for Rongta / generic thermal printers
const PRINTER_FILTERS: USBDeviceFilter[] = [
  { vendorId: 0x20d1 }, // Rongta
  { vendorId: 0x0fe6 }, // Rongta alternate
  { vendorId: 0x0483 }, // Generic thermal (STM)
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x6868 }, // Various POS
  { vendorId: 0x0525 }, // NetChip / generic USB serial
];

let _device: USBDevice | null = null;
let _endpointOut = 1; // default bulk-out endpoint number

export function isPrinterSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function isPrinterConnected(): boolean {
  return !!(_device?.opened);
}

export async function connectPrinter(): Promise<USBDevice> {
  if (_device?.opened) return _device;

  _device = await (navigator as any).usb.requestDevice({ filters: PRINTER_FILTERS });
  await _device!.open();

  if (_device!.configuration === null) {
    await _device!.selectConfiguration(1);
  }

  // Find the bulk-out endpoint
  const iface = _device!.configuration!.interfaces[0];
  await _device!.claimInterface(iface.interfaceNumber);
  const alt = iface.alternate;
  for (const ep of alt.endpoints) {
    if (ep.direction === "out" && ep.type === "bulk") {
      _endpointOut = ep.endpointNumber;
      break;
    }
  }

  return _device!;
}

export async function disconnectPrinter(): Promise<void> {
  if (_device?.opened) await _device.close();
  _device = null;
}

async function sendRaw(data: Uint8Array): Promise<void> {
  if (!_device?.opened) throw new Error("Printer not connected. Click 'Connect Printer' first.");
  // Send in 64-byte chunks to avoid USB transfer size limits
  const CHUNK = 64;
  for (let i = 0; i < data.length; i += CHUNK) {
    await _device.transferOut(_endpointOut, data.slice(i, i + CHUNK));
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function enc(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ─── ESC/POS Receipt Printing ─────────────────────────────────────────────────

// ESC/POS byte constants
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

// Effective printable columns at 80mm paper (72mm usable / ~8px per char at 12-dot font)
const COLS = 32;

// Pad a two-column row to COLS width
function padRow(left: string, right: string): string {
  const gap = COLS - left.length - right.length;
  return left + " ".repeat(Math.max(1, gap)) + right + "\n";
}

// Word-wrap text to fit within `width` chars
function wrap(str: string, width = COLS - 10): string[] {
  const words = str.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + w).length > width) { if (line) lines.push(line.trimEnd()); line = ""; }
    line += w + " ";
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [str.slice(0, width)];
}

// ESC/POS command buffers
const ESCPOS = {
  INIT:         new Uint8Array([ESC, 0x40]),
  CENTER:       new Uint8Array([ESC, 0x61, 0x01]),
  LEFT:         new Uint8Array([ESC, 0x61, 0x00]),
  RIGHT:        new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON:      new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF:     new Uint8Array([ESC, 0x45, 0x00]),
  SIZE_NORMAL:  new Uint8Array([GS,  0x21, 0x00]),
  SIZE_2H:      new Uint8Array([GS,  0x21, 0x01]), // double height
  SIZE_2W:      new Uint8Array([GS,  0x21, 0x10]), // double width
  SIZE_2X:      new Uint8Array([GS,  0x21, 0x11]), // double width+height
  LF:           new Uint8Array([LF]),
  FEED4:        new Uint8Array([ESC, 0x64, 0x04]),
  CUT:          new Uint8Array([GS,  0x56, 0x42, 0x00]), // partial cut
};

export type ReceiptData = {
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
  invoice_no: string;
  date: string;
  cashier?: string;
  items: { name: string; qty: number; price: number; total: number }[];
  item_total: number;
  item_discount?: number;
  other_discount?: number;
  special_discount?: number;
  subtotal: number;
  net_payable: number;
  paid: number;
  change: number;
  payment_cash?: number;
  payment_card?: number;
  payment_mobile?: number;
  footer?: string;
};

export async function printReceipt(data: ReceiptData): Promise<void> {
  const fmt = (n: number) => `Tk ${n.toLocaleString("en-US")}`;
  const divider  = enc("-".repeat(COLS) + "\n");
  const divider2 = enc("=".repeat(COLS) + "\n");

  const buf: Uint8Array[] = [
    ESCPOS.INIT,
    // ── Header ──
    ESCPOS.CENTER,
    ESCPOS.BOLD_ON, ESCPOS.SIZE_2X,
    enc((data.shop_name ?? "RIZZ LEATHER") + "\n"),
    ESCPOS.SIZE_NORMAL, ESCPOS.BOLD_OFF,
    data.shop_address ? enc(data.shop_address + "\n") : new Uint8Array(0),
    data.shop_phone   ? enc(data.shop_phone   + "\n") : new Uint8Array(0),
    ESCPOS.LF,

    // ── Invoice meta ──
    ESCPOS.LEFT,
    enc(padRow("Invoice#:", data.invoice_no)),
    enc(padRow("Date:",     data.date)),
    data.cashier ? enc(padRow("Cashier:", data.cashier)) : new Uint8Array(0),
    divider,

    // ── Items header ──
    ESCPOS.BOLD_ON,
    enc(padRow("Item", "Total")),
    ESCPOS.BOLD_OFF,
    divider,
  ];

  // Items
  for (const item of data.items) {
    const nameLines = wrap(item.name, COLS - 12);
    buf.push(enc(nameLines[0].padEnd(COLS - 12) + fmt(item.total).padStart(12) + "\n"));
    for (let i = 1; i < nameLines.length; i++) buf.push(enc("  " + nameLines[i] + "\n"));
    buf.push(enc(`  x${item.qty} @ ${fmt(item.price)}\n`));
  }

  buf.push(
    divider,
    // ── Totals ──
    enc(padRow("Item Total:",     fmt(data.item_total))),
  );
  if (data.item_discount)    buf.push(enc(padRow("Item Discount:",    `-${fmt(data.item_discount)}`)));
  if (data.other_discount)   buf.push(enc(padRow("Other Discount:",   `-${fmt(data.other_discount)}`)));
  if (data.special_discount) buf.push(enc(padRow("Special Discount:", `-${fmt(data.special_discount)}`)));

  buf.push(
    divider2,
    ESCPOS.BOLD_ON,
    enc(padRow("Net Payable:", fmt(data.net_payable))),
    ESCPOS.BOLD_OFF,
    enc(padRow("Paid:",   fmt(data.paid))),
    enc(padRow("Change:", fmt(data.change))),
  );

  // Payment breakdown
  if ((data.payment_cash ?? 0) > 0)   buf.push(enc(padRow("  Cash:",   fmt(data.payment_cash!))));
  if ((data.payment_card ?? 0) > 0)   buf.push(enc(padRow("  Card:",   fmt(data.payment_card!))));
  if ((data.payment_mobile ?? 0) > 0) buf.push(enc(padRow("  Mobile:", fmt(data.payment_mobile!))));

  buf.push(
    divider,
    ESCPOS.LF,
    // ── Footer ──
    ESCPOS.CENTER,
    enc("Exchange within 3 days.\n"),
    enc("No exchange on sale items.\n"),
    enc((data.footer ?? "Thank you for shopping with RIZZ!") + "\n"),
    ESCPOS.FEED4,
    ESCPOS.CUT,
  );

  await sendRaw(concat(...buf));
}

// ─── TSPL Label Printing ──────────────────────────────────────────────────────

// 1 mm = 8 dots at 203 DPI
const MM_TO_DOT = 8;

export type LabelData = {
  /** Label stock dimensions */
  width_mm: number;   // 24–82mm
  height_mm: number;  // 20–250mm
  gap_mm?: number;    // gap between labels (default 3mm, use if gap-type stock)
  use_black_mark?: boolean; // set true for black-mark stock (uses BLINE instead of GAP)
  bline_mm?: number;  // black-mark height in mm (default 3)

  product_name: string;
  variant_name?: string; // e.g. "42 / Tan"
  price: number;
  sale_price?: number;
  sku?: string;
  barcode?: string;           // barcode data; falls back to sku
  barcode_type?: "CODE128" | "EAN13" | "CODE39"; // default CODE128
  show_qr?: boolean;          // add a small QR code
  qty?: number;               // copies to print (default 1)
};

/** Label size presets */
export const LABEL_PRESETS = {
  small:  { width_mm: 40, height_mm: 25, label: "40×25 mm (small tag)" },
  medium: { width_mm: 60, height_mm: 40, label: "60×40 mm (shoe label)" },
  large:  { width_mm: 80, height_mm: 50, label: "80×50 mm (full label)" },
} as const;

export async function printLabel(data: LabelData): Promise<void> {
  const W = Math.round(data.width_mm  * MM_TO_DOT);
  const H = Math.round(data.height_mm * MM_TO_DOT);
  const qty = data.qty ?? 1;
  const barcodeData = data.barcode ?? data.sku ?? "";
  const barcodeType = data.barcode_type ?? "CODE128";

  const lines: string[] = [];

  // ── Label setup ──
  lines.push(`SIZE ${data.width_mm} mm, ${data.height_mm} mm`);
  if (data.use_black_mark) {
    lines.push(`BLINE ${data.bline_mm ?? 3} mm, 0 mm`);
  } else {
    lines.push(`GAP ${data.gap_mm ?? 3} mm, 0 mm`);
  }
  lines.push("DIRECTION 0,0");
  lines.push("REFERENCE 0,0");
  lines.push("OFFSET 0 mm");
  lines.push("SET PEEL OFF");
  lines.push("SET CUTTER OFF");
  lines.push("CLS");

  // ── Layout positions (dots) ──
  const margin = 16;
  let y = margin;

  // Product name — font "3" (16×24 dots), bold
  const name = data.product_name.slice(0, 24);
  lines.push(`BOLD 1`);
  lines.push(`TEXT ${margin}, ${y}, "3", 0, 1, 1, "${name}"`);
  lines.push(`BOLD 0`);
  y += 28;

  // Variant (size / color)
  if (data.variant_name) {
    lines.push(`TEXT ${margin}, ${y}, "2", 0, 1, 1, "${data.variant_name}"`);
    y += 24;
  }

  // Price
  const priceStr = data.sale_price
    ? `Tk ${data.sale_price.toLocaleString("en-US")}  (Tk ${data.price.toLocaleString("en-US")})`
    : `Tk ${data.price.toLocaleString("en-US")}`;
  lines.push(`TEXT ${margin}, ${y}, "2", 0, 1, 1, "${priceStr}"`);
  y += 28;

  // Barcode (CODE128 centered, height = remaining space minus footer)
  if (barcodeData) {
    const barcodeH = Math.max(40, H - y - 36);
    // narrow=2 wide=4 → good scan reliability
    lines.push(`BARCODE ${margin}, ${y}, "${barcodeType}", ${barcodeH}, 1, 0, 2, 4, "${barcodeData}"`);
    y += barcodeH + 4;
  }

  // SKU text under barcode
  if (data.sku) {
    lines.push(`TEXT ${margin}, ${y}, "1", 0, 1, 1, "SKU: ${data.sku}"`);
  }

  // QR code (bottom-right corner, small)
  if (data.show_qr && barcodeData) {
    const qrSize = 4;
    const qrX = W - (qrSize * 10) - margin;
    const qrY = H - (qrSize * 10) - margin;
    lines.push(`QRCODE ${qrX}, ${qrY}, H, ${qrSize}, A, 0, M2, "${barcodeData}"`);
  }

  // ── Print ──
  lines.push(`PRINT ${qty}, 1`);

  await sendRaw(enc(lines.join("\r\n") + "\r\n"));
}

// ─── Calibration ─────────────────────────────────────────────────────────────

/** Run auto-calibration (detects gap/black-mark, aligns first label). */
export async function calibratePrinter(): Promise<void> {
  const cmd = "SET CUTTER OFF\r\nSET PEEL OFF\r\nCALIBRATE\r\n";
  await sendRaw(enc(cmd));
}

/** Feed n labels (useful to verify alignment after calibration). */
export async function feedLabels(count = 1): Promise<void> {
  const cmd = `FORMFEED ${count}\r\n`;
  await sendRaw(enc(cmd));
}
