const rs = n => 'Rs. ' + new Intl.NumberFormat('en-IN').format(n || 0); // jsPDF can't print the ₹ symbol

const loadLogo = () => new Promise(ok => {
  const i = new Image();
  i.onload = () => {
    const c = document.createElement('canvas');
    c.width = i.width; c.height = i.height;
    c.getContext('2d').drawImage(i, 0, 0);
    ok({ data: c.toDataURL('image/png'), w: i.width, h: i.height });
  };
  i.onerror = () => ok(null);
  i.src = 'images/mandal-logo.png';
});

async function makePdf() {
  const { jsPDF } = window.jspdf, doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth(), t = totals();
  let y = 14;

  // Logo + title
  const logo = await loadLogo();
  if (logo) { const h = 24, w = h * logo.w / logo.h; doc.addImage(logo.data, 'PNG', (W - w) / 2, y, w, h); y += h + 6; }
  doc.setFontSize(18); doc.text('Ganesh Mandal', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(11); doc.text('Contribution & Expense Report', W / 2, y, { align: 'center' }); y += 6;
  doc.setFontSize(9);  doc.text('Generated on ' + fdate(today()), W / 2, y, { align: 'center' }); y += 10;

  // 1) All contributions
  const cs = DB.list('contributions').sort((a, b) => a.date.localeCompare(b.date));
  doc.setFontSize(13); doc.text('Contributions', 14, y);
  doc.autoTable({
    startY: y + 3,
    head: [['#', 'Date', 'Member', 'Type', 'Amount', 'Notes']],
    body: cs.length ? cs.map((c, i) => [i + 1, fdate(c.date), mname(c.memberId), c.type === 'mandatory' ? 'Mandatory' : 'Regular', rs(c.amount), c.notes || '']) : [['', 'No contributions', '', '', '', '']],
    foot: [['', '', '', 'Total', rs(sum(cs)), '']],
    headStyles: { fillColor: [249, 115, 22] }, footStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: { 4: { halign: 'right' } }, styles: { fontSize: 9 }
  });
  y = doc.lastAutoTable.finalY + 12;
  if (y > 250) { doc.addPage(); y = 20; }

  // 2) All expenses
  const ex = DB.list('expenses').sort((a, b) => a.date.localeCompare(b.date));
  doc.setFontSize(13); doc.text('Expenses', 14, y);
  doc.autoTable({
    startY: y + 3,
    head: [['#', 'Date', 'Description', 'Category', 'Vendor / Notes', 'Amount']],
    body: ex.length ? ex.map((e, i) => [i + 1, fdate(e.date), e.description, e.category, e.vendor || '', rs(e.amount)]) : [['', 'No expenses', '', '', '', '']],
    foot: [['', '', '', '', 'Total', rs(sum(ex))]],
    headStyles: { fillColor: [153, 27, 27] }, footStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: { 5: { halign: 'right' } }, styles: { fontSize: 9 }
  });
  y = doc.lastAutoTable.finalY + 12;
  if (y > 240) { doc.addPage(); y = 20; }

  // 3) Summary at the end
  doc.setFontSize(13); doc.text('Summary', 14, y);
  doc.autoTable({
    startY: y + 3, theme: 'grid',
    body: [
      ['Total Budget (Total Contributions Collected)', rs(t.collected)],
      ['Total Expenses', rs(t.expenses)],
      ['Remaining Money', rs(t.balance)]
    ],
    styles: { fontSize: 11, fontStyle: 'bold' }, columnStyles: { 1: { halign: 'right' } }
  });

  // Page numbers
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFontSize(8); doc.text(`Page ${p} of ${n}`, W / 2, 290, { align: 'center' }); }

  doc.save('ganesh-mandal-report.pdf');
}

PAGES.report = () => {
  const t = totals();
  main().innerHTML = head('Download Report', 'One PDF with all contributions, expenses and the remaining balance') +
    `<div class="grid g4">${card('Total Budget (Collected)', fmt(t.collected), 'up')}${card('Total Expenses', fmt(t.expenses), 'down')}${card('Remaining Money', fmt(t.balance), 'hero')}</div>
     <div class="card"><button class="btn primary" id="dl">⬇ Download All Contribution List (PDF)</button></div>`;
  $('#dl').onclick = async () => { try { await makePdf(); toast('PDF downloaded'); } catch (e) { console.error(e); toast('Could not create PDF', 'bad'); } };
};