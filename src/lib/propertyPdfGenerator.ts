/**
 * Property PDF Generator
 *
 * Generates property listing PDFs with proper data isolation for bulk sending.
 * Each PDF is generated fresh for each buyer-property pair to prevent data mixing.
 */

import { jsPDF } from 'jspdf';

export interface PropertyData {
  id: string;
  propertyCode: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  description?: string;
  images?: string[];
  features?: string[];
  yearBuilt?: number;
  lotSize?: number;
}

export interface BuyerData {
  id: string;
  contactId: string;
  name: string;
  email: string;
}

export interface MatchData {
  score: number;
  isPriority: boolean;
  distance?: number;
  budgetMatch?: number;
  bedroomMatch?: number;
  bathroomMatch?: number;
  locationMatch?: number;
  typeMatch?: number;
}

/**
 * Generate a property PDF for a specific buyer-property pair
 *
 * IMPORTANT: This function creates a new PDF instance for each call
 * to prevent data mixing when sending bulk emails.
 *
 * @param property - Property details
 * @param buyer - Buyer details (optional, for personalization)
 * @param match - Match details (optional, for score display)
 * @returns Base64 encoded PDF with data URL prefix
 */
export async function generatePropertyPdf(
  property: PropertyData,
  buyer?: BuyerData,
  match?: MatchData
): Promise<string> {
  // Create NEW PDF instance for this specific property
  // DO NOT reuse PDF instances across multiple properties!
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // ==================== HEADER ====================

  // Purple gradient background (simulated with rectangles)
  doc.setFillColor(102, 126, 234); // Purple
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Property code in top right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`Property #${property.propertyCode}`, pageWidth - margin, 15, { align: 'right' });

  // Main title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Details', margin, 25);

  // Personalization if buyer provided
  if (buyer && match) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prepared for: ${buyer.name}`, margin, 35);

    // Match score badge
    doc.setFillColor(102, 126, 234);
    doc.roundedRect(pageWidth - 60, 28, 40, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${match.score}% Match`, pageWidth - 40, 34, { align: 'center' });
  }

  yPosition = 55;

  // ==================== PROPERTY IMAGE ====================

  if (property.images && property.images.length > 0) {
    try {
      // Load first image as base64
      const imageUrl = property.images[0];
      const imageBase64 = await loadImageAsBase64(imageUrl);

      // Add image (max width: contentWidth, max height: 80mm)
      const imgWidth = contentWidth;
      const imgHeight = 80;

      doc.addImage(imageBase64, 'JPEG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.warn('Failed to load property image:', error);
      // Continue without image
    }
  }

  // ==================== ADDRESS & PRICE ====================

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(property.address, margin, yPosition);
  yPosition += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray
  doc.text(`${property.city}, ${property.state} ${property.zip}`, margin, yPosition);
  yPosition += 15;

  // Price box
  doc.setFillColor(102, 126, 234);
  doc.roundedRect(margin, yPosition, contentWidth, 20, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Price', margin + 5, yPosition + 7);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${property.price.toLocaleString()}`, margin + 5, yPosition + 16);
  yPosition += 30;

  // ==================== PROPERTY SPECS ====================

  // Specs box
  doc.setFillColor(243, 244, 246); // Light gray
  doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'F');

  const specStartY = yPosition + 8;
  const specGap = contentWidth / 4;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');

  // Bedrooms
  doc.text(`🛏️ ${property.bedrooms}`, margin + 10, specStartY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Bedrooms', margin + 10, specStartY + 7);

  // Bathrooms
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`🚿 ${property.bathrooms}`, margin + specGap + 10, specStartY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Bathrooms', margin + specGap + 10, specStartY + 7);

  // Square Feet
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`📏 ${property.sqft.toLocaleString()}`, margin + (specGap * 2) + 10, specStartY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Sq Ft', margin + (specGap * 2) + 10, specStartY + 7);

  // Property Type
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`🏠`, margin + (specGap * 3) + 5, specStartY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(property.propertyType, margin + (specGap * 3) + 10, specStartY + 7);

  yPosition += 35;

  // ==================== DESCRIPTION ====================

  if (property.description) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Description', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);

    // Wrap text
    const lines = doc.splitTextToSize(property.description, contentWidth);
    doc.text(lines, margin, yPosition);
    yPosition += (lines.length * 5) + 10;
  }

  // ==================== ADDITIONAL DETAILS ====================

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Additional Details', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (property.yearBuilt) {
    doc.text(`Year Built: ${property.yearBuilt}`, margin, yPosition);
    yPosition += 6;
  }

  if (property.lotSize) {
    doc.text(`Lot Size: ${property.lotSize.toLocaleString()} sq ft`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  // ==================== FEATURES ====================

  if (property.features && property.features.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Features & Amenities', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    property.features.forEach((feature) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(`• ${feature}`, margin + 5, yPosition);
      yPosition += 5;
    });
  }

  // ==================== MATCH DETAILS (if provided) ====================

  if (match && buyer) {
    yPosition += 10;

    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPosition, contentWidth, 40, 3, 3, 'F');

    yPosition += 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(102, 126, 234);
    doc.text(`Why This is a ${match.score}% Match for You`, margin + 5, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    if (match.budgetMatch !== undefined) {
      doc.text(`✓ Budget Match: ${match.budgetMatch}/35 points`, margin + 5, yPosition);
      yPosition += 5;
    }
    if (match.bedroomMatch !== undefined) {
      doc.text(`✓ Bedroom Match: ${match.bedroomMatch}/15 points`, margin + 5, yPosition);
      yPosition += 5;
    }
    if (match.bathroomMatch !== undefined) {
      doc.text(`✓ Bathroom Match: ${match.bathroomMatch}/10 points`, margin + 5, yPosition);
      yPosition += 5;
    }
    if (match.locationMatch !== undefined) {
      doc.text(`✓ Location Match: ${match.locationMatch}/25 points${match.distance ? ` (${Math.round(match.distance)} miles away)` : ''}`, margin + 5, yPosition);
      yPosition += 5;
    }
    if (match.typeMatch !== undefined) {
      doc.text(`✓ Property Type Match: ${match.typeMatch}/15 points`, margin + 5, yPosition);
      yPosition += 5;
    }
  }

  // ==================== FOOTER ====================

  const footerY = pageHeight - 15;
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'normal');
  doc.text('© Purple Homes - Property Listing', margin, footerY);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, footerY, { align: 'right' });

  // ==================== RETURN PDF ====================

  // Return as base64 data URL
  const pdfBase64 = doc.output('dataurlstring');

  console.log('[PDF Generator] Generated PDF for property:', property.propertyCode, 'Size:', pdfBase64.length, 'bytes');

  return pdfBase64;
}

/**
 * Load image from URL and convert to base64
 * This is needed because jsPDF requires base64 images
 */
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Handle CORS

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      resolve(base64);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Generate PDFs for multiple buyer-property pairs
 * IMPORTANT: Each PDF is generated independently to prevent data mixing
 *
 * @param pairs - Array of buyer-property-match tuples
 * @returns Array of { buyer, property, pdfData } objects
 */
export async function generateBulkPropertyPdfs(
  pairs: Array<{ buyer: BuyerData; property: PropertyData; match: MatchData }>
): Promise<Array<{ buyer: BuyerData; property: PropertyData; pdfData: string }>> {
  console.log(`[PDF Generator] Generating ${pairs.length} PDFs...`);

  const results = [];

  for (let i = 0; i < pairs.length; i++) {
    const { buyer, property, match } = pairs[i];

    console.log(`[PDF Generator] Generating PDF ${i + 1}/${pairs.length} for ${buyer.name} - ${property.address}`);

    try {
      // Generate FRESH PDF for this specific buyer-property pair
      const pdfData = await generatePropertyPdf(property, buyer, match);

      results.push({
        buyer,
        property,
        pdfData
      });

      console.log(`[PDF Generator] ✓ PDF ${i + 1}/${pairs.length} complete`);
    } catch (error) {
      console.error(`[PDF Generator] ✗ Failed to generate PDF for ${buyer.name} - ${property.address}:`, error);
      // Continue with other PDFs even if one fails
    }
  }

  console.log(`[PDF Generator] Generated ${results.length}/${pairs.length} PDFs successfully`);

  return results;
}
