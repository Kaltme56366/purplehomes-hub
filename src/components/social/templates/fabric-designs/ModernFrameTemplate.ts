import * as fabric from 'fabric';
import type { PropertyData, CanvasDimensions, TemplateSettings } from '../types';
import { PURPLE_HOMES_COLORS } from '../colors';
import { loadImage, formatCurrency, formatNumber } from '../fabricUtils';

export async function renderModernFrameTemplate(
  canvas: fabric.Canvas,
  property: PropertyData,
  dimensions: CanvasDimensions,
  settings: TemplateSettings
): Promise<void> {
  const { width, height } = dimensions;
  const borderWidth = Math.round(width * 0.037); // ~40px at 1080w
  const padding = Math.round(width * 0.025); // ~27px at 1080w

  // Clear canvas and set white background
  canvas.clear();
  canvas.backgroundColor = PURPLE_HOMES_COLORS.white;

  // === WHITE BACKGROUND (the frame) ===
  const frame = new fabric.Rect({
    left: 0,
    top: 0,
    width: width,
    height: height,
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(frame);

  // === HEADER SECTION ===
  const headerY = borderWidth + padding;
  const headerX = borderWidth + padding;

  // Address
  if (settings.showAddress) {
    const addressStr = `${property.address}, ${property.city}${property.state ? `, ${property.state}` : ''}`;
    const addressText = new fabric.FabricText(addressStr, {
      left: headerX,
      top: headerY,
      fontSize: Math.round(width * 0.028), // ~30px at 1080w
      fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.gray[900],
    });
    canvas.add(addressText);
  }

  // Specs line
  if (settings.showSpecs) {
    const specsStr = `${property.beds} BD  •  ${property.baths} BA${property.sqft ? `  •  ${formatNumber(property.sqft)} SF` : ''}`;
    const specsText = new fabric.FabricText(specsStr, {
      left: headerX,
      top: headerY + Math.round(width * 0.035),
      fontSize: Math.round(width * 0.018), // ~20px at 1080w
      fontWeight: '500',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.gray[600],
    });
    canvas.add(specsText);
  }

  // === HERO IMAGE SECTION ===
  const imageTop = headerY + Math.round(width * 0.075);
  const imageLeft = borderWidth;
  const imageWidth = width - borderWidth * 2;
  const imageHeight = height - imageTop - Math.round(height * 0.12); // Leave room for footer

  // Image container background
  const imageBg = new fabric.Rect({
    left: imageLeft,
    top: imageTop,
    width: imageWidth,
    height: imageHeight,
    fill: PURPLE_HOMES_COLORS.gray[100],
  });
  canvas.add(imageBg);

  try {
    const heroImg = await loadImage(property.heroImage);

    const imgWidth = heroImg.width || 1;
    const imgHeight = heroImg.height || 1;
    const scale = Math.max(imageWidth / imgWidth, imageHeight / imgHeight);

    // Center the image
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
        absolutePositioned: true,
      }),
    });

    canvas.add(heroImg);
  } catch (error) {
    console.error('Failed to load hero image:', error);
  }

  // === "JUST LISTED" BADGE ===
  const badgeHeight = Math.round(height * 0.035);
  const badgeWidth = Math.round(width * 0.14);
  const badgeY = imageTop + imageHeight - badgeHeight - Math.round(height * 0.02);
  const badgeX = imageLeft + Math.round(width * 0.02);

  const justListedBg = new fabric.Rect({
    left: badgeX,
    top: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    fill: PURPLE_HOMES_COLORS.purple[600],
    rx: 4,
    ry: 4,
  });
  canvas.add(justListedBg);

  const justListedText = new fabric.FabricText('JUST LISTED', {
    left: badgeX + Math.round(badgeWidth * 0.12),
    top: badgeY + Math.round(badgeHeight * 0.22),
    fontSize: Math.round(width * 0.014),
    fontWeight: '700',
    fontFamily: 'Arial, sans-serif',
    fill: PURPLE_HOMES_COLORS.white,
  });
  canvas.add(justListedText);

  // === PRICE BADGE ===
  if (settings.showPrice) {
    const priceStr = formatCurrency(property.price);
    const priceBadgeWidth = Math.round(width * 0.16);
    const priceBadgeHeight = Math.round(height * 0.038);
    const priceX = imageLeft + imageWidth - priceBadgeWidth - Math.round(width * 0.02);
    const priceY = badgeY;

    const priceBg = new fabric.Rect({
      left: priceX,
      top: priceY,
      width: priceBadgeWidth,
      height: priceBadgeHeight,
      fill: PURPLE_HOMES_COLORS.white,
      rx: 6,
      ry: 6,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.15)',
        blur: 10,
        offsetX: 0,
        offsetY: 4,
      }),
    });
    canvas.add(priceBg);

    const priceText = new fabric.FabricText(priceStr, {
      left: priceX + Math.round(priceBadgeWidth * 0.08),
      top: priceY + Math.round(priceBadgeHeight * 0.18),
      fontSize: Math.round(width * 0.024),
      fontWeight: '800',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.purple[600],
    });
    canvas.add(priceText);
  }

  // === FOOTER SECTION ===
  const footerY = imageTop + imageHeight + Math.round(height * 0.015);
  const thumbSize = Math.round(width * 0.055);
  const thumbGap = Math.round(width * 0.01);

  // Thumbnail placeholders
  for (let i = 0; i < 4; i++) {
    const thumbBg = new fabric.Rect({
      left: headerX + i * (thumbSize + thumbGap),
      top: footerY,
      width: thumbSize,
      height: thumbSize,
      fill: PURPLE_HOMES_COLORS.purple[100],
      rx: 4,
      ry: 4,
      stroke: PURPLE_HOMES_COLORS.purple[300],
      strokeWidth: 1,
    });
    canvas.add(thumbBg);
  }

  // === LOGO ===
  if (settings.showLogo) {
    const logoText = new fabric.FabricText('PURPLE HOMES', {
      left: width - borderWidth - Math.round(width * 0.15),
      top: footerY + Math.round(thumbSize * 0.3),
      fontSize: Math.round(width * 0.018),
      fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      fill: PURPLE_HOMES_COLORS.purple[600],
    });
    canvas.add(logoText);
  }

  canvas.renderAll();
}
