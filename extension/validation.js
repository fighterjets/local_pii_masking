/**
 * Validation Functions Module
 * Validates various data formats and patterns
 * Local PII Masking v2.3.5
 */

import { FILE_CONFIG } from './constants.js';

/**
 * Validate credit card number using Luhn algorithm
 * @param {string} cardNumber - Credit card number
 * @returns {boolean} True if valid
 */
export function validateCreditCard(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate Singapore NRIC/FIN checksum
 * @param {string} nric - NRIC/FIN number
 * @returns {boolean} True if valid
 */
export function validateNRIC(nric) {
  const weights = [2, 7, 6, 5, 4, 3, 2];
  const stCheckChars = 'JZIHGFEDCBA';
  const fgCheckChars = 'XWUTRQPNMLK';

  const prefix = nric[0];
  const digits = nric.substring(1, 8);
  const checkChar = nric[8];

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }

  if (prefix === 'F' || prefix === 'G') {
    sum += 4;
  } else if (prefix === 'M') {
    sum += 3;
  }

  const remainder = sum % 11;
  const expectedChar = (prefix === 'S' || prefix === 'T' || prefix === 'M')
    ? stCheckChars[remainder]
    : fgCheckChars[remainder];

  return expectedChar === checkChar;
}

/**
 * Validate Singapore phone number
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
export function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 8 && /^[689]/.test(digits);
}

/**
 * Validate Singapore postal code
 * @param {string} code - Postal code
 * @returns {boolean} True if valid
 */
export function validatePostalCode(code) {
  return /^\d{6}$/.test(code);
}

/**
 * Validate China Resident Identity Card (居民身份证 / Shenfengzheng)
 * Uses the GB 11643-1999 checksum algorithm.
 * @param {string} id - 18-character ID string (last char may be X)
 * @returns {boolean} True if structurally valid with correct checksum
 */
export function validateChineseID(id) {
  const clean = id.trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(clean)) return false;

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkChars = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(clean[i]) * weights[i];
  }
  return checkChars[sum % 11] === clean[17];
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  return email.includes('@') && email.includes('.');
}

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSizeMB - Optional maximum size in MB (default from config)
 * @throws {Error} If file is too large
 */
export function validateFileSize(file, maxSizeMB = FILE_CONFIG.MAX_SIZE_MB) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File too large (${fileSizeMB}MB). Maximum file size is ${maxSizeMB}MB.`);
  }
}
