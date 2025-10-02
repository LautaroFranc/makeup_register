/**
 * Genera un código EAN-13 válido para Argentina
 * Argentina usa el prefijo 779
 */
export function generateEAN13(): string {
  // Prefijo de Argentina para EAN-13
  const argentinaPrefix = "779";

  // Generar 9 dígitos aleatorios para el código del producto
  const productCode = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, "0");

  // Combinar prefijo + código del producto
  const codeWithoutCheckDigit = argentinaPrefix + productCode;

  // Calcular dígito de verificación
  const checkDigit = calculateEAN13CheckDigit(codeWithoutCheckDigit);

  return codeWithoutCheckDigit + checkDigit;
}

/**
 * Calcula el dígito de verificación para EAN-13
 */
function calculateEAN13CheckDigit(code: string): string {
  let sum = 0;

  // Sumar dígitos en posiciones impares (1, 3, 5, etc.)
  for (let i = 0; i < code.length; i += 2) {
    sum += parseInt(code[i]);
  }

  // Sumar dígitos en posiciones pares (2, 4, 6, etc.) multiplicados por 3
  for (let i = 1; i < code.length; i += 2) {
    sum += parseInt(code[i]) * 3;
  }

  // El dígito de verificación es el número que hace que la suma sea múltiplo de 10
  const remainder = sum % 10;
  return remainder === 0 ? "0" : (10 - remainder).toString();
}

/**
 * Genera un código EAN-8 válido para Argentina
 * Argentina usa el prefijo 779
 */
export function generateEAN8(): string {
  // Prefijo de Argentina para EAN-8
  const argentinaPrefix = "779";

  // Generar 4 dígitos aleatorios para el código del producto
  const productCode = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  // Combinar prefijo + código del producto
  const codeWithoutCheckDigit = argentinaPrefix + productCode;

  // Calcular dígito de verificación
  const checkDigit = calculateEAN8CheckDigit(codeWithoutCheckDigit);

  return codeWithoutCheckDigit + checkDigit;
}

/**
 * Calcula el dígito de verificación para EAN-8
 */
function calculateEAN8CheckDigit(code: string): string {
  let sum = 0;

  // Sumar dígitos en posiciones impares (1, 3, 5, etc.) multiplicados por 3
  for (let i = 0; i < code.length; i += 2) {
    sum += parseInt(code[i]) * 3;
  }

  // Sumar dígitos en posiciones pares (2, 4, 6, etc.)
  for (let i = 1; i < code.length; i += 2) {
    sum += parseInt(code[i]);
  }

  // El dígito de verificación es el número que hace que la suma sea múltiplo de 10
  const remainder = sum % 10;
  return remainder === 0 ? "0" : (10 - remainder).toString();
}

/**
 * Valida si un código EAN-13 es válido
 */
export function validateEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) {
    return false;
  }

  const checkDigit = calculateEAN13CheckDigit(code.slice(0, 12));
  return checkDigit === code[12];
}

/**
 * Valida si un código EAN-8 es válido
 */
export function validateEAN8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) {
    return false;
  }

  const checkDigit = calculateEAN8CheckDigit(code.slice(0, 7));
  return checkDigit === code[7];
}

/**
 * Genera un código de barras apropiado para Argentina
 * Por defecto usa EAN-13, pero puede generar EAN-8 si se especifica
 */
export function generateArgentineBarcode(
  format: "EAN13" | "EAN8" = "EAN13"
): string {
  return format === "EAN8" ? generateEAN8() : generateEAN13();
}
