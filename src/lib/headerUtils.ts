/**
 * Header Surat (KOP) Utilities
 * Shared logic for global header configuration
 */

export const FONT_SIZE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20

export interface HeaderFormState {
  headerMode: 'text' | 'image';
  logoUrl: string;
  logoSize: number;
  line1: string;
  line2: string;
  school: string;
  address: string;
  contact: string;
  line1Size: number;
  line2Size: number;
  schoolSize: number;
  addressSize: number;
  contactSize: number;
  headerImageUrl: string;
  kabupatenSearch: string;
  showKabupatenList: boolean;
}

/**
 * Format header preview by rendering text lines with proper spacing
 */
export function renderHeaderPreview(state: HeaderFormState): {
  line1?: string;
  line2?: string;
  school?: string;
  address?: string;
  contact?: string;
  logo?: string;
  image?: string;
} {
  if (state.headerMode === 'image') {
    return { image: state.headerImageUrl };
  }

  return {
    logo: state.logoUrl || undefined,
    line1: state.line1 || undefined,
    line2: state.line2 || undefined,
    school: state.school || undefined,
    address: state.address || undefined,
    contact: state.contact || undefined,
  };
}

/**
 * Get default font size for a header field
 */
export function getDefaultFontSize(field: 'line1' | 'line2' | 'school' | 'address' | 'contact'): number {
  const defaults: Record<string, number> = {
    line1: 16,
    line2: 14,
    school: 12,
    address: 11,
    contact: 11,
  };
  return defaults[field] || 11;
}

/**
 * Get default logo size in mm
 */
export function getDefaultLogoSize(): number {
  return 22;
}

/**
 * Validate header configuration
 */
export function validateHeaderConfig(state: Partial<HeaderFormState>): string[] {
  const errors: string[] = [];

  if (state.headerMode === 'text') {
    // At least one text field should be filled
    if (!state.line1 && !state.line2 && !state.school && !state.address && !state.contact) {
      errors.push('Isi minimal satu baris teks untuk header');
    }
  } else if (state.headerMode === 'image') {
    if (!state.headerImageUrl) {
      errors.push('Upload gambar KOP terlebih dahulu');
    }
  }

  return errors;
}

/**
 * Convert image file to base64 data URL
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get header fields configuration for rendering form
 */
export function getHeaderFields(): Array<{
  label: string;
  field: keyof HeaderFormState;
  sizeField: keyof HeaderFormState;
  defaultSize: number;
  hint: string;
}> {
  return [
    {
      label: 'Baris 1',
      field: 'line1',
      sizeField: 'line1Size',
      defaultSize: 16,
      hint: '',
    },
    {
      label: 'Baris 2',
      field: 'line2',
      sizeField: 'line2Size',
      defaultSize: 14,
      hint: 'KANTOR KEMENTERIAN AGAMA {KABUPATEN}',
    },
    {
      label: 'Nama Sekolah',
      field: 'school',
      sizeField: 'schoolSize',
      defaultSize: 12,
      hint: '',
    },
    {
      label: 'Alamat',
      field: 'address',
      sizeField: 'addressSize',
      defaultSize: 11,
      hint: '',
    },
    {
      label: 'Kontak',
      field: 'contact',
      sizeField: 'contactSize',
      defaultSize: 11,
      hint: '',
    },
  ];
}
