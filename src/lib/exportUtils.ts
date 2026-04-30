import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Datos') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const addHeader = (pdf: jsPDF, title: string, metadata?: { engineer?: string, project?: string }) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header Background
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(30, 41, 59);
  pdf.text(title, 15, 18);
  
  // Metadata
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  if (metadata?.engineer) {
    pdf.text(`Ingeniero Responsable: ${metadata.engineer}`, 15, 32);
  }
  if (metadata?.project) {
    pdf.text(`Proyecto: ${metadata.project}`, 15, 37);
  }
  
  // Date
  const dateStr = new Date().toLocaleDateString('es-PE', { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generado: ${dateStr}`, pageWidth - 15, 18, { align: 'right' });
};

const addFooter = (pdf: jsPDF, pageNumber: number, totalPages: number) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  
  pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  pdf.text('Documento Técnico de Ingeniería - Confidencial', 15, pageHeight - 10);
  pdf.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
};

export const exportToPDF = async (elementId: string, fileName: string, title: string, engineer?: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id ${elementId} not found`);
      return;
    }

    // Capture current scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    window.scrollTo(0, 0);

    // Add a small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.display = 'block';
          clonedElement.style.visibility = 'visible';
          clonedElement.style.overflow = 'visible';
          clonedElement.style.height = 'auto';
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.padding = '20px';
          clonedElement.style.width = element.scrollWidth + 'px';
          
          const tables = clonedElement.getElementsByTagName('table');
          for (let t = 0; t < tables.length; t++) {
            tables[t].style.width = '100%';
            tables[t].style.tableLayout = 'auto';
          }
        }
      }
    });

    // Restore scroll position
    window.scrollTo(scrollX, scrollY);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth - 30;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    addHeader(pdf, title, { engineer });
    
    // Handle multi-page if content is too long
    if (pdfHeight > pageHeight - 60) {
      let heightLeft = pdfHeight;
      let position = 50;
      let page = 1;

      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', 15, position, pdfWidth, pdfHeight);
        heightLeft -= (pageHeight - 60);
        position -= (pageHeight - 60);
        if (heightLeft > 0) {
          pdf.addPage();
          addHeader(pdf, title, { engineer });
          position = 50;
          page++;
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', 15, 50, pdfWidth, pdfHeight);
    }
    
    const totalPages = pdf.getNumberOfPages();
    for (let j = 1; j <= totalPages; j++) {
      pdf.setPage(j);
      addFooter(pdf, j, totalPages);
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateReportPDF = async (
  sections: { title: string, contentId: string }[], 
  fileName: string, 
  mainTitle: string,
  metadata?: { engineer?: string, project?: string }
) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Capture current scroll
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    window.scrollTo(0, 0);

    // Initial delay for rendering
    await new Promise(resolve => setTimeout(resolve, 1500));

    let currentY = 50;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const element = document.getElementById(section.contentId);
      
      if (!element) {
        console.error(`Element not found: ${section.contentId}`);
        continue;
      }

      if (i === 0 || currentY === 50) {
        addHeader(pdf, mainTitle, metadata);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      
      if (currentY + 20 > pageHeight - 20) {
        pdf.addPage();
        addHeader(pdf, mainTitle, metadata);
        currentY = 50;
      }
      
      pdf.setDrawColor(226, 232, 240);
      pdf.line(15, currentY, pageWidth - 15, currentY);
      currentY += 8;
      
      pdf.text(section.title.toUpperCase(), 15, currentY);
      currentY += 8;

      try {
        // Delay before capturing each section
        await new Promise(resolve => setTimeout(resolve, 800));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth + 50, // Slightly safer than 100
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById(section.contentId);
            if (clonedElement) {
              clonedElement.style.display = 'block';
              clonedElement.style.visibility = 'visible';
              clonedElement.style.overflow = 'visible';
              clonedElement.style.height = 'auto';
              clonedElement.style.maxHeight = 'none';
              clonedElement.style.padding = '20px';
              clonedElement.style.background = 'white';
              
              // Remove fixed heights and potential scroll containers inside the clone
              const scrollableElements = clonedElement.querySelectorAll('.overflow-y-auto, .overflow-x-auto');
              scrollableElements.forEach((el: any) => {
                el.style.overflow = 'visible';
                el.style.maxHeight = 'none';
                el.style.height = 'auto';
              });
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pageWidth - 30;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (currentY + pdfHeight > pageHeight - 25) {
          pdf.addPage();
          addHeader(pdf, mainTitle, metadata);
          currentY = 50;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(`${section.title} (continuación)`, 15, currentY);
          currentY += 10;
        }

        pdf.addImage(imgData, 'PNG', 15, currentY, pdfWidth, pdfHeight);
        currentY += pdfHeight + 15;
      } catch (sectionError) {
        console.error(`Error capturing section ${section.title}:`, sectionError);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(239, 68, 68);
        pdf.text(`Error al capturar esta sección: ${section.title}. Reintente o verifique visualización.`, 15, currentY);
        currentY += 15;
      }
    }

    const totalPages = pdf.getNumberOfPages();
    for (let j = 1; j <= totalPages; j++) {
      pdf.setPage(j);
      addFooter(pdf, j, totalPages);
    }

    window.scrollTo(scrollX, scrollY);
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating report PDF:', error);
    throw error;
  }
};

export const exportToPPT = async (
  elements: string | { contentId: string, title: string }[], 
  fileName: string, 
  title: string
) => {
  try {
    const pptx = new pptxgen();
    
    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: 'F8FAFC' };
    titleSlide.addText(title, { 
      x: 0, y: '40%', w: '100%', h: 1, 
      align: 'center', fontSize: 36, color: '1E293B', bold: true 
    });
    titleSlide.addText(`Generado el ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}`, { 
      x: 0, y: '55%', w: '100%', h: 0.5, 
      align: 'center', fontSize: 14, color: '64748B' 
    });

    const sections = typeof elements === 'string' 
      ? [{ contentId: elements, title }] 
      : elements;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    window.scrollTo(0, 0);

    for (const section of sections) {
      const element = document.getElementById(section.contentId);
      if (!element) {
        console.error(`Element with id ${section.contentId} not found`);
        continue;
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth + 50,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById(section.contentId);
            if (clonedElement) {
              clonedElement.style.display = 'block';
              clonedElement.style.visibility = 'visible';
              clonedElement.style.overflow = 'visible';
              clonedElement.style.height = 'auto';
              clonedElement.style.maxHeight = 'none';
              clonedElement.style.width = element.scrollWidth + 'px';
              clonedElement.style.background = 'white';
              
              // Remove fixed heights and potential scroll containers inside the clone
              const scrollableElements = clonedElement.querySelectorAll('.overflow-y-auto, .overflow-x-auto');
              scrollableElements.forEach((el: any) => {
                el.style.overflow = 'visible';
                el.style.maxHeight = 'none';
                el.style.height = 'auto';
              });
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');
        const contentSlide = pptx.addSlide();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const slideWidth = 10;
        const slideHeight = 5.625;
        
        let displayWidth = slideWidth - 1;
        let displayHeight = (imgHeight * displayWidth) / imgWidth;
        
        if (displayHeight > slideHeight - 1.5) {
          displayHeight = slideHeight - 1.5;
          displayWidth = (imgWidth * displayHeight) / imgHeight;
        }

        contentSlide.addText(section.title, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 20, color: '1E293B', bold: true });
        contentSlide.addImage({ 
          data: imgData, 
          x: (slideWidth - displayWidth) / 2, 
          y: 0.8, 
          w: displayWidth, 
          h: displayHeight 
        });
      } catch (sectionError) {
        console.error(`Error capturing section ${section.title} for PPT:`, sectionError);
        const errorSlide = pptx.addSlide();
        errorSlide.addText(`Error al capturar esta sección: ${section.title}`, { 
          x: 0, y: '45%', w: '100%', align: 'center', color: 'EF4444', fontSize: 18, italic: true 
        });
      }
    }

    window.scrollTo(scrollX, scrollY);
    await pptx.writeFile({ fileName: `${fileName}.pptx` });
  } catch (error) {
    console.error('Error generating PPT:', error);
    throw error;
  }
};
