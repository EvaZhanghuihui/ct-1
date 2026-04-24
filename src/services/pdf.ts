import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (elements: HTMLElement[], filename: string = 'mistakes.pdf') => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pdfWidth - (2 * margin);

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // Check if we need a new page
    let currentY = 10; // Simple logic: one mistake per page or layout
    // For a real "printer" app, we might want to stack them, 
    // but here we'll do one major mistake block per page for clarity or handle overflow.
    
    // Simple implementation for now: Each selected mistake on a new page if it's the 1st one.
    if (i > 0) pdf.addPage();
    
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
  }

  pdf.save(filename);
};
