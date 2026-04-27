// A4 dimensions in millimeters
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;

// Conversion: 1mm = 96/25.4 px (at 96 DPI)
const MM_TO_PX = 96 / 25.4;

// Margins: 1 inch on all sides
const MARGIN_INCH = 1;
const INCH_TO_PX = 96;

// Page dimensions in pixels
export const PAGE_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX;
export const PAGE_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX;

// Usable content height (page height minus top and bottom margins)
export const CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - MARGIN_INCH * INCH_TO_PX * 2;

// Usable content width (page width minus left and right margins)
export const CONTENT_WIDTH_PX = PAGE_WIDTH_PX - MARGIN_INCH * INCH_TO_PX * 2;

// Margin in pixels
export const MARGIN_PX = MARGIN_INCH * INCH_TO_PX;
