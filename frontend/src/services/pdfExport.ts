import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StructuredCaseV2 } from '@/types/intake_v2';
import type { CompletePayload } from '@/components/simulation/StreamingArgumentDisplay';
import type { DebateMessage, WeaknessAnalysis } from '@/context/SessionContext';
import { DISCLAIMER_COMPACT } from '@/constants/legalNotices';
import type { ChatMessage, WeaknessAnalysisResult } from '@/services/api';

// ─── Legacy single-round export (kept for backward compatibility) ──────────────

export default function generatePdf(
  structuredCase: StructuredCaseV2,
  simulationResult: CompletePayload,
  rebuttals: Record<string, string>,
  messages: DebateMessage[] = [],
  analysis: WeaknessAnalysis | null = null,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const checkPageBreak = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - margin - 15) {
      doc.addPage();
      currentY = margin;
      drawHeaderFooter();
      currentY += 10;
    }
  };

  const drawHeaderFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(DISCLAIMER_COMPACT.toUpperCase(), pageWidth / 2, 10, { align: 'center' });
    const currentPage = (doc.internal as unknown as { getCurrentPageInfo: () => { pageNumber: number } }).getCurrentPageInfo().pageNumber;
    doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(DISCLAIMER_COMPACT.toUpperCase(), pageWidth / 2, pageHeight - 5, { align: 'center' });
  };

  const addText = (
    text: string,
    fontSize: number,
    isBold: boolean = false,
    textColor: number[] = [0, 0, 0],
    lineSpacing: number = 7
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    const textHeight = lines.length * (fontSize * 0.3527);
    checkPageBreak(textHeight + lineSpacing);
    doc.text(lines, margin, currentY);
    currentY += textHeight + lineSpacing;
  };

  drawHeaderFooter();
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Hearing Rehearsal Guide', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  checkPageBreak(30);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [41, 128, 185] },
    body: [
      ['Jurisdiction', structuredCase.jurisdiction],
      ['Claim Type', structuredCase.claim_type],
      ['Plaintiff', structuredCase.parties.find((p) => p.role === 'plaintiff')?.name || 'N/A'],
      ['Defendant', structuredCase.parties.find((p) => p.role === 'defendant')?.name || 'N/A'],
    ],
    theme: 'grid',
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  addText(`Grounding Verification Score: ${(simulationResult.g_v_score * 100).toFixed(0)}%`, 12, true, [41, 128, 185]);
  if (simulationResult.insufficient_grounding) {
    addText('WARNING: Insufficient grounding in retrieved case law.', 10, true, [200, 50, 50]);
  }
  currentY += 5;

  if (messages.length > 0) {
    addText('Chat Transcript', 16, true, [41, 128, 185]);
    messages.forEach((message) => {
      const label = message.sender === 'opponent' ? 'Opposing Counsel' : 'Your Rebuttal';
      const color = message.sender === 'opponent' ? [200, 50, 50] : [41, 128, 185];
      addText(`${label}:`, 11, true, color, 4);
      addText(message.text || '[No text]', 10, false, [0, 0, 0], 6);
      if (message.citations?.length) {
        addText(
          `Citations: ${message.citations.map(c => c.citation).join('; ')}`,
          9,
          false,
          [90, 90, 90],
          5,
        );
      }
    });
  }

  // Iterating over opposing arguments
  simulationResult.arguments.forEach((arg, idx) => {
    checkPageBreak(20);
    addText(`Opposing Argument ${idx + 1} - ${arg.category.toUpperCase()} (${arg.confidence} Confidence)`, 14, true, [50, 50, 50]);
    currentY += 2;
    addText(arg.claim_text, 11, false, [0, 0, 0]);
    if (arg.supporting_authority.length > 0) {
      addText('Supporting Authorities:', 10, true, [100, 100, 100], 4);
      arg.supporting_authority.forEach((auth) => {
        const badge = auth.unverified ? '[UNVERIFIED]' : '[VERIFIED]';
        const color = auth.unverified ? [200, 50, 50] : [50, 150, 50];
        addText(`${badge} ${auth.citation}`, 10, false, color, 4);
      });
      currentY += 4;
    } else {
      addText('No authorities cited.', 10, false, [150, 150, 150], 8);
    }
    currentY += 2;
    addText('Your Rebuttal / Notes:', 12, true, [41, 128, 185], 5);
    const rebuttalText = rebuttals[idx.toString()];
    if (rebuttalText && rebuttalText.trim().length > 0) {
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
    currentY += 5;
  });

  if (analysis) {
    checkPageBreak(30);
    addText('Case Weaknesses & Strategy to Overcome', 16, true, [41, 128, 185]);
    addText('Top Weaknesses:', 12, true, [50, 50, 50], 5);
    analysis.weaknesses.forEach((weakness, index) => {
      addText(`${index + 1}. ${weakness}`, 10, false, [0, 0, 0], 5);
    });
    addText('Improvement Tips:', 12, true, [50, 50, 50], 5);
    analysis.improvement_tips.forEach((tip, index) => {
      addText(`${index + 1}. ${tip}`, 10, false, [0, 0, 0], 5);
    });
  }
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`hearing-rehearsal-guide-${structuredCase.claim_type}-${dateStr}.pdf`);
}

// ─── New continuous-debate export ─────────────────────────────────────────────

export function exportDebatePDF(
  structuredCase: StructuredCaseV2,
  chatHistory: ChatMessage[],
  analysis?: WeaknessAnalysisResult
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── helpers ──
  const nl = (space = 6) => { y += space; };

  const checkBreak = (needed: number) => {
    if (y + needed > pageHeight - margin - 12) {
      doc.addPage();
      y = margin;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text('NOT LEGAL ADVICE — FOR PRACTICE PURPOSES ONLY', pageWidth / 2, 8, { align: 'center' });
    const pg = (doc.internal as unknown as { getCurrentPageInfo: () => { pageNumber: number } }).getCurrentPageInfo().pageNumber;
    doc.text(`Page ${pg}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const heading = (text: string, size = 14, rgb: [number, number, number] = [30, 30, 30]) => {
    checkBreak(12);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...rgb);
    doc.text(text, margin, y);
    y += size * 0.4 + 3;
  };

  const body = (text: string, size = 10, rgb: [number, number, number] = [50, 50, 50]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...rgb);
    const lines = doc.splitTextToSize(text, contentWidth);
    const h = lines.length * (size * 0.37);
    checkBreak(h + 4);
    doc.text(lines, margin, y);
    y += h + 4;
  };

  const divider = (rgb: [number, number, number] = [200, 200, 200]) => {
    checkBreak(6);
    doc.setDrawColor(...rgb);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // ── Cover ──
  drawRunningHeader();
  doc.setFillColor(10, 12, 20);
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 215, 0);
  doc.text('⚖ Debate Practice Report', pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(144, 164, 174);
  doc.text('Opposing Counsel Simulator  ·  Continuous Debate Format', pageWidth / 2, 38, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, 46, { align: 'center' });
  y = 65;

  // ── Case summary table ──
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
    head: [['Case Detail', 'Value']],
    body: [
      ['Jurisdiction', structuredCase.jurisdiction || '—'],
      ['Claim Type', String(structuredCase.claim_type) || '—'],
      ['Plaintiff', structuredCase.parties?.find((p) => p.role === 'plaintiff')?.name || 'You'],
      ['Defendant', structuredCase.parties?.find((p) => p.role === 'defendant')?.name || 'Opposing Party'],
      ['Debate Turns', String(chatHistory.filter((m) => m.role === 'user').length)],
    ],
    theme: 'striped',
    styles: { fontSize: 9 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // ── Debate Transcript ──
  divider([41, 128, 185]);
  heading('Debate Transcript', 13, [21, 101, 192]);
  nl(2);

  chatHistory.forEach((msg, i) => {
    const isUser = msg.role === 'user';
    const label = isUser ? 'You (Plaintiff)' : 'Opposing Counsel';
    const turnNum = Math.floor(i / 2) + 1;
    const rgb: [number, number, number] = isUser ? [21, 101, 192] : [183, 28, 28];

    checkBreak(20);

    // Turn label pill
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...rgb);
    doc.text(`${isUser ? '🧑' : '⚖'} ${label}  ·  Turn ${turnNum}`, margin, y);
    y += 5;

    // Content box
    const lines = doc.splitTextToSize(msg.content, contentWidth - 6);
    const boxH = lines.length * (10 * 0.37) + 8;
    checkBreak(boxH + 4);

    doc.setFillColor(...(isUser ? ([235, 245, 255] as [number, number, number]) : ([255, 235, 235] as [number, number, number])));
    doc.setDrawColor(...rgb);
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(lines, margin + 3, y + 5);
    y += boxH + 8;
  });

  // ── Strategic Analysis ──
  if (analysis && analysis.weaknesses.length > 0) {
    doc.addPage();
    y = margin;
    drawRunningHeader();

    divider([239, 83, 80]);
    heading('Strategic Debrief', 14, [183, 28, 28]);
    nl(2);

    heading('⚠ Key Weaknesses Identified', 11, [183, 28, 28]);
    analysis.weaknesses.forEach((w, i) => {
      checkBreak(14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(183, 28, 28);
      doc.text(`${i + 1}.`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(w, contentWidth - 8);
      doc.text(lines, margin + 6, y);
      y += lines.length * (9 * 0.37) + 6;
    });

    nl(4);
    heading('💡 Actionable Improvements', 11, [21, 101, 192]);
    analysis.improvement_tips.forEach((tip, i) => {
      checkBreak(14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 101, 192);
      doc.text(`→`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(tip, contentWidth - 8);
      doc.text(lines, margin + 6, y);
      y += lines.length * (9 * 0.37) + 6;
    });
  }

  // ── Footer disclaimer ──
  checkBreak(20);
  nl(8);
  divider([200, 200, 200]);
  body(
    'IMPORTANT NOTICE: This report was generated by an AI simulation tool for educational and self-preparation purposes only. ' +
    'It does not constitute legal advice and should not be relied upon as such. Always consult a qualified attorney for advice specific to your situation.',
    8,
    [120, 120, 120]
  );

  const dateStr = new Date().toISOString().split('T')[0];
  const claimType = String(structuredCase.claim_type).replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`debate-practice-report-${claimType}-${dateStr}.pdf`);
}
