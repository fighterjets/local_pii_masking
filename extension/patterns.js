/**
 * Patterns and Detection Module
 * Regex patterns for PII detection
 * Local PII Masking v2.3.5
 */

import { validateNRIC, validateCreditCard, validatePhone, validateEmail, validateChineseID } from './validation.js';

// Detection patterns configuration
export const PATTERNS = {
  asianIDPatterns: {
    // Singapore
    singaporeNRIC: {
      pattern: /\b[STFGM]\d{7}[A-Z]\b/g,
      type: 'NRIC_SG',
      description: 'Singapore NRIC/FIN',
      validator: 'validateNRIC'
    },
    singaporePassport: {
      pattern: /\b[KEG]\d{7}[A-Z]\b/g,
      type: 'PASSPORT_SG',
      description: 'Singapore Passport'
    },
    singaporePhone: {
      pattern: /(?:\+65\s?)?[689]\d{7}\b/g,
      type: 'PHONE_SG',
      description: 'Singapore phone number'
    },
    singaporePostalCode: {
      pattern: /\b\d{6}\b/g,
      type: 'POSTAL_CODE_SG',
      description: 'Singapore postal code'
    },
    singaporeUEN: {
      pattern: /\b(?:[0-9]{8}[A-Z]|[0-9]{9}[A-Z]|[TS][0-9]{2}[A-Z]{2}[0-9]{4}[A-Z])\b/g,
      type: 'UEN_SG',
      description: 'Singapore UEN'
    },

    // Other Asian countries (abbreviated for brevity - keeping key patterns)
    chinaPhone: {
      // Matches: +86 139-1234-5678 | +86 13912345678 | +86 139 1234 5678
      // Requires +86 country code to avoid false positives on bare 11-digit strings
      pattern: /\+86[\s-]?1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}\b/g,
      type: 'PHONE_CN',
      description: 'China mobile number'
    },
    chinaID: {
      pattern: /\b\d{17}[\dXx]\b/g,
      type: 'NATIONAL_ID_CN',
      description: 'China National ID'
    },
    hongKongID: {
      pattern: /\b[A-Z]{1,2}\d{6}[(\s]?\d[)A]?\b/gi,
      type: 'HKID',
      description: 'Hong Kong ID Card'
    },
    taiwanID: {
      pattern: /\b[A-Z]\d{9}\b/g,
      type: 'NATIONAL_ID_TW',
      description: 'Taiwan National ID'
    },
    japanMyNumber: {
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      type: 'MY_NUMBER_JP',
      description: 'Japan My Number'
    },
    koreaRRN: {
      pattern: /\b\d{6}[\s-]?\d{7}\b/g,
      type: 'RRN_KR',
      description: 'South Korea RRN'
    },
    malaysiaMyKad: {
      pattern: /\b\d{6}[\s-]?\d{2}[\s-]?\d{4}\b/g,
      type: 'MYKAD_MY',
      description: 'Malaysia MyKad'
    },
    thailandID: {
      pattern: /\b\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d\b/g,
      type: 'NATIONAL_ID_TH',
      description: 'Thailand National ID'
    },
    indonesiaKTP: {
      pattern: /\b\d{16}\b/g,
      type: 'KTP_ID',
      description: 'Indonesia KTP'
    },
    indiaAadhaar: {
      pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
      type: 'AADHAAR_IN',
      description: 'India Aadhaar'
    }
  },

  universalPatterns: {
    email: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      type: 'EMAIL',
      description: 'Email address'
    },
    creditCard: {
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      type: 'CREDIT_CARD',
      description: 'Credit card number'
    },
    dateOfBirth: {
      pattern: /\b(?:DOB|Date of Birth|Birth Date|Born on)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi,
      type: 'DATE_OF_BIRTH',
      description: 'Date of birth'
    }
  }
};

/**
 * Detect PII using regex patterns
 * @param {string} text - Text to analyze
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Array of detections
 */
export async function detectWithRegex(text, options = {}) {
  const detections = [];
  const allPatterns = {
    ...PATTERNS.asianIDPatterns,
    ...PATTERNS.universalPatterns
  };

  for (const [id, pattern] of Object.entries(allPatterns)) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      let isValid = true;

      // Use pattern-specific validator if available
      if (pattern.validator && window.AsianIDValidators) {
        const validatorFunc = window.AsianIDValidators[pattern.validator];
        if (validatorFunc) {
          isValid = validatorFunc(match[0]);
        }
      }
      // Built-in validators
      else if (pattern.type === 'NRIC_SG') {
        isValid = validateNRIC(match[0]);
      } else if (pattern.type === 'CREDIT_CARD') {
        isValid = validateCreditCard(match[0]);
      } else if (pattern.type === 'EMAIL') {
        isValid = validateEmail(match[0]);
      } else if (pattern.type === 'PHONE_SG') {
        isValid = validatePhone(match[0]);
      } else if (pattern.type === 'NATIONAL_ID_CN') {
        isValid = validateChineseID(match[0]);
      }
      // For patterns without validators, accept all matches
      else {
        isValid = true;
      }

      if (isValid) {
        detections.push({
          type: pattern.type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 1.0,
          method: 'regex',
          description: pattern.description
        });
      }
    }
  }

  return detections;
}
