
/* =========================================================
   GANESH MANDAL — FORMAL FINANCIAL REPORT
   Print-friendly PDF with tables, summary and signatures
   Requires jsPDF and jsPDF-AutoTable
   ========================================================= */

   const rs = n =>
   'Rs. ' + new Intl.NumberFormat('en-IN').format(n || 0);
 
 const C = {
   pri:   [128, 32, 32],
   sec:   [92, 24, 24],
   gold:  [184, 145, 70],
   ok:    [40, 90, 60],
   bad:   [160, 45, 45],
   ink:   [35, 35, 35],
   mut:   [90, 90, 90],
   soft:  [248, 248, 248],
   track: [215, 215, 215],
   white: [255, 255, 255]
 };
 
 // ===== Load Mandal Logo =====
 const loadLogo = () => new Promise(resolve => {
   const img = new Image();
 
   img.onload = () => {
     try {
       const canvas = document.createElement('canvas');
       canvas.width = img.naturalWidth || img.width;
       canvas.height = img.naturalHeight || img.height;
 
       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0);
 
       resolve({
         data: canvas.toDataURL('image/png'),
         w: canvas.width,
         h: canvas.height
       });
     } catch (error) {
       console.warn('Could not process mandal logo:', error);
       resolve(null);
     }
   };
 
   img.onerror = () => resolve(null);
   img.src = 'images/mandal-logo.png';
 });
 
 // ===== Section Heading =====
 const sectionTitle = (doc, text, y, color = C.pri) => {
   doc.setFillColor(...color);
   doc.roundedRect(14, y - 5, 2.5, 7, 0.8, 0.8, 'F');
 
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(11);
   doc.setTextColor(...C.ink);
   doc.text(text, 20, y);
 
   doc.setFont('helvetica', 'normal');
   return y + 5;
 };
 
 // ===== Financial Summary Table Style =====
 const formalTableStyles = {
   theme: 'grid',
   margin: { left: 14, right: 14 },
   styles: {
     font: 'helvetica',
     fontSize: 8,
     cellPadding: 3,
     textColor: C.ink,
     lineColor: [205, 205, 205],
     lineWidth: 0.15,
     valign: 'middle',
     overflow: 'linebreak'
   },
   headStyles: {
     fillColor: C.sec,
     textColor: C.white,
     fontStyle: 'bold',
     halign: 'center',
     fontSize: 8
   },
   footStyles: {
     fillColor: [238, 238, 238],
     textColor: C.ink,
     fontStyle: 'bold'
   },
   alternateRowStyles: {
     fillColor: C.soft
   },
   showHead: 'everyPage'
 };
 
 // ===== Create PDF =====
 async function makePdf() {
   const { jsPDF } = window.jspdf;
   const doc = new jsPDF({
     orientation: 'portrait',
     unit: 'mm',
     format: 'a4'
   });
 
   const W = doc.internal.pageSize.getWidth();
   const H = doc.internal.pageSize.getHeight();
   const t = totals();
 
   const cs = DB.list('contributions')
     .slice()
     .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
 
   const ex = DB.list('expenses')
     .slice()
     .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
 
   const generatedDate = fdate(today());
 
   let y = 0;
 
   // Add a page when the next section will not fit.
   const need = h => {
     if (y + h > 274) {
       doc.addPage();
       y = 22;
     }
   };
 
   // ===== Formal Letterhead =====
   doc.setFillColor(...C.white);
   doc.rect(0, 0, W, 43, 'F');
 
   const logo = await loadLogo();
 
   if (logo) {
     const maxW = 27;
     const maxH = 27;
     const scale = Math.min(
       maxW / logo.w,
       maxH / logo.h
     );
 
     const logoW = logo.w * scale;
     const logoH = logo.h * scale;
 
     doc.addImage(
       logo.data,
       'PNG',
       14,
       5,
       logoW,
       logoH
     );
   }
 
   doc.setTextColor(...C.ink);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(15);
 
   doc.text('SHRADDHA GROUP', W / 2, 12, {
     align: 'center'
   });
 
   doc.setFontSize(10);
   doc.text('CONTRIBUTION AND EXPENDITURE STATEMENT',
     W / 2, 20, {
       align: 'center'
     }
   );
 
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8);
 
   doc.text('Financial Records and Account Summary',
     W / 2, 26, {
       align: 'center'
     }
   );
 
   doc.setDrawColor(...C.sec);
   doc.setLineWidth(0.6);
   doc.line(14, 33, W - 14, 33);
 
   doc.setDrawColor(...C.gold);
   doc.setLineWidth(0.25);
   doc.line(14, 35, W - 14, 35);
 
   doc.setFontSize(8);
   doc.setTextColor(...C.mut);
 
   doc.text('Report Date: ' + generatedDate, 14, 41);
 
   doc.text('Currency: INR (Rs.)', W - 14, 41, {
     align: 'right'
   });
 
   y = 51;
 
   // ===== Financial Overview =====
   y = sectionTitle(
     doc,
     '1. FINANCIAL OVERVIEW',
     y,
     C.pri
   ) + 2;
 
   doc.autoTable({
     ...formalTableStyles,
     startY: y,
 
     head: [[
       'Financial Particulars',
       'Amount (Rs.)'
     ]],
 
     body: [
       ['Total Contributions Received', rs(t.collected)],
       ['Total Expenditure Incurred', rs(t.expenses)],
       ['Closing Balance', rs(t.balance)]
     ],
 
     columnStyles: {
       0: { cellWidth: 115 },
       1: { halign: 'right' }
     },
 
     didParseCell: data => {
       if (
         data.section === 'body' &&
         data.row.index === 2
       ) {
         data.cell.styles.fontStyle = 'bold';
         data.cell.styles.fillColor = [240, 240, 240];
       }
     }
   });
 
   y = doc.lastAutoTable.finalY + 12;
 
   // ===== Top Contributors =====
   const byMember = {};
 
   cs.forEach(c => {
     const id = c.memberId;
     byMember[id] =
       (byMember[id] || 0) + Number(c.amount || 0);
   });
 
   const top = Object.entries(byMember)
     .sort((a, b) => b[1] - a[1])
     .slice(0, 5);
 
   if (top.length) {
     need(25 + top.length * 7);
 
     y = sectionTitle(
       doc,
       '2. CONTRIBUTION SUMMARY',
       y,
       C.pri
     ) + 2;
 
     doc.autoTable({
       ...formalTableStyles,
       startY: y,
 
       head: [[
         'Sr. No.',
         'Contributor Name',
         'Contribution Amount (Rs.)'
       ]],
 
       body: top.map(([id, amount], i) => [
         i + 1,
         String(mname(id) || 'Unknown'),
         rs(amount)
       ]),
 
       columnStyles: {
         0: { cellWidth: 18, halign: 'center' },
         1: { cellWidth: 95 },
         2: { halign: 'right' }
       }
     });
 
     y = doc.lastAutoTable.finalY + 12;
   }
 
   // ===== Detailed Contributions =====
   need(30);
 
   y = sectionTitle(
     doc,
     '3. REGISTER OF CONTRIBUTIONS',
     y,
     C.ok
   ) + 2;
 
   doc.autoTable({
     ...formalTableStyles,
     startY: y,
 
     head: [[
       'Sr.',
       'Date',
       'Member Name',
       'Type',
       'Amount (Rs.)',
       'Remarks'
     ]],
 
     body: cs.length
       ? cs.map((c, i) => [
           i + 1,
           c.date ? fdate(c.date) : '-',
           String(mname(c.memberId) || 'Unknown'),
           c.type === 'mandatory'
             ? 'Mandatory'
             : 'Regular',
           rs(c.amount),
           c.notes || '-'
         ])
       : [[
           '',
           '',
           'No contribution records available',
           '',
           '',
           ''
         ]],
 
     foot: [[
       '',
       '',
       '',
       'TOTAL',
       rs(sum(cs)),
       ''
     ]],
 
     columnStyles: {
       0: { cellWidth: 9, halign: 'center' },
       1: { cellWidth: 23 },
       2: { cellWidth: 43 },
       3: { cellWidth: 21 },
       4: { cellWidth: 29, halign: 'right' },
       5: { cellWidth: 'auto' }
     },
 
     styles: {
       ...formalTableStyles.styles,
       fontSize: 7,
       cellPadding: 2.5
     },
 
     didParseCell: data => {
       if (
         data.section === 'body' &&
         data.column.index === 3
       ) {
         data.cell.styles.textColor =
           data.cell.raw === 'Mandatory'
             ? C.pri
             : C.ink;
       }
     }
   });
 
   y = doc.lastAutoTable.finalY + 12;
 
   // ===== Expense Category Summary =====
   const byCat = {};
 
   ex.forEach(e => {
     const category = e.category || 'Uncategorized';
 
     byCat[category] =
       (byCat[category] || 0) + Number(e.amount || 0);
   });
 
   const cats = Object.entries(byCat)
     .sort((a, b) => b[1] - a[1]);
 
   if (cats.length) {
     need(25);
 
     y = sectionTitle(
       doc,
       '4. EXPENDITURE BY CATEGORY',
       y,
       C.pri
     ) + 2;
 
     doc.autoTable({
       ...formalTableStyles,
       startY: y,
 
       head: [[
         'Sr. No.',
         'Expense Category',
         'Amount (Rs.)'
       ]],
 
       body: cats.map(([name, amount], i) => [
         i + 1,
         String(name),
         rs(amount)
       ]),
 
       foot: [[
         '',
         'TOTAL EXPENDITURE',
         rs(sum(ex))
       ]],
 
       columnStyles: {
         0: { cellWidth: 18, halign: 'center' },
         1: { cellWidth: 100 },
         2: { halign: 'right' }
       }
     });
 
     y = doc.lastAutoTable.finalY + 12;
   }
 
   // ===== Detailed Expenses =====
   need(30);
 
   y = sectionTitle(
     doc,
     '5. REGISTER OF EXPENDITURE',
     y,
     C.pri
   ) + 2;
 
   doc.autoTable({
     ...formalTableStyles,
     startY: y,
 
     head: [[
       'Sr.',
       'Date',
       'Description',
       'Category',
       'Vendor / Remarks',
       'Amount (Rs.)'
     ]],
 
     body: ex.length
       ? ex.map((e, i) => [
           i + 1,
           e.date ? fdate(e.date) : '-',
           e.description || '-',
           e.category || '-',
           e.vendor || '-',
           rs(e.amount)
         ])
       : [[
           '',
           '',
           'No expense records available',
           '',
           '',
           ''
         ]],
 
     foot: [[
       '',
       '',
       '',
       '',
       'TOTAL',
       rs(sum(ex))
     ]],
 
     columnStyles: {
       0: { cellWidth: 9, halign: 'center' },
       1: { cellWidth: 23 },
       2: { cellWidth: 40 },
       3: { cellWidth: 28 },
       4: { cellWidth: 40 },
       5: { cellWidth: 'auto', halign: 'right' }
     },
 
     styles: {
       ...formalTableStyles.styles,
       fontSize: 7,
       cellPadding: 2.5
     }
   });
 
   y = doc.lastAutoTable.finalY + 12;
 
   // ===== Final Summary and Verification =====
   // Keep the summary and signature fields together.
   need(85);
 
   y = sectionTitle(
     doc,
     '6. FINAL STATEMENT',
     y,
     C.pri
   ) + 2;
 
   doc.autoTable({
     ...formalTableStyles,
     startY: y,
 
     head: [[
       'Particulars',
       'Amount (Rs.)'
     ]],
 
     body: [
       ['Total Contributions Received', rs(t.collected)],
       ['Total Expenditure Incurred', rs(t.expenses)],
       ['Closing Balance', rs(t.balance)]
     ],
 
     columnStyles: {
       0: { cellWidth: 115 },
       1: { halign: 'right' }
     },
 
     didParseCell: data => {
       if (
         data.section === 'body' &&
         data.row.index === 2
       ) {
         data.cell.styles.fontStyle = 'bold';
         data.cell.styles.fillColor = [240, 240, 240];
       }
     }
   });
 
   y = doc.lastAutoTable.finalY + 8;
 
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8);
   doc.setTextColor(...C.ink);
 
   const declaration =
     'This statement has been prepared from the financial records ' +
     'maintained by the organization. The particulars and amounts ' +
     'should be verified against the original records and supporting documents.';
 
   const declarationLines = doc.splitTextToSize(
     declaration,
     W - 28
   );
 
   doc.text(declarationLines, 14, y);
 
   y += declarationLines.length * 4 + 19;
 
   // Move signatures to a new page if necessary.
   if (y + 18 > 274) {
     doc.addPage();
     y = 35;
   }
 
   const sigGap = 6;
   const sigW = (W - 28 - sigGap * 2) / 3;
 
   const signatories = [
     'Prepared By',
     'Verified By',
     'Authorized Signatory'
   ];
 
   signatories.forEach((label, i) => {
     const x = 14 + i * (sigW + sigGap);
 
     doc.setDrawColor(100, 100, 100);
     doc.setLineWidth(0.25);
     doc.line(x, y, x + sigW, y);
 
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8);
     doc.setTextColor(...C.ink);
 
     doc.text(label, x + sigW / 2, y + 5, {
       align: 'center'
     });
 
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(7.5);
     doc.setTextColor(...C.mut);
 
     doc.text('Name: __________________', x, y + 12);
   });
 
   // ===== Page Headers and Footers =====
   const pageCount = doc.getNumberOfPages();
 
   for (let p = 1; p <= pageCount; p++) {
     doc.setPage(p);
 
     // Simple continuation-page header.
     if (p > 1) {
       doc.setFillColor(...C.sec);
       doc.rect(0, 0, W, 3, 'F');
 
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(8);
       doc.setTextColor(...C.ink);
 
       doc.text(
         'SHRADDHA GROUP - FINANCIAL STATEMENT',
         14,
         11
       );
 
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(7);
       doc.setTextColor(...C.mut);
 
       doc.text(
         'Report Date: ' + generatedDate,
         W - 14,
         11,
         { align: 'right' }
       );
     }
 
     doc.setDrawColor(190, 190, 190);
     doc.setLineWidth(0.2);
     doc.line(14, 285, W - 14, 285);
 
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(7.5);
     doc.setTextColor(...C.mut);
 
     doc.text(
       'SHRADDHA GROUP | Financial Records',
       14,
       291
     );
 
     doc.text(
       'System-generated report',
       W / 2,
       291,
       { align: 'center' }
     );
 
     doc.text(
       `Page ${p} of ${pageCount}`,
       W - 14,
       291,
       { align: 'right' }
     );
   }
 
   // Download the PDF.
   doc.save('ganesh-mandal-financial-report.pdf');
 }
 
 // ===== Report Page UI =====
 PAGES.report = () => {
   const t = totals();
 
   main().innerHTML =
     head(
       'Financial Report',
       'Generate a formal PDF statement of contributions, expenses and closing balance.'
     ) +
 
     `<div class="grid g4">
       ${card('Total Contributions', fmt(t.collected), 'up')}
       ${card('Total Expenses', fmt(t.expenses), 'down')}
       ${card('Closing Balance', fmt(t.balance), 'hero')}
     </div>
 
     <div class="card">
       <h3>Financial Statement</h3>
       <p style="color:var(--muted)">
         Includes contribution records, expenditure records,
         financial totals and verification fields.
       </p>
       <button class="btn primary" id="dl">
         Download Financial Report (PDF)
       </button>
     </div>`;
 
   $('#dl').onclick = async () => {
     const btn = $('#dl');
 
     try {
       btn.disabled = true;
       btn.textContent = 'Generating PDF...';
 
       await makePdf();
 
       toast('Financial report downloaded');
     } catch (error) {
       console.error('PDF generation failed:', error);
       toast('Could not create PDF', 'bad');
     } finally {
       btn.disabled = false;
       btn.textContent = 'Download Financial Report (PDF)';
     }
   };
 };
 