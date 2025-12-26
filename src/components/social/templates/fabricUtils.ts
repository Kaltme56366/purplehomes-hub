import * as fabric from 'fabric';
import { PURPLE_HOMES_COLORS } from './colors';

/**
 * Load an image into Fabric.js with CORS handling
 */
export function loadImage(url: string): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    // Handle data URLs directly
    if (url.startsWith('data:')) {
      fabric.FabricImage.fromURL(url).then((img) => {
        if (img) {
          resolve(img);
        } else {
          reject(new Error('Failed to load image'));
        }
      }).catch(reject);
      return;
    }

    // For external URLs, try to load with CORS
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      .then((img) => {
        if (img) {
          resolve(img);
        } else {
          reject(new Error('Failed to load image'));
        }
      })
      .catch(reject);
  });
}

/**
 * Create a clipping mask (circle)
 */
export function createCircleMask(
  radius: number,
  left: number,
  top: number
): fabric.Circle {
  return new fabric.Circle({
    radius,
    left,
    top,
    absolutePositioned: true,
  });
}

/**
 * Create the Purple Homes logo text
 */
export function createLogoText(
  left: number,
  top: number,
  options?: Partial<fabric.FabricText>
): fabric.FabricText {
  return new fabric.FabricText('PURPLE HOMES', {
    left,
    top,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    fill: PURPLE_HOMES_COLORS.purple[600],
    ...options,
  });
}

/**
 * Create text with consistent styling
 */
export function createText(
  text: string,
  options: Partial<fabric.FabricText>
): fabric.FabricText {
  return new fabric.FabricText(text, {
    fontFamily: 'Inter, system-ui, sans-serif',
    ...options,
  });
}

/**
 * Create a rounded rectangle
 */
export function createRoundedRect(
  width: number,
  height: number,
  options: Partial<fabric.Rect> & { rx?: number; ry?: number }
): fabric.Rect {
  return new fabric.Rect({
    width,
    height,
    rx: options.rx || 0,
    ry: options.ry || 0,
    ...options,
  });
}

/**
 * Create a polygon (for diagonal shapes)
 */
export function createPolygon(
  points: { x: number; y: number }[],
  options: Partial<fabric.Polygon>
): fabric.Polygon {
  return new fabric.Polygon(points, options);
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Export canvas to data URL
 */
export function exportCanvas(
  canvas: fabric.Canvas,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 1
): string {
  return canvas.toDataURL({
    format,
    quality,
    multiplier: 2, // 2x for retina quality
  });
}

/**
 * Download canvas as image
 */
export function downloadCanvas(
  canvas: fabric.Canvas,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): void {
  const dataURL = exportCanvas(canvas, format);
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataURL;
  link.click();
}

/**
 * Create a line
 */
export function createLine(
  points: [number, number, number, number],
  options: Partial<fabric.Line>
): fabric.Line {
  return new fabric.Line(points, options);
}
