import { jsPDF } from 'jspdf';
import { formatDateTime as formatBusinessDateTime } from '@/lib/utils';

const formatDateTime = (value) => {
  if (!value) return '--';
  return formatBusinessDateTime(value, 'dd MMM yyyy, HH:mm') || '--';
};

const formatAmount = (value, currency = 'EGP') => {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const extractText = (value, fallback = '') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value?.en === 'string' || typeof value?.ar === 'string') {
    return `${value.en || ''}${value.en && value.ar ? ' / ' : ''}${value.ar || ''}`.trim();
  }
  return fallback;
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export function downloadInvoicePdf(invoice) {
  if (!invoice) {
    return;
  }

  const snapshot = invoice.snapshot || {};
  const currency = snapshot.currency || invoice.currency || 'EGP';
  const patient = snapshot.patient || invoice.patient || {};
  const clinic = snapshot.clinic || invoice.clinic || {};
  const branch = snapshot.branch || invoice.branch || {};
  const lineItems = ensureArray(snapshot.lineItems);

  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const rightEdge = pageWidth - margin;
  const leftEdge = margin;

  let y = margin;
  const lineGap = 18;

  const drawLabelValue = (label, value) => {
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(label, leftEdge, y);
    doc.setTextColor(25, 25, 25);
    doc.text(String(value ?? '--'), leftEdge + 150, y);
    y += lineGap;
  };

  const ensureSpace = (heightNeeded = 40) => {
    if (y + heightNeeded <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text('Invoice / فاتورة', leftEdge, y);
  y += 24;

  doc.setFontSize(12);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `#${invoice.invoiceNumber || invoice.id} | ${formatDateTime(
      invoice.issuedAt || snapshot.issuedAt,
    )}`,
    leftEdge,
    y,
  );
  y += 24;

  drawLabelValue('Type / النوع', invoice.invoiceType || snapshot.invoiceType || '--');
  drawLabelValue('Status / الحالة', invoice.status || '--');
  drawLabelValue('Clinic / العيادة', clinic.name || '--');
  drawLabelValue('Branch / الفرع', branch.name || '--');
  drawLabelValue(
    'Patient / المريض',
    `${patient.fullName || '--'}${patient.patientCode ? ` (#${patient.patientCode})` : ''}`,
  );
  drawLabelValue('Phone / الهاتف', patient.phone || '--');

  if (snapshot.period?.fromDate || snapshot.period?.toDate) {
    drawLabelValue(
      'Statement Period / الفترة',
      `${snapshot.period?.fromDate || '--'} -> ${snapshot.period?.toDate || '--'}`,
    );
  }

  y += 6;
  ensureSpace(50);
  doc.setDrawColor(220, 220, 220);
  doc.line(leftEdge, y, rightEdge, y);
  y += 18;

  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('Line Items / بنود الفاتورة', leftEdge, y);
  y += 16;

  if (!lineItems.length) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No line items available', leftEdge, y);
    y += 20;
  } else {
    lineItems.forEach((item, index) => {
      ensureSpace(68);
      doc.setFontSize(10);
      doc.setTextColor(25, 25, 25);
      const title = extractText(item.title, 'Line item');
      doc.text(`${index + 1}. ${title}`, leftEdge, y);
      doc.text(
        formatAmount(item.amount, currency),
        rightEdge,
        y,
        { align: 'right' },
      );
      y += 14;

      const details = extractText(item.details, '');
      if (details) {
        doc.setTextColor(90, 90, 90);
        const wrappedDetails = doc.splitTextToSize(details, rightEdge - leftEdge);
        doc.text(wrappedDetails, leftEdge + 16, y);
        y += wrappedDetails.length * 12;
      }

      doc.setTextColor(110, 110, 110);
      doc.text(
        `Date: ${formatDateTime(item.date)}${item.notes ? ` | Notes: ${item.notes}` : ''}`,
        leftEdge + 16,
        y,
      );
      y += 16;
    });
  }

  ensureSpace(56);
  doc.setDrawColor(220, 220, 220);
  doc.line(leftEdge, y, rightEdge, y);
  y += 22;

  const totalAmount = Number(
    snapshot?.totals?.totalAmount ?? invoice.totalAmount ?? 0,
  );
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text('Total / الإجمالي', leftEdge, y);
  doc.text(formatAmount(totalAmount, currency), rightEdge, y, { align: 'right' });
  y += 20;

  if (invoice.status === 'void') {
    doc.setTextColor(180, 40, 40);
    doc.setFontSize(11);
    doc.text(
      `VOID / ملغاة${invoice.voidReason ? `: ${invoice.voidReason}` : ''}`,
      leftEdge,
      y,
    );
  }

  const fileName = `${invoice.invoiceNumber || `invoice-${invoice.id}`}.pdf`;
  doc.save(fileName);
}
