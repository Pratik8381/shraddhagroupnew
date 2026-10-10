const rs = n => 'Rs. ' + new Intl.NumberFormat('en-IN').format(n || 0); // jsPDF can't print the ₹ symbol
const C = { pri:[249,115,22], sec:[153,27,27], gold:[234,179,8], ok:[22,163,74], bad:[220,38,38], man:[91,33,182], ink:[30,41,59], mut:[100,116,139], soft:[255,247,237], track:[226,232,240] };

const loadLogo = () => new Promise(ok => {
  const i = new Image();
  i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); ok({ data: c.toDataURL('image/png'), w: i.width, h: i.height }); };
  i.onerror = () => ok(null);
  i.src = 'images/mandal-logo.png';
});

const sectionTitle = (doc, text, y, col) => {
  doc.setFillColor(...col); doc.roundedRect(14, y - 5, 3, 7, 1, 1, 'F');
  doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(...C.ink); doc.text(text, 20, y);
  doc.setFont(undefined, 'normal'); return y + 4;
};
const statBox = (doc, x, y, w, label, value, col) => {
  doc.setFillColor(...C.soft); doc.roundedRect(x, y, w, 24, 3, 3, 'F');
  doc.setFillColor(...col); doc.roundedRect(x, y, 2.5, 24, 1, 1, 'F');
  doc.setFontSize(7.5); doc.setTextColor(...C.mut); doc.text(label.toUpperCase(), x + 7, y + 8);
  doc.setFont(undefined, 'bold'); doc.setFontSize(12.5); doc.setTextColor(...col); doc.text(value, x + 7, y + 18);
  doc.setFont(undefined, 'normal');
};
const progress = (doc, x, y, w, pct, col) => {
  doc.setFillColor(...C.track); doc.roundedRect(x, y, w, 4, 2, 2, 'F');
  if (pct > 0) { doc.setFillColor(...col); doc.roundedRect(x, y, Math.max(3, w * Math.min(pct, 100) / 100), 4, 2, 2, 'F'); }
};

async function makePdf() {
  const { jsPDF } = window.jspdf, doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth(), t = totals();
  const cs = DB.list('contributions').sort((a, b) => a.date.localeCompare(b.date));
  const ex = DB.list('expenses').sort((a, b) => a.date.localeCompare(b.date));
  let y = 0;
  const need = h => { if (y + h > 275) { doc.addPage(); y = 22; } };

  // ===== Header band =====
  doc.setFillColor(...C.sec); doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(...C.gold); doc.rect(0, 40, W, 2.5, 'F');
  const logo = await loadLogo();
  if (logo) {
    const h = 26, w = Math.min(h * logo.w / logo.h, 50);
    doc.setFillColor(255, 255, 255); doc.roundedRect(12, 7, w + 6, h + 0, 4, 4, 'F');
    doc.addImage(logo.data, 'PNG', 15, 7, w, h);
  }
  doc.setTextColor(255, 255, 255); doc.setFont(undefined, 'bold'); doc.setFontSize(20);
  doc.text('GANESH MANDAL', W - 14, 19, { align: 'right' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(10.5);
  doc.text('Contribution & Expense Report', W - 14, 27, { align: 'right' });
  doc.setFontSize(8.5); doc.text('Generated on ' + fdate(today()), W - 14, 34, { align: 'right' });
  y = 54;

  // ===== Key figures =====
  const bw = (W - 28 - 12) / 3;
  statBox(doc, 14, y, bw, 'Total Budget (Collected)', rs(t.collected), C.ok);
  statBox(doc, 14 + bw + 6, y, bw, 'Total Expenses', rs(t.expenses), C.bad);
  statBox(doc, 14 + 2 * (bw + 6), y, bw, 'Remaining Money', rs(t.balance), t.balance < 0 ? C.bad : C.pri);
  y += 32;
  const spentPct = t.collected ? Math.round(t.expenses / t.collected * 100) : 0;
  doc.setFontSize(9); doc.setTextColor(...C.mut); doc.text(`Budget used: ${spentPct}%`, 14, y);
  progress(doc, 45, y - 3.5, W - 59, spentPct, spentPct > 100 ? C.bad : spentPct >= 80 ? C.gold : C.ok);
  y += 12;

  // ===== Mandatory collection =====
  const mp = t.expected ? Math.round(t.mandPaid / t.expected * 100) : 0;
  y = sectionTitle(doc, 'Mandatory Collection', y, C.man) + 6;
  doc.setFontSize(9); doc.setTextColor(...C.ink);
  doc.text(`Expected ${rs(t.expected)}   |   Received ${rs(t.mandPaid)}   |   Pending ${rs(t.pending)}   |   ${mp}% collected`, 14, y);
  progress(doc, 14, y + 4, W - 28, mp, C.man);
  y += 16;

  // ===== Top contributors (bar chart) =====
  const byMember = {}; cs.forEach(c => byMember[c.memberId] = (byMember[c.memberId] || 0) + c.amount);
  const top = Object.entries(byMember).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length) {
    need(15 + top.length * 8);
    y = sectionTitle(doc, 'Top Contributors', y, C.pri) + 6;
    top.forEach(([id, amt]) => {
      doc.setFontSize(9); doc.setTextColor(...C.ink); doc.text(mname(id).slice(0, 24), 14, y + 3);
      progress(doc, 62, y, W - 62 - 42, amt / top[0][1] * 100, C.pri);
      doc.text(rs(amt), W - 14, y + 3, { align: 'right' }); y += 8;
    });
    y += 6;
  }

  // ===== Contributions table =====
  need(40); y = sectionTitle(doc, 'All Contributions', y, C.ok);
  doc.autoTable({
    startY: y + 2, margin: { left: 14, right: 14 },
    head: [['#', 'Date', 'Member', 'Type', 'Amount', 'Notes']],
    body: cs.length ? cs.map((c, i) => [i + 1, fdate(c.date), mname(c.memberId), c.type === 'mandatory' ? 'Mandatory' : 'Regular', rs(c.amount), c.notes || '']) : [['', 'No contributions yet', '', '', '', '']],
    foot: [['', '', '', 'TOTAL', rs(sum(cs)), '']],
    headStyles: { fillColor: C.sec, textColor: 255 }, footStyles: { fillColor: C.gold, textColor: 20, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.soft }, styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 4: { halign: 'right' } },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 3) d.cell.styles.textColor = d.cell.raw === 'Mandatory' ? C.man : [7, 89, 133]; }
  });
  y = doc.lastAutoTable.finalY + 12;

  // ===== Expenses by category (bar chart) =====
  const byCat = {}; ex.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + e.amount);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (cats.length) {
    need(15 + cats.length * 8);
    y = sectionTitle(doc, 'Expenses by Category', y, C.bad) + 6;
    cats.forEach(([name, amt]) => {
      doc.setFontSize(9); doc.setTextColor(...C.ink); doc.text(name.slice(0, 24), 14, y + 3);
      progress(doc, 62, y, W - 62 - 42, amt / cats[0][1] * 100, C.bad);
      doc.text(rs(amt), W - 14, y + 3, { align: 'right' }); y += 8;
    });
    y += 6;
  }

  // ===== Expenses table =====
  need(40); y = sectionTitle(doc, 'All Expenses', y, C.bad);
  doc.autoTable({
    startY: y + 2, margin: { left: 14, right: 14 },
    head: [['#', 'Date', 'Description', 'Category', 'Vendor / Notes', 'Amount']],
    body: ex.length ? ex.map((e, i) => [i + 1, fdate(e.date), e.description, e.category, e.vendor || '', rs(e.amount)]) : [['', 'No expenses yet', '', '', '', '']],
    foot: [['', '', '', '', 'TOTAL', rs(sum(ex))]],
    headStyles: { fillColor: C.sec, textColor: 255 }, footStyles: { fillColor: C.gold, textColor: 20, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.soft }, styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 5: { halign: 'right' } }
  });
  y = doc.lastAutoTable.finalY + 14;

  // ===== Final summary banner =====
  need(48);
  doc.setFillColor(...C.sec); doc.roundedRect(14, y, W - 28, 40, 4, 4, 'F');
  doc.setFillColor(...C.gold); doc.rect(14, y + 36, W - 28, 4, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.text('FINAL SUMMARY', 22, y + 9);
  doc.setFont(undefined, 'normal'); doc.setFontSize(9.5);
  doc.text('Total Budget (Collected)', 22, y + 18); doc.text(rs(t.collected), W - 22, y + 18, { align: 'right' });
  doc.text('Total Expenses', 22, y + 25);          doc.text(rs(t.expenses), W - 22, y + 25, { align: 'right' });
  doc.setFont(undefined, 'bold'); doc.setFontSize(12); doc.setTextColor(...C.gold);
  doc.text('REMAINING MONEY', 22, y + 33);         doc.text(rs(t.balance), W - 22, y + 33, { align: 'right' });

  // ===== Footer on every page =====
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    if (p > 1) { doc.setFillColor(...C.sec); doc.rect(0, 0, W, 4, 'F'); doc.setFillColor(...C.gold); doc.rect(0, 4, W, 1, 'F'); }
    doc.setDrawColor(...C.track); doc.line(14, 285, W - 14, 285);
    doc.setFontSize(8); doc.setTextColor(...C.mut);
    doc.text('© ' + new Date().getFullYear() + ' Pratik Patil · All rights reserved', 14, 291);
    doc.text(`Page ${p} of ${n}`, W - 14, 291, { align: 'right' });
  }
  doc.save('ganesh-mandal-report.pdf');
}

PAGES.report = () => {
  const t = totals();
  main().innerHTML = head('Download Report', 'One PDF with all contributions, expenses and the remaining balance') +
    `<div class="grid g4">${card('Total Budget (Collected)', fmt(t.collected), 'up')}${card('Total Expenses', fmt(t.expenses), 'down')}${card('Remaining Money', fmt(t.balance), 'hero')}</div>
     <div class="card"><button class="btn primary" id="dl">⬇ Download All Contribution List (PDF)</button></div>`;
  $('#dl').onclick = async () => { try { await makePdf(); toast('PDF downloaded'); } catch (e) { console.error(e); toast('Could not create PDF', 'bad'); } };
};