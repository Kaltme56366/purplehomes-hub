import * as fabric from 'fabric';
import type { PropertyData, CanvasDimensions, TemplateSettings } from '../types';
import { PURPLE_HOMES_COLORS } from '../colors';
import { loadImage, formatCurrency, formatNumber } from '../fabricUtils';

export async function renderDiagonalBoldTemplate(
  canvas: fabric.Canvas,
  property: PropertyData,
  dimensions: CanvasDimensions,
  settings: TemplateSettings
): Promise<void> {
  const { width, height } = dimensions;

  // Clear canvas
  canvas.clear();
  canvas.backgroundColor = PURPLE_HOMES_COLORS.white;

  // === DIAGONAL PURPLE SHAPE (Top-left corner) ===
  const diagonalShape = new fabric.Polygon(
    [
      { x: 0, y: 0 },
      { x: width * 0.45, y: 0 },
      { x: width * 0.30, y: height * 0.40 },
      { x: 0, y: height * 0.40 },
    ],
    {
      fill: PURPLE_HOMES_COLORS.purple[600],
      left: 0,
      top: 0,
    }
  );
  canvas.add(diagonalShape);

  // === "JUST LISTED" TEXT (on the purple area) ===
  const titleX = width * 0.04;
  const titleY = height * 0.08;

  const justText = new fabric.FabricText('JUST', {
    left: titleX,
    top: titleY,
    fontSize: Math.round(width * 0.055),
    fontWeight: '800',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(justText);

  const listedText = new fabric.FabricText('LISTED', {
    left: titleX,
    top: titleY + Math.round(width * 0.055),
    fontSize: Math.round(width * 0.055),
    fontWeight: '800',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(listedText);

  // === PROPERTY IMAGE (Right side) ===
  const imageLeft = width * 0.38;
  const imageTop = height * 0.03;
  const imageWidth = width * 0.58;
  const imageHeight = height * 0.38;

  // Image background
  const imageBg = new fabric.Rect({
    left: imageLeft,
    top: imageTop,
    width: imageWidth,
    height: imageHeight,
    fill: PURPLE_HOMES_COLORS.gray[100],
    rx: 8,
    ry: 8,
  });
  canvas.add(imageBg);

  try {
    const heroImg = await loadImage(property.heroImage);

    const imgWidth = heroImg.width || 1;
    const imgHeight = heroImg.height || 1;
    const scale = Math.max(imageWidth / imgWidth, imageHeight / imgHeight);

    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const offsetX = (scaledWidth - imageWidth) / 2;
    const offsetY = (scaledHeight - imageHeight) / 2;

    heroImg.set({
      left: imageLeft - offsetX,
      top: imageTop - offsetY,
      scaleX: scale,
      scaleY: scale,
      clipPath: new fabric.Rect({
        left: imageLeft,
        top: imageTop,
        width: imageWidth,
        height: imageHeight,
        rx: 8,
        ry: 8,
        absolutePositioned: true,
      }),
    });

    canvas.add(heroImg);
  } catch (error) {
    console.error('Failed to load hero image:', error);
  }

  // === PRICE SECTION ===
  const infoStartY = height * 0.46;
  const infoX = width * 0.04;

  if (settings.showPrice) {
    const priceText = new fabric.FabricText(formatCurrency(property.price), {
      left: infoX,
      top: infoStartY,
      fontSize: Math.round(width * 0.052),
      fontWeight: '800',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.purple[700],
    });
    canvas.add(priceText);

    // Underline
    const underline = new fabric.Line(
      [infoX, infoStartY + Math.round(width * 0.06), infoX + width * 0.28, infoStartY + Math.round(width * 0.06)],
      {
        stroke: PURPLE_HOMES_COLORS.purple[300],
        strokeWidth: 3,
      }
    );
    canvas.add(underline);
  }

  // === ADDRESS ===
  if (settings.showAddress) {
    const addressText = new fabric.FabricText(
      `${property.address}, ${property.city}`,
      {
        left: infoX,
        top: infoStartY + Math.round(width * 0.075),
        fontSize: Math.round(width * 0.022),
        fontWeight: '500',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.gray[700],
      }
    );
    canvas.add(addressText);
  }

  // === SPECS CHECKLIST ===
  if (settings.showSpecs) {
    const specsStartY = infoStartY + Math.round(width * 0.13);
    const specs = [
      { label: `${property.beds} Bedrooms`, col: 0 },
      { label: `${formatNumber(property.sqft || 0)} SF`, col: 1 },
      { label: `${property.baths} Bathrooms`, col: 0 },
      { label: property.propertyType || 'Single Family', col: 1 },
    ];

    specs.forEach((spec, index) => {
      const row = Math.floor(index / 2);
      const col = spec.col;
      const x = infoX + col * (width * 0.28);
      const y = specsStartY + row * Math.round(height * 0.04);

      // Checkmark
      const check = new fabric.FabricText('✓', {
        left: x,
        top: y,
        fontSize: Math.round(width * 0.022),
        fontWeight: '700',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.purple[600],
      });
      canvas.add(check);

      // Label
      const label = new fabric.FabricText(spec.label, {
        left: x + Math.round(width * 0.03),
        top: y,
        fontSize: Math.round(width * 0.018),
        fontWeight: '500',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.gray[800],
      });
      canvas.add(label);
    });
  }

  // === CTA BUTTON ===
  const ctaY = height - Math.round(height * 0.09);
  const ctaWidth = Math.round(width * 0.22);
  const ctaHeight = Math.round(height * 0.045);

  const ctaButton = new fabric.Rect({
    left: infoX,
    top: ctaY,
    width: ctaWidth,
    height: ctaHeight,
    fill: PURPLE_HOMES_COLORS.purple[600],
    rx: 6,
    ry: 6,
  });
  canvas.add(ctaButton);

  const ctaText = new fabric.FabricText('DM FOR DETAILS', {
    left: infoX + Math.round(ctaWidth * 0.12),
    top: ctaY + Math.round(ctaHeight * 0.25),
    fontSize: Math.round(width * 0.016),
    fontWeight: '700',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(ctaText);

  // === LOGO ===
  if (settings.showLogo) {
    const logoText = new fabric.FabricText('PURPLE HOMES', {
      left: width - Math.round(width * 0.2),
      top: ctaY + Math.round(ctaHeight * 0.25),
      fontSize: Math.round(width * 0.02),
      fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.purple[600],
    });
    canvas.add(logoText);
  }

  canvas.renderAll();
}
