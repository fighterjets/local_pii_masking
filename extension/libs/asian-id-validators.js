/**
 * Validation functions for Asian identification numbers
 * These implement checksum algorithms to reduce false positives
 */

/**
 * Validate Hong Kong ID (HKID)
 * Format: X123456(A) where X is a letter, 123456 are digits, A is check digit
 * Check digit can be 0-9 or A
 */
function validateHKID(hkid) {
  // Remove parentheses and spaces
  const cleaned = hkid.replace(/[() ]/g, '').toUpperCase();

  // Must be 8 or 9 characters
  if (cleaned.length < 8 || cleaned.length > 9) return false;

  // Extract parts
  let letters = '';
  let digits = '';
  let checkDigit = '';

  if (cleaned.length === 9) {
    letters = cleaned.substring(0, 2);
    digits = cleaned.substring(2, 8);
    checkDigit = cleaned.charAt(8);
  } else {
    letters = cleaned.charAt(0);
    digits = cleaned.substring(1, 7);
    checkDigit = cleaned.charAt(7);
  }

  // Calculate checksum
  let sum = 0;
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];

  // Convert letters to numbers (A=10, B=11, etc.)
  for (let i = 0; i < letters.length; i++) {
    sum += (letters.charCodeAt(i) - 55) * weights[i];
  }

  // Add digit weights
  const startWeight = letters.length === 2 ? 2 : 1;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits.charAt(i)) * weights[startWeight + i];
  }

  const remainder = sum % 11;
  const expectedCheck = remainder === 0 ? '0' : (remainder === 1 ? 'A' : String(11 - remainder));

  return checkDigit === expectedCheck;
}

/**
 * Validate China National ID (居民身份证)
 * Format: 18 digits with checksum
 * Last digit can be 0-9 or X
 */
function validateChinaID(id) {
  if (!/^\d{17}[\dXx]$/.test(id)) return false;

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkChars = '10X98765432';

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id.charAt(i)) * weights[i];
  }

  const expectedCheck = checkChars.charAt(sum % 11);
  return id.charAt(17).toUpperCase() === expectedCheck;
}

/**
 * Validate Taiwan National ID (中華民國國民身分證)
 * Format: 1 letter + 9 digits
 */
function validateTaiwanID(id) {
  if (!/^[A-Z]\d{9}$/.test(id)) return false;

  // Letter to number mapping
  const letterValues = {
    'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17,
    'I': 34, 'J': 18, 'K': 19, 'L': 20, 'M': 21, 'N': 22, 'O': 35, 'P': 23,
    'Q': 24, 'R': 25, 'S': 26, 'T': 27, 'U': 28, 'V': 29, 'W': 32, 'X': 30,
    'Y': 31, 'Z': 33
  };

  const letterValue = letterValues[id.charAt(0)];
  if (!letterValue) return false;

  // Calculate checksum
  let sum = Math.floor(letterValue / 10) + (letterValue % 10) * 9;
  const weights = [8, 7, 6, 5, 4, 3, 2, 1, 1];

  for (let i = 0; i < 9; i++) {
    sum += parseInt(id.charAt(i + 1)) * weights[i];
  }

  return sum % 10 === 0;
}

/**
 * Validate South Korea RRN (Resident Registration Number / 주민등록번호)
 * Format: YYMMDD-GNNNNNN (13 digits with checksum)
 */
function validateKoreaRRN(rrn) {
  const cleaned = rrn.replace(/-/g, '');
  if (!/^\d{13}$/.test(cleaned)) return false;

  // Validate date
  const yy = parseInt(cleaned.substring(0, 2));
  const mm = parseInt(cleaned.substring(2, 4));
  const dd = parseInt(cleaned.substring(4, 6));

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;

  // Calculate checksum
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights[i];
  }

  const expectedCheck = (11 - (sum % 11)) % 10;
  return parseInt(cleaned.charAt(12)) === expectedCheck;
}

/**
 * Validate Malaysia MyKad
 * Format: YYMMDD-PB-###G (12 digits)
 */
function validateMalaysiaMyKad(mykad) {
  const cleaned = mykad.replace(/-/g, '');
  if (!/^\d{12}$/.test(cleaned)) return false;

  // Validate date
  const yy = parseInt(cleaned.substring(0, 2));
  const mm = parseInt(cleaned.substring(2, 4));
  const dd = parseInt(cleaned.substring(4, 6));

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;

  // Validate place of birth code (07-59 for Malaysia states, 60-99 for foreign)
  const pb = parseInt(cleaned.substring(6, 8));
  if (pb < 1 || pb > 99) return false;

  return true;
}

/**
 * Validate India Aadhaar
 * Format: 12 digits with Verhoeff checksum
 */
function validateAadhaar(aadhaar) {
  const cleaned = aadhaar.replace(/\s/g, '');
  if (!/^\d{12}$/.test(cleaned)) return false;

  // Verhoeff algorithm
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  let c = 0;
  const reversedDigits = cleaned.split('').reverse();

  for (let i = 0; i < reversedDigits.length; i++) {
    c = d[c][p[(i % 8)][parseInt(reversedDigits[i])]];
  }

  return c === 0;
}

/**
 * Validate Thailand National ID
 * Format: 1-XXXX-XXXXX-XX-C (13 digits with checksum)
 */
function validateThailandID(id) {
  const cleaned = id.replace(/-/g, '');
  if (!/^\d{13}$/.test(cleaned)) return false;

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * (13 - i);
  }

  const expectedCheck = (11 - (sum % 11)) % 10;
  return parseInt(cleaned.charAt(12)) === expectedCheck;
}

/**
 * Validate Chinese company name format
 * Checks for minimum Chinese characters and valid company suffix
 */
function validateChineseCompany(name) {
  // Must have at least 2 Chinese characters
  const chineseChars = name.match(/[\u4E00-\u9FFF]/g);
  if (!chineseChars || chineseChars.length < 2) return false;

  // Must have valid company suffix
  const validSuffixes = [
    '有限公司', '股份有限公司', '集团', '控股',
    '企业', '公司', '银行', '保险', '证券', '基金',
    '投资', '科技', '制造', '贸易', '咨询', '传媒',
    '文化', '教育', '医疗', '药业', '地产', '物流', '电商'
  ];

  return validSuffixes.some(suffix => name.endsWith(suffix));
}

/**
 * Validate romanized Chinese name
 * Check against common English words to reduce false positives
 */
function validateRomanizedName(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 3) return false;

  // Each part should be 2-10 letters only
  if (!parts.every(part => /^[A-Za-z]{2,10}$/.test(part))) return false;

  // Blacklist: known non-name phrases and common English words that appear
  // title-cased after short Chinese surnames (He, Ma, Su, etc.)
  const BLACKLIST_PHRASES = new Set([
    // Locations
    'New York', 'Los Angeles', 'San Francisco', 'United States', 'Great Britain',
    'North Korea', 'South Africa', 'New Zealand', 'Hong Kong', 'South Korea',
    // Roles / titles
    'General Manager', 'Chief Executive', 'Vice President', 'Project Manager',
    'Public School', 'High School', 'National Park',
    // Common English words that follow short surnames (He, Ma, Su, Ai, Ge, Mo, Du)
    'He Said', 'He Was', 'He Is', 'He Had', 'He Has', 'He Did', 'He Can',
    'He Will', 'He Would', 'He Could', 'He Should', 'He May', 'He Might',
    'Ma Belle', 'Du Bois', 'Su Casa', 'Ai Weiwei',
    'Ye Olde', 'Fan Club', 'Tan Lines', 'Wei Rd',
    // Common English given names that might follow a Chinese surname
    // (e.g. "Lin Manuel", "Chen Williams")
    'He North', 'He South', 'He East', 'He West',
  ]);

  if (BLACKLIST_PHRASES.has(name)) return false;

  // Reject if the given-name part is a common standalone English word
  const COMMON_WORDS = new Set([
    'Said', 'Was', 'Were', 'Had', 'Has', 'Did', 'Does', 'Can', 'Could',
    'Will', 'Would', 'Should', 'May', 'Might', 'Must', 'Shall',
    'Been', 'Being', 'Gone', 'Got', 'Let', 'Set', 'Put', 'Run',
    'But', 'And', 'The', 'For', 'Not', 'Are', 'Its', 'Our',
    'Their', 'They', 'This', 'That', 'With', 'From', 'Into',
    'Club', 'Road', 'Road', 'Street', 'Avenue', 'Lane', 'Drive',
    'North', 'South', 'East', 'West', 'Central', 'Upper', 'Lower',
    'Group', 'Team', 'Board', 'Fund', 'Bank', 'Corp', 'Ltd',
    'Belle', 'Bois', 'Casa', 'Monde', 'Olde', 'Lines',
  ]);

  // Check every part after the surname (index 1+)
  for (let i = 1; i < parts.length; i++) {
    if (COMMON_WORDS.has(parts[i])) return false;
  }

  return true;
}

/**
 * Validate Japan My Number (個人番号 / マイナンバー)
 * Format: 12 digits with mod-11 check digit
 * Algorithm: weights [6,5,4,3,2,7,6,5,4,3,2] applied to first 11 digits;
 *   remainder = sum mod 11; check = (remainder <= 1) ? 0 : 11 - remainder
 */
function validateJapanMyNumber(num) {
  const cleaned = num.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(cleaned)) return false;
  const weights = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  const remainder = sum % 11;
  const expected = remainder <= 1 ? 0 : 11 - remainder;
  return parseInt(cleaned[11]) === expected;
}

/**
 * Validate US ABA / Routing Transit Number
 * Format: 9 digits; weighted sum with [3,7,1,3,7,1,3,7,1] must be divisible by 10
 */
function validateABARouting(num) {
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  return sum % 10 === 0;
}

/**
 * Validate Australian Tax File Number (TFN)
 * Format: 9 digits (8-digit legacy accepted without checksum)
 * Weights: [1,4,3,7,5,8,6,9,10]; weighted sum mod 11 == 0
 */
function validateAustraliaTFN(num) {
  const cleaned = num.replace(/\s/g, '');
  if (!/^\d{8,9}$/.test(cleaned)) return false;
  if (cleaned.length === 8) return true; // older 8-digit TFN: trust the label context
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  return sum % 11 === 0;
}

// Export validators
window.AsianIDValidators = {
  validateHKID,
  validateChinaID,
  validateTaiwanID,
  validateKoreaRRN,
  validateMalaysiaMyKad,
  validateAadhaar,
  validateThailandID,
  validateChineseCompany,
  validateRomanizedName,
  validateJapanMyNumber,
  validateABARouting,
  validateAustraliaTFN,
};
