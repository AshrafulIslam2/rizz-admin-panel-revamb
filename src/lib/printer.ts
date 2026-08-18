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
  if (!_device || !_device.opened) throw new Error("Printer not connected. Click 'Connect Printer' first.");
  // Send as single transfer — let the USB stack handle packetization
  await _device.transferOut(_endpointOut, data);
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
  // Feed past the tear bar. This printer has no cutter, so the paper must be
  // advanced far enough that tearing doesn't cut into the printed footer.
  FEED_TEAR:    new Uint8Array([ESC, 0x64, 0x06]),
  CUT:          new Uint8Array([GS,  0x56, 0x42, 0x00]), // partial cut (unused: RP80VI has no cutter)
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
    // The RP80VI has no auto-cutter (its spec says "Manual tearing"), so the
    // cut command is dropped and replaced with enough feed to push the last
    // printed line clear of the tear bar — otherwise you'd rip through the
    // footer every time.
    ESCPOS.FEED_TEAR,
  );

  await sendRaw(concat(...buf));
}

// ─── TSPL Label Printing ──────────────────────────────────────────────────────

// 1 mm ≈ 7.87 dots at 200 DPI (Rongta RP80VI), rounded to 8
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

/** Label size presets — based on actual Rongta RP80VI driver settings (200 DPI) */
export const LABEL_PRESETS = {
  standard:  { width_mm: 76, height_mm: 180, label: "76×180 mm (standard)" },
  medium:    { width_mm: 76, height_mm:  90, label: "76×90 mm (half)" },
  small:     { width_mm: 76, height_mm:  50, label: "76×50 mm (small tag)" },
  dtsticker: { width_mm: 45, height_mm:  35, label: "45×35 mm (DT sticker)" },
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
  lines.push("SPEED 4");
  lines.push("DENSITY 8");    // matches Rongta driver default (density=8)
  lines.push("DIRECTION 0");
  lines.push("CLS");

  // ── Layout (200 DPI, 1mm ≈ 8 dots) ──
  // Tiny stock (e.g. 45×35mm DT stickers) needs a tighter layout — the
  // standard spacing below is tuned for the 180mm roll and overflows a
  // short label.
  const compact = data.height_mm <= 40;
  const margin = compact ? 12 : 24;   // 1.5mm vs 3mm
  let y = margin;

  if (!compact) {
    // Shop name — small header
    lines.push(`TEXT ${margin}, ${y}, "0", 0, 1, 1, "RIZZ LEATHER"`);
    y += 18;

    // Divider
    lines.push(`BAR ${margin}, ${y}, ${W - margin * 2}, 2`);
    y += 10;
  }

  // Product name — 2 lines max
  const nameSize = compact ? 1 : 2;
  const nameStep = compact ? 16 : 30;
  const nameChars = compact ? 14 : 18;
  const namePart1 = data.product_name.slice(0, nameChars);
  const namePart2 = data.product_name.slice(nameChars, nameChars * 2);
  lines.push(`TEXT ${margin}, ${y}, "0", 0, ${nameSize}, ${nameSize}, "${namePart1}"`);
  y += nameStep;
  if (namePart2) {
    lines.push(`TEXT ${margin}, ${y}, "0", 0, ${nameSize}, ${nameSize}, "${namePart2}"`);
    y += nameStep;
  }

  // Variant size/color
  if (data.variant_name) {
    lines.push(`TEXT ${margin}, ${y}, "0", 0, ${nameSize}, ${nameSize}, "Size: ${data.variant_name}"`);
    y += nameStep;
  }

  y += compact ? 4 : 8;

  // Price — extra large
  const priceSize = compact ? 2 : 3;
  const priceStep = compact ? 26 : 44;
  if (data.sale_price) {
    lines.push(`TEXT ${margin}, ${y}, "0", 0, ${priceSize}, ${priceSize}, "Tk ${data.sale_price.toLocaleString("en-US")}"`);
    y += priceStep;
    lines.push(`TEXT ${margin}, ${y}, "0", 0, 1, 1, "MRP: Tk ${data.price.toLocaleString("en-US")}"`);
    y += compact ? 14 : 18;
  } else {
    lines.push(`TEXT ${margin}, ${y}, "0", 0, ${priceSize}, ${priceSize}, "Tk ${data.price.toLocaleString("en-US")}"`);
    y += priceStep;
  }

  y += compact ? 6 : 12;

  // Barcode — TSPL's own "readable" flag (the "1" below) already prints the
  // code as text under the bars, so a compact label skips the extra SKU
  // line below and just leans on that.
  if (barcodeData) {
    const barcodeH = Math.min(compact ? 110 : 220, Math.max(50, H - y - (compact ? 10 : 50)));
    lines.push(`BARCODE ${margin}, ${y}, "${barcodeType}", ${barcodeH}, 1, 0, 2, 4, "${barcodeData}"`);
    y += barcodeH + (compact ? 4 : 6);
  }

  // SKU under barcode (only when there's genuine room to spare)
  if (data.sku && !compact && y < H - 20) {
    lines.push(`TEXT ${margin}, ${y}, "0", 0, 1, 1, "SKU: ${data.sku}"`);
    y += 18;
  }

  // QR bottom-right
  if (data.show_qr && barcodeData) {
    const qrSize = 5;
    const qrX = W - (qrSize * 12) - margin;
    const qrY = H - (qrSize * 12) - margin;
    if (qrY > y) lines.push(`QRCODE ${qrX}, ${qrY}, H, ${qrSize}, A, 0, M2, "${barcodeData}"`);
  }

  // ── Print ──
  lines.push(`PRINT ${qty}, 1`);

  await sendRaw(enc(lines.join("\r\n") + "\r\n"));
}

// ─── Calibration ─────────────────────────────────────────────────────────────

/** TSPL minimal test — prints "RIZZ TEST" text + barcode */
export async function testPrint(width_mm = 76, height_mm = 180): Promise<void> {
  const cmd = [
    `SIZE ${width_mm} mm, ${height_mm} mm`,
    "GAP 3 mm, 0 mm",
    "SPEED 4",
    "DENSITY 8",
    "DIRECTION 0",
    "CLS",
    'TEXT 24, 24, "0", 0, 2, 2, "RIZZ LEATHER"',
    'TEXT 24, 60, "0", 0, 3, 3, "TEST PRINT"',
    'TEXT 24, 110, "0", 0, 1, 1, "If you see this, TSPL works!"',
    'BARCODE 24, 140, "CODE128", 120, 1, 0, 2, 4, "123456789"',
    "PRINT 1, 1",
  ].join("\r\n") + "\r\n";
  console.log("[TSPL] Sending:\n", cmd);
  const result = await _device!.transferOut(_endpointOut, enc(cmd));
  console.log("[TSPL] transferOut result:", result.status, "bytes:", result.bytesWritten);
}

/** ESC/POS test — if this prints text on label paper, printer is in ESC/POS mode */
export async function testPrintEscPos(): Promise<void> {
  const ESC = 0x1b; const GS = 0x1d; const LF = 0x0a;
  const buf = new Uint8Array([
    ESC, 0x40,        // INIT
    ESC, 0x61, 0x01,  // CENTER
    ESC, 0x45, 0x01,  // BOLD ON
    ...enc("RIZZ TEST\n"),
    ESC, 0x45, 0x00,  // BOLD OFF
    ...enc("ESC/POS MODE ACTIVE\n"),
    ...enc("If you see this text,\n"),
    ...enc("printer is in ESC/POS mode.\n"),
    LF, LF, LF, LF,
    GS, 0x56, 0x42, 0x00, // partial cut
  ]);
  console.log("[ESC/POS] Sending test, bytes:", buf.length);
  const result = await _device!.transferOut(_endpointOut, buf);
  console.log("[ESC/POS] transferOut result:", result.status, "bytes:", result.bytesWritten);
}

/** Run auto-calibration (detects gap/black-mark, aligns first label). */
export async function calibratePrinter(): Promise<void> {
  const cmd = "SPEED 4\r\nDENSITY 10\r\nCALIBRATE\r\n";
  await sendRaw(enc(cmd));
}

/** Feed n labels (useful to verify alignment after calibration). */
export async function feedLabels(count = 1): Promise<void> {
  const cmd = `FORMFEED ${count}\r\n`;
  await sendRaw(enc(cmd));
}
