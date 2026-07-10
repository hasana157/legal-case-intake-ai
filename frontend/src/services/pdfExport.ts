import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StructuredCaseV2 } from '@/types/intake_v2';
import type { CompletePayload } from '@/components/simulation/StreamingArgumentDisplay';
import { DISCLAIMER_COMPACT } from '@/constants/legalNotices';

export default function generatePdf(
  structuredCase: StructuredCaseV2,
  simulationResult: CompletePayload,
  rebuttals: Record<string, string>
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  let currentY = margin;

  // --- Helper Functions for Pagination ---
  
  const checkPageBreak = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - margin - 15) { // 15mm for footer space
      doc.addPage();
      currentY = margin;
      drawHeaderFooter();
      currentY += 10; // extra space after header
    }
  };

  const drawHeaderFooter = () => {
    const pageCount = (doc.internal as any).getNumberOfPages();
    const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;
    
    // Header
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(DISCLAIMER_COMPACT.toUpperCase(), pageWidth / 2, 10, { align: 'center' });
    
    // Footer
    doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(DISCLAIMER_COMPACT.toUpperCase(), pageWidth / 2, pageHeight - 5, { align: 'center' });
  };

  const addText = (text: string, fontSize: number, isBold: boolean = false, textColor: number[] = [0, 0, 0], lineSpacing: number = 7) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    const textHeight = lines.length * (fontSize * 0.3527); // approx height in mm
    
    checkPageBreak(textHeight + lineSpacing);
    doc.text(lines, margin, currentY);
    currentY += textHeight + lineSpacing;
  };

  // --- Start Drawing ---
  drawHeaderFooter();

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Hearing Rehearsal Guide', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Case Summary Table
  checkPageBreak(30);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [41, 128, 185] },
    body: [
      ['Jurisdiction', structuredCase.jurisdiction],
      ['Claim Type', structuredCase.claim_type],
      ['Plaintiff', structuredCase.parties.find(p => p.role === 'plaintiff')?.name || 'N/A'],
      ['Defendant', structuredCase.parties.find(p => p.role === 'defendant')?.name || 'N/A'],
    ],
    theme: 'grid'
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Overall Score
  addText(`Grounding Verification Score: ${(simulationResult.g_v_score * 100).toFixed(0)}%`, 12, true, [41, 128, 185]);
  if (simulationResult.insufficient_grounding) {
    addText("WARNING: The retrieved case law provided insufficient grounding for a complete defense strategy.", 10, true, [200, 50, 50]);
  }
  currentY += 5;

  // Iterating over opposing arguments
  simulationResult.arguments.forEach((arg, idx) => {
    checkPageBreak(20);
    
    // Argument Header
    addText(`Opposing Argument ${idx + 1} - ${arg.category.toUpperCase()} (${arg.confidence} Confidence)`, 14, true, [50, 50, 50]);
    currentY += 2;
    
    // Argument Body
    addText(arg.claim_text, 11, false, [0, 0, 0]);
    
    // Citations
    if (arg.supporting_authority.length > 0) {
      addText('Supporting Authorities:', 10, true, [100, 100, 100], 4);
      arg.supporting_authority.forEach(auth => {
        const badge = auth.unverified ? '[UNVERIFIED]' : '[VERIFIED]';
        const color = auth.unverified ? [200, 50, 50] : [50, 150, 50];
        // We write the badge then the citation
        // To keep it simple, we just write it all as one string, but set the color based on verified status
        addText(`${badge} ${auth.citation}`, 10, false, color, 4);
      });
      currentY += 4;
    } else {
      addText('No authorities cited.', 10, false, [150, 150, 150], 8);
    }

    // User Rebuttal
    currentY += 2;
    addText('Your Rebuttal / Notes:', 12, true, [41, 128, 185], 5);
    
    const rebuttalText = rebuttals[idx.toString()];
    if (rebuttalText && rebuttalText.trim().length > 0) {
      // Draw a box around the rebuttal
      const lines = doc.splitTextToSize(rebuttalText, contentWidth - 4);
      const textHeight = lines.length * (11 * 0.3527);
      
      checkPageBreak(textHeight + 10);
      
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, contentWidth, textHeight + 6, 'FD');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(lines, margin + 2, currentY + 5);
      
      currentY += textHeight + 15;
    } else {
      addText('[No rebuttal drafted yet]', 11, false, [150, 150, 150]);
    }
    
    currentY += 5; // Spacing between arguments
  });

  // End of Document
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `hearing-rehearsal-guide-${structuredCase.claim_type}-${dateStr}.pdf`;
  doc.save(filename);
}
