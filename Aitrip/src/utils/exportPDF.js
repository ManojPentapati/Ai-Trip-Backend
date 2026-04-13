import jsPDF from 'jspdf';

/**
 * Exports the trip itinerary as a clean, styled PDF document.
 * @param {string} tripText - Raw markdown itinerary text
 * @param {object} meta - { destination, duration, budget, companions, country }
 */
export const exportTripPDF = (tripText, meta = {}) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addPage = () => {
    pdf.addPage();
    y = margin;
    drawPageFooter();
  };

  const checkY = (needed = 10) => {
    if (y + needed > pageH - 20) addPage();
  };

  const drawPageFooter = () => {
    const pageNum = pdf.internal.getNumberOfPages();
    pdf.setFontSize(8);
    pdf.setTextColor(150, 140, 120);
    pdf.text(`AI Trip Planner · ${meta.destination || 'Trip'} · Page ${pageNum}`, pageW / 2, pageH - 8, { align: 'center' });
  };

  // ── Cover / Header ─────────────────────────────────────────────────────────
  // Gold header bar
  pdf.setFillColor(201, 168, 76);
  pdf.rect(0, 0, pageW, 42, 'F');

  // Dark overlay strip
  pdf.setFillColor(17, 17, 16);
  pdf.rect(0, 38, pageW, 6, 'F');

  // Title
  pdf.setFontSize(22);
  pdf.setTextColor(17, 17, 16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AI Trip Planner', margin, 16);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(50, 40, 20);
  pdf.text(`Your personalised itinerary`, margin, 26);

  // Tags row below header
  y = 56;
  const tags = [
    meta.destination && `📍 ${meta.destination}`,
    meta.country && `🌍 ${meta.country}`,
    meta.duration && `📅 ${meta.duration} days`,
    meta.budget && `💰 ${meta.budget}`,
    meta.companions && `👥 ${meta.companions}`,
  ].filter(Boolean);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  let tagX = margin;
  tags.forEach(tag => {
    const tagW = pdf.getTextWidth(tag) + 6;
    pdf.setFillColor(245, 242, 236);
    pdf.setDrawColor(201, 168, 76);
    pdf.roundedRect(tagX, y - 5, tagW, 7, 1.5, 1.5, 'FD');
    pdf.setTextColor(100, 80, 20);
    pdf.text(tag, tagX + 3, y);
    tagX += tagW + 4;
    if (tagX > pageW - margin - 40) { tagX = margin; y += 10; }
  });

  // Generated date
  y += 12;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 140, 120);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y);

  // Divider
  y += 6;
  pdf.setDrawColor(201, 168, 76);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 10;

  drawPageFooter();

  // ── Parse & Render Content ─────────────────────────────────────────────────
  // Strip the Alternative Places section from PDF
  const cleanText = tripText.replace(/##\s*Alternative Places?[\s\S]*$/i, '').trim();
  const lines = cleanText.split('\n');

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) { y += 3; return; }

    // ## Day N: Title
    if (line.startsWith('## ')) {
      checkY(20);
      y += 4;
      // Day pill background
      pdf.setFillColor(201, 168, 76);
      pdf.roundedRect(margin, y - 5, contentW, 10, 2, 2, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 17, 16);
      pdf.text(line.replace('## ', ''), margin + 4, y + 1);
      y += 12;
      return;
    }

    // ### Section (Morning / Afternoon / Evening etc.)
    if (line.startsWith('### ')) {
      checkY(10);
      y += 3;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(160, 117, 30);
      pdf.text('▸ ' + line.replace('### ', ''), margin + 2, y);
      y += 6;
      return;
    }

    // **bold** text — activity name
    if (line.startsWith('**') || line.includes('**')) {
      checkY(7);
      const clean = line.replace(/\*\*/g, '');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 35, 25);
      const wrapped = pdf.splitTextToSize(clean, contentW - 4);
      pdf.text(wrapped, margin + 4, y);
      y += wrapped.length * 5;
      return;
    }

    // Bullet point
    if (line.startsWith('- ') || line.startsWith('* ')) {
      checkY(6);
      const clean = line.replace(/^[-*]\s*/, '');
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 55, 45);
      pdf.text('•', margin + 2, y);
      const wrapped = pdf.splitTextToSize(clean, contentW - 8);
      pdf.text(wrapped, margin + 6, y);
      y += wrapped.length * 4.5;
      return;
    }

    // Regular paragraph text
    checkY(6);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 55, 45);
    const wrapped = pdf.splitTextToSize(line, contentW);
    pdf.text(wrapped, margin, y);
    y += wrapped.length * 4.5 + 1;
  });

  // ── Final Footer ───────────────────────────────────────────────────────────
  checkY(20);
  y += 6;
  pdf.setDrawColor(201, 168, 76);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(150, 140, 120);
  pdf.text(
    'This itinerary was AI-generated by AI Trip Planner · Vignan University · For informational purposes only.',
    pageW / 2, y, { align: 'center' }
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `${(meta.destination || 'trip').replace(/\s+/g, '-').toLowerCase()}-itinerary.pdf`;
  pdf.save(filename);
};
