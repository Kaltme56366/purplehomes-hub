import * as fabric from 'fabric';
import type { PropertyData, CanvasDimensions, TemplateSettings } from '../types';
import { PURPLE_HOMES_COLORS } from '../colors';
import { loadImage, formatCurrency, formatNumber } from '../fabricUtils';

export async function renderLuxuryShowcaseTemplate(
  canvas: fabric.Canvas,
  property: PropertyData,
  dimensions: CanvasDimensions,
  settings: TemplateSettings
): Promise<void> {
  const { width, height } = dimensions;

  // Clear canvas
  canvas.clear();
  canvas.backgroundColor = PURPLE_HOMES_COLORS.white;

  // === HEADER BAR ===
  const headerHeight = Math.round(height * 0.065);
  const headerBg = new fabric.Rect({
    left: 0,
    top: 0,
    width: width,
    height: headerHeight,
    fill: PURPLE_HOMES_COLORS.purple[800],
  });
  canvas.add(headerBg);

  // Logo in header
  const logoText = new fabric.FabricText('PURPLE HOMES', {
    left: Math.round(width * 0.04),
    top: Math.round(headerHeight * 0.28),
    fontSize: Math.round(width * 0.022),
    fontWeight: '700',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(logoText);

  // === "NEW LISTING" SECTION ===
  const newListingY = headerHeight + Math.round(height * 0.04);
  const leftPadding = Math.round(width * 0.04);

  const newListingText = new fabric.FabricText('NEW LISTING', {
    left: leftPadding,
    top: newListingY,
    fontSize: Math.round(width * 0.038),
    fontWeight: '800',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.purple[700],
  });
  canvas.add(newListingText);

  // Gold accent line
  const goldLine1 = new fabric.Line(
    [leftPadding, newListingY + Math.round(width * 0.048), leftPadding + Math.round(width * 0.22), newListingY + Math.round(width * 0.048)],
    {
      stroke: PURPLE_HOMES_COLORS.gold,
      strokeWidth: 4,
    }
  );
  canvas.add(goldLine1);

  // === MAIN CIRCULAR IMAGE ===
  const circleX = width - Math.round(width * 0.3);
  const circleY = headerHeight + Math.round(height * 0.08);
  const mainCircleRadius = Math.round(width * 0.18);

  // Circle border/background
  const circleBorder = new fabric.Circle({
    radius: mainCircleRadius + 4,
    left: circleX - mainCircleRadius - 4,
    top: circleY,
    fill: PURPLE_HOMES_COLORS.gold,
  });
  canvas.add(circleBorder);

  const circleBackground = new fabric.Circle({
    radius: mainCircleRadius,
    left: circleX - mainCircleRadius,
    top: circleY + 4,
    fill: PURPLE_HOMES_COLORS.gray[100],
  });
  canvas.add(circleBackground);

  try {
    const heroImg = await loadImage(property.heroImage);

    const imgWidth = heroImg.width || 1;
    const imgHeight = heroImg.height || 1;
    const scale = Math.max((mainCircleRadius * 2) / imgWidth, (mainCircleRadius * 2) / imgHeight);

    const centerX = circleX;
    const centerY = circleY + mainCircleRadius + 4;

    heroImg.set({
      left: centerX - (imgWidth * scale) / 2,
      top: centerY - (imgHeight * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      clipPath: new fabric.Circle({
        radius: mainCircleRadius,
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        absolutePositioned: true,
      }),
    });
    canvas.add(heroImg);
  } catch (error) {
    console.error('Failed to load hero image:', error);
  }

  // === SMALLER DECORATIVE CIRCLES ===
  const smallCircle1 = new fabric.Circle({
    radius: Math.round(width * 0.045),
    left: circleX - mainCircleRadius - Math.round(width * 0.12),
    top: circleY + mainCircleRadius * 1.5,
    fill: PURPLE_HOMES_COLORS.purple[100],
    stroke: PURPLE_HOMES_COLORS.purple[300],
    strokeWidth: 2,
  });
  canvas.add(smallCircle1);

  const smallCircle2 = new fabric.Circle({
    radius: Math.round(width * 0.035),
    left: circleX + mainCircleRadius + Math.round(width * 0.02),
    top: circleY + Math.round(width * 0.08),
    fill: PURPLE_HOMES_COLORS.purple[100],
    stroke: PURPLE_HOMES_COLORS.purple[300],
    strokeWidth: 2,
  });
  canvas.add(smallCircle2);

  // === PRICE SECTION ===
  const priceY = newListingY + Math.round(width * 0.08);

  const startingText = new fabric.FabricText('STARTING FROM', {
    left: leftPadding,
    top: priceY,
    fontSize: Math.round(width * 0.014),
    fontWeight: '600',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.gray[500],
  });
  canvas.add(startingText);

  if (settings.showPrice) {
    const priceText = new fabric.FabricText(formatCurrency(property.price), {
      left: leftPadding,
      top: priceY + Math.round(width * 0.022),
      fontSize: Math.round(width * 0.048),
      fontWeight: '800',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.purple[700],
    });
    canvas.add(priceText);

    // Gold underline
    const goldLine2 = new fabric.Line(
      [leftPadding, priceY + Math.round(width * 0.078), leftPadding + Math.round(width * 0.26), priceY + Math.round(width * 0.078)],
      {
        stroke: PURPLE_HOMES_COLORS.gold,
        strokeWidth: 3,
      }
    );
    canvas.add(goldLine2);
  }

  // === ADDRESS ===
  if (settings.showAddress) {
    const addressY = priceY + Math.round(width * 0.1);
    const addressText = new fabric.FabricText(
      `${property.address}, ${property.city}${property.state ? `, ${property.state}` : ''}`,
      {
        left: leftPadding,
        top: addressY,
        fontSize: Math.round(width * 0.018),
        fontWeight: '500',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.gray[700],
      }
    );
    canvas.add(addressText);
  }

  // === DETAILS SECTION ===
  if (settings.showSpecs) {
    const detailsY = priceY + Math.round(width * 0.14);

    const detailsLabel = new fabric.FabricText('DETAILS', {
      left: leftPadding,
      top: detailsY,
      fontSize: Math.round(width * 0.016),
      fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.gray[600],
    });
    canvas.add(detailsLabel);

    const specs = [
      { icon: '🛏', label: `${property.beds} Bedrooms` },
      { icon: '🛁', label: `${property.baths} Bathrooms` },
      { icon: '📐', label: `${formatNumber(property.sqft || 0)} Sq Ft` },
    ];

    specs.forEach((spec, index) => {
      const y = detailsY + Math.round(width * 0.032) + index * Math.round(height * 0.035);

      const icon = new fabric.FabricText(spec.icon, {
        left: leftPadding,
        top: y,
        fontSize: Math.round(width * 0.018),
      });
      canvas.add(icon);

      const label = new fabric.FabricText(spec.label, {
        left: leftPadding + Math.round(width * 0.032),
        top: y + Math.round(width * 0.002),
        fontSize: Math.round(width * 0.018),
        fontWeight: '500',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.gray[800],
      });
      canvas.add(label);
    });
  }

  // === FOOTER BAR ===
  const footerHeight = Math.round(height * 0.065);
  const footerY = height - footerHeight;

  const footerBg = new fabric.Rect({
    left: 0,
    top: footerY,
    width: width,
    height: footerHeight,
    fill: PURPLE_HOMES_COLORS.purple[600],
  });
  canvas.add(footerBg);

  const contactText = new fabric.FabricText('DM for Details', {
    left: leftPadding,
    top: footerY + Math.round(footerHeight * 0.3),
    fontSize: Math.round(width * 0.018),
    fontWeight: '600',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(contactText);

  const ctaText = new fabric.FabricText('LEARN MORE →', {
    left: width - Math.round(width * 0.2),
    top: footerY + Math.round(footerHeight * 0.3),
    fontSize: Math.round(width * 0.018),
    fontWeight: '700',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(ctaText);

  canvas.renderAll();
}
