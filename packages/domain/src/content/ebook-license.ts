export const EBOOK_LICENSE_TYPES = [
  'dominio_publico',
  'creative_commons',
  'licenca_institucional',
] as const;

export type EbookLicenseType = (typeof EBOOK_LICENSE_TYPES)[number];

export interface EbookLicenseInput {
  author: string;
  source: string;
  licenseType: string;
  licenseUrl: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateEbookLicense(input: EbookLicenseInput): ValidationResult {
  const errors: string[] = [];

  if (!input.author?.trim()) {
    errors.push('Autor é obrigatório.');
  }

  if (!input.source?.trim()) {
    errors.push('Fonte é obrigatória.');
  }

  if (!EBOOK_LICENSE_TYPES.includes(input.licenseType as EbookLicenseType)) {
    errors.push('Tipo de licença é obrigatório.');
  }

  if (!input.licenseUrl?.trim()) {
    errors.push('URL da licença é obrigatória.');
  } else if (!isValidHttpsUrl(input.licenseUrl.trim())) {
    errors.push('URL da licença deve ser um endereço https:// válido.');
  }

  return { ok: errors.length === 0, errors };
}
