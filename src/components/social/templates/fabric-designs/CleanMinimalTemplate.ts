import * as fabric from 'fabric';
import type { PropertyData, CanvasDimensions, TemplateSettings } from '../types';
import { PURPLE_HOMES_COLORS } from '../colors';
import { loadImage, formatCurrency, formatNumber } from '../fabricUtils';

export async function renderCleanMinimalTemplate(
  canvas: fabric.Canvas,
  property: PropertyData,
  dimensions: CanvasDimensions,
  settings: TemplateSettings
): Promise<void> {
  const { width, height } = dimensions;

  // Clear canvas
  canvas.clear();
  canvas.backgroundColor = PURPLE_HOMES_COLORS.gray[200];

  // === FULL BLEED HERO IMAGE ===
  try {
    const heroImg = await loadImage(property.heroImage);

    const imgWidth = heroImg.width || 1;
    const imgHeight = heroImg.height || 1;
    const scale = Math.max(width / imgWidth, height / imgHeight);

    // Center the image
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const offsetX = (scaledWidth - width) / 2;
    const offsetY = (scaledHeight - height) / 2;

    heroImg.set({
      left: -offsetX,
      top: -offsetY,
      scaleX: scale,
      scaleY: scale,
    });

    canvas.add(heroImg);
  } catch (error) {
    console.error('Failed to load hero image:', error);
  }

  // === GRADIENT OVERLAY AT BOTTOM ===
  const overlayHeight = height * 0.42;
  const overlayY = height - overlayHeight;

  // Create gradient effect with multiple rectangles
  const gradientSteps = 25;
  for (let i = 0; i < gradientSteps; i++) {
    const stepHeight = overlayHeight / gradientSteps;
    const opacity = (i / gradientSteps) * 0.92;

    const gradientStep = new fabric.Rect({
      left: 0,
      top: overlayY + i * stepHeight,
      width: width,
      height: stepHeight + 1,
      fill: PURPLE_HOMES_COLORS.purple[900],
      opacity: opacity,
    });
    canvas.add(gradientStep);
  }

  // === CONTENT AREA ===
  const contentStartY = height - overlayHeight + Math.round(height * 0.035);
  const leftPadding = Math.round(width * 0.05);

  // "JUST LISTED" pill badge
  const badgeWidth = Math.round(width * 0.14);
  const badgeHeight = Math.round(height * 0.03);
  const badge = new fabric.Rect({
    left: leftPadding,
    top: contentStartY,
    width: badgeWidth,
    height: badgeHeight,
    fill: PURPLE_HOMES_COLORS.purple[500],
    rx: badgeHeight / 2,
    ry: badgeHeight / 2,
  });
  canvas.add(badge);

  const badgeText = new fabric.FabricText('JUST LISTED', {
    left: leftPadding + Math.round(badgeWidth * 0.12),
    top: contentStartY + Math.round(badgeHeight * 0.2),
    fontSize: Math.round(width * 0.014),
    fontWeight: '700',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(badgeText);

  // === ADDRESS ===
  if (settings.showAddress) {
    const addressY = contentStartY + Math.round(height * 0.045);
    const addressText = new fabric.FabricText(
      `${property.address}  •  ${property.city}${property.state ? `, ${property.state}` : ''}`,
      {
        left: leftPadding,
        top: addressY,
        fontSize: Math.round(width * 0.022),
        fontWeight: '500',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.white,
        opacity: 0.9,
      }
    );
    canvas.add(addressText);
  }

  // === PRICE ===
  if (settings.showPrice) {
    const priceY = contentStartY + Math.round(height * 0.085);
    const priceText = new fabric.FabricText(formatCurrency(property.price), {
      left: leftPadding,
      top: priceY,
      fontSize: Math.round(width * 0.055),
      fontWeight: '800',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.white,
    });
    canvas.add(priceText);
  }

  // === SPECS LINE ===
  if (settings.showSpecs) {
    const specsY = contentStartY + Math.round(height * 0.15);
    const specsText = new fabric.FabricText(
      `${property.beds} BD  •  ${property.baths} BA${property.sqft ? `  •  ${formatNumber(property.sqft)} SF` : ''}`,
      {
        left: leftPadding,
        top: specsY,
        fontSize: Math.round(width * 0.02),
        fontWeight: '500',
        fontFamily: 'Arial, sans-serif',
        fill: PURPLE_HOMES_COLORS.white,
        opacity: 0.8,
      }
    );
    canvas.add(specsText);
  }

  // === LOGO ===
  if (settings.showLogo) {
    const logoY = height - Math.round(height * 0.045);

    const logoText = new fabric.FabricText('PURPLE HOMES', {
      left: width - Math.round(width * 0.2),
      top: logoY,
      fontSize: Math.round(width * 0.018),
      fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.white,
      opacity: 0.9,
    });
    canvas.add(logoText);
  }

  canvas.renderAll();
}
