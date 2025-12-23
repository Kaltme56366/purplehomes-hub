import { jsPDF } from 'jspdf';
import type { Property } from '@/types';

interface PropertyPDFOptions {
  properties: Property[];
  buyerName?: string;
  buyerEmail?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  companyName?: string;
  companyLogo?: string;
}

/**
 * Generate a professional property matching PDF for buyers
 */
export async function generatePropertyMatchPDF(options: PropertyPDFOptions): Promise<Blob> {
  const {
    properties,
    buyerName = 'Valued Buyer',
    buyerEmail,
    agentName = 'Purple Homes',
    agentPhone = '(555) 123-4567',
    agentEmail = 'info@purplehomes.com',
    companyName = 'Purple Homes',
  } = options;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header with Purple Homes branding
  pdf.setFillColor(147, 51, 234); // purple-600
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyName, margin, 25);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Investment Property Opportunities', margin, 33);

  yPos = 55;

  // Buyer information section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Property Matches For:', margin, yPos);
  yPos += 8;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${buyerName}`, margin, yPos);
  yPos += 6;

  if (buyerEmail) {
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(buyerEmail, margin, yPos);
    yPos += 10;
  } else {
    yPos += 5;
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, margin, yPos);
  yPos += 15;

  // Property list
  properties.forEach((property, index) => {
    // Check if we need a new page
    checkPageBreak(80);

    // Property card background
    pdf.setFillColor(249, 250, 251); // gray-50
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 70, 3, 3, 'F');

    // Property number badge
    pdf.setFillColor(147, 51, 234);
    pdf.circle(margin + 8, yPos + 8, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}`, margin + 8, yPos + 10, { align: 'center' });

    // Property code
    pdf.setTextColor(147, 51, 234);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(property.propertyCode, margin + 20, yPos + 10);

    // Property address
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(property.address, margin + 5, yPos + 20);

    // City
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(property.city, margin + 5, yPos + 27);

    // Price - large and prominent
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(147, 51, 234);
    const priceText = `$${property.price.toLocaleString()}`;
    pdf.text(priceText, pageWidth - margin - 5, yPos + 20, { align: 'right' });

    // Down Payment and Monthly Payment
    if (property.downPayment !== undefined || property.monthlyPayment !== undefined) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      let paymentY = yPos + 28;

      if (property.downPayment !== undefined) {
        const downText = `Down: $${property.downPayment.toLocaleString()}`;
        pdf.text(downText, pageWidth - margin - 5, paymentY, { align: 'right' });
        paymentY += 5;
      }

      if (property.monthlyPayment !== undefined) {
        const monthlyText = `Monthly: $${property.monthlyPayment.toLocaleString()}`;
        pdf.text(monthlyText, pageWidth - margin - 5, paymentY, { align: 'right' });
      }
    }

    // Property details row
    const detailsY = yPos + 40;
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    let detailX = margin + 5;

    // Beds
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${property.beds}`, detailX, detailsY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Beds', detailX, detailsY + 4);
    detailX += 20;

    // Baths
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${property.baths}`, detailX, detailsY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Baths', detailX, detailsY + 4);
    detailX += 20;

    // Sqft
    if (property.sqft) {
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${property.sqft.toLocaleString()}`, detailX, detailsY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Sq Ft', detailX, detailsY + 4);
      detailX += 30;
    }

    // Property Type
    if (property.propertyType) {
      pdf.setFontSize(9);
      pdf.setTextColor(147, 51, 234);
      pdf.setFont('helvetica', 'normal');
      pdf.text(property.propertyType, detailX, detailsY);
      detailX += 35;
    }

    // Condition
    if (property.condition) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Condition: ${property.condition}`, detailX, detailsY);
    }

    // Description
    if (property.description) {
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(property.description, pageWidth - 2 * margin - 10);
      const maxLines = 2; // Limit to 2 lines
      pdf.text(lines.slice(0, maxLines), margin + 5, yPos + 52);
    }

    yPos += 80;
  });

  // Footer on last page
  checkPageBreak(30);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contact Information', margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`${agentName}`, margin, yPos);
  yPos += 5;
  pdf.text(`Phone: ${agentPhone}`, margin, yPos);
  yPos += 5;
  pdf.text(`Email: ${agentEmail}`, margin, yPos);
  yPos += 10;

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('These properties are offered for investment purposes. Contact us for more details and to schedule viewings.', margin, yPos);

  return pdf.output('blob');
}

/**
 * Download the PDF to the user's device
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Options for generating a single property flyer PDF
 */
interface PropertyFlyerOptions {
  property: {
    address: string;
    city: string;
    state?: string;
    price: number;         // Underwriting purchase price
    zillowPrice?: number;  // Original Zillow list price
    downPayment: number;
    monthlyPayment: number;
    beds: number;
    baths: number;
    sqft?: number;
    images: string[];
    zillowUrl?: string;
    description?: string;
  };
  buyerName?: string;
  buyerEmail?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  companyName?: string;
}

/**
 * Generate a single property flyer PDF with underwriting data
 * This is used for sending individual Zillow properties to buyers
 */
export async function generatePropertyFlyerPDF(options: PropertyFlyerOptions): Promise<Blob> {
  const {
    property,
    buyerName = 'Valued Buyer',
    agentName = 'Purple Homes',
    agentPhone = '(555) 123-4567',
    agentEmail = 'info@purplehomes.com',
    companyName = 'Purple Homes',
  } = options;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Header with Purple Homes branding
  pdf.setFillColor(147, 51, 234); // purple-600
  pdf.rect(0, 0, pageWidth, 45, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyName, margin, 28);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Investment Property Opportunity', margin, 38);

  yPos = 60;

  // Greeting section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Property for ${buyerName}`, margin, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated on: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, margin, yPos);
  yPos += 15;

  // Property card background
  pdf.setFillColor(249, 250, 251); // gray-50
  pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 95, 3, 3, 'F');

  const cardTop = yPos;

  // Property address
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(property.address, margin + 8, yPos + 15);

  // City, State
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  const locationText = property.state
    ? `${property.city}, ${property.state}`
    : property.city;
  pdf.text(locationText, margin + 8, yPos + 24);

  // Underwriting numbers - prominent display
  const priceBoxY = yPos + 35;

  // Your Price (large and prominent)
  pdf.setFillColor(147, 51, 234); // purple-600
  pdf.roundedRect(margin + 8, priceBoxY, 50, 22, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('YOUR PRICE', margin + 12, priceBoxY + 7);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`$${property.price.toLocaleString()}`, margin + 12, priceBoxY + 17);

  // Down Payment
  pdf.setFillColor(79, 70, 229); // indigo-600
  pdf.roundedRect(margin + 62, priceBoxY, 50, 22, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('DOWN PAYMENT', margin + 66, priceBoxY + 7);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`$${property.downPayment.toLocaleString()}`, margin + 66, priceBoxY + 17);

  // Monthly Payment
  pdf.setFillColor(16, 185, 129); // emerald-500
  pdf.roundedRect(margin + 116, priceBoxY, 50, 22, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('MONTHLY', margin + 120, priceBoxY + 7);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`$${property.monthlyPayment.toLocaleString()}`, margin + 120, priceBoxY + 17);

  // Property details row
  const detailsY = priceBoxY + 32;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);

  let detailX = margin + 8;

  // Beds
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${property.beds}`, detailX, detailsY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Beds', detailX, detailsY + 5);
  detailX += 25;

  // Baths
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${property.baths}`, detailX, detailsY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Baths', detailX, detailsY + 5);
  detailX += 25;

  // Sqft
  if (property.sqft) {
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${property.sqft.toLocaleString()}`, detailX, detailsY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Sq Ft', detailX, detailsY + 5);
  }

  // Original Zillow price (if different from underwriting price)
  if (property.zillowPrice && property.zillowPrice !== property.price) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Zillow List: $${property.zillowPrice.toLocaleString()}`, pageWidth - margin - 8, detailsY + 3, { align: 'right' });
  }

  yPos = cardTop + 105;

  // Description section (if provided)
  if (property.description) {
    yPos += 5;
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(property.description, pageWidth - 2 * margin);
    const maxLines = 4; // Limit to 4 lines
    pdf.text(lines.slice(0, maxLines), margin, yPos);
    yPos += maxLines * 5 + 10;
  }

  // View on Zillow link
  if (property.zillowUrl) {
    yPos += 5;
    pdf.setFontSize(10);
    pdf.setTextColor(147, 51, 234);
    pdf.setFont('helvetica', 'normal');
    pdf.textWithLink('View property details on Zillow', margin, yPos, { url: property.zillowUrl });
    yPos += 15;
  }

  // Footer
  yPos = Math.max(yPos, 220); // Ensure some minimum space
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ready to move forward?', margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  pdf.text('Contact us today to schedule a viewing or get more information.', margin, yPos);
  yPos += 12;

  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${agentName}`, margin, yPos);
  yPos += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Phone: ${agentPhone}`, margin, yPos);
  yPos += 5;
  pdf.text(`Email: ${agentEmail}`, margin, yPos);
  yPos += 12;

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('This property is offered for investment purposes. Contact us for more details.', margin, yPos);

  return pdf.output('blob');
}
