import { jsPDF } from "jspdf";
import notoSansArabicRegularUrl from "@/assets/fonts/NotoSansArabic-Regular.ttf?url";
import { formatDateTime as formatBusinessDateTime } from "@/lib/utils";

const ARABIC_FONT_NAME = "NotoSansArabic";
const ARABIC_FONT_FILE = "NotoSansArabic-Regular.ttf";

const COLORS = {
  primary: [15, 118, 110],
  primaryDark: [4, 47, 46],
  ink: [17, 24, 39],
  muted: [97, 111, 126],
  border: [215, 221, 226],
  soft: [245, 247, 248],
  softTeal: [236, 253, 250],
  success: [5, 150, 105],
  danger: [225, 29, 72],
  amber: [180, 83, 9],
};

const ARABIC_TEXT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let arabicFontBase64Promise;

const formatDateTime = (value) => {
  if (!value) return "--";
  return formatBusinessDateTime(value, "dd MMM yyyy, HH:mm") || "--";
};

const formatDateOnly = (value) => {
  if (!value) return "--";
  return String(value).slice(0, 10);
};

const formatAmount = (value, currency = "EGP") =>
  new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const hasArabic = (value) => ARABIC_TEXT_PATTERN.test(String(value || ""));

const hasMojibake = (value) =>
  /[ØÙ][\u0080-\u00FF]?|�/.test(String(value || ""));

const repairMojibake = (value) => {
  const text = String(value ?? "");
  if (!hasMojibake(text)) return text;

  try {
    const bytes = Uint8Array.from(
      Array.from(text).map((character) => character.charCodeAt(0) & 0xff),
    );
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (hasArabic(decoded)) return decoded;
  } catch {
    // Keep the original below; callers can still fall back to English labels.
  }

  return text;
};

const extractText = (value, fallback = "", language = "en") => {
  if (!value) return fallback;
  if (typeof value === "string") return repairMojibake(value);
  if (typeof value?.[language] === "string") {
    return repairMojibake(value[language]);
  }
  if (typeof value?.en === "string") return repairMojibake(value.en);
  if (typeof value?.ar === "string") return repairMojibake(value.ar);
  return fallback;
};

const stripUnsupportedArabic = (value) => {
  const text = repairMojibake(value);
  return hasArabic(text) ? "" : text;
};

const slugify = (value, fallback = "recovera") => {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || fallback;
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const getArabicFontBase64 = async () => {
  if (!arabicFontBase64Promise) {
    arabicFontBase64Promise = fetch(notoSansArabicRegularUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load PDF Arabic font: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64);
  }

  return arabicFontBase64Promise;
};

const registerArabicFont = async (doc) => {
  try {
    const fontBase64 = await getArabicFontBase64();
    doc.addFileToVFS(ARABIC_FONT_FILE, fontBase64);
    doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_NAME, "normal");
    return true;
  } catch {
    return false;
  }
};

const setDrawColor = (doc, color) => doc.setDrawColor(...color);
const setFillColor = (doc, color) => doc.setFillColor(...color);
const setTextColor = (doc, color) => doc.setTextColor(...color);

export async function downloadInvoicePdf(invoice) {
  if (!invoice) return;

  const snapshot = invoice.snapshot || {};
  const currency = snapshot.currency || invoice.currency || "EGP";
  const patient = snapshot.patient || invoice.patient || {};
  const clinic = snapshot.clinic || invoice.clinic || {};
  const branch = snapshot.branch || invoice.branch || {};
  const lineItems = ensureArray(snapshot.lineItems);
  const issuedAt = invoice.issuedAt || snapshot.issuedAt;
  const invoiceType = invoice.invoiceType || snapshot.invoiceType || "invoice";
  const invoiceNumber = invoice.invoiceNumber || `INV-${invoice.id}`;
  const isVoid = invoice.status === "void";

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const arabicReady = await registerArabicFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;
  let y = margin;
  let pageNumber = 1;

  const useFontFor = (text, style = "normal") => {
    if (arabicReady && hasArabic(text)) {
      doc.setFont(ARABIC_FONT_NAME, "normal");
      return;
    }

    doc.setFont("helvetica", style);
  };

  const text = (value, x, textY, options = {}) => {
    const raw = repairMojibake(value ?? "--");
    const safe = arabicReady
      ? raw
      : stripUnsupportedArabic(raw) || options.fallback || "--";
    const printable =
      arabicReady && hasArabic(safe) && typeof doc.processArabic === "function"
        ? doc.processArabic(safe)
        : safe;
    useFontFor(safe, options.style || "normal");
    doc.setFontSize(options.size || 10);
    setTextColor(doc, options.color || COLORS.ink);

    doc.text(printable, x, textY, options);
  };

  const split = (value, width, options = {}) => {
    const raw = repairMojibake(value ?? "");
    const safe = arabicReady ? raw : stripUnsupportedArabic(raw);
    if (!safe) return [];
    useFontFor(safe, options.style || "normal");
    if (options.size) doc.setFontSize(options.size);
    return doc.splitTextToSize(safe, width);
  };

  const addFooter = () => {
    setDrawColor(doc, COLORS.border);
    doc.line(margin, pageHeight - 42, rightEdge, pageHeight - 42);
    text("Recovera medical management platform", margin, pageHeight - 24, {
      size: 8,
      color: COLORS.muted,
    });
    text(`Page ${pageNumber}`, rightEdge, pageHeight - 24, {
      size: 8,
      color: COLORS.muted,
      align: "right",
    });
  };

  const addPage = () => {
    addFooter();
    doc.addPage();
    pageNumber += 1;
    y = margin;
  };

  const ensureSpace = (heightNeeded = 48) => {
    if (y + heightNeeded <= pageHeight - 58) return;
    addPage();
  };

  const drawBadge = (
    label,
    x,
    badgeY,
    color = COLORS.primary,
    align = "left",
  ) => {
    const width = Math.max(doc.getTextWidth(label) + 18, 58);
    const startX = align === "right" ? x - width : x;
    setFillColor(doc, color);
    doc.roundedRect(startX, badgeY - 12, width, 20, 5, 5, "F");
    text(label, align === "right" ? x - 9 : x + 9, badgeY + 2, {
      size: 8,
      color: [255, 255, 255],
      style: "bold",
      align,
    });
  };

  const drawInfoBox = ({ label, labelAr, value, x, boxY, width }) => {
    setDrawColor(doc, COLORS.border);
    setFillColor(doc, [255, 255, 255]);
    doc.roundedRect(x, boxY, width, 58, 6, 6, "FD");
    text(label, x + 12, boxY + 17, {
      size: 8,
      color: COLORS.muted,
      style: "bold",
    });
    if (arabicReady && labelAr) {
      text(labelAr, x + width - 12, boxY + 17, {
        size: 8,
        color: COLORS.muted,
        align: "right",
      });
    }
    const wrapped = split(value || "--", width - 24, { size: 10 });
    text(wrapped[0] || "--", x + 12, boxY + 37, {
      size: 10,
      color: COLORS.ink,
      style: "bold",
    });
  };

  const drawSectionTitle = (title, subtitle) => {
    ensureSpace(34);
    setFillColor(doc, COLORS.softTeal);
    doc.roundedRect(margin, y, contentWidth, 30, 6, 6, "F");
    text(title, margin + 12, y + 20, {
      size: 10,
      color: COLORS.primaryDark,
      style: "bold",
    });
    if (subtitle) {
      text(subtitle, rightEdge - 12, y + 20, {
        size: 8,
        color: COLORS.muted,
        align: "right",
      });
    }
    y += 44;
  };

  const headerClinicName = clinic.name || "Clinic";
  const headerClinicLines = split(headerClinicName, 275, {
    size: 16,
    style: "bold",
  }).slice(0, 2);

  setFillColor(doc, COLORS.primaryDark);
  doc.roundedRect(margin, y, contentWidth, 92, 10, 10, "F");
  setFillColor(doc, COLORS.primary);
  doc.roundedRect(margin + 18, y + 18, 42, 42, 8, 8, "F");
  text("R", margin + 39, y + 47, {
    size: 22,
    color: [255, 255, 255],
    style: "bold",
    align: "center",
  });
  text(headerClinicLines[0] || headerClinicName, margin + 74, y + 31, {
    size: headerClinicLines.length > 1 ? 14 : 17,
    color: [255, 255, 255],
    style: "bold",
  });
  if (headerClinicLines[1]) {
    text(headerClinicLines[1], margin + 74, y + 47, {
      size: 14,
      color: [255, 255, 255],
      style: "bold",
    });
  }
  text("Recovera medical management platform", margin + 74, y + 64, {
    size: 9,
    color: [194, 231, 226],
  });
  text("Patient Invoice", rightEdge - 18, y + 35, {
    size: 16,
    color: [255, 255, 255],
    style: "bold",
    align: "right",
  });
  if (arabicReady) {
    text("فاتورة المريض", rightEdge - 18, y + 56, {
      size: 11,
      color: [194, 231, 226],
      align: "right",
    });
  }
  drawBadge(
    isVoid ? "VOID" : "ACTIVE",
    rightEdge - 18,
    y + 77,
    isVoid ? COLORS.danger : COLORS.success,
    "right",
  );
  y += 116;

  text(`#${invoiceNumber}`, margin, y, {
    size: 13,
    color: COLORS.ink,
    style: "bold",
  });
  text(formatDateTime(issuedAt), rightEdge, y, {
    size: 10,
    color: COLORS.muted,
    align: "right",
  });
  y += 20;

  const boxGap = 10;
  const boxWidth = (contentWidth - boxGap * 2) / 3;
  drawInfoBox({
    label: "Patient",
    labelAr: "المريض",
    value: `${patient.fullName || "--"}${patient.patientCode ? ` (#${patient.patientCode})` : ""}`,
    x: margin,
    boxY: y,
    width: boxWidth,
  });
  drawInfoBox({
    label: "Phone",
    labelAr: "الهاتف",
    value: patient.phone || "--",
    x: margin + boxWidth + boxGap,
    boxY: y,
    width: boxWidth,
  });
  drawInfoBox({
    label: "Invoice Type",
    labelAr: "النوع",
    value: invoiceType,
    x: margin + (boxWidth + boxGap) * 2,
    boxY: y,
    width: boxWidth,
  });
  y += 72;

  drawInfoBox({
    label: "Clinic",
    labelAr: "العيادة",
    value: clinic.name || "--",
    x: margin,
    boxY: y,
    width: boxWidth,
  });
  drawInfoBox({
    label: "Branch",
    labelAr: "الفرع",
    value: branch.name || "--",
    x: margin + boxWidth + boxGap,
    boxY: y,
    width: boxWidth,
  });
  drawInfoBox({
    label:
      snapshot.period?.fromDate || snapshot.period?.toDate
        ? "Statement Period"
        : "Status",
    labelAr:
      snapshot.period?.fromDate || snapshot.period?.toDate
        ? "الفترة"
        : "الحالة",
    value:
      snapshot.period?.fromDate || snapshot.period?.toDate
        ? `${formatDateOnly(snapshot.period?.fromDate)} to ${formatDateOnly(snapshot.period?.toDate)}`
        : invoice.status || "--",
    x: margin + (boxWidth + boxGap) * 2,
    boxY: y,
    width: boxWidth,
  });
  y += 82;

  drawSectionTitle(
    "Line Items",
    `${lineItems.length || 0} item${lineItems.length === 1 ? "" : "s"}`,
  );

  setFillColor(doc, COLORS.soft);
  setDrawColor(doc, COLORS.border);
  doc.roundedRect(margin, y, contentWidth, 26, 6, 6, "FD");
  text("Description", margin + 12, y + 17, {
    size: 8,
    color: COLORS.muted,
    style: "bold",
  });
  text("Date", rightEdge - 144, y + 17, {
    size: 8,
    color: COLORS.muted,
    style: "bold",
  });
  text("Amount", rightEdge - 12, y + 17, {
    size: 8,
    color: COLORS.muted,
    style: "bold",
    align: "right",
  });
  y += 34;

  if (!lineItems.length) {
    text("No line items available.", margin + 12, y + 4, {
      size: 10,
      color: COLORS.muted,
    });
    y += 24;
  } else {
    lineItems.forEach((item, index) => {
      const titleEn = extractText(item.title, "Line item", "en");
      const titleAr = extractText(item.title, "", "ar");
      const detailsEn = extractText(item.details, "", "en");
      const detailsAr = extractText(item.details, "", "ar");
      const notes = item.notes ? `Notes: ${item.notes}` : "";
      const detailLines = [
        ...split(detailsEn, contentWidth - 170, { size: 8 }),
        ...(arabicReady && detailsAr
          ? split(detailsAr, contentWidth - 170, { size: 8 })
          : []),
        ...split(notes, contentWidth - 170, { size: 8 }),
      ];
      const rowHeight = Math.max(
        54,
        34 + detailLines.length * 10 + (arabicReady && titleAr ? 12 : 0),
      );

      ensureSpace(rowHeight + 8);
      setDrawColor(doc, COLORS.border);
      doc.line(margin, y - 10, rightEdge, y - 10);
      text(`${index + 1}. ${titleEn}`, margin + 12, y + 4, {
        size: 10,
        color: COLORS.ink,
        style: "bold",
      });
      if (arabicReady && titleAr) {
        text(titleAr, margin + 12, y + 18, {
          size: 8,
          color: COLORS.muted,
        });
      }
      text(formatDateOnly(item.date), rightEdge - 144, y + 4, {
        size: 8,
        color: COLORS.muted,
      });
      text(formatAmount(item.amount, currency), rightEdge - 12, y + 4, {
        size: 10,
        color: COLORS.ink,
        style: "bold",
        align: "right",
      });

      let detailsY = y + (arabicReady && titleAr ? 32 : 20);
      detailLines.forEach((line) => {
        text(line, margin + 28, detailsY, {
          size: 8,
          color: COLORS.muted,
        });
        detailsY += 10;
      });
      y += rowHeight;
    });
  }

  ensureSpace(86);
  setDrawColor(doc, COLORS.border);
  doc.line(margin, y, rightEdge, y);
  y += 18;

  const totalAmount = Number(
    snapshot?.totals?.totalAmount ?? invoice.totalAmount ?? 0,
  );
  setFillColor(doc, COLORS.primaryDark);
  doc.roundedRect(rightEdge - 230, y, 230, 58, 8, 8, "F");
  text("Total", rightEdge - 214, y + 22, {
    size: 10,
    color: [194, 231, 226],
    style: "bold",
  });
  if (arabicReady) {
    text("الإجمالي", rightEdge - 18, y + 22, {
      size: 8,
      color: [194, 231, 226],
      align: "right",
    });
  }
  text(formatAmount(totalAmount, currency), rightEdge - 18, y + 45, {
    size: 16,
    color: [255, 255, 255],
    style: "bold",
    align: "right",
  });
  y += 76;

  if (isVoid) {
    ensureSpace(40);
    setFillColor(doc, [255, 241, 242]);
    setDrawColor(doc, [253, 164, 175]);
    doc.roundedRect(margin, y, contentWidth, 36, 6, 6, "FD");
    text(
      `VOID${invoice.voidReason ? `: ${invoice.voidReason}` : ""}`,
      margin + 12,
      y + 22,
      {
        size: 10,
        color: COLORS.danger,
        style: "bold",
      },
    );
    y += 48;
  }

  ensureSpace(34);
  text(
    "This receipt was generated by Recovera from recorded clinic transactions.",
    margin,
    y,
    {
      size: 8,
      color: COLORS.muted,
    },
  );

  addFooter();

  const fileNameParts = [
    "Recovera",
    invoiceType === "statement" ? "Statement" : "Receipt",
    patient.patientCode || patient.fullName || "Patient",
    invoiceNumber,
  ];
  const fileName = `${fileNameParts.map((part) => slugify(part)).join("-")}.pdf`;
  doc.save(fileName);
}
