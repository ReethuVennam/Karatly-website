/**
 * src/utils/augmontInvoicePdf.js
 *
 * Shared PDF builders for Augmont buy and sell invoices.
 * Import wherever you need to download an invoice as a PDF.
 *
 * Usage:
 *   import { buildBuyInvoicePdf, buildSellInvoicePdf } from '../utils/augmontInvoicePdf';
 *   buildBuyInvoicePdf(invoiceData);
 *   buildSellInvoicePdf(invoiceData);
 */

import jsPDF from 'jspdf';

// ─── Augmont logo (base64 PNG — from /public/images/augmont-logo.png) ────────
// Loaded at module level so both buy and sell builders share it.
const AUGMONT_LOGO_B64 = (() => {
  // We fetch this at runtime from the public folder so the base64 is not
  // hardcoded and the file stays small. Falls back gracefully if unavailable.
  return null; // replaced by dynamic loader below
})();

let _logoCache = null;
async function getLogoDataUrl() {
  if (_logoCache) return _logoCache;
  try {
    const res  = await fetch('/images/augmont-logo.png');
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => { _logoCache = reader.result; resolve(_logoCache); };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Augmont company details ──────────────────────────────────────────────────

const AUGMONT = {
  name:    'AUGMONT GOLDTECH PRIVATE LIMITED',
  formerly:'(Formerly AUGMONT PRECIOUS METALS PRIVATE LIMITED)',
  cin:     'CIN: U51909MH2020PTC337639',
  gstin:   '27AATCA3030A1Z3',
  address: 'Unit No. 1A, 1st Floor, A-Trade Garden, Kamala Mills Compound, Senapati Bapat Marg, Delisle Road, above Bombay Canteen, Lower Parel, Mumbai, Maharashtra - 400013',
  contact: 'Tel: +91 9090906867  |  Email: support@augmont.com  |  Web: www.augmont.com',
};

const BUY_CONTENT = {
  disclaimer: 'The gold grams you own are calculated by dividing the amount paid net of GST by the gold rate and rounded down to 4 decimal places. For example, .00054 grams will be rounded down to .0005 grams.',
  terms: [
    '1. Goods once sold will not be returned.',
    '2. Any disputes shall be subject to Mumbai jurisdiction.',
    '3. Our responsibility ceases once the goods are delivered to the customer.',
    '4. I/We hereby certify that my/our registration certificate under the Central Goods and Services Act, 2017 is in force on the date on which the sales of goods specified in this tax invoice is made by me/us and that the transaction of sale covered by this tax invoice has been effected by me/us and it shall be accounted for in the turnover of sales while filing of return and the due tax, if any, payable on the sale has been paid or shall be paid.',
    '5. This is system generated document hence signature is not required.',
  ],
};

const SELL_CONTENT = {
  disclaimer: 'The gold grams you own are calculated by dividing the amount paid net of GST by the gold rate and rounded down to 4 decimal places. For example, .00054 grams will be rounded down to .0005 grams.',
  terms: [
    '1. Goods once sold will not be returned.',
    '2. Any disputes shall be subject to Mumbai jurisdiction.',
    '3. Our responsibility ceases once the goods are delivered to the customer.',
    '4. I/We hereby certify that my/our registration certificate under the Central Goods and Services Act, 2017 is in force on the date on which the sales of goods specified in this tax invoice is made by me/us and that the transaction of sale covered by this tax invoice has been effected by me/us and it shall be accounted for in the turnover of sales while filing of return and the due tax, if any, payable on the sale has been paid or shall be paid.',
    '5. This is system generated document hence signature is not required.',
  ],
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function drawHeader(doc, pw) {
  let y = 14;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(AUGMONT.name, 14, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80);
  doc.text(AUGMONT.formerly, 14, y); y += 5;
  doc.text(AUGMONT.cin,      14, y); y += 5;
  doc.text(AUGMONT.gstin,    14, y); y += 5;
  doc.text(AUGMONT.address,  14, y); y += 5;
  doc.text(AUGMONT.contact,  14, y); y += 7;
  doc.setDrawColor(184, 134, 11); doc.setLineWidth(0.8);
  doc.line(14, y, pw - 14, y); y += 7;
  return y;
}

function drawFooter(doc, pw, ph) {
  doc.setFontSize(7); doc.setTextColor(150);
  doc.text(
    'This is a computer generated invoice and does not require a physical signature. Powered by Augmont Goldtech Pvt. Ltd.',
    pw / 2, ph - 10, { align: 'center' }
  );
}

function drawDisclaimerAndTerms(doc, pw, y, content) {
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text('DISCLAIMER:', 14, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const dLines = doc.splitTextToSize(content.disclaimer, pw - 28);
  doc.text(dLines, 14, y); y += dLines.length * 4 + 5;

  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS:', 14, y); y += 4;
  doc.setFont('helvetica', 'normal');
  content.terms.forEach((term) => {
    const tLines = doc.splitTextToSize(term, pw - 28);
    doc.text(tLines, 14, y); y += tLines.length * 4 + 1;
  });
  return y;
}

function drawCustomerDetails(doc, pw, y, userInfo) {
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(184, 134, 11);
  doc.text('Customer Details', 14, y); y += 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
  doc.text(`Name: ${userInfo?.name || ''}`,           14, y); y += 5;
  doc.text(`Mobile: ${userInfo?.mobileNumber || ''}`, 14, y); y += 5;
  doc.text(`Email: ${userInfo?.email || ''}`,         14, y); y += 5;
  if (userInfo?.panNumber) { doc.text(`PAN: ${userInfo.panNumber}`, 14, y); y += 5; }
  const city  = userInfo?.city    || '';
  const state = userInfo?.state   || '';
  const pin   = userInfo?.pincode || '';
  if (city || state || pin) { doc.text(`${city}, ${state} - ${pin}`, 14, y); y += 5; }
  return y + 4;
}

function drawTableRows(doc, pw, y, rows) {
  rows.forEach(([label, value], i) => {
    const isLast = i === rows.length - 1;
    if (isLast) { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); }
    doc.text(label, 14, y);
    doc.text(value, pw - 14, y, { align: 'right' });
    doc.setDrawColor(220); doc.setLineWidth(0.3);
    doc.line(14, y + 2, pw - 14, y + 2);
    y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  });
  return y + 4;
}

// ─── Number to words (Indian system, up to crores) ───────────────────────────

function toWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100);
  }

  const n = Math.round(amount);
  if (n === 0) return 'Zero';
  let result = '';
  if (n >= 10000000) { result += convertHundreds(Math.floor(n / 10000000)) + 'Crore '; }
  if (n % 10000000 >= 100000) { result += convertHundreds(Math.floor((n % 10000000) / 100000)) + 'Lakh '; }
  if (n % 100000 >= 1000) { result += convertHundreds(Math.floor((n % 100000) / 1000)) + 'Thousand '; }
  result += convertHundreds(n % 1000);
  return result.trim() + ' Only';
}

// ─── Buy Invoice PDF — matches Augmont tax invoice layout ────────────────────

export async function buildBuyInvoicePdf(d) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw    = doc.internal.pageSize.getWidth();
  const ph    = doc.internal.pageSize.getHeight();
  const lm    = 14;
  const rm    = pw - 14;
  const gold  = [184, 134, 11];
  const navy  = [0, 51, 102];
  const black = [0, 0, 0];
  const lgrey = [240, 240, 240];

  // ── Gold border top ───────────────────────────────────────────────────────
  doc.setFillColor(...gold);
  doc.rect(0, 0, pw, 3, 'F');

  // ── Header text (left column, capped at 140mm to avoid logo overlap) ───────
  let y = 8;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
  doc.text(AUGMONT.name, lm, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
  doc.text(AUGMONT.formerly, lm, y); y += 4;
  doc.text(AUGMONT.cin + ' | GSTIN: ' + AUGMONT.gstin, lm, y); y += 4;
  const hdrAddrLines = doc.splitTextToSize(AUGMONT.address, 138);
  doc.text(hdrAddrLines, lm, y); y += hdrAddrLines.length * 3.8 + 1;
  doc.text(AUGMONT.contact, lm, y); y += 6;

  // ── Logo (top right — rendered after text so it never clips the address) ──
  try {
    const logoDataUrl = await getLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', rm - 34, 6, 34, 16);
    }
  } catch (_) { /* logo unavailable — continue */ }

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...gold); doc.setLineWidth(0.8);
  doc.line(lm, y, rm, y); y += 5;

  // ── TAX INVOICE title ─────────────────────────────────────────────────────
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
  doc.text('TAX INVOICE', pw / 2, y, { align: 'center' }); y += 7;

  // ── Buyer details box + Invoice meta box (side by side) ───────────────────
  const boxTop = y;
  const leftBoxW  = 110;
  const rightBoxW = pw - lm - 14 - leftBoxW - 4;
  const rightBoxX = lm + leftBoxW + 4;

  // Left box — buyer details
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(lm, boxTop, leftBoxW, 30);
  doc.setFillColor(...lgrey);
  doc.rect(lm, boxTop, leftBoxW, 5, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
  doc.text('BUYER DETAILS:', lm + 2, boxTop + 3.5);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...black);
  doc.text(String(d.userInfo?.name || '').toUpperCase(), lm + 2, boxTop + 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  let buyerY = boxTop + 14;
  if (d.userInfo?.address) { const al = doc.splitTextToSize(d.userInfo.address, leftBoxW - 4); doc.text(al, lm + 2, buyerY); buyerY += al.length * 3.5; }
  const cityState = [d.userInfo?.city, d.userInfo?.state].filter(Boolean).join(', ');
  if (cityState) { doc.text(cityState, lm + 2, buyerY); buyerY += 4; }
  if (d.userInfo?.pincode) { doc.text(d.userInfo.pincode, lm + 2, buyerY); }

  // Right box — invoice meta
  doc.rect(rightBoxX, boxTop, rightBoxW, 30);
  doc.setFillColor(...lgrey);
  doc.rect(rightBoxX, boxTop, rightBoxW, 5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...navy);
  doc.text('INVOICE DETAILS', rightBoxX + 2, boxTop + 3.5);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...black);
  const metaRows = [
    ['Invoice No.:', d.invoiceNumber || ''],
    ['Invoice Date:', d.invoiceDate || ''],
    ['Transaction ID:', d.transactionId || ''],
    ['Place of Supply:', 'Delivered at Sequel\'s Vault in Mumbai'],
  ];
  metaRows.forEach(([label, value], i) => {
    const my = boxTop + 9 + i * 5;
    doc.setFont('helvetica', 'bold'); doc.text(label, rightBoxX + 2, my);
    doc.setFont('helvetica', 'normal');
    const val = doc.splitTextToSize(value, rightBoxW - 28);
    doc.text(val, rightBoxX + 28, my);
  });

  y = boxTop + 34;

  // ── Table header ──────────────────────────────────────────────────────────
  const cols = {
    sr:     { x: lm,       w: 8  },
    desc:   { x: lm + 8,   w: 68 },
    hsn:    { x: lm + 76,  w: 18 },
    grams:  { x: lm + 94,  w: 18 },
    rate:   { x: lm + 112, w: 22 },
    per:    { x: lm + 134, w: 14 },
    amount: { x: lm + 148, w: rm - (lm + 148) },
  };

  doc.setFillColor(...navy);
  doc.rect(lm, y, rm - lm, 6, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  const headers = [
    ['Sr\nNo.', cols.sr],
    ['Description', cols.desc],
    ['HSN\nCode', cols.hsn],
    ['Grams', cols.grams],
    ['Rate', cols.rate],
    ['Per', cols.per],
    ['Amount', cols.amount],
  ];
  headers.forEach(([label, col]) => {
    doc.text(label, col.x + col.w / 2, y + 3.5, { align: 'center' });
  });
  y += 6;

  // ── Table row ─────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.rect(lm, y, rm - lm, 10);

  const metalType  = (d.metalType || 'GOLD').toUpperCase();
  const purity     = d.purity || '999';
  const karat      = d.karat  || '24G';
  const descText   = `${metalType} - ${purity} - ${karat} : ${d.transactionId} @ ${d.rate}`;
  const descWrapped = doc.splitTextToSize(descText, cols.desc.w - 2);

  doc.setTextColor(...black); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('1', cols.sr.x + cols.sr.w / 2, y + 5, { align: 'center' });
  doc.text(descWrapped, cols.desc.x + 1, y + 3.5);
  doc.text(d.hsnCode || '711419', cols.hsn.x + cols.hsn.w / 2, y + 5, { align: 'center' });
  doc.text(d.quantity || '', cols.grams.x + cols.grams.w / 2, y + 5, { align: 'center' });
  doc.text(d.rate || '', cols.rate.x + cols.rate.w / 2, y + 5, { align: 'center' });
  doc.text('1 GM', cols.per.x + cols.per.w / 2, y + 5, { align: 'center' });
  doc.text(d.grossAmount || '', cols.amount.x + cols.amount.w - 2, y + 5, { align: 'right' });
  y += 10;

  // ── Summary rows ──────────────────────────────────────────────────────────
  const taxSplit = Array.isArray(d.taxes?.taxSplit) ? d.taxes.taxSplit : [];
  const cgst = taxSplit.find(t => t.type === 'CGST');
  const sgst = taxSplit.find(t => t.type === 'SGST');
  const igst = taxSplit.find(t => t.type === 'IGST');

  const summaryRows = [
    ['TAXABLE VALUE',    '', d.grossAmount || ''],
    ['CGST + SGST',      `${cgst?.taxPerc || '1.50'}% + ${sgst?.taxPerc || '1.50'}%`,
                         String(((Number(cgst?.taxAmount || 0) + Number(sgst?.taxAmount || 0))).toFixed(2))],
    ['IGST',             `${igst?.taxPerc || '0.00'}%`, igst?.taxAmount || '0.00'],
    ['GROSS INVOICE AMOUNT', '', d.netAmount || ''],
    ['DISCOUNT',         '', '0.00'],
    ['TOTAL NET PAYABLE', '', d.netAmount || ''],
  ];

  summaryRows.forEach(([label, sub, value], i) => {
    const isTotal = label === 'TOTAL NET PAYABLE';
    const rowH = 6;
    if (isTotal) {
      doc.setFillColor(...navy);
      doc.rect(lm, y, rm - lm, rowH, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255);
      doc.rect(lm, y, rm - lm, rowH, 'F');
      doc.setTextColor(...black);
    }
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
    doc.rect(lm, y, rm - lm, rowH);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.text(label, lm + 2, y + 4);
    if (sub) doc.text(sub, cols.rate.x + cols.rate.w / 2, y + 4, { align: 'center' });
    doc.text(value, rm - 2, y + 4, { align: 'right' });
    y += rowH;
  });

  y += 4;

  // ── Amount in words ───────────────────────────────────────────────────────
  doc.setFillColor(...lgrey);
  doc.rect(lm, y, rm - lm, 6, 'F');
  doc.setTextColor(...black); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('Rupees ' + toWords(Number(d.netAmount || 0)), lm + 2, y + 4);
  y += 10;

  // ── E&OE ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('E. & O.E.', lm, y); y += 4;
  doc.text('Delivery: Ex-office/Showroom/As per Customers request', lm, y); y += 8;

  // ── Disclaimer + T&C box ─────────────────────────────────────────────────
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  const disclaimerBox = y;
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
  doc.text('*Disclaimer', lm + 2, y + 4); y += 7;
  doc.setFont('helvetica', 'normal');
  const dLines = doc.splitTextToSize(BUY_CONTENT.disclaimer, rm - lm - 4);
  doc.text(dLines, lm + 2, y); y += dLines.length * 3.5 + 3;

  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', lm + 2, y); y += 4;
  doc.setFont('helvetica', 'normal');
  BUY_CONTENT.terms.forEach((term) => {
    const tLines = doc.splitTextToSize(term, rm - lm - 4);
    doc.text(tLines, lm + 2, y); y += tLines.length * 3.5 + 1;
  });
  doc.rect(lm, disclaimerBox, rm - lm, y - disclaimerBox + 2);
  y += 6;

  // ── Authorised signatory ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...navy);
  doc.text('For Augmont Goldtech Private Limited', rm, y, { align: 'right' }); y += 14;
  doc.setDrawColor(...navy); doc.setLineWidth(0.3);
  doc.line(rm - 50, y, rm, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Authorised Signatory', rm, y, { align: 'right' });

  // ── Gold border bottom ────────────────────────────────────────────────────
  doc.setFillColor(...gold);
  doc.rect(0, ph - 3, pw, 3, 'F');

  doc.save(`BuyInvoice-${d.transactionId}.pdf`);
}

// ─── Sell Invoice PDF ─────────────────────────────────────────────────────────

export async function buildSellInvoicePdf(d) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw    = doc.internal.pageSize.getWidth();
  const ph    = doc.internal.pageSize.getHeight();
  const lm    = 14;
  const rm    = pw - 14;
  const gold  = [184, 134, 11];
  const navy  = [0, 51, 102];
  const black = [0, 0, 0];
  const lgrey = [240, 240, 240];

  // ── Gold border top ───────────────────────────────────────────────────────
  doc.setFillColor(...gold);
  doc.rect(0, 0, pw, 3, 'F');

  // ── Header text (left column) ─────────────────────────────────────────────
  let y = 8;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
  doc.text(AUGMONT.name, lm, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
  doc.text(AUGMONT.formerly, lm, y); y += 4;
  doc.text(AUGMONT.cin + ' | GSTIN: ' + AUGMONT.gstin, lm, y); y += 4;
  const addrLines = doc.splitTextToSize(AUGMONT.address, 138);
  doc.text(addrLines, lm, y); y += addrLines.length * 3.8 + 1;
  doc.text(AUGMONT.contact, lm, y); y += 6;

  // ── Logo (top right — rendered after text) ────────────────────────────────
  try {
    const logoDataUrl = await getLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', rm - 34, 6, 34, 16);
    }
  } catch (_) { /* logo unavailable — continue */ }

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...gold); doc.setLineWidth(0.8);
  doc.line(lm, y, rm, y); y += 5;

  // ── SELL INVOICE title ────────────────────────────────────────────────────
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
  doc.text('SELL INVOICE', pw / 2, y, { align: 'center' }); y += 7;

  // ── Seller details box + Invoice meta box ─────────────────────────────────
  const boxTop    = y;
  const leftBoxW  = 110;
  const rightBoxW = pw - lm - 14 - leftBoxW - 4;
  const rightBoxX = lm + leftBoxW + 4;

  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(lm, boxTop, leftBoxW, 30);
  doc.setFillColor(...lgrey);
  doc.rect(lm, boxTop, leftBoxW, 5, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
  doc.text('SELLER DETAILS:', lm + 2, boxTop + 3.5);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...black);
  doc.text(String(d.userInfo?.name || '').toUpperCase(), lm + 2, boxTop + 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  let sellerY = boxTop + 14;
  if (d.userInfo?.address) { const al = doc.splitTextToSize(d.userInfo.address, leftBoxW - 4); doc.text(al, lm + 2, sellerY); sellerY += al.length * 3.5; }
  const cityStateSell = [d.userInfo?.city, d.userInfo?.state].filter(Boolean).join(', ');
  if (cityStateSell) { doc.text(cityStateSell, lm + 2, sellerY); sellerY += 4; }
  if (d.userInfo?.pincode) { doc.text(d.userInfo.pincode, lm + 2, sellerY); sellerY += 4; }
  doc.text('Mobile: ' + (d.userInfo?.mobileNumber || ''), lm + 2, sellerY); sellerY += 4;
  doc.text('Email: ' + (d.userInfo?.email || ''), lm + 2, sellerY);

  doc.rect(rightBoxX, boxTop, rightBoxW, 30);
  doc.setFillColor(...lgrey);
  doc.rect(rightBoxX, boxTop, rightBoxW, 5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...navy);
  doc.text('INVOICE DETAILS', rightBoxX + 2, boxTop + 3.5);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...black);
  const metaRows = [
    ['Invoice No.:', d.invoiceNumber || ''],
    ['Invoice Date:', d.sellTransactionDate || d.invoiceDate || ''],
    ['Transaction ID:', d.transactionId || ''],
  ];
  metaRows.forEach(([label, value], i) => {
    const my = boxTop + 9 + i * 6;
    doc.setFont('helvetica', 'bold'); doc.text(label, rightBoxX + 2, my);
    doc.setFont('helvetica', 'normal');
    doc.text(value, rightBoxX + 28, my);
  });

  y = boxTop + 34;

  // ── Table header ──────────────────────────────────────────────────────────
  const cols = {
    sr:     { x: lm,       w: 8  },
    desc:   { x: lm + 8,   w: 68 },
    hsn:    { x: lm + 76,  w: 18 },
    grams:  { x: lm + 94,  w: 18 },
    rate:   { x: lm + 112, w: 22 },
    per:    { x: lm + 134, w: 14 },
    amount: { x: lm + 148, w: rm - (lm + 148) },
  };

  doc.setFillColor(...navy);
  doc.rect(lm, y, rm - lm, 6, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  [
    ['Sr\nNo.', cols.sr],
    ['Description', cols.desc],
    ['HSN\nCode', cols.hsn],
    ['Grams', cols.grams],
    ['Rate', cols.rate],
    ['Per', cols.per],
    ['Amount', cols.amount],
  ].forEach(([label, col]) => {
    doc.text(label, col.x + col.w / 2, y + 3.5, { align: 'center' });
  });
  y += 6;

  // ── Table row ─────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.rect(lm, y, rm - lm, 10);

  const metalType  = (d.metalType || 'GOLD').toUpperCase();
  const purity     = d.purity || '999';
  const karat      = d.karat  || '24K';
  const descText   = `${metalType} - ${purity} - ${karat} : ${d.transactionId} @ ${d.rate}`;
  const descWrapped = doc.splitTextToSize(descText, cols.desc.w - 2);

  doc.setTextColor(...black); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('1', cols.sr.x + cols.sr.w / 2, y + 5, { align: 'center' });
  doc.text(descWrapped, cols.desc.x + 1, y + 3.5);
  doc.text(d.hsnCode || '711419', cols.hsn.x + cols.hsn.w / 2, y + 5, { align: 'center' });
  doc.text(d.quantity || '', cols.grams.x + cols.grams.w / 2, y + 5, { align: 'center' });
  doc.text(d.rate || '', cols.rate.x + cols.rate.w / 2, y + 5, { align: 'center' });
  doc.text('1 GM', cols.per.x + cols.per.w / 2, y + 5, { align: 'center' });
  doc.text(d.grossAmount || '', cols.amount.x + cols.amount.w - 2, y + 5, { align: 'right' });
  y += 10;

  // ── Summary rows ──────────────────────────────────────────────────────────
  const summaryRows = [
    ['TAXABLE VALUE',     '', d.grossAmount || ''],
    ['NET PAYOUT',        '', d.netAmount   || ''],
  ];

  summaryRows.forEach(([label, sub, value], i) => {
    const isTotal = label === 'NET PAYOUT';
    const rowH = 6;
    if (isTotal) {
      doc.setFillColor(...navy);
      doc.rect(lm, y, rm - lm, rowH, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 248, 248);
      doc.rect(lm, y, rm - lm, rowH, 'F');
      doc.setTextColor(...black);
    }
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
    doc.rect(lm, y, rm - lm, rowH);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal'); doc.setFontSize(7.5);
    doc.text(label, lm + 2, y + 4);
    doc.text(value, rm - 2, y + 4, { align: 'right' });
    y += rowH;
  });

  y += 4;

  // ── Amount in words ───────────────────────────────────────────────────────
  doc.setFillColor(...lgrey);
  doc.rect(lm, y, rm - lm, 6, 'F');
  doc.setTextColor(...black); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('Rupees ' + toWords(Number(d.netAmount || 0)), lm + 2, y + 4);
  y += 10;

  // ── E&OE ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('E. & O.E.', lm, y); y += 4;
  doc.text('Payout will be credited to the registered bank account within 1-2 business days.', lm, y); y += 8;

  // ── Disclaimer + T&C box ─────────────────────────────────────────────────
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  const disclaimerBox = y;
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
  doc.text('*Disclaimer', lm + 2, y + 4); y += 7;
  doc.setFont('helvetica', 'normal');
  const dLines = doc.splitTextToSize(SELL_CONTENT.disclaimer, rm - lm - 4);
  doc.text(dLines, lm + 2, y); y += dLines.length * 3.5 + 3;

  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', lm + 2, y); y += 4;
  doc.setFont('helvetica', 'normal');
  SELL_CONTENT.terms.forEach((term) => {
    const tLines = doc.splitTextToSize(term, rm - lm - 4);
    doc.text(tLines, lm + 2, y); y += tLines.length * 3.5 + 1;
  });
  doc.rect(lm, disclaimerBox, rm - lm, y - disclaimerBox + 2);
  y += 6;

  // ── Authorised signatory ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...navy);
  doc.text('For Augmont Goldtech Private Limited', rm, y, { align: 'right' }); y += 14;
  doc.setDrawColor(...navy); doc.setLineWidth(0.3);
  doc.line(rm - 50, y, rm, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Authorised Signatory', rm, y, { align: 'right' });

  // ── Gold border bottom ────────────────────────────────────────────────────
  doc.setFillColor(...gold);
  doc.rect(0, ph - 3, pw, 3, 'F');

  doc.save(`SellInvoice-${d.transactionId}.pdf`);
}
