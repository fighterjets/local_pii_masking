/**
 * Local PII Masking - Browser Extension
 * PII Detection and Masking - 100% Client-Side
 */

// ============================================================================
// SYNTHETIC MASKING DATA & LOGIC
// ============================================================================

const SYNTHETIC_NAMES = [
  // Chinese-English names (SG-appropriate)
  'John Lane', 'Sarah Chen', 'David Wong', 'Michael Tan', 'Emma Lee',
  'James Kumar', 'Rachel Lim', 'Thomas Park', 'Robert Ng', 'William Ho',
  'Jennifer Zhao', 'Christopher Liu', 'Amanda Goh', 'Daniel Yap', 'Michelle Tay',
  'Kevin Ong', 'Stephanie Koh', 'Brian Soh', 'Jessica Chua', 'Marcus Leong',
  // Malay names
  'Ahmad Razif Hassan', 'Nurul Ain Mahmood', 'Faizal Othman',
  'Siti Norzahirah Bakar', 'Muhammad Hafiz Ismail', 'Zainab Ahmad',
  'Hafeez Rahman', 'Amirah Nabilah Jusoh',
  // Indian names
  'Ravi Kumar', 'Priya Nair', 'Arjun Sharma', 'Deepa Krishnan',
  'Suresh Menon', 'Kavitha Pillai', 'Rajesh Patel', 'Ananya Singh',
  // Eurasian names
  'Jason De Souza', 'Melissa Pereira', 'Ryan Fernandez', 'Christina D\'Cruz'
];
const SYNTHETIC_NAMES_CN_ROMAN = [
  'Wei Liang', 'Xiao Ming', 'Jun Hui', 'Mei Lin', 'Jia Hao',
  'Ying Xian', 'Zhi Wei', 'Li Na', 'Cheng Yang', 'Rui Xuan',
  'Hao Chen', 'Fang Yu', 'Jing Wen', 'Bo Tao', 'Xin Yi'
];
const SYNTHETIC_NAMES_CN = [
  '王伟', '李明', '张华', '陈静', '刘洋', '杨帆', '赵敏', '吴强', '周燕', '徐磊'
];
const SYNTHETIC_COMPANIES_SG = [
  'Prestige Solutions Pte. Ltd.', 'Blue Horizon Technologies Private Limited',
  'Summit Capital Group Pte. Ltd.', 'Pacific Meridian Holdings Private Limited',
  'Anchor Systems & Services Pte. Ltd.', 'Global Bridge Consulting Private Limited',
  'Nexus Innovations Pte. Ltd.', 'Sterling Dynamics Private Limited'
];
const SYNTHETIC_COMPANIES_HK = [
  'Pacific Solutions Limited', 'Blue Star Holdings Limited',
  'Summit Capital Co., Ltd.', 'Meridian Group Limited', 'Anchor Ventures Limited'
];
const SYNTHETIC_COMPANIES_CN = [
  '蓝海科技有限公司', '鼎盛集团有限公司', '永恒投资股份有限公司',
  '瑞达控股有限公司', '华信科技有限公司'
];
const SYNTHETIC_COMPANIES_EN = [
  'Meridian Consulting Group', 'Blue Anchor Holdings', 'Summit Pacific Ltd.',
  'Nexus Bridge Partners', 'Sterling Global Solutions'
];
const SYNTHETIC_ADDRESSES_SG = [
  'Blk 10 Woodlands Avenue 3 #05-21 Singapore 730010',
  'Blk 45 Ang Mo Kio Street 52 #12-08 Singapore 560045',
  'No. 1 Harbour Drive #08-01 Singapore 099253',
  'Blk 123 Bedok North Road #03-456 Singapore 460123',
  '22 Orchard Road #10-01 Singapore 238883'
];
const SYNTHETIC_ADDRESSES_HK = [
  'Flat A, 5/F, Pacific Place, 88 Queensway, Central, Hong Kong',
  'Unit 12, 20/F, Times Square, 1 Matheson Street, Causeway Bay, Hong Kong',
  'Room 8, 12/F, Harbour Centre, 25 Harbour Road, Wan Chai, Hong Kong'
];
const SYNTHETIC_ADDRESSES_CN = [
  'Room 101, Building 3, No. 1 Jianguomen Road, Chaoyang District, Beijing',
  'Unit 5, 8/F, Kerry Centre, 1515 Nanjing West Road, Jing\'an District, Shanghai',
  'Suite 2001, Tower A, No. 5 Huacheng Avenue, Tianhe District, Guangzhou'
];

let _syntheticMap = new Map();

function resetSyntheticData() {
  _syntheticMap = new Map();
}

// NRIC check char — uses the same algorithm as validateNRIC()
function syntheticNRICCheckChar(prefix, digits7) {
  const weights = [2, 7, 6, 5, 4, 3, 2];
  const stChars = 'JZIHGFEDCBA';
  const fgChars = 'XWUTRQPNMLK';
  let sum = digits7.split('').reduce((s, d, i) => s + parseInt(d) * weights[i], 0);
  if (prefix === 'F' || prefix === 'G') sum += 4;
  else if (prefix === 'M') sum += 3;
  return (prefix === 'S' || prefix === 'T' || prefix === 'M')
    ? stChars[sum % 11] : fgChars[sum % 11];
}

// djb2 hash → unsigned 32-bit integer seed
function hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function _generateFake(ch, value, type) {
  switch (type) {
    case 'PERSON':          return ch.pickone(SYNTHETIC_NAMES);
    case 'PERSON_CN':       return ch.pickone(SYNTHETIC_NAMES_CN_ROMAN);
    case 'NAME_CN':         return ch.pickone(SYNTHETIC_NAMES_CN);

    case 'ORGANIZATION':    return ch.company();
    case 'ORGANIZATION_CN': return ch.pickone(SYNTHETIC_COMPANIES_CN);
    case 'ENTITY_NAME_SG':  return ch.pickone(SYNTHETIC_COMPANIES_SG);
    case 'ENTITY_NAME_HK':  return ch.pickone(SYNTHETIC_COMPANIES_HK);
    case 'ENTITY_NAME_CN':  return ch.pickone(SYNTHETIC_COMPANIES_CN);

    case 'ADDRESS_SG':      return ch.pickone(SYNTHETIC_ADDRESSES_SG);
    case 'ADDRESS_HK':      return ch.pickone(SYNTHETIC_ADDRESSES_HK);
    case 'ADDRESS_CN':      return ch.pickone(SYNTHETIC_ADDRESSES_CN);

    case 'EMAIL':
    case 'EMAIL_CN': {
      const domain = ch.pickone(['example.com', 'demo.sg', 'sample.net']);
      return `${ch.first().toLowerCase()}.${ch.last().toLowerCase()}@${domain}`;
    }

    case 'PHONE_SG': {
      const first = ch.pickone(['8', '9', '6']);
      const rest = String(ch.integer({min: 1000000, max: 9999999}));
      const raw = first + rest;
      return `+65 ${raw.slice(0, 4)} ${raw.slice(4)}`;
    }
    case 'PHONE_HK': {
      const raw = String(ch.integer({min: 10000000, max: 99999999}));
      return `+852 ${raw.slice(0, 4)} ${raw.slice(4)}`;
    }
    case 'PHONE_CN': {
      const prefix = ch.pickone(['138', '139', '150', '186', '188']);
      const rest = String(ch.integer({min: 10000000, max: 99999999}));
      return `+86 ${prefix} ${rest.slice(0, 4)} ${rest.slice(4)}`;
    }

    case 'CREDIT_CARD':
      return ch.cc({type: ch.pickone(['Visa', 'Mastercard'])});

    case 'BANK_ACCOUNT':
      return String(ch.integer({min: 100000000, max: 999999999}));

    case 'NRIC_SG': {
      const prefix = /^[FGM]/.test(value) ? value[0] : 'S';
      const digits = String(ch.integer({min: 1000000, max: 9999999}));
      return `${prefix}${digits}${syntheticNRICCheckChar(prefix, digits)}`;
    }
    case 'PASSPORT_SG': {
      const prefix = /^[KEG]/.test(value) ? value[0] : 'K';
      return `${prefix}${ch.integer({min: 1000000, max: 9999999})}A`;
    }
    case 'HKID': {
      const letters = ch.pickone(['AB', 'CD', 'EF', 'GH', 'HK', 'JK']);
      const digits = String(ch.integer({min: 100000, max: 999999}));
      return `${letters}${digits}(0)`;
    }
    case 'PASSPORT_HK':
      return `K${ch.integer({min: 1000000, max: 9999999})}`;

    case 'NATIONAL_ID_CN': {
      const p1 = String(ch.integer({min: 100000000, max: 999999999}));
      const p2 = String(ch.integer({min: 100000000, max: 999999999}));
      return p1 + p2;
    }
    case 'PASSPORT_CN':
      return `E${ch.integer({min: 10000000, max: 99999999})}`;

    case 'PASSPORT':
      return `A${ch.integer({min: 1000000, max: 9999999})}`;

    case 'UEN_SG': {
      const year = String(ch.integer({min: 10, max: 99}));
      const num = String(ch.integer({min: 10000, max: 99999}));
      const letter = ch.character({alpha: true, casing: 'upper'});
      return `20${year}${num}${letter}`;
    }
    case 'BR_HK':
      return String(ch.integer({min: 10000000, max: 99999999}));

    case 'USCC_CN':
      return `91110000MA${ch.string({length: 7, pool: 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'})}A`;

    case 'POSTAL_CODE_SG':
      return String(ch.integer({min: 100000, max: 799999}));

    case 'DATE_OF_BIRTH': {
      const year = ch.integer({min: 1940, max: 2005});
      const month = ch.integer({min: 1, max: 12});
      const day = ch.integer({min: 1, max: 28});
      if (/[年月日]/.test(value)) {
        return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
      }
      const sep = value.includes('/') ? '/' : '-';
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return /^\d{4}/.test(value) ? `${year}${sep}${mm}${sep}${dd}` : `${dd}${sep}${mm}${sep}${year}`;
    }
    case 'DATE_OF_BIRTH_CN': {
      const year = ch.integer({min: 1940, max: 2005});
      const month = ch.integer({min: 1, max: 12});
      const day = ch.integer({min: 1, max: 28});
      return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
    }

    case 'GENDER':
    case 'GENDER_CN': return value;

    default: return `[SYNTHETIC_${type}]`;
  }
}

function getSyntheticReplacement(value, type) {
  const key = `${type}\x00${value}`;
  if (_syntheticMap.has(key)) return _syntheticMap.get(key);
  const fake = _generateFake(new Chance(hashSeed(key)), value, type);
  _syntheticMap.set(key, fake);
  return fake;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  detection: {
    thresholds: {
      regex: 1.0,
      ner: 0.85,
      download: 0.5
    },
    methods: {
      regex: true,
      ner: false,  // Disabled by default, enable with preload button
      qwen: false  // Enabled when QwenClassifier loads successfully
    },
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
        description: 'Singapore Passport',
        confidence: 0.75
      },
      singaporePhone: {
        // +65 with optional separator then 8-digit local number, or standalone 8-digit
        pattern: /(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}\b/g,
        type: 'PHONE_SG',
        description: 'Singapore phone number (+65 or local 8-digit)'
      },
      singaporePostalCode: {
        pattern: /\bSingapore\s+(\d{6})\b|(?:postal\s*code|postcode)[\s:#-]*(\d{6})\b/gi,
        type: 'POSTAL_CODE_SG',
        description: 'Singapore postal code (requires "Singapore" prefix or label)',
        confidence: 0.75,
        piiGroup: 'alt'
      },

      // Hong Kong phone — placed here so all region phones are together
      // +852 covers all HK numbers; without prefix only match mobile prefixes 5,6,7,9
      hongKongPhone: {
        pattern: /(?:\+852[\s-]?[2-9]|[5679])\d{3}[\s-]?\d{4}\b/g,
        type: 'PHONE_HK',
        description: 'Hong Kong phone number (+852 or local mobile 8-digit)'
      },
      singaporeAddress: {
        pattern: /(?:Blk|Block|Blk\.|BLK)\s*\d+[A-Z]?\s+[A-Za-z\s]+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Close|Crescent|Cres|Boulevard|Blvd|Highway|Hwy)\s*(?:#\d{2}-\d{2,4})?\s*(?:Singapore\s+\d{6})?/gi,
        type: 'ADDRESS_SG',
        description: 'Singapore address'
      },
      singaporeAddressUnit: {
        pattern: /(?:#|Unit|Apt|Apartment)\s*\d{2}-\d{2,4}/gi,
        type: 'ADDRESS_SG',
        description: 'Singapore unit number'
      },
      singaporeUEN: {
        pattern: /\b(?:[0-9]{8}[A-Z]|[0-9]{9}[A-Z]|[TS][0-9]{2}[A-Z]{2}[0-9]{4}[A-Z])\b/g,
        type: 'UEN_SG',
        description: 'Singapore UEN (Unique Entity Number)'
      },
      // Standalone entity names ending in SG-specific legal suffixes
      singaporeEntityName: {
        pattern: /\b[A-Z][A-Za-z0-9&'()\-.]*(?:\s+[A-Za-z0-9&'()\-.]+){0,7}\s+(?:Pte\.?\s*Ltd\.?|Private\s+Limited|LLP|Limited\s+Liability\s+Partnership|VCC)\b/g,
        type: 'ENTITY_NAME_SG',
        description: 'Singapore registered entity name (Pte. Ltd., LLP, VCC)',
        confidence: 0.9
      },
      // Labeled company name field (catches names without a recognisable legal suffix)
      singaporeEntityNameLabeled: {
        pattern: /(?:Company\s+Name|Entity\s+Name|Business\s+Name|Registered\s+Name|Name\s+of\s+(?:Company|Entity|Business|Firm))[\s:]+[A-Z][A-Za-z0-9\s&'()\-.]{2,80}/gi,
        type: 'ENTITY_NAME_SG',
        description: 'Singapore entity name (labeled field)',
        confidence: 0.85
      },

      // China
      chinaID: {
        pattern: /\b\d{17}[\dXx]\b/g,
        type: 'NATIONAL_ID_CN',
        description: 'China National ID (居民身份证)',
        validator: 'validateChinaID'
      },
      chinaPassport: {
        pattern: /\b(?:[EGDSP]\d{8}|[A-Z]{2}\d{7})\b/g,
        type: 'PASSPORT_CN',
        description: 'China Passport (E/G/D/S/P + 8 digits, or 2-letter prefix + 7 digits)',
        confidence: 0.75
      },
      chinaAddressEnglish: {
        // Handles: "Villa 6, Emerald Garden, No. 200 Huqingping Highway, Qingpu District, Shanghai"
        // Captures unit/villa prefix + optional estate name + street + optional district + city
        pattern: /(?:Villa|Apt\.?|Apartment|House|Room|Rm|Suite|Unit|Floor|Flr|Building|Bldg|Block|Tower)\s*[\dA-Z]+(?:[,\s]+[A-Za-z][A-Za-z\s]+(?:Garden|Estate|Court|Park|Place|Residence|Residences|Manor|Villa|Compound))?[,\s]+(?:No\.\s*)?\d+[,\s]+[A-Za-z][A-Za-z\s-]+(?:Road|Rd|Street|St|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Highway|Hwy|Drive|Dr)(?:[,\s]+[A-Za-z][A-Za-z\s-]*(?:Zone|District|Area|Park|Town|County|New\sArea))*[,\s]+(?:Shanghai|Beijing|Guangzhou|Shenzhen|Chengdu|Hangzhou|Nanjing|Suzhou|Wuhan|Tianjin|Chongqing|Dongguan|Foshan|Zhengzhou|Changsha|Kunming|Shenyang|Dalian|Qingdao|Ningbo|Xiamen|Wuxi|Hefei|Nanchang|Harbin|Changchun)/gi,
        type: 'ADDRESS_CN',
        description: 'China address (English format)'
      },
      chinaAddressSimple: {
        // Handles: "No. 1588, Songzheng Road, Songjiang Industrial Zone, Shanghai"
        // Allows comma after number, optional zone/district/area segments before city
        pattern: /(?:No\.\s*)?\d+[,\s]+[A-Za-z][A-Za-z\s-]+(?:Road|Rd|Street|St|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Highway|Hwy|Drive|Dr)(?:[,\s]+[A-Za-z][A-Za-z\s-]*(?:Zone|District|Area|Park|Town|County|New\sArea))*[,\s]+(?:Shanghai|Beijing|Guangzhou|Shenzhen|Chengdu|Hangzhou|Nanjing|Suzhou|Wuhan|Tianjin|Chongqing|Dongguan|Foshan|Zhengzhou|Changsha|Kunming|Shenyang|Dalian|Qingdao|Ningbo|Xiamen|Wuxi|Hefei|Nanchang|Harbin|Changchun)/gi,
        type: 'ADDRESS_CN',
        description: 'China street address'
      },
      chinaUSCC: {
        pattern: /\b[0-9A-HJ-NP-RTUW-Y]{18}\b/g,
        type: 'USCC_CN',
        description: 'China Unified Social Credit Code (统一社会信用代码)',
        confidence: 0.6
      },
      // China mobile/landline with explicit +86 country code (high confidence)
      chinaPhonePrefixed: {
        pattern: /\+86[\s-]?(?:1[3-9]\d{9}|0\d{2,3}[\s-]?\d{7,8})\b/g,
        type: 'PHONE_CN',
        description: 'China phone number with +86 country code',
        confidence: 0.95
      },
      // Standalone China mobile (1[3-9] + 9 digits, no +86 prefix)
      chinaPhoneStandalone: {
        pattern: /\b1[3-9]\d{9}\b/g,
        type: 'PHONE_CN',
        description: 'China mobile number (11-digit, no country code)',
        confidence: 0.65
      },
      // English-language company names operating in China (foreign/JV entities)
      chinaEntityNameEnglish: {
        pattern: /\b[A-Z][A-Za-z0-9&'()\-.]*(?:[^\S\n]+[A-Za-z0-9&'()\-.]+){2,7}[^\S\n]+(?:Co\.?,?[^\S\n]*Ltd\.?|Corporation|Corp\.?|(?:China|Beijing|Shanghai|Shenzhen|Guangzhou)[^\S\n]+(?:Limited|Ltd\.?))\b/g,
        type: 'ENTITY_NAME_CN',
        description: 'China registered English company name (Co., Ltd., Corporation; min 3 words)',
        confidence: 0.75
      },

      // Malaysia
      malaysiaMyKad: {
        pattern: /\b\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[-]?\d{2}[-]?\d{4}\b/g,
        type: 'NATIONAL_ID_MY',
        description: 'Malaysian MyKad',
        confidence: 0.85,
        validator: (m) => window.AsianIDValidators?.validateMalaysiaMyKad?.(m[0]) ?? true
      },
      malaysiaPhone: {
        pattern: /(?:\+?60|0)1[0-9][\s-]?\d{7,8}\b/g,
        type: 'PHONE_MY',
        description: 'Malaysian mobile number',
        confidence: 0.85
      },

      // Singapore vehicle plate
      singaporeVehiclePlate: {
        pattern: /\b(?:S[A-Z]{1,2}|E[A-Z]|T[A-Z]|P[ABC]|G[HB]|Y[HLST]|MC[ABC])\d{1,4}[A-Z]\b/g,
        type: 'VEHICLE_PLATE_SG',
        description: 'Singapore vehicle registration plate',
        confidence: 0.75
      },

      // Hong Kong
      hongKongID: {
        pattern: /\b[A-Z]{1,2}\d{6}[(\s]?\d[)A]?\b/gi,
        type: 'HKID',
        description: 'Hong Kong ID Card',
        validator: 'validateHKID'
      },
      hongKongPassport: {
        pattern: /\b[KH]\d{7,8}\b/g,
        type: 'PASSPORT_HK',
        description: 'Hong Kong Passport',
        confidence: 0.75
      },
      hongKongAddress: {
        pattern: /(?:Flat|Ft|Unit|Rm|Room)\s*[\dA-Z]+[,\s]+(?:\d{1,3}\/F|Floor\s+\d+)[,\s]+[A-Za-z\s&']+(?:Building|Bldg|Plaza|Centre|Center|Tower|Court|Mansion|House|Estate)[,\s]+(?:No\.\s*)?\d+[A-Z]?\s+[A-Za-z\s']+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Path)[,\s]+(?:Central|Wan Chai|Causeway Bay|Tsim Sha Tsui|Mong Kok|Admiralty|Sheung Wan|Quarry Bay|Tai Koo|North Point|Kowloon|Hong Kong|HK)/gi,
        type: 'ADDRESS_HK',
        description: 'Hong Kong address (full format)'
      },
      hongKongAddressSimple: {
        pattern: /(?:\d{1,3}\/F|Floor\s+\d+)[,\s]+[A-Za-z\s&']+(?:Building|Bldg|Plaza|Centre|Tower)[,\s]+[A-Za-z\s']+(?:Road|Rd|Street|St)/gi,
        type: 'ADDRESS_HK',
        description: 'Hong Kong address (simple format)'
      },
      // Company names ending in HK legal suffixes ("Limited" anchored to 2+ words, or Co., Ltd.)
      hongKongEntityName: {
        pattern: /\b[A-Z][A-Za-z0-9&'()\-.]+(?:\s+[A-Za-z0-9&'()\-.]+){1,7}\s+Limited\b|\b[A-Z][A-Za-z0-9&'()\-.]*(?:\s+[A-Za-z0-9&'()\-.]+){0,7}\s+Co\.?,?\s*Ltd\.?\b/g,
        type: 'ENTITY_NAME_HK',
        description: 'Hong Kong registered company name (Limited, Co., Ltd.)',
        confidence: 0.75
      },
      // Business Registration number preceded by a label (avoids matching bare 8-digit numbers)
      hongKongBRNumber: {
        pattern: /(?:BR(?:\s*No\.?|\s*Number|\s*Reg(?:istration)?(?:\s*No\.?)?)?|Business\s+Reg(?:istration)?(?:\s*No\.?|\s*Number)?)[\s:#-]*\d{8}(?:-\d{3})?/gi,
        type: 'BR_HK',
        description: 'Hong Kong Business Registration number (with label)'
      },

      // Taiwan
      // Format: letter (region A-Z) + 9 digits; second digit 1/2=citizen male/female.
      // Checksum validated by validateTaiwanID — reduces false positives significantly.
      taiwanNationalID: {
        pattern: /\b[A-Z]\d{9}\b/g,
        type: 'NATIONAL_ID_TW',
        description: 'Taiwan National ID Card (身份證字號)',
        validator: 'validateTaiwanID'
      },

      // South Korea
      // RRN format: YYMMDD-GNNNNNN (13 digits); separator required for specificity.
      // G digit: 1-4 citizen, 5-9 foreigner; date fields validated by validator.
      koreaRRN: {
        pattern: /\b\d{6}-[1-9]\d{6}\b/g,
        type: 'RRN_KR',
        description: 'South Korea Resident Registration Number (주민등록번호)',
        confidence: 0.85,
        validator: 'validateKoreaRRN'
      },
      // Mobile: 01X-XXXX-XXXX (11 digits) or +82 10-XXXX-XXXX
      koreaPhone: {
        pattern: /\+82[\s-]?1[0-9][\s-]?\d{3,4}[\s-]?\d{4}\b|\b01[0-9][\s-]?\d{3,4}[\s-]?\d{4}\b/g,
        type: 'PHONE_KR',
        description: 'South Korea mobile number (+82 or 01X)'
      },

      // Japan
      // My Number (個人番号): 12 digits, displayed 4-4-4; labeled only to avoid false positives.
      // Mod-11 checksum validated by validateJapanMyNumber.
      japanMyNumber: {
        pattern: /(?:マイナンバー|個人番号|My\s*Number)[\s:：]*(\d{4}[\s-]?\d{4}[\s-]?\d{4})/gi,
        type: 'MY_NUMBER_JP',
        description: 'Japan My Number (個人番号) — labeled',
        confidence: 0.9,
        piiGroup: 1,
        validatorGroup: 1,
        validator: 'validateJapanMyNumber'
      },
      // Mobile: 0[789]0-XXXX-XXXX or +81 [789]0-XXXX-XXXX
      japanPhone: {
        pattern: /\+81[\s-]?[789]0[\s-]?\d{4}[\s-]?\d{4}\b|\b0[789]0[\s-]?\d{4}[\s-]?\d{4}\b/g,
        type: 'PHONE_JP',
        description: 'Japan mobile number (+81 or 0[789]0-XXXX-XXXX)'
      },

      // Thailand
      // 13-digit ID; first digit 1-8 indicates holder type. Checksum mod-10 via validateThailandID.
      // Confidence 0.7 because standalone 13-digit numbers can appear in other contexts.
      thailandNationalID: {
        pattern: /\b[1-8]\d{12}\b/g,
        type: 'NATIONAL_ID_TH',
        description: 'Thailand National ID (บัตรประชาชน)',
        confidence: 0.7,
        validator: 'validateThailandID'
      },

      // Indonesia
      // NIK (Nomor Induk Kependudukan): 16 digits; no reliable public checksum.
      // Labeled-only to prevent false positives from standalone 16-digit numbers.
      indonesiaKTP: {
        pattern: /(?:NIK|KTP|Kartu\s+Tanda\s+Penduduk|Nomor\s+Induk\s+Kependudukan)[\s::#-]*(\d{16})\b/gi,
        type: 'KTP_ID',
        description: 'Indonesia National ID (NIK/KTP) — labeled',
        confidence: 0.9,
        piiGroup: 1
      },

      // India
      // Aadhaar: 12 digits, first digit 2-9, formatted 4-4-4. Verhoeff checksum via validateAadhaar.
      indiaAadhaar: {
        pattern: /\b[2-9]\d{3}[\s]?\d{4}[\s]?\d{4}\b/g,
        type: 'AADHAAR_IN',
        description: 'India Aadhaar number',
        confidence: 0.75,
        validator: 'validateAadhaar'
      },
      // PAN: 3 letters + entity-type letter + surname initial + 4 digits + check letter.
      // Entity-type characters: A=AOP, B=BOI, C=Company, F=Firm, G=Govt, H=HUF,
      //   J=Artificial Juridical Person, L=Local Authority, P=Person, T=Trust.
      indiaPAN: {
        pattern: /\b[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]\b/g,
        type: 'PAN_IN',
        description: 'India PAN Card (Permanent Account Number)',
        confidence: 0.9
      },
      // Mobile with explicit country code: +91 or 91 prefix, then 6-9 leading digit, 9 more digits.
      indiaPhone: {
        pattern: /(?:\+91[\s-]?|91[\s-]?)[6-9]\d{9}\b/g,
        type: 'PHONE_IN',
        description: 'India mobile number (with +91 or 91 country code)',
        confidence: 0.9
      },

      // Philippines
      // SSS (Social Security System) number: XX-XXXXXXX-X, labeled only.
      philippinesSSS: {
        pattern: /(?:SSS|Social\s+Security(?:\s+System)?)\s*(?:No\.?|Number|#)[\s:#-]*(\d{2}[-\s]?\d{7}[-\s]?\d)\b/gi,
        type: 'SSS_PH',
        description: 'Philippines SSS number (labeled)',
        confidence: 0.9,
        piiGroup: 1
      },

      // Vietnam
      // CCCD (Căn cước công dân): 12 digits (new); CMND: 9 digits (old).
      // Labeled only — standalone 9 or 12 digits too ambiguous without context.
      vietnamNationalID: {
        pattern: /(?:CCCD|CMND|Căn\s+cước\s+công\s+dân|Chứng\s+minh\s+nhân\s+dân)[\s::#-]*(\d{9}|\d{12})\b/gi,
        type: 'NATIONAL_ID_VN',
        description: 'Vietnam National ID (CCCD/CMND) — labeled',
        confidence: 0.9,
        piiGroup: 1
      },
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
        description: 'Date of birth (with label)',
        piiGroup: 1
      },
      passportNumberLabeled: {
        pattern: /\bpassport\s+(?:no\.?|num(?:ber)?|#)[\s:#-]*([A-Z]{1,2}\d{7,8}[A-Z]?)\b/gi,
        type: 'PASSPORT',
        description: 'Passport number (labeled field, any format)',
        piiGroup: 1
      },
      gender: {
        pattern: /\b(?:Gender|Sex)[\s:]*\b(Male|Female|M|F|MALE|FEMALE|male|female)\b/gi,
        type: 'GENDER',
        description: 'Gender (with label)',
        piiGroup: 1
      },
      // Chinese Language Patterns
      chineseGender: {
        pattern: /(?:性别|性別)[\s:：]*([男女])/g,
        type: 'GENDER_CN',
        description: 'Chinese Gender (性别)',
        piiGroup: 1
      },
      chineseGenderStandalone: {
        pattern: /\b([男女])(?=[性患员工]|[\s,;。，；]|$)/g,
        type: 'GENDER_CN',
        description: 'Chinese Gender character (男/女) with context',
        confidence: 0.6
      },
      chineseDateOfBirth: {
        pattern: /(?:出生日期|出生年月日|生日|出生)[\s:：]*(\d{4}[-年\/]\d{1,2}[-月\/]\d{1,2}[日]?|\d{4}\.\d{1,2}\.\d{1,2})/g,
        type: 'DATE_OF_BIRTH_CN',
        description: 'Chinese Date of Birth (出生日期)',
        piiGroup: 1
      },
      chineseName: {
        pattern: /(?:姓名|名字)[\s:：]*([\u4E00-\u9FFF]{2,4})/g,
        type: 'NAME_CN',
        description: 'Chinese Name (姓名)',
        piiGroup: 1
      },
      chineseNameStandalone: {
        pattern: /([\u4E00-\u9FFF]{2,4}(?:先生|女士|医生|博士|教授|总经理|经理|主任))/g,
        type: 'NAME_CN',
        description: 'Chinese Name with title'
      },
      chineseAddress: {
        pattern: /(?:地址|住址|详细地址|联系地址|家庭住址)[\s:：]*([\u4E00-\u9FFF\d\s]{5,}(?:省|市|区|县|街道|路|号|室|楼|栋|单元))/g,
        type: 'ADDRESS_CN',
        description: 'Chinese Address (地址)',
        piiGroup: 1
      },
      chinesePhone: {
        pattern: /(?:电话|手机|联系电话|联系方式|手机号码|电话号码)[\s:：]*(\d{3,4}[-\s]?\d{7,8}|\d{11})/g,
        type: 'PHONE_CN',
        description: 'Chinese Phone (电话)',
        piiGroup: 1
      },
      chineseIDCard: {
        pattern: /(?:身份证号码|身份证号|身份证|证件号码)[\s:：]*(\d{17}[\dXx])/g,
        type: 'NATIONAL_ID_CN',
        description: 'Chinese ID Card (身份证)',
        piiGroup: 1
      },
      chineseEmail: {
        pattern: /(?:电子邮件|邮箱|电邮|Email)[\s:：]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi,
        type: 'EMAIL_CN',
        description: 'Chinese Email label (邮箱)',
        piiGroup: 1
      },

      // === Chinese Company Names (with confidence scoring) ===

      // HIGH confidence - labeled company names
      chineseCompanyLabeled: {
        pattern: /(?:公司名称|单位名称|企业名称)[\s:：]*([\u4E00-\u9FFF]{2,}(?:有限公司|股份有限公司|集团|控股|企业|公司|银行|保险|证券|基金|投资))/g,
        type: 'ORGANIZATION_CN',
        description: 'Chinese company name (labeled field)',
        confidence: 0.95,
        piiGroup: 1
      },

      // MEDIUM-HIGH confidence - standalone with location prefix
      chineseCompanyWithLocation: {
        pattern: /(?:北京|上海|深圳|广州|杭州|成都|重庆|天津|南京|武汉|西安|苏州|[\u4E00-\u9FFF]{2,3}(?:省|市))[\u4E00-\u9FFF]{2,}(?:有限公司|股份有限公司|集团|控股|企业|公司)/g,
        type: 'ORGANIZATION_CN',
        description: 'Chinese company with location',
        confidence: 0.85
      },

      // MEDIUM confidence - standalone company with standard suffix
      chineseCompanyStandalone: {
        pattern: /[\u4E00-\u9FFF]{3,}(?:有限公司|股份有限公司)/g,
        type: 'ORGANIZATION_CN',
        description: 'Chinese company (standalone)',
        confidence: 0.7,
        validator: 'validateChineseCompany'
      },

      // === Romanized Chinese Names (with confidence scoring) ===

      // HIGH confidence - with English title
      chineseNameEnglishTitle: {
        pattern: /\b(?:Mr\.?|Ms\.?|Mrs\.?|Miss|Dr\.?|Prof\.?|Professor)\s+([A-Z]{2,}(?:\s+[A-Z][a-z]+){1,2}|[A-Z][a-z]+\s+[A-Z]{2,})\b/g,
        type: 'PERSON_CN',
        description: 'Romanized Chinese name with title',
        confidence: 0.9,
        piiGroup: 1,
        validator: 'validateRomanizedName',
        validatorGroup: 1
      },

      // MEDIUM confidence - bare title-case: "Chen Wei", "Li Qiang", "Zhang Weiguo"
      // Anchored to top-100 Chinese surnames to reduce false positives.
      // NER will override at higher confidence when context is available.
      chineseNameBare: {
        pattern: /\b((?:Zhang|Wang|Li|Zhao|Chen|Yang|Huang|Zhou|Wu|Xu|Sun|Ma|Zhu|Hu|Guo|He|Gao|Lin|Luo|Zheng|Liang|Xie|Song|Tang|Han|Cao|Deng|Feng|Xiao|Peng|Zeng|Yu|Dong|Pan|Yuan|Jiang|Cheng|Cai|Ding|Shen|Ye|Qian|Tan|Yan|Jin|Bai|Fu|Shao|Fang|Du|Hong|Gu|Xiong|Lei|Su|Qi|Tao|Wan|Qin|Hou|Ren|Liao|Ou|Mao|Ai|Ge|Yi|Qiu|Mo|Bi|Wei|Lv|Shi|Ji|Ni|Jia|Bao|Yin|Miao|Pei|Pang|Kong|Xia|Fan)\s+[A-Z][a-z]{1,7}(?:\s+[A-Z][a-z]{1,7})?)\b/g,
        type: 'PERSON_CN',
        description: 'Romanized Chinese name (surname list)',
        confidence: 0.65,
        validator: 'validateRomanizedName',
        validatorGroup: 1
      },

      // MEDIUM confidence - all-caps variant: "CHEN WEI", "LI QIANG"
      chineseNameAllCaps: {
        pattern: /\b((?:ZHANG|WANG|LI|ZHAO|CHEN|YANG|HUANG|ZHOU|WU|XU|SUN|MA|ZHU|HU|GUO|HE|GAO|LIN|LUO|ZHENG|LIANG|XIE|SONG|TANG|HAN|CAO|DENG|FENG|XIAO|PENG|ZENG|YU|DONG|PAN|YUAN|JIANG|CHENG|CAI|DING|SHEN|YE|QIAN|TAN|YAN|JIN|BAI|FU|SHAO|FANG|DU|HONG|GU|XIONG|LEI|SU|QI|TAO|WAN|QIN|HOU|REN|LIAO|OU|MAO|AI|GE|YI|QIU|MO|BI|WEI|LV|SHI|JI|NI|JIA|BAO|YIN|MIAO|PEI|PANG|KONG|XIA|FAN)\s+[A-Z]{2,8}(?:\s+[A-Z]{2,8})?)\b/g,
        type: 'PERSON_CN',
        description: 'Romanized Chinese name all-caps (surname list)',
        confidence: 0.7,
        validator: 'validateRomanizedName',
        validatorGroup: 1
      },

      // HIGH confidence - all-caps name in legal document context (e.g. "YITAO ZHU, an individual")
      nameAllCapsLegalContext: {
        pattern: /\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\b(?=,?\s+(?:an?\s+)?(?:individual|director|shareholder|person|officer|guarantor|trustee|executor|beneficiary|party))/g,
        type: 'PERSON',
        description: 'All-caps person name (legal document context)',
        confidence: 0.9
      },

      // Bank account number (context-anchored to avoid bare-number false positives)
      bankAccountLabeled: {
        pattern: /(?:account\s*(?:no\.?|number|#)|acc\.?\s*(?:no\.?|number|#)|a\/c\s*(?:no\.?|number|#)|bank\s+account)[\s:#-]*(\d[\d\s-]{6,20}\d)/gi,
        type: 'BANK_ACCOUNT',
        description: 'Bank account number (labeled)',
        confidence: 0.9,
        piiGroup: 1
      },

      // IBAN (labeled only)
      ibanLabeled: {
        pattern: /(?:IBAN|International\s+Bank\s+Account\s+Number)[\s:#-]*([A-Z]{2}\d{2}[A-Z0-9]{4,30})/gi,
        type: 'IBAN',
        description: 'IBAN (labeled)',
        confidence: 0.9,
        piiGroup: 1
      },

      // US Social Security Number
      usSSN: {
        pattern: /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
        type: 'SSN_US',
        description: 'US Social Security Number',
        confidence: 0.85
      },

      // IPv4 address (with octet-range validation)
      ipAddress: {
        pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
        type: 'IP_ADDRESS',
        description: 'IPv4 address',
        confidence: 0.8,
        validator: (m) => {
          const octets = m[0].split('.');
          return octets.every(o => parseInt(o) <= 255) &&
                 !['0.0.0.0', '127.0.0.1', '255.255.255.255'].includes(m[0]);
        }
      },

      // US ABA / Routing Transit Number (RTN): exactly 9 digits.
      // Weighted checksum [3,7,1,3,7,1,3,7,1] mod 10 == 0 validated by validateABARouting.
      // Labeled only — bare 9-digit numbers appear in many non-routing contexts.
      usABARouting: {
        pattern: /(?:ABA|routing\s+(?:no\.?|number|#)|routing[\s-]transit(?:\s+number)?)[\s:#-]*(\d{9})\b/gi,
        type: 'ABA_ROUTING_US',
        description: 'US ABA routing number (labeled)',
        confidence: 0.9,
        piiGroup: 1,
        validatorGroup: 1,
        validator: 'validateABARouting'
      },

      // UK National Insurance Number (NIN)
      // Format: two letters + 6 digits + suffix letter A-D.
      // Excluded first-letter chars: D F I Q U V → [ABCEGHJKLMNOPRSTWXYZ]
      // Excluded second-letter chars: D F I O Q U V → [ABCEGHJKLMNPRSTWXYZ]
      // Excluded prefixes: BG GB NK KN NT TN ZZ
      ukNINumber: {
        pattern: /\b(?!BG|GB|NK|KN|NT|TN|ZZ)[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ]\d{6}[A-D]\b/g,
        type: 'NIN_UK',
        description: 'UK National Insurance Number',
        confidence: 0.9
      },

      // Australian Tax File Number (TFN): 8 or 9 digits, typically formatted XXX XXX XXX.
      // Labeled only. 9-digit checksum [1,4,3,7,5,8,6,9,10] mod 11 == 0 via validateAustraliaTFN.
      australiaTFN: {
        pattern: /(?:TFN|Tax\s+File\s+Number)[\s:#-]*(\d{3}[\s]?\d{3}[\s]?\d{2,3})\b/gi,
        type: 'TFN_AU',
        description: 'Australian Tax File Number (labeled)',
        confidence: 0.9,
        piiGroup: 1,
        validatorGroup: 1,
        validator: 'validateAustraliaTFN'
      },

    }
  },
  masking: {
    strategies: {
      REDACTION: {
        name: 'Redaction',
        format: (type) => `[REDACTED_${type}]`
      },
      TOKENIZATION: {
        name: 'Tokenization',
        format: (type, index) => `[${type}_${index}]`
      },
      PARTIAL: {
        name: 'Partial Masking',
        format: (value, type) => {
          if (type === 'EMAIL') {
            const parts = value.split('@');
            return `${parts[0][0]}***@***${parts[1].slice(-5)}`;
          }
          if (/^PHONE_/.test(type)) {
            return `****${value.slice(-4)}`;
          }
          return `${value[0]}${'*'.repeat(Math.max(0, value.length - 2))}${value.slice(-1)}`;
        }
      },
      SYNTHETIC: {
        name: 'Synthetic Replacement',
        format: (value, type) => getSyntheticReplacement(value, type)
      }
    }
  }
};

// ============================================================================
// STATE
// ============================================================================

let currentDetections = [];
let currentMaskedText = '';
let currentOriginalText = '';
let currentFormattedHtml = null;  // HTML from mammoth.convertToHtml() for DOCX files
let editorViewMode = 'plain';     // 'plain' | 'formatted'
let editorMaskedView = false;     // true = show replacement text in editor; false = original detected view
let pdfCanvasCache = null;        // cached rendered page canvases for PDF editor view
let currentFilename = '';
let detectionStartTime = null;
let detectionEndTime = null;
let nerModelStartTime = null; // reset per-model so elapsed time shows per-model duration
let currentHistoryItem = null; // Track current processing session for history
let selectedTypes = new Set();      // PII types included in next download
let excludedDetections = new Set(); // indices of individually-excluded detections
let activeCategory = 'All';         // active category tab filter
let typeGroups = {};                 // { EMAIL: { count: 3, previews: ['j***@...'] }, ... }
let loadedCorrections = [];          // in-memory cache of pii_corrections from storage

const CATEGORY_MAP = {
  NRIC_SG: 'Singapore', PASSPORT_SG: 'Singapore', PHONE_SG: 'Singapore',
  POSTAL_CODE_SG: 'Singapore', ADDRESS_SG: 'Singapore', UEN_SG: 'Singapore',
  ENTITY_NAME_SG: 'Singapore', VEHICLE_PLATE_SG: 'Singapore',
  NATIONAL_ID_MY: 'Malaysia', PHONE_MY: 'Malaysia',
  HKID: 'Hong Kong', PASSPORT_HK: 'Hong Kong', PHONE_HK: 'Hong Kong',
  ADDRESS_HK: 'Hong Kong', ENTITY_NAME_HK: 'Hong Kong', BR_HK: 'Hong Kong',
  NATIONAL_ID_CN: 'China', PASSPORT_CN: 'China', ADDRESS_CN: 'China',
  USCC_CN: 'China', PHONE_CN: 'China', ENTITY_NAME_CN: 'China',
  NAME_CN: 'China', DATE_OF_BIRTH_CN: 'China', EMAIL_CN: 'China',
  ORGANIZATION_CN: 'China', GENDER_CN: 'China',
  EMAIL: 'Universal', CREDIT_CARD: 'Universal', DATE_OF_BIRTH: 'Universal',
  PASSPORT: 'Universal', GENDER: 'Universal',
  BANK_ACCOUNT: 'Universal', IBAN: 'Universal', SSN_US: 'Universal',
  IP_ADDRESS: 'Universal', ID_NUMBER: 'Universal',
  ABA_ROUTING_US: 'Universal', NIN_UK: 'Universal', TFN_AU: 'Universal',
  NATIONAL_ID_TW: 'Taiwan',
  RRN_KR: 'South Korea', PHONE_KR: 'South Korea',
  MY_NUMBER_JP: 'Japan', PHONE_JP: 'Japan',
  NATIONAL_ID_TH: 'Thailand',
  KTP_ID: 'Indonesia',
  AADHAAR_IN: 'India', PAN_IN: 'India', PHONE_IN: 'India',
  SSS_PH: 'Philippines',
  NATIONAL_ID_VN: 'Vietnam',
  PERSON: 'Named Entities', PERSON_CN: 'Named Entities',
  LOCATION: 'Named Entities', LOCATION_CN: 'Named Entities',
  ORGANIZATION: 'Named Entities',
  PHONE: 'Named Entities', ADDRESS: 'Named Entities',
};
const CATEGORIES = [
  'Singapore', 'Malaysia', 'Hong Kong', 'China',
  'Taiwan', 'South Korea', 'Japan', 'Thailand', 'Indonesia',
  'India', 'Philippines', 'Vietnam',
  'Universal', 'Named Entities',
];

// ============================================================================
// UTILITY FUNCTIONS

/**
 * Merge and deduplicate detections by position, keeping higher confidence on overlap.
 */
function mergeDetections(detections) {
  detections.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const out = [];
  for (const d of detections) {
    const overlapping = out.filter(e => d.start < e.end && d.end > e.start);
    if (overlapping.length === 0) {
      out.push(d);
    } else if (overlapping.every(e => d.confidence > e.confidence)) {
      // d beats every overlapping entry — remove them all and add d
      for (const e of overlapping) out.splice(out.indexOf(e), 1);
      out.push(d);
    }
    // else d is dominated by at least one existing entry — discard d
  }
  return out;
}

/**
 * Apply learned boundary corrections to a set of detections.
 * For each detection whose (type, value) matches a saved correction, the span
 * is adjusted so the extracted text equals correctedValue. Adjustments are only
 * applied when the surrounding text actually contains the corrected string at
 * the adjusted position, so false matches are never introduced.
 */
function applyLearnedCorrections(detections, text) {
  if (!loadedCorrections.length || !text) return detections;

  // ── Step 1: suppress detections the user explicitly dismissed as not-PII ──
  const suppressions = loadedCorrections.filter(c => c.action === 'suppress');
  let result = suppressions.length
    ? detections.filter(det => !suppressions.some(
        s => s.type === det.type && s.originalValue.toLowerCase() === det.value.toLowerCase()
      ))
    : detections;

  // ── Step 2: apply boundary corrections (expand / contract) ────────────────
  //
  // Matching strategy — based on what the user wants the result to look like,
  // not the exact string that was originally detected (which varies between docs):
  //
  //   CONTRACT: fire when det.value *contains* correctedValue as a substring.
  //             The detector captured too much; trim to the desired inner form.
  //
  //   EXPAND:   fire when correctedValue *contains* det.value as a substring.
  //             The detector captured too little; grow to the desired outer form.
  //
  // This tolerates NER boundary variation across documents far better than
  // the old exact `originalValue === det.value` comparison.

  result = result.map(det => {
    const correction = loadedCorrections.find(c => {
      if (c.action === 'suppress' || c.type !== det.type || !c.correctedValue) return false;
      if (c.action === 'contract') return det.value.includes(c.correctedValue);
      if (c.action === 'expand')   return c.correctedValue.includes(det.value);
      return false;
    });
    if (!correction) return det;

    const { correctedValue, action } = correction;

    if (action === 'contract') {
      // correctedValue is guaranteed to be a substring of det.value (matched above).
      const spanText = text.slice(det.start, det.end);
      const innerIdx = spanText.indexOf(correctedValue);
      if (innerIdx === -1) return det;
      const newStart = det.start + innerIdx;
      const newEnd   = newStart + correctedValue.length;
      return { ...det, start: newStart, end: newEnd, value: correctedValue, method: det.method + '+learned' };
    }

    if (action === 'expand') {
      // Search for correctedValue in a window around the current detection.
      // correctedValue contains det.value, so the found span will enclose it.
      const searchWindow = correctedValue.length * 2;
      const searchStart  = Math.max(0, det.start - searchWindow);
      const searchEnd    = Math.min(text.length, det.end + searchWindow);
      const region       = text.slice(searchStart, searchEnd);
      const idx          = region.indexOf(correctedValue);
      if (idx === -1) return det;
      const newStart = searchStart + idx;
      const newEnd   = newStart + correctedValue.length;
      // Sanity: the expanded span must enclose the original detection.
      if (newStart > det.start || newEnd < det.end) return det;
      return { ...det, start: newStart, end: newEnd, value: correctedValue, method: det.method + '+learned' };
    }

    return det;
  });

  // ── Step 4: inject custom-trained detections ──────────────────────────────
  // For every value the user manually flagged as a PII type, search the full
  // text (case-insensitive) for all occurrences and add detections where they
  // are not already covered by an existing detection.
  const customs = loadedCorrections.filter(c => c.action === 'custom');
  if (customs.length) {
    // Build a suppressed-value set so custom detections don't override suppressions.
    const suppressedKeys = new Set(
      suppressions.map(s => s.type + '\x00' + s.originalValue.toLowerCase())
    );

    for (const c of customs) {
      const needle    = c.originalValue;
      const needleLow = needle.toLowerCase();
      const needleLen = needle.length;
      if (!needleLow.trim()) continue;
      if (suppressedKeys.has(c.type + '\x00' + needleLow)) continue;

      const textLow = text.toLowerCase();
      let   searchFrom = 0;

      while (searchFrom < text.length) {
        const idx = textLow.indexOf(needleLow, searchFrom);
        if (idx === -1) break;

        const idxEnd = idx + needleLen;

        // Enforce word boundaries so "Smith" doesn't match inside "Smithson".
        const before = idx > 0               ? text[idx - 1]   : ' ';
        const after  = idxEnd < text.length  ? text[idxEnd]     : ' ';
        const isWordBoundaryBefore = !/[\w\u00C0-\u024F]/.test(before);
        const isWordBoundaryAfter  = !/[\w\u00C0-\u024F]/.test(after);

        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          // Skip if this span is already covered by an existing detection.
          const alreadyCovered = result.some(d => d.start <= idx && d.end >= idxEnd);
          if (!alreadyCovered) {
            result.push({
              type:       c.type,
              value:      text.slice(idx, idxEnd),
              start:      idx,
              end:        idxEnd,
              confidence: 0.95,
              method:     'custom-trained',
            });
          }
        }

        searchFrom = idx + 1;
      }
    }
  }

  // ── Step 3: re-merge to eliminate overlaps created by expand corrections ──
  // Expand can grow a span to overlap an adjacent detection. Without re-merging,
  // the renderer's `if (det.start < pos) continue` would silently drop the
  // overlapping detection — the "omission" bug. Detections marked '+learned'
  // are preferred (treated as maximum confidence) so they win any overlap.
  result = result.map(d =>
    d.method?.includes('+learned') ? { ...d, confidence: 1.1 } : d
  );
  result = mergeDetections(result);
  // Restore confidence to original value (1.1 was only used to win the merge).
  result = result.map(d =>
    d.confidence === 1.1 ? { ...d, confidence: 1.0 } : d
  );

  return result;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format elapsed time for display
 */
function formatElapsedTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  const seconds = (milliseconds / 1000).toFixed(2);
  return `${seconds}s`;
}

/**
 * Get elapsed time since detection started
 */
function getElapsedTime() {
  if (!detectionStartTime) return null;
  // During NER, use the per-model start time so each model phase shows its own elapsed time
  return Date.now() - (nerModelStartTime || detectionStartTime);
}
// ============================================================================

/**
 * SHA-256 hash
 */
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Luhn algorithm for credit card validation
 */
function validateLuhn(cardNumber) {
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
 * Validate NRIC checksum
 */
function validateNRIC(nric) {
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

// ============================================================================
// REDACTED FILE CACHE (IndexedDB)
// ============================================================================

/**
 * Initialize IndexedDB for caching redacted files
 */
function initFileCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PIIMaskingCache', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store for cached files
      if (!db.objectStoreNames.contains('redactedFiles')) {
        const store = db.createObjectStore('redactedFiles', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Save redacted file blob to cache
 * @param {string} historyId - History item ID
 * @param {Blob} blob - Redacted file blob
 * @param {string} filename - Downloaded filename
 */
async function cacheRedactedFile(historyId, blob, filename) {
  try {
    const db = await initFileCache();

    // Check file size (limit to 10MB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (blob.size > MAX_FILE_SIZE) {
      console.log('[Cache] File too large to cache:', filename, `(${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
      return false;
    }

    // Convert blob to array buffer for storage
    const arrayBuffer = await blob.arrayBuffer();

    const transaction = db.transaction(['redactedFiles'], 'readwrite');
    const store = transaction.objectStore('redactedFiles');

    const cacheItem = {
      id: historyId,
      filename: filename,
      blob: arrayBuffer,
      mimeType: blob.type,
      size: blob.size,
      timestamp: Date.now()
    };

    await new Promise((resolve, reject) => {
      const request = store.put(cacheItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[Cache] Saved redacted file:', filename, `(${(blob.size / 1024).toFixed(1)} KB)`);

    // Cleanup old cache entries if needed
    await cleanupFileCache();

    return true;
  } catch (error) {
    console.error('[Cache] Error saving file:', error);
    return false;
  }
}

/**
 * Retrieve cached redacted file
 * @param {string} historyId - History item ID
 * @returns {Promise<{blob: Blob, filename: string}|null>}
 */
async function getCachedFile(historyId) {
  try {
    const db = await initFileCache();
    const transaction = db.transaction(['redactedFiles'], 'readonly');
    const store = transaction.objectStore('redactedFiles');

    return new Promise((resolve, reject) => {
      const request = store.get(historyId);

      request.onsuccess = () => {
        if (request.result) {
          const blob = new Blob([request.result.blob], { type: request.result.mimeType });
          resolve({
            blob: blob,
            filename: request.result.filename
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Cache] Error retrieving file:', error);
    return null;
  }
}

/**
 * Check if a file is cached
 * @param {string} historyId - History item ID
 * @returns {Promise<boolean>}
 */
async function isFileCached(historyId) {
  try {
    const db = await initFileCache();
    const transaction = db.transaction(['redactedFiles'], 'readonly');
    const store = transaction.objectStore('redactedFiles');

    return new Promise((resolve) => {
      const request = store.get(historyId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    return false;
  }
}

/**
 * Cleanup old cache entries
 * Keeps only the most recent 10 files, max 100MB total
 */
async function cleanupFileCache() {
  try {
    const db = await initFileCache();
    const transaction = db.transaction(['redactedFiles'], 'readwrite');
    const store = transaction.objectStore('redactedFiles');
    const index = store.index('timestamp');

    // Get all entries sorted by timestamp (oldest first)
    const entries = await new Promise((resolve, reject) => {
      const request = index.openCursor();
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push({
            id: cursor.value.id,
            size: cursor.value.size,
            timestamp: cursor.value.timestamp
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });

    // Calculate total size
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_FILES = 10;

    // Delete oldest entries if limits exceeded
    if (entries.length > MAX_FILES || totalSize > MAX_TOTAL_SIZE) {
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      let currentSize = totalSize;
      let currentCount = entries.length;

      for (const entry of entries) {
        if (currentCount <= MAX_FILES && currentSize <= MAX_TOTAL_SIZE) {
          break;
        }

        await new Promise((resolve, reject) => {
          const deleteRequest = store.delete(entry.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });

        currentSize -= entry.size;
        currentCount--;
        console.log('[Cache] Deleted old cache entry:', entry.id);
      }
    }
  } catch (error) {
    console.error('[Cache] Error during cleanup:', error);
  }
}

/**
 * Clear all cached files
 */
async function clearFileCache() {
  try {
    const db = await initFileCache();
    const transaction = db.transaction(['redactedFiles'], 'readwrite');
    const store = transaction.objectStore('redactedFiles');

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[Cache] Cleared all cached files');
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}

// ============================================================================
// ML MODEL STORAGE (IndexedDB — PIIMaskingModels)
// ============================================================================

const MODEL_DB_NAME = 'PIIMaskingModels';
const MODEL_DB_VERSION = 1;
const MODEL_STORE = 'files'; // keyPath: 'id' (e.g. 'bert-base-NER/config.json')

function openModelDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MODEL_DB_NAME, MODEL_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MODEL_STORE)) {
        db.createObjectStore(MODEL_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function storeModelFileInDB(modelName, filePath, buffer) {
  const db = await openModelDB();
  const transaction = db.transaction([MODEL_STORE], 'readwrite');
  const store = transaction.objectStore(MODEL_STORE);
  await new Promise((resolve, reject) => {
    const request = store.put({ id: `${modelName}/${filePath}`, data: buffer, storedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getModelFileFromDB(modelName, filePath) {
  try {
    const db = await openModelDB();
    const transaction = db.transaction([MODEL_STORE], 'readonly');
    const store = transaction.objectStore(MODEL_STORE);
    return new Promise((resolve) => {
      const request = store.get(`${modelName}/${filePath}`);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Check if a model is fully stored in IndexedDB.
 * Uses the ONNX file (stored last, largest) as a proxy for completeness.
 */
async function isModelInDB(modelName) {
  // Use the last entry in the registry's file list (always the ONNX model) as the presence probe
  const reg = MODEL_REGISTRY[modelName];
  const onnxFile = reg ? reg.files[reg.files.length - 1] : 'onnx/model_quantized.onnx';
  return (await getModelFileFromDB(modelName, onnxFile)) !== null;
}

// ============================================================================
// ML MODEL DOWNLOAD HELPERS
// ============================================================================

const MODEL_REGISTRY = {
  'Qwen2.5-1.5B-Instruct': {
    label: 'Qwen Classifier',
    baseUrl: 'https://huggingface.co/onnx-community/Qwen2.5-1.5B-Instruct/resolve/main',
    totalMB: 900,
    files: ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'generation_config.json', 'onnx/model_q4f16.onnx']
  },
  'piiranha-v1': {
    label: 'Piiranha (Multilingual PII)',
    baseUrl: 'https://huggingface.co/onnx-community/piiranha-v1-detect-personal-information-ONNX/resolve/main',
    totalMB: 317,
    files: ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx']
  },
  'bert-base-chinese-ner': {
    label: 'Chinese NER',
    baseUrl: 'https://huggingface.co/Xenova/bert-base-chinese-ner/resolve/main',
    totalMB: 98,
    files: ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx']
  }
};

/**
 * Stream-download a single URL with byte-level progress reporting.
 * @param {string} url
 * @param {function(received: number, total: number): void} onProgress
 * @returns {Promise<ArrayBuffer>}
 */
async function downloadWithProgress(url, onProgress) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const total = parseInt(response.headers.get('Content-Length') || '0');
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received, total || received);
  }
  const result = new Uint8Array(received);
  let pos = 0;
  for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; }
  return result.buffer;
}

/**
 * Read the custom mirror URL from the network settings input and derive
 * the per-model base URL.  Returns null when the field is empty / unchanged.
 * @param {string} modelName  Key in MODEL_REGISTRY
 * @returns {string|null}
 */
function getCustomBaseUrl(modelName) {
  const input = document.getElementById('proxyBaseUrl');
  const raw = (input ? input.value.trim() : '').replace(/\/$/, '');
  if (!raw || raw === 'https://huggingface.co') return null;

  try {
    // Substitute only the origin — keep the HuggingFace path structure intact.
    // e.g. https://hf-mirror.corp.com + /Xenova/bert-base-NER/resolve/main
    const customOrigin = new URL(raw).origin;
    const defaultBaseUrl = MODEL_REGISTRY[modelName].baseUrl;
    return defaultBaseUrl.replace('https://huggingface.co', customOrigin);
  } catch {
    return null;
  }
}

/**
 * Download all files for one model and store them in IndexedDB.
 * @param {string} modelName  Key in MODEL_REGISTRY
 * @param {function(filePath: string, received: number, total: number): void} onFileProgress
 * @param {string|null} [baseUrl]  Override base URL (from getCustomBaseUrl)
 */
async function downloadModel(modelName, onFileProgress, baseUrl = null) {
  const reg = MODEL_REGISTRY[modelName];
  const resolvedBase = baseUrl || reg.baseUrl;
  for (const filePath of reg.files) {
    const url = `${resolvedBase}/${filePath}`;
    const buffer = await downloadWithProgress(url, (received, total) => {
      onFileProgress(filePath, received, total);
    });
    await storeModelFileInDB(modelName, filePath, buffer);
  }
}

/**
 * Read all necessary model files from IndexedDB and return them as parsed objects.
 * @param {string} modelName
 * @returns {Promise<{ config: object, tokenizerData: object, tokenizerConfig: object, modelBuffer: ArrayBuffer }>}
 */
async function loadModelFromDB(modelName) {
  const [configBuf, tokenizerBuf, tokenizerConfigBuf, modelBuffer] = await Promise.all([
    getModelFileFromDB(modelName, 'config.json'),
    getModelFileFromDB(modelName, 'tokenizer.json'),
    getModelFileFromDB(modelName, 'tokenizer_config.json'),
    getModelFileFromDB(modelName, 'onnx/model_quantized.onnx'),
  ]);
  const decode = buf => JSON.parse(new TextDecoder().decode(buf));
  return {
    config: decode(configBuf),
    tokenizerData: decode(tokenizerBuf),
    tokenizerConfig: decode(tokenizerConfigBuf),
    modelBuffer,
  };
}

/**
 * Read Qwen model files from IndexedDB.
 * Only tokenizer.json and the ONNX model are needed at runtime.
 * @returns {Promise<{ tokenizerData: object, modelBuffer: ArrayBuffer }>}
 */
async function loadQwenFromDB() {
  const [configBuf, tokenizerBuf, modelBuffer] = await Promise.all([
    getModelFileFromDB('Qwen2.5-1.5B-Instruct', 'config.json'),
    getModelFileFromDB('Qwen2.5-1.5B-Instruct', 'tokenizer.json'),
    getModelFileFromDB('Qwen2.5-1.5B-Instruct', 'onnx/model_q4f16.onnx'),
  ]);
  const decode = buf => JSON.parse(new TextDecoder().decode(buf));
  return {
    modelConfig:   decode(configBuf),
    tokenizerData: decode(tokenizerBuf),
    modelBuffer,
  };
}

/**
 * Instantiate and load window.qwenClassifier from IndexedDB data.
 * Safe to call even if the class hasn't been defined (logs a warning).
 * @param {HTMLElement|null} statusEl  Optional span to update with load state
 */
async function loadQwenClassifier(statusEl) {
  if (!window.QwenClassifier) {
    console.warn('[Qwen] QwenClassifier class not found — is qwen-classifier.js loaded?');
    return;
  }
  if (statusEl) statusEl.textContent = 'Loading…';
  const data = await loadQwenFromDB();
  window.qwenClassifier = new window.QwenClassifier();
  try {
    await window.qwenClassifier.loadFromData(data);
  } catch (err) {
    // WebGPU unavailable — degrade gracefully, do NOT set qwen method active
    const isGpuError = err.message && err.message.includes('WebGPU');
    const label = isGpuError ? '⚠️ GPU required' : '⚠️ Load failed';
    if (statusEl) statusEl.textContent = label;
    console.warn('[Qwen] Classifier not active:', err.message);
    throw err; // re-throw so callers can update status / skip Qwen
  }
  CONFIG.detection.methods.qwen = true;
  if (statusEl) statusEl.textContent = '✅ Qwen2.5-1.5B · validates PII context (WebGPU)';
  console.log('[Qwen] ✅ Classifier active, EP: WebGPU');
}

// ============================================================================
// HISTORY TRACKING
// ============================================================================

/**
 * Generate unique ID for history items
 */
function generateHistoryId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new history item when file is uploaded
 */
function createHistoryItem(filename, fileSize, fileType) {
  const historyItem = {
    id: generateHistoryId(),
    originalFilename: filename,
    fileSize: fileSize,
    fileType: fileType,
    uploadedAt: new Date().toISOString(),
    detectionCount: 0,
    detections: [], // Summary of detections (types and counts, no actual PII)
    maskingStrategy: null,
    downloadedFilename: null,
    downloadedAt: null,
    processingTime: null,
    modelsUsed: [],
    modelsSkipped: []
  };

  currentHistoryItem = historyItem;
  return historyItem;
}

/**
 * Update history item with detection results
 */
function updateHistoryWithDetections(detections, processingTime, modelsInfo) {
  if (!currentHistoryItem) return;

  currentHistoryItem.detectionCount = detections.length;
  currentHistoryItem.processingTime = processingTime;

  // Create detection summary (count by type, no actual PII values)
  const detectionSummary = {};
  detections.forEach(d => {
    if (!detectionSummary[d.type]) {
      detectionSummary[d.type] = {
        count: 0,
        avgConfidence: 0,
        methods: new Set()
      };
    }
    detectionSummary[d.type].count++;
    detectionSummary[d.type].avgConfidence += d.confidence || 1.0;
    detectionSummary[d.type].methods.add(d.method || 'regex');
  });

  // Calculate average confidence for each type
  Object.keys(detectionSummary).forEach(type => {
    const summary = detectionSummary[type];
    summary.avgConfidence = summary.avgConfidence / summary.count;
    summary.methods = Array.from(summary.methods);
  });

  currentHistoryItem.detections = detectionSummary;

  if (modelsInfo) {
    currentHistoryItem.modelsUsed = modelsInfo.used || [];
    currentHistoryItem.modelsSkipped = modelsInfo.skipped || [];
  }
}

/**
 * Update history item when file is downloaded
 */
function updateHistoryWithDownload(downloadedFilename, maskingStrategy) {
  if (!currentHistoryItem) return;

  currentHistoryItem.downloadedFilename = downloadedFilename;
  currentHistoryItem.downloadedAt = new Date().toISOString();
  currentHistoryItem.maskingStrategy = maskingStrategy;

  // Save to storage
  saveHistoryItem(currentHistoryItem);
}

/**
 * Save history item to chrome.storage.local
 */
async function saveHistoryItem(historyItem) {
  try {
    // Get existing history
    const result = await chrome.storage.local.get(['processingHistory']);
    const history = result.processingHistory || [];

    // Add new item to beginning of array (most recent first)
    history.unshift(historyItem);

    // Keep only last 100 items to avoid storage bloat
    const trimmedHistory = history.slice(0, 100);

    // Save back to storage
    await chrome.storage.local.set({ processingHistory: trimmedHistory });

    console.log('[History] Saved history item:', historyItem.id);

    // Update history UI if it's visible
    displayHistory();
  } catch (error) {
    console.error('[History] Error saving history:', error);
  }
}

/**
 * Load processing history from storage
 */
async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(['processingHistory']);
    return result.processingHistory || [];
  } catch (error) {
    console.error('[History] Error loading history:', error);
    return [];
  }
}

/**
 * Clear all processing history
 */
async function clearHistory() {
  try {
    // Clear both history metadata and cached files
    await chrome.storage.local.set({ processingHistory: [] });
    await clearFileCache();

    console.log('[History] History and cached files cleared');
    displayHistory(); // Refresh UI
    showStatus('✅ History and cached files cleared', 'success');
  } catch (error) {
    console.error('[History] Error clearing history:', error);
    showStatus('❌ Failed to clear history', 'error');
  }
}

/**
 * Export history as JSON
 */
async function exportHistory() {
  try {
    const history = await loadHistory();

    if (history.length === 0) {
      showStatus('No history to export', 'info');
      return;
    }

    const jsonStr = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pii_masking_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);

    showStatus(`✅ Exported ${history.length} history items`, 'success');
  } catch (error) {
    console.error('[History] Error exporting history:', error);
    showStatus('❌ Failed to export history', 'error');
  }
}

/**
 * Display history in UI
 */
async function displayHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return; // History UI not loaded yet

  try {
    const history = await loadHistory();

    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No processing history yet. Upload and process a file to see it here.</div>';
      return;
    }

    // Check cache status for all items
    const cacheStatus = await Promise.all(
      history.map(item => isFileCached(item.id))
    );

    let html = '';
    history.forEach((item, index) => {
      const uploadDate = new Date(item.uploadedAt);
      const downloadDate = item.downloadedAt ? new Date(item.downloadedAt) : null;
      const isCached = cacheStatus[index];

      html += `
        <div class="history-item" data-index="${index}" data-id="${item.id}">
          <div class="history-header" data-toggle-index="${index}">
            <div class="history-main">
              <strong>${escapeHtml(item.originalFilename)}</strong>
              <span class="history-meta">${formatFileSize(item.fileSize)} • ${item.detectionCount} detections</span>
            </div>
            <div class="history-date">${formatDate(uploadDate)}</div>
          </div>
          <div class="history-details" id="history-details-${index}" style="display: none;">
            <div class="history-detail-row">
              <span class="label">Uploaded:</span>
              <span>${uploadDate.toLocaleString()}</span>
            </div>
            ${downloadDate ? `
            <div class="history-detail-row">
              <span class="label">Downloaded:</span>
              <span>${downloadDate.toLocaleString()}</span>
            </div>
            <div class="history-detail-row">
              <span class="label">Downloaded as:</span>
              <span>${escapeHtml(item.downloadedFilename)}</span>
            </div>
            <div class="history-detail-row">
              <span class="label">Masking:</span>
              <span>${item.maskingStrategy || 'N/A'}</span>
            </div>
            ${isCached ? `
            <div class="history-detail-row">
              <span class="label">Cached file:</span>
              <span>
                <button class="btn btn-success btn-sm download-cached-btn" data-history-id="${item.id}">
                  📥 Download Again
                </button>
              </span>
            </div>
            ` : `
            <div class="history-detail-row">
              <span class="label">Cached file:</span>
              <span style="color: #64748b; font-size: 0.8rem;">Not cached (file too large or cleared)</span>
            </div>
            `}
            ` : '<div class="history-detail-row"><span class="label">Status:</span><span>Detected only (not downloaded)</span></div>'}
            ${item.processingTime ? `
            <div class="history-detail-row">
              <span class="label">Processing time:</span>
              <span>${item.processingTime.toFixed(2)}s</span>
            </div>
            ` : ''}
            ${item.modelsUsed && item.modelsUsed.length > 0 ? `
            <div class="history-detail-row">
              <span class="label">Models used:</span>
              <span>${item.modelsUsed.join(', ')}</span>
            </div>
            ` : ''}
            ${item.modelsSkipped && item.modelsSkipped.length > 0 ? `
            <div class="history-detail-row">
              <span class="label">Models skipped:</span>
              <span>${item.modelsSkipped.join(', ')}</span>
            </div>
            ` : ''}
            <div class="history-detections">
              <strong>Detections by type:</strong>
              ${formatDetectionSummary(item.detections)}
            </div>
          </div>
        </div>
      `;
    });

    historyList.innerHTML = html;

    // Add event listeners using event delegation
    // Remove old listeners to prevent duplicates
    const oldListener = historyList._clickListener;
    if (oldListener) {
      historyList.removeEventListener('click', oldListener);
    }

    // Create new listener
    const clickListener = (event) => {
      // Handle toggle history item
      const toggleHeader = event.target.closest('.history-header');
      if (toggleHeader) {
        const index = toggleHeader.getAttribute('data-toggle-index');
        if (index !== null) {
          toggleHistoryItem(parseInt(index));
        }
      }

      // Handle download cached file button
      const downloadBtn = event.target.closest('.download-cached-btn');
      if (downloadBtn) {
        const historyId = downloadBtn.getAttribute('data-history-id');
        if (historyId) {
          downloadCachedFile(historyId);
        }
      }
    };

    // Store listener reference for cleanup
    historyList._clickListener = clickListener;
    historyList.addEventListener('click', clickListener);

  } catch (error) {
    console.error('[History] Error displaying history:', error);
    historyList.innerHTML = '<div class="history-error">Error loading history</div>';
  }
}

/**
 * Toggle history item details
 */
function toggleHistoryItem(index) {
  const details = document.getElementById(`history-details-${index}`);
  if (details) {
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Download a cached redacted file from history
 * @param {string} historyId - History item ID
 */
async function downloadCachedFile(historyId) {
  try {
    const cachedFile = await getCachedFile(historyId);

    if (!cachedFile) {
      showStatus('❌ File not found in cache. It may have been cleared or was too large to cache.', 'error');
      return;
    }

    // Trigger download
    const url = URL.createObjectURL(cachedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cachedFile.filename;
    a.click();
    URL.revokeObjectURL(url);

    showStatus(`✅ Downloaded ${cachedFile.filename} from cache`, 'success');
    console.log('[Cache] Re-downloaded file from cache:', cachedFile.filename);
  } catch (error) {
    console.error('[Cache] Error downloading cached file:', error);
    showStatus('❌ Error downloading file from cache', 'error');
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format date for display
 */
function formatDate(date) {
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';

  return date.toLocaleDateString();
}

/**
 * Format detection summary for display
 */
function formatDetectionSummary(detections) {
  if (!detections || Object.keys(detections).length === 0) {
    return '<div class="detection-summary-empty">No detections</div>';
  }

  let html = '<div class="detection-summary-list">';
  Object.entries(detections).forEach(([type, summary]) => {
    const avgConf = (summary.avgConfidence * 100).toFixed(0);
    html += `
      <div class="detection-summary-item">
        <span class="detection-type">${type}</span>
        <span class="detection-count">${summary.count}×</span>
        <span class="detection-confidence">${avgConf}% avg</span>
      </div>
    `;
  });
  html += '</div>';

  return html;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// DETECTION ENGINE
// ============================================================================

/**
 * Detect PII using regex patterns
 */
async function detectPII(text) {
  const detections = [];
  const allPatterns = {
    ...CONFIG.detection.asianIDPatterns,
    ...CONFIG.detection.universalPatterns
  };

  for (const [id, pattern] of Object.entries(allPatterns)) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Validate specific patterns
      let isValid = true;

      // Use pattern-specific validator if available
      if (pattern.validator && window.AsianIDValidators) {
        const validatorFunc = window.AsianIDValidators[pattern.validator];
        if (validatorFunc) {
          const valueToValidate = pattern.validatorGroup != null ? match[pattern.validatorGroup] : match[0];
          isValid = validatorFunc(valueToValidate);
        }
      }
      // Legacy validators (keep for backward compatibility)
      else if (pattern.type === 'NRIC_SG') {
        isValid = validateNRIC(match[0]);
      } else if (pattern.type === 'CREDIT_CARD') {
        isValid = validateLuhn(match[0]);
      } else if (pattern.type === 'EMAIL') {
        isValid = match[0].includes('@') && match[0].includes('.');
      } else if (pattern.type === 'PHONE_SG') {
        const digits = match[0].replace(/\D/g, '');
        isValid = digits.length === 8 && /^[689]/.test(digits);
      }
      // For patterns without validators, apply basic validation
      else {
        // Accept all matches for patterns without specific validation
        // Err on the side of caution (as requested)
        isValid = true;
      }

      if (isValid) {
        let piiValue, piiStart, piiEnd;
        if (pattern.piiGroup === 'alt') {
          // Alternation pattern: one of match[1] or match[2] is the PII value
          const grp = match[1] != null ? 1 : 2;
          piiValue = match[grp];
          piiEnd = match.index + match[0].length;
          piiStart = piiEnd - piiValue.length;
        } else if (pattern.piiGroup != null) {
          // Labeled prefix pattern: group N is the PII, prefix is non-PII context
          piiValue = match[pattern.piiGroup];
          if (!piiValue) {
            if (match.index === regex.lastIndex) regex.lastIndex++;
            continue;
          }
          piiEnd = match.index + match[0].length;
          piiStart = piiEnd - piiValue.length;
        } else {
          // Full match is the PII value
          piiValue = match[0];
          piiStart = match.index;
          piiEnd = match.index + match[0].length;
        }
        detections.push({
          type: pattern.type,
          value: piiValue,
          start: piiStart,
          end: piiEnd,
          confidence: pattern.confidence || CONFIG.detection.thresholds.regex,
          method: 'regex',
          description: pattern.description,
          hash: await hashContent(piiValue)
        });
      }

      // Prevent infinite loop
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  return detections.sort((a, b) => a.start - b.start);
}

/**
 * Structural field extractor — parses "Label: Value" lines produced by
 * formatDOCXForNER() and emits high-confidence detections based on the label.
 *
 * This is the third detection pass (alongside regex and NER).  It activates
 * the context that formatDOCXForNER() already encodes in the text:
 *   "NRIC: S1234567D"  →  NRIC_SG  confidence 0.97  (validated)
 *   "Name: Ahmad bin Abdullah"  →  PERSON  confidence 0.90
 *   "Email: john@example.com"   →  EMAIL   confidence 0.97
 *
 * Detections produced here carry method:'structural' and merge via the same
 * mergeDetections() deduplication path as regex/NER results.
 *
 * @param {string} text  The formatted text returned by parseDOCX / parseTXT
 * @returns {Promise<Array>}
 */
async function detectStructuredFields(text) {
  const detections = [];

  // Each entry: regex that matches the label text, target PII type, base confidence,
  // optional validator name (must exist in window.AsianIDValidators or local fns).
  const LABEL_MAP = [
    // ── Identity docs ────────────────────────────────────────────────────────
    {
      labels: /^(?:NRIC|NRIC\s*No\.?|IC\s*No\.?|FIN|Identity\s*No\.?|Identity\s*Card\s*(?:No\.?)?|ID\s*No\.?)$/i,
      type: 'NRIC_SG', confidence: 0.97,
      validate: v => { try { return validateNRIC(v); } catch { return false; } }
    },
    {
      labels: /^(?:Passport\s*No\.?|Passport\s*Number|Travel\s*Doc(?:ument)?\s*No\.?)$/i,
      type: 'PASSPORT_SG', confidence: 0.95
    },
    {
      labels: /^(?:HKID|HK\s*ID|Hong\s*Kong\s*ID\s*(?:Card\s*)?(?:No\.?)?)$/i,
      type: 'HKID', confidence: 0.95
    },
    {
      labels: /^(?:China\s*(?:National\s*)?ID|PRC\s*ID|居民身份证\s*(?:号码)?)$/i,
      type: 'NATIONAL_ID_CN', confidence: 0.95
    },

    // ── Contact ───────────────────────────────────────────────────────────────
    {
      labels: /^(?:Email|E-?mail|Email\s*Address|Electronic\s*Mail)$/i,
      type: 'EMAIL', confidence: 0.97
    },
    {
      labels: /^(?:Tel\.?|Phone|Mobile|Mobile\s*No\.?|Contact\s*No\.?|HP|Handphone|Phone\s*No\.?|Tel(?:ephone)?\s*No\.?|Fax|Fax\s*No\.?)$/i,
      type: 'PHONE_SG', confidence: 0.90
    },

    // ── Financial ─────────────────────────────────────────────────────────────
    {
      labels: /^(?:Account\s*No\.?|Acct\.?\s*No\.?|Bank\s*Account|Account\s*Number|Savings\s*Account)$/i,
      type: 'BANK_ACCOUNT', confidence: 0.93
    },
    {
      labels: /^(?:Credit\s*Card|Card\s*No\.?|Card\s*Number|Debit\s*Card)$/i,
      type: 'CREDIT_CARD', confidence: 0.93
    },
    {
      labels: /^(?:UEN|Company\s*Reg(?:istration)?\s*(?:No\.?)?|Business\s*Reg(?:istration)?\s*(?:No\.?)?)$/i,
      type: 'UEN_SG', confidence: 0.93
    },

    // ── Location ─────────────────────────────────────────────────────────────
    {
      labels: /^(?:Address|Residential\s*Address|Mailing\s*Address|Home\s*Address|Postal\s*Address|Registered\s*Address|Correspondence\s*Address)$/i,
      type: 'ADDRESS_SG', confidence: 0.88
    },

    // ── Person name ───────────────────────────────────────────────────────────
    // Value must look like a human name (capitalised words, optional connectors).
    {
      labels: /^(?:Name|Full\s*Name|Given\s*Name|First\s*Name|Last\s*Name|Surname|Family\s*Name|Borrower|Co-?Borrower|Guarantor|Customer|Client|Patient|Director|Applicant|Authorised\s*(?:Person|Signatory)|Account\s*Holder)$/i,
      type: 'PERSON', confidence: 0.90, isPerson: true
    },

    // ── Date ─────────────────────────────────────────────────────────────────
    {
      labels: /^(?:Date\s*of\s*Birth|DOB|D\.O\.B\.?|Birth\s*Date|Birthdate)$/i,
      type: 'DATE_OF_BIRTH', confidence: 0.93
    },
  ];

  // Matches "Label: Value" lines anchored to start-of-line.
  // Label: up to 60 chars, no colon or newline; Value: rest of line.
  const lineRe = /^([^:\n]{1,60}):\s+(.+)$/gm;

  // Simple name heuristic: 1–5 words, each starting with a capital (or all-caps),
  // with optional connectors (bin, binte, s/o, d/o, a/l, a/p) between words.
  const NAME_RE = /^[A-Z][a-zA-Z'-]+(?:\s+(?:(?:bin|binte|s\/o|d\/o|a\/l|a\/p)\s+)?[A-Z][a-zA-Z'-]+){0,4}$/;

  let match;
  while ((match = lineRe.exec(text)) !== null) {
    const label = match[1].trim();
    const value = match[2].trim();
    if (!value || value.length < 2) continue;

    const entry = LABEL_MAP.find(e => e.labels.test(label));
    if (!entry) continue;

    // Name fields: value must look like a human name
    if (entry.isPerson && !NAME_RE.test(value)) continue;

    // Run checksum / format validator if provided
    if (entry.validate && !entry.validate(value)) continue;

    // The value group is always at the end of the full match, so its absolute
    // start position is: match.index + (fullMatch.length - capturedValue.length).
    // Using indexOf would incorrectly return 0 if the value text also appears in the label.
    const valueStart = match.index + match[0].length - match[2].length;
    const valueEnd   = valueStart + value.length;

    detections.push({
      type:        entry.type,
      value,
      start:       valueStart,
      end:         valueEnd,
      confidence:  entry.confidence,
      method:      'structural',
      description: `Labeled field: "${label}"`,
      hash:        await hashContent(value),
    });
  }

  return detections;
}

/**
 * Detect language features in text to optimize NER model selection
 * Analyzes text for Chinese characters, English text, and romanized Chinese names
 */
function detectLanguageFeatures(text) {
  const features = {
    hasChinese: /[\u4E00-\u9FFF]/.test(text),
    hasEnglish: /[a-zA-Z]/.test(text),
    hasRomanizedChinese: false
  };

  // Detect romanized Chinese (Hanyu Pinyin)
  // Common Chinese surnames in various formats
  if (features.hasEnglish) {
    const commonSurnames = [
      'ZHANG', 'WANG', 'LI', 'ZHAO', 'CHEN', 'YANG', 'HUANG', 'ZHOU',
      'WU', 'XU', 'SUN', 'MA', 'ZHU', 'HU', 'GUO', 'HE', 'GAO', 'LIN',
      'LUO', 'ZHENG', 'LIANG', 'XIE', 'SONG', 'TANG', 'HAN', 'FENG',
      'YU', 'DONG', 'CAO', 'CHENG', 'WEI', 'PAN', 'YUAN', 'JIANG',
      'LIU', 'DENG', 'PENG', 'ZENG', 'XIAO', 'TIAN', 'QIN', 'REN'
    ];

    // Pattern: ALL_CAPS_SURNAME GivenName (e.g., ZHANG Wei)
    const allCapsPattern = new RegExp(
      `\\b(${commonSurnames.join('|')})\\s+[A-Z][a-z]+`,
      'g'
    );

    // Pattern: Surname GivenName in title case (e.g., Zhang Wei)
    const titleCaseSurnames = commonSurnames.map(s =>
      s.charAt(0) + s.slice(1).toLowerCase()
    );
    const titleCasePattern = new RegExp(
      `\\b(${titleCaseSurnames.join('|')})\\s+[A-Z][a-z]+`,
      'g'
    );

    features.hasRomanizedChinese =
      allCapsPattern.test(text) || titleCasePattern.test(text);
  }

  return features;
}

/**
 * Detect PII using NER model(s)
 * Uses smart language detection to optimize which models run
 */
async function detectPIIWithNER(text) {
  if (!CONFIG.detection.methods.ner) {
    return [];
  }

  // Support both legacy single pipeline and new dual pipelines
  const hasDualModels = window.nerPipelines && window.nerPipelines.english && window.nerPipelines.chinese;
  const hasSingleModel = window.nerPipeline;

  if (!hasDualModels && !hasSingleModel) {
    return [];
  }

  try {
    const detections = [];

    // NEW: Dual model approach with smart language detection
    if (hasDualModels) {
      const features = detectLanguageFeatures(text);
      console.log('[Language Detection]', features);

      // Optimize: Only run necessary models based on content
      let runEnglish = false;
      let runChinese = false;

      if (features.hasChinese) {
        runChinese = true; // Chinese characters → must run Chinese model
      }

      if (features.hasEnglish || features.hasRomanizedChinese) {
        runEnglish = true; // English text → run English model
      }

      if (features.hasRomanizedChinese && !features.hasChinese) {
        runChinese = true; // Romanized Chinese → run both models
      }

      // Show which models will run
      const modelsToRun = [];
      if (runEnglish) modelsToRun.push('English');
      if (runChinese) modelsToRun.push('Chinese');

      if (modelsToRun.length > 0) {
        const modelsList = modelsToRun.join(' + ');
        showProgress(true, `🔍 Running ${modelsList} NER model${modelsToRun.length > 1 ? 's' : ''}...`);
      }

      // Run English NER if needed
      if (runEnglish && window.nerPipelines.english) {
        nerModelStartTime = Date.now();
        resetProgressBar();
        showProgress(true, '🔤 English NER Model - Initializing...');
        const englishResults = await window.nerPipelines.english.predict(text, (message) => {
          showProgress(true, `🔤 English NER Model - ${message}`);
        });
        detections.push(...await processNERResults(englishResults, 'english'));
      }

      // Run Chinese NER if needed
      if (runChinese && window.nerPipelines.chinese) {
        nerModelStartTime = Date.now();
        resetProgressBar();
        showProgress(true, '🀄 Chinese NER Model - Initializing...');
        const chineseResults = await window.nerPipelines.chinese.predict(text, (message) => {
          showProgress(true, `🀄 Chinese NER Model - ${message}`);
        });
        detections.push(...await processNERResults(chineseResults, 'chinese'));
      }

      nerModelStartTime = null; // clear so overall timer resumes after NER

      // Log what was skipped for performance tracking
      if (!runEnglish) console.log('[NER] Skipped English model (no English content)');
      if (!runChinese) console.log('[NER] Skipped Chinese model (no Chinese content)');

      // Deduplicate overlapping detections from multiple models
      return deduplicateNERDetections(detections);
    }

    // LEGACY: Single model approach (backwards compatibility)
    else {
      nerModelStartTime = Date.now();
      resetProgressBar();
      const results = await window.nerPipeline.predict(text, (message) => {
        showProgress(true, message);
      });

      for (const entity of results) {
        const entityType = entity.entity_group || entity.entity || 'UNKNOWN';
        let piiType = 'UNKNOWN';

        if (entityType.includes('PER')) piiType = 'PERSON';
        else if (entityType.includes('ORG')) piiType = 'ORGANIZATION';
        else if (entityType.includes('LOC')) piiType = 'LOCATION';

        if (piiType === 'UNKNOWN') continue;

        detections.push({
          type: piiType,
          value: entity.word,
          start: entity.start,
          end: entity.end,
          confidence: entity.score,
          method: 'ner',
          description: `Named entity (${entityType})`,
          hash: await hashContent(entity.word)
        });
      }

      nerModelStartTime = null; // clear so overall timer resumes after NER
      return detections;
    }
  } catch (error) {
    nerModelStartTime = null;
    console.error('NER detection error:', error);
    return [];
  }
}

/**
 * Process NER results from a specific language model
 * Maps entity types and adds language-specific PII types
 */
async function processNERResults(results, language) {
  const detections = [];

  for (const entity of results) {
    // Get entity type (e.g., "B-PER", "I-ORG")
    const entityLabel = entity.entity_group || entity.entity || 'UNKNOWN';
    const entityType = entityLabel.split('-').pop(); // "B-PER" -> "PER"

    let piiType = 'UNKNOWN';

    if (language === 'english') {
      // piiranha-v1 label set (iiiorg/piiranha-v1-detect-personal-information)
      // Labels use only I- prefix (no B-), 17 PII types
      if (entityType === 'GIVENNAME' || entityType === 'SURNAME') {
        piiType = 'PERSON';
      } else if (entityType === 'EMAIL') {
        piiType = 'EMAIL';
        entity.score = Math.min(entity.score, 0.75); // regex is more reliable
      } else if (entityType === 'TELEPHONENUM') {
        piiType = 'PHONE_SG';
        entity.score = Math.min(entity.score, 0.7);
      } else if (entityType === 'IDCARDNUM' || entityType === 'SOCIALNUM') {
        piiType = 'NRIC_SG';
        entity.score = Math.min(entity.score, 0.7); // regex+checksum more reliable
      } else if (entityType === 'CREDITCARDNUMBER') {
        piiType = 'CREDIT_CARD';
        entity.score = Math.min(entity.score, 0.75);
      } else if (entityType === 'ACCOUNTNUM') {
        piiType = 'BANK_ACCOUNT';
        entity.score = Math.min(entity.score, 0.65);
      } else if (entityType === 'TAXNUM') {
        piiType = 'UEN_SG';
        entity.score = Math.min(entity.score, 0.65);
      } else if (entityType === 'DATEOFBIRTH') {
        piiType = 'DATE_OF_BIRTH';
      } else if (entityType === 'STREET' || entityType === 'CITY' || entityType === 'ZIPCODE') {
        piiType = 'ADDRESS_SG';
      } else {
        // Skip: PASSWORD, USERNAME, DRIVERLICENSENUM (not common in our documents)
        continue;
      }
    } else {
      // bert-base-chinese-ner label set (PER / ORG / LOC)
      if (entityType === 'PER') {
        piiType = 'PERSON_CN';
      } else if (entityType === 'ORG') {
        piiType = 'ORGANIZATION_CN';
        const isSingleToken = !/\s/.test(entity.word.replace(/##/g, ''));
        entity.score = isSingleToken ? Math.min(entity.score, 0.45) : Math.min(entity.score, 0.65);
      } else if (entityType === 'LOC') {
        piiType = 'LOCATION_CN';
        entity.score = Math.min(entity.score, 0.45);
      } else {
        continue;
      }
    }

    // Discard cross-line entities — real PII values don't span newlines.
    // These are NER hallucinations produced when the model continues an entity
    // tag across a \n boundary in the formatted document text.
    if (entity.word.includes('\n')) continue;

    detections.push({
      type: piiType,
      value: entity.word,
      start: entity.start,
      end: entity.end,
      confidence: entity.score,
      method: `ner-${language}`,
      description: `Named entity (${entityType})`,
      hash: await hashContent(entity.word)
    });
  }

  return detections;
}

/**
 * Check if two detections overlap
 * @param {Object} detection1 - First detection with start/end positions
 * @param {Object} detection2 - Second detection with start/end positions
 * @returns {boolean} - True if detections overlap
 */
function detectionsOverlap(detection1, detection2) {
  // Check if the ranges overlap
  return !(detection1.end <= detection2.start || detection2.end <= detection1.start);
}

/**
 * Deduplicate NER detections from multiple models
 * Keeps higher confidence detection when overlaps occur
 */
function deduplicateNERDetections(detections) {
  // Sort by start position
  const sorted = detections.sort((a, b) => a.start - b.start);

  // Remove overlaps, keeping higher confidence
  const filtered = [];
  for (const detection of sorted) {
    const overlaps = filtered.filter(d =>
      detectionsOverlap(d, detection)
    );

    if (overlaps.length === 0) {
      filtered.push(detection);
    } else {
      // Keep the detection with higher confidence
      const maxConfidence = Math.max(...overlaps.map(d => d.confidence));
      if (detection.confidence > maxConfidence) {
        // Remove lower confidence overlaps
        overlaps.forEach(overlap => {
          const index = filtered.indexOf(overlap);
          filtered.splice(index, 1);
        });
        filtered.push(detection);
      }
    }
  }

  return filtered;
}

/**
 * Combine regex and NER detections
 */
async function detectAllPII(text) {
  const regexDetections = await detectPII(text);

  // Structural pass: parse "Label: Value" lines from DOCX-formatted text.
  // Runs unconditionally — on plain TXT it simply finds no labeled lines.
  const structuralDetections = await detectStructuredFields(text);
  if (structuralDetections.length > 0) {
    console.log('[Structural] Found', structuralDetections.length, 'labeled-field detections');
  }

  // Track which methods were used
  const modelsInfo = {
    used: structuralDetections.length > 0 ? ['regex', 'structural'] : ['regex'],
    skipped: []
  };

  let nerDetections = [];
  if (CONFIG.detection.methods.ner) {
    // Store original console.log to capture NER model info
    const originalLog = console.log;
    const nerLogs = [];
    console.log = function(...args) {
      const msg = args.join(' ');
      if (msg.includes('[NER]') || msg.includes('[Language Detection]')) {
        nerLogs.push(msg);
      }
      originalLog.apply(console, args);
    };

    nerDetections = await detectPIIWithNER(text);

    // Restore console.log
    console.log = originalLog;

    // Parse logs to determine which models were used
    const logStr = nerLogs.join(' ');
    if (logStr.includes('English NER Model')) modelsInfo.used.push('ner-english');
    if (logStr.includes('Chinese NER Model')) modelsInfo.used.push('ner-chinese');
    if (logStr.includes('Skipped English model')) modelsInfo.skipped.push('ner-english');
    if (logStr.includes('Skipped Chinese model')) modelsInfo.skipped.push('ner-chinese');
  } else {
    modelsInfo.skipped.push('ner');
  }

  // Merge and deduplicate detections (structural first — highest priority in tie-breaks)
  const allDetections = [...structuralDetections, ...regexDetections, ...nerDetections]
    .filter(d => d.value && !d.value.includes('\n'));
  const sortedDetections = mergeDetections(allDetections);

  // Apply any boundary corrections the user has taught the system.
  const finalDetections = applyLearnedCorrections(sortedDetections, text);

  // Return both detections and model info
  return {
    detections: finalDetections,
    modelsInfo: modelsInfo
  };
}

/**
 * Run each NER detection through the Qwen classifier.
 * Regex detections pass through unchanged; NER detections are kept only
 * if Qwen confirms they are genuine PII.
 *
 * @param {Array}  detections   Merged and deduplicated detection list
 * @param {string} originalText Full document text (for context windows)
 * @returns {Promise<Array>}    Filtered detection list
 */
// Common business-document words that NER frequently misclassifies as PERSON/ORG.
// Checked before any Qwen call — O(1) lookup, eliminates obvious false positives.
const QWEN_SKIP_ENTITIES = new Set([
  // Invoice / financial labels
  'Invoice', 'Reference', 'Ref', 'Total', 'Subtotal', 'Amount', 'Balance',
  'Payment', 'Payments', 'Receipt', 'Credit', 'Debit', 'Memo', 'Tax', 'GST',
  'VAT', 'Price', 'Quantity', 'Description', 'Note', 'Notes', 'Terms',
  'Conditions', 'Account', 'Order', 'Discount', 'Shipping', 'Handling',
  'Deposit', 'Fee', 'Fees', 'Interest', 'Penalty', 'Refund', 'Charge',
  // Calendar / time
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  // Common business roles used as labels (not names)
  'Manager', 'Director', 'Officer', 'Executive', 'President', 'Chairman',
  'Signature', 'Signatory', 'Authorized', 'Approved',
  // Generic document words
  'Page', 'Date', 'Subject', 'From', 'To', 'Cc', 'Attention', 'Attn',
  'Regards', 'Dear', 'Sincerely', 'Yours', 'Enclosure',
]);

async function filterWithQwen(detections, originalText) {
  const downloadThreshold = CONFIG.detection.thresholds.download ?? 0.5;

  // Identify NER detections that are actually candidates for Qwen validation:
  // must be NER-sourced, above the download threshold (will appear in output),
  // and below the confidence ceiling (below which NER is already reliable).
  const CONFIDENCE_CEILING = 0.70;
  const MAX_QWEN_CALLS     = 15;

  // Separate regex (pass through) from NER (evaluate)
  const regexDetections = detections.filter(d => !d.method.startsWith('ner-'));
  const nerDetections   = detections.filter(d =>  d.method.startsWith('ner-'));

  if (nerDetections.length === 0) return detections;

  // --- Gate 1: download threshold — skip entities excluded from output anyway
  // --- Gate 2: confidence ceiling — trust high-confidence NER directly
  // --- Gate 3: entity blocklist — known business-doc false positives
  const autoKeep    = [];  // NER entities that pass through without Qwen
  const autoDiscard = [];  // NER entities discarded by gate 3 (blocklist)
  const grayZone    = [];  // NER entities that need Qwen validation

  for (const det of nerDetections) {
    if (det.confidence < downloadThreshold) {
      autoKeep.push(det);   // below threshold → won't affect output, skip Qwen
      continue;
    }
    if (det.confidence >= CONFIDENCE_CEILING) {
      autoKeep.push(det);   // NER already confident, trust it
      continue;
    }
    if (QWEN_SKIP_ENTITIES.has(det.value) || det.value.length < 3) {
      autoDiscard.push(det); // known FP word or too short
      continue;
    }
    grayZone.push(det);
  }

  // --- Gate 5: hard cap — if more gray-zone entities than budget allows,
  // sort by confidence ascending (least certain = most worth checking),
  // validate the bottom MAX_QWEN_CALLS, auto-keep the rest.
  grayZone.sort((a, b) => a.confidence - b.confidence);
  const toValidate = grayZone.slice(0, MAX_QWEN_CALLS);
  const capKept    = grayZone.slice(MAX_QWEN_CALLS);  // above cap → auto-keep

  console.log(
    `[Qwen] Routing: ${autoKeep.length} auto-keep, ` +
    `${autoDiscard.length} blocklist-discard, ` +
    `${capKept.length} cap-keep, ` +
    `${toValidate.length} to validate`
  );

  // --- Run Qwen on the gray-zone candidates
  const qwenKept = [];
  for (let i = 0; i < toValidate.length; i++) {
    const det = toValidate[i];

    const epLabel = window.qwenClassifier?.usingWebGPU ? '🤖 Qwen (GPU)' : '🤖 Qwen (CPU)';
    showProgress(true, `${epLabel} — validating ${i + 1} / ${toValidate.length}…`);
    // Yield so the progress text repaints before ORT blocks the thread.
    await new Promise(resolve => setTimeout(resolve, 0));

    // --- Gate 4: sentence-snapping context window with entity bracketing.
    const _start = det.start ?? 0;
    const _end   = det.end   ?? 0;
    const SENT   = /[.!?\n]/;

    let sentStart = 0;
    for (let p = _start - 1; p >= 0; p--) {
      if (SENT.test(originalText[p])) { sentStart = p + 1; break; }
    }
    let winStart = 0;
    if (sentStart > 1) {
      for (let p = sentStart - 2; p >= Math.max(0, sentStart - 400); p--) {
        if (SENT.test(originalText[p])) { winStart = p + 1; break; }
      }
    }
    let sentEnd = originalText.length;
    for (let p = _end; p < originalText.length; p++) {
      if (SENT.test(originalText[p])) { sentEnd = p + 1; break; }
    }
    let winEnd = originalText.length;
    for (let p = sentEnd; p < Math.min(originalText.length, sentEnd + 400); p++) {
      if (SENT.test(originalText[p])) { winEnd = p + 1; break; }
    }
    const localCtx =
      originalText.slice(winStart, _start).trimStart() +
      '<<<' + det.value + '>>>' +
      originalText.slice(_end, winEnd).trimEnd();

    const keep = await window.qwenClassifier.classify(det.value, det.type, localCtx, det.confidence);
    if (keep) {
      qwenKept.push({ ...det, method: det.method + '+qwen' });
    }
  }

  // Include discarded items tagged so they show up as unchecked in the UI
  const discarded = autoDiscard.map(d => ({ ...d, method: d.method + '+qwen-discarded' }));

  // Reassemble in original document order (start position)
  const allKept = [
    ...regexDetections,
    ...autoKeep,
    ...capKept,
    ...qwenKept,
    ...discarded,
  ];
  allKept.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  return allKept;
}

/**
 * If `s` is wrapped in a matching bracket pair (() [] {}), return the inner
 * text and the surrounding characters so the caller can re-wrap the replacement.
 */
function _outerBrackets(s) {
  if (s.length >= 2) {
    const open = '([{', close = ')]}';
    const i = open.indexOf(s[0]);
    if (i !== -1 && s[s.length - 1] === close[i]) {
      return { prefix: s[0], inner: s.slice(1, -1), suffix: s[s.length - 1] };
    }
  }
  return { prefix: '', inner: s, suffix: '' };
}

/**
 * Apply a masking strategy format to `original`, preserving any outer bracket
 * pair so that e.g. "(John Smith)" becomes "(Edmund Ng)" not "Edmund Ng".
 */
function _applyFormat(strategyConfig, original, type, index) {
  const { prefix, inner, suffix } = _outerBrackets(original);
  const base = typeof strategyConfig.format === 'function'
    ? strategyConfig.format(inner, type, index)
    : strategyConfig.format;
  return prefix + base + suffix;
}

/**
 * Mask PII in text
 */
function maskPII(text, detections, strategy) {
  let masked = text;
  let offset = 0;
  const operations = [];

  for (const detection of detections) {
    const start = detection.start + offset;
    const end = detection.end + offset;
    const original = masked.substring(start, end);

    const strategyConfig = CONFIG.masking.strategies[strategy];
    const index = detections.indexOf(detection);
    const replacement = _applyFormat(strategyConfig, original, detection.type, index);

    masked = masked.substring(0, start) + replacement + masked.substring(end);
    offset += replacement.length - original.length;

    operations.push({
      type: detection.type,
      position: { start: detection.start, end: detection.end },
      originalLength: original.length,
      maskedLength: replacement.length
    });
  }

  return {
    content: masked,
    operations
  };
}

/**
 * Return a copy of detections with a 'replacement' field computed from the strategy.
 * Used by DOCX and PDF handlers that need the replacement value pre-computed.
 */
function withReplacements(detections, strategy) {
  const strategyConfig = CONFIG.masking.strategies[strategy];
  return detections.map((det, index) => ({
    ...det,
    replacement: _applyFormat(strategyConfig, det.value || '', det.type, index)
  }));
}

// ============================================================================
// MARKDOWN CONVERSION
// ============================================================================

/**
 * Convert a mammoth-generated HTML string to GitHub-flavoured Markdown.
 * Handles the elements mammoth actually produces: headings, paragraphs,
 * bold/italic, links, tables, and unordered/ordered lists.
 */
function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  function nodeToMd(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    if (tag === 'style' || tag === 'script') return '';

    const inner = () => Array.from(node.childNodes).map(nodeToMd).join('');

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const hashes = '#'.repeat(parseInt(tag[1], 10));
      return `\n${hashes} ${inner().trim()}\n\n`;
    }

    // Blocks
    if (tag === 'p') {
      const text = inner().trim();
      return text ? `${text}\n\n` : '';
    }
    if (tag === 'br') return '\n';
    if (tag === 'hr') return '\n---\n\n';
    if (tag === 'pre') {
      // Inside <pre> don't escape individual chars
      return `\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
    }
    if (tag === 'blockquote') {
      return inner().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
    }

    // Inline formatting
    if (tag === 'strong' || tag === 'b') {
      const t = inner();
      return t.trim() ? `**${t}**` : '';
    }
    if (tag === 'em' || tag === 'i') {
      const t = inner();
      return t.trim() ? `*${t}*` : '';
    }
    if (tag === 'code') return `\`${node.textContent}\``;
    if (tag === 'a')    return inner(); // strip hyperlinks, keep text

    // Lists
    if (tag === 'ul') return '\n' + inner() + '\n';
    if (tag === 'ol') {
      let n = 0;
      return '\n' + Array.from(node.childNodes).map(child => {
        if (child.nodeType === Node.ELEMENT_NODE &&
            child.tagName.toLowerCase() === 'li') {
          n++;
          return `${n}. ${Array.from(child.childNodes).map(nodeToMd).join('').trim()}\n`;
        }
        return '';
      }).join('') + '\n';
    }
    if (tag === 'li') return `- ${inner().trim()}\n`;

    // Tables
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (!rows.length) return '';

      const escCell = s =>
        s.replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim();

      const grid = rows.map(tr =>
        Array.from(tr.querySelectorAll('td,th')).map(cell =>
          escCell(Array.from(cell.childNodes).map(nodeToMd).join(''))
        )
      );

      const colCount = Math.max(...grid.map(r => r.length));
      const pad = row => { while (row.length < colCount) row.push(''); return row; };
      const gridPadded = grid.map(pad);

      const header    = `| ${gridPadded[0].join(' | ')} |`;
      const separator = `| ${Array(colCount).fill('---').join(' | ')} |`;
      const body      = gridPadded.slice(1).map(r => `| ${r.join(' | ')} |`);

      return '\n' + [header, separator, ...body].join('\n') + '\n\n';
    }

    // Generic block containers — just render children
    return inner();
  }

  return nodeToMd(div)
    .replace(/\n{3,}/g, '\n\n')  // collapse excess blank lines
    .trim() + '\n';
}

/**
 * Apply PII masking to a Markdown string using value-based (not offset-based)
 * replacement.  This works across both formatted and plain-text sources because
 * the PII values appear verbatim in the Markdown regardless of surrounding
 * markup (bold markers, table pipes, etc.).
 *
 * Replacements are applied longest-first so that a substring value (e.g.
 * "John") is not replaced before a longer enclosing one (e.g. "John Smith").
 *
 * @param {string} mdText     Markdown string to mask
 * @param {string} strategy   Masking strategy key (e.g. 'SYNTHETIC')
 * @returns {string}          Masked Markdown string
 */
function maskMarkdown(mdText, strategy) {
  const filtered = getFilteredDetections();
  if (!filtered.length) return mdText;

  const enriched = withReplacements(filtered, strategy);

  // Sort longest value first to prevent a short value from pre-empting a
  // longer one that contains it as a substring.
  const sorted = [...enriched]
    .filter(d => d.value && d.replacement != null)
    .sort((a, b) => (b.value.length - a.value.length));

  let result = mdText;
  for (const det of sorted) {
    // Escape regex metacharacters in the literal value for safe use in RegExp.
    const regexEscaped = det.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(regexEscaped, 'g'), det.replacement);
  }
  return result;
}

// ============================================================================
// FILE PARSING
// ============================================================================

/**
 * Parse text file
 */
async function parseTextFile(file) {
  return await file.text();
}

/**
 * Parse PDF file (using bundled PDF.js)
 */
async function parsePDF(file) {
  try {
    // Initialize PDF handler if not already done
    if (!window.pdfHandler) {
      window.pdfHandler = new PDFHandler();
    }

    // Clear any cached canvas pages from a previous PDF
    pdfCanvasCache = null;

    // Parse the PDF
    const pdfData = await window.pdfHandler.parsePDF(file);

    // Store PDF data for later redaction
    window.currentPDFData = pdfData;

    console.log('[PDF] Parsed successfully:', {
      pages: pdfData.numPages,
      textLength: pdfData.text.length,
      items: pdfData.textItems.length
    });

    return pdfData.text;
  } catch (error) {
    console.error('[PDF] Parse error:', error);

    if (error.message.includes('download-pdf-libs.sh')) {
      throw new Error(
        'PDF libraries not installed. Run: ./download-pdf-libs.sh to enable PDF support.'
      );
    }

    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Parse DOCX file (using mammoth.js from CDN)
 */
async function parseDOCX(file) {
  console.log('[DOCX] Parsing DOCX file:', file.name);

  if (!window.DOCXHandler) {
    throw new Error('DOCX Handler not loaded. Please reload the extension.');
  }

  if (!window.mammoth) {
    throw new Error('Mammoth library not loaded. Please reload the extension.');
  }

  try {
    const text = await window.DOCXHandler.parseDOCX(file);
    console.log('[DOCX] Successfully extracted text:', text.length, 'characters');
    return text;
  } catch (error) {
    console.error('[DOCX] Parse error:', error);
    throw new Error(`Failed to parse DOCX file: ${error.message}`);
  }
}

/**
 * Load external script
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'module';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Parse document based on type
 */
async function parseDocument(file) {
  const type = file.type;
  const extension = file.name.split('.').pop().toLowerCase();

  if (type === 'text/plain' || extension === 'txt') {
    return await parseTextFile(file);
  } else if (type === 'application/pdf' || extension === 'pdf') {
    return await parsePDF(file);
  } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
    return await parseDOCX(file);
  } else {
    throw new Error(`Unsupported file type: ${type}. Supported: TXT, PDF, DOCX`);
  }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function showStatus(message, type) {
  const status = document.getElementById('statusMessage');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
}

function hideStatus() {
  document.getElementById('statusMessage').style.display = 'none';
}

/**
 * Instantly snap the progress bar to 0% without a CSS transition.
 * Called before each NER model phase so the bar doesn't animate backwards
 * from the previous model's 100% completion down to 0%.
 */
function resetProgressBar() {
  const progressFill = document.querySelector('.progress-fill');
  if (!progressFill) return;
  // Disable transition → set width → force reflow → re-enable transition
  progressFill.style.transition = 'none';
  progressFill.style.width = '0%';
  void progressFill.offsetWidth; // trigger reflow so the change is committed before transition re-enables
  progressFill.style.transition = '';
}

function showProgress(show, message = 'Processing...') {
  console.log('[UI] showProgress called:', { show, message });
  const progress = document.getElementById('progress');
  const progressText = document.getElementById('progressText');
  const progressFill = document.querySelector('.progress-fill');

  if (!progress) {
    console.error('[UI] ERROR: progress element not found!');
    return;
  }

  progress.style.display = show ? 'block' : 'none';
  console.log('[UI] Set progress.style.display to:', progress.style.display);
  console.log('[UI] Computed display style:', window.getComputedStyle(progress).display);

  if (show) {
    // Log element dimensions and visibility
    const rect = progress.getBoundingClientRect();
    console.log('[UI] Progress element dimensions:', {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      visible: rect.width > 0 && rect.height > 0
    });

    // Extract percentage from message (e.g., "Processing chunk 3/10 (30%)...")
    // Only update the bar when the message explicitly carries a percentage.
    // Non-percentage messages (e.g. "Initializing…", status text) leave the bar
    // where it is — resetProgressBar() handles the explicit reset at model start.
    const percentMatch = message.match(/\((\d+)%\)/);
    if (percentMatch && progressFill) {
      const percentage = parseInt(percentMatch[1]);
      progressFill.style.width = `${percentage}%`;
      console.log('[UI] Progress bar updated to:', percentage + '%');
    }
  }

  if (show && progressText) {
    // Add elapsed time to message if detection is in progress
    const elapsed = getElapsedTime();
    const displayMessage = elapsed ? `${message} (${formatElapsedTime(elapsed)})` : message;
    progressText.textContent = displayMessage;
    console.log('[UI] Progress text updated to:', displayMessage);
  } else if (show && !progressText) {
    console.error('[UI] progressText element not found!');
  }
}

/**
 * Get line number from character position in text
 */
function getLineNumber(text, position) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  const beforePosition = text.substring(0, position);
  const lineNumber = beforePosition.split('\n').length;
  return lineNumber;
}

/**
 * Get page number from character position in PDF
 */
function getPageNumber(position) {
  if (!window.currentPDFData || !window.currentPDFData.textItems) {
    return null;
  }

  // Find which page this position falls on
  let currentPos = 0;
  for (const item of window.currentPDFData.textItems) {
    if (!item || !item.str) continue;
    const itemEnd = currentPos + item.str.length;
    if (position >= currentPos && position < itemEnd) {
      return item.page;
    }
    currentPos = itemEnd + 1; // +1 for space/newline between items
  }

  return window.currentPDFData.numPages; // Default to last page if not found
}

/**
 * Get location string (page or line number)
 */
function getLocationString(position) {
  const isPDF = window.currentFileType === 'application/pdf' ||
                (currentFilename && currentFilename.endsWith('.pdf'));

  if (isPDF && window.currentPDFData) {
    const pageNum = getPageNumber(position);
    return pageNum ? `Page ${pageNum}` : 'Position ' + position;
  } else {
    const lineNum = getLineNumber(currentOriginalText, position);
    return lineNum ? `Line ${lineNum}` : 'Position ' + position;
  }
}

/**
 * Get human-readable method label
 */
function getMethodLabel(method) {
  if (method === 'ner')        return 'Model matched';
  if (method === 'regex')      return 'Pattern matched';
  if (method === 'structural') return 'Labeled field';
  if (method === 'manual')     return 'Manually added';
  return method;
}

/**
 * Get confidence badge HTML based on confidence score
 */
function getConfidenceBadge(confidence) {
  if (confidence >= 0.9) {
    return '<span class="confidence-badge high">HIGH</span>';
  } else if (confidence >= 0.6) {
    return '<span class="confidence-badge medium">MEDIUM</span>';
  } else if (confidence >= 0.3) {
    return '<span class="confidence-badge low">LOW</span>';
  }
  return '';
}

function maskValueForPreview(value, type) {
  if (!value || value.length < 2) return '***';
  if (type === 'EMAIL') {
    const atIdx = value.indexOf('@');
    if (atIdx > 0) return value[0] + '***@' + value.slice(atIdx + 1);
    return value[0] + '***';
  }
  if (type === 'PHONE_SG' || type === 'PHONE_HK' || type === 'PHONE_CN')
    return '****' + value.replace(/\D/g, '').slice(-4);
  if (value.length >= 6)
    return value.slice(0, 2) + '*'.repeat(Math.min(value.length - 4, 5)) + value.slice(-2);
  return value[0] + '***' + value[value.length - 1];
}

function buildTypeGroups(detections) {
  const groups = {};
  for (const d of detections) {
    if (!groups[d.type]) groups[d.type] = { count: 0, previews: [] };
    groups[d.type].count++;
    if (groups[d.type].previews.length < 2 && d.value) {
      groups[d.type].previews.push(maskValueForPreview(d.value, d.type));
    }
  }
  return groups;
}

function getFilteredDetections() {
  const minConf = CONFIG.detection.thresholds.download ?? 0.5;
  return currentDetections.filter((d, i) =>
    selectedTypes.has(d.type) && d.confidence >= minConf && !excludedDetections.has(i)
  );
}

function updateRedactionCounter() {
  const counter = document.getElementById('redactionCounter');
  if (!counter) return;
  const filtered = getFilteredDetections().length;
  const total = currentDetections.length;
  if (filtered === 0) {
    counter.textContent = '⚠️ No types selected — PII will not be redacted';
    counter.className = 'redaction-counter none';
    document.getElementById('downloadMasked').disabled = true;
  } else {
    counter.textContent = `Redacting ${filtered} of ${total} detection${total !== 1 ? 's' : ''}`;
    counter.className = filtered < total ? 'redaction-counter partial' : 'redaction-counter';
    document.getElementById('downloadMasked').disabled = false;
  }
}

function renderCategoryTabs(detections) {
  const tabsDiv = document.getElementById('categoryTabs');
  tabsDiv.innerHTML = '';

  const catCounts = {};
  const catHasHighConf = {};
  for (const d of detections) {
    const cat = CATEGORY_MAP[d.type] || 'Universal';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    if (d.confidence >= 0.65) catHasHighConf[cat] = true;
  }

  const allTab = document.createElement('button');
  allTab.className = 'cat-tab' + (activeCategory === 'All' ? ' active' : '');
  allTab.dataset.cat = 'All';
  allTab.textContent = `All (${detections.length})`;
  tabsDiv.appendChild(allTab);

  for (const cat of CATEGORIES) {
    if (!catCounts[cat]) continue;
    const tab = document.createElement('button');
    const allLow = !catHasHighConf[cat];
    tab.className = 'cat-tab' +
      (activeCategory === cat ? ' active' : '') +
      (allLow ? ' has-low' : '');
    tab.dataset.cat = cat;
    tab.textContent = `${cat} (${catCounts[cat]})${allLow ? ' ⚠️' : ''}`;
    tabsDiv.appendChild(tab);
  }
}

function renderTypeGrid(catDetections) {
  const summaryDiv = document.getElementById('summary');
  summaryDiv.innerHTML = '';
  const groups = buildTypeGroups(catDetections);
  for (const [type, group] of Object.entries(groups)) {
    const card = document.createElement('div');
    card.className = 'summary-card ' + (selectedTypes.has(type) ? 'enabled' : 'disabled');
    card.dataset.type = type;
    const previewHtml = group.previews[0]
      ? `<div class="summary-preview">${escapeHTML(group.previews[0])}</div>`
      : '';
    card.innerHTML = `
      <div class="summary-value">${group.count}</div>
      <div class="summary-label">${escapeHTML(type)}</div>
      ${previewHtml}
    `;
    summaryDiv.appendChild(card);
  }
}

function renderDetectionList(catDetections) {
  const listDiv = document.getElementById('detectionsList');
  listDiv.innerHTML = '';

  // Map to original indices then sort by confidence ascending (false positives first)
  const indexed = catDetections.map(d => ({ d, origIdx: currentDetections.indexOf(d) }));
  indexed.sort((a, b) => a.d.confidence - b.d.confidence);

  let visibleCount = 0;
  const textLen = currentOriginalText ? currentOriginalText.length : 0;

  for (const { d, origIdx } of indexed) {
    const isTypeEnabled = selectedTypes.has(d.type);
    const isExcluded = excludedDetections.has(origIdx);

    // Build context snippet
    const before = currentOriginalText
      ? currentOriginalText.slice(Math.max(0, d.start - 25), d.start).replace(/[\r\n]+/g, ' ')
      : '';
    const after = currentOriginalText
      ? currentOriginalText.slice(d.end, Math.min(textLen, d.end + 25)).replace(/[\r\n]+/g, ' ')
      : '';

    const location = getLocationString(d.start);
    const methodLabel = getMethodLabel(d.method);
    const confidenceBadge = getConfidenceBadge(d.confidence);
    const qwenBadge = d.method.includes('+qwen') && !d.method.includes('+qwen-discarded')
      ? '<span class="qwen-badge" style="font-size:0.72rem;color:#6d28d9;" title="Reviewed by Qwen">🤖</span>'
      : '';
    const discardedBadge = d.method.includes('+qwen-discarded')
      ? '<span style="font-size:0.72rem;color:#dc2626;" title="Discarded by Qwen at detection time">🚫</span>'
      : '';
    const manualBadge = d.manual
      ? '<span class="manual-badge" title="Added manually">✏ manual</span>'
      : '';
    const manualRemoveBtn = d.manual
      ? `<button class="det-manual-remove" data-idx="${origIdx}" title="Remove manual detection">×</button>`
      : '';

    const row = document.createElement('div');
    row.className = 'detection-row' +
      (isExcluded ? ' excluded' : '') +
      (!isTypeEnabled ? ' type-hidden' : '');
    row.dataset.idx = origIdx;
    row.dataset.type = d.type;

    row.innerHTML = `
      <input type="checkbox" class="det-checkbox" data-idx="${origIdx}" ${(!isExcluded && isTypeEnabled) ? 'checked' : ''}>
      <div class="det-body">
        <div class="det-header">
          <span class="detection-type">${escapeHTML(d.type)}</span>
          ${confidenceBadge}
          ${qwenBadge}
          ${discardedBadge}
          ${manualBadge}
          <span class="detection-meta">${escapeHTML(location)} | ${escapeHTML(methodLabel)}</span>
        </div>
        <div class="det-context">…${escapeHTML(before)}<mark>${escapeHTML(d.value || '')}</mark>${escapeHTML(after)}…</div>
      </div>
      ${manualRemoveBtn}
    `;
    listDiv.appendChild(row);
    if (isTypeEnabled) visibleCount++;
  }

  const label = document.getElementById('visibleCountLabel');
  if (label) label.innerHTML = `<b>${visibleCount}</b> detection${visibleCount !== 1 ? 's' : ''} visible`;
}

// ============================================================================
// PII RISK GRADING
// ============================================================================

const GRADE_WEIGHTS = {
  // Critical national identifiers
  NRIC_SG: { weight: 20, critical: true, label: 'NRIC/FIN (SG)' },
  PASSPORT_SG: { weight: 20, critical: true, label: 'Passport (SG)' },
  PASSPORT_CN: { weight: 20, critical: true, label: 'Passport (CN)' },
  PASSPORT_HK: { weight: 20, critical: true, label: 'Passport (HK)' },
  PASSPORT: { weight: 20, critical: true, label: 'Passport' },
  NATIONAL_ID_CN: { weight: 20, critical: true, label: 'National ID (CN)' },
  HKID: { weight: 20, critical: true, label: 'HKID' },
  NATIONAL_ID_TW: { weight: 20, critical: true, label: 'National ID (TW)' },
  MY_NUMBER_JP: { weight: 20, critical: true, label: 'My Number (JP)' },
  RRN_KR: { weight: 20, critical: true, label: 'RRN (KR)' },
  NATIONAL_ID_MY: { weight: 20, critical: true, label: 'MyKad (MY)' },
  NATIONAL_ID_TH: { weight: 20, critical: true, label: 'National ID (TH)' },
  KTP_ID: { weight: 20, critical: true, label: 'KTP ID (ID)' },
  AADHAAR_IN: { weight: 20, critical: true, label: 'Aadhaar (IN)' },
  PAN_IN: { weight: 20, critical: true, label: 'PAN Card (IN)' },
  SSS_PH: { weight: 20, critical: true, label: 'SSS Number (PH)' },
  NATIONAL_ID_VN: { weight: 20, critical: true, label: 'National ID (VN)' },
  NIN_UK: { weight: 20, critical: true, label: 'NI Number (UK)' },
  TFN_AU: { weight: 20, critical: true, label: 'TFN (AU)' },
  // Critical financial identifiers
  BANK_ACCOUNT: { weight: 25, critical: true, label: 'Bank Account' },
  CREDIT_CARD: { weight: 25, critical: true, label: 'Credit Card' },
  ABA_ROUTING_US: { weight: 20, critical: true, label: 'ABA Routing (US)' },
  IBAN: { weight: 20, critical: true, label: 'IBAN' },
  // High sensitivity
  DATE_OF_BIRTH: { weight: 10, critical: false, label: 'Date of Birth' },
  PERSON: { weight: 8, critical: false, label: 'Person Name' },
  PERSON_CN: { weight: 8, critical: false, label: 'Person Name' },
  ADDRESS_SG: { weight: 8, critical: false, label: 'Address (SG)' },
  ADDRESS_HK: { weight: 8, critical: false, label: 'Address (HK)' },
  ADDRESS_CN: { weight: 8, critical: false, label: 'Address (CN)' },
  EMAIL: { weight: 6, critical: false, label: 'Email' },
  PHONE_SG: { weight: 6, critical: false, label: 'Phone' },
  PHONE_CN: { weight: 6, critical: false, label: 'Phone (CN)' },
  PHONE_KR: { weight: 6, critical: false, label: 'Phone' },
  PHONE_JP: { weight: 6, critical: false, label: 'Phone' },
  PHONE_IN: { weight: 6, critical: false, label: 'Phone' },
  // Medium sensitivity
  ORGANIZATION: { weight: 3, critical: false, label: 'Organisation' },
  ORGANIZATION_CN: { weight: 3, critical: false, label: 'Organisation' },
  UEN_SG: { weight: 3, critical: false, label: 'UEN (SG)' },
  // Low sensitivity
  LOCATION: { weight: 1, critical: false, label: 'Location' },
  LOCATION_CN: { weight: 1, critical: false, label: 'Location' },
  POSTAL_CODE_SG: { weight: 1, critical: false, label: 'Postal Code' },
  IP_ADDRESS: { weight: 1, critical: false, label: 'IP Address' },
};

function computeDocumentGrade() {
  const typeScores = {};
  const criticalFound = [];
  let totalScore = 0;

  currentDetections.forEach((d, i) => {
    // Only active (not excluded, type enabled) detections count
    if (excludedDetections.has(i) || !selectedTypes.has(d.type)) return;

    const entry = GRADE_WEIGHTS[d.type];
    const weight = entry ? entry.weight : 2; // unknown type → low default

    totalScore += weight;
    typeScores[d.type] = (typeScores[d.type] || 0) + weight;

    if (entry?.critical && !criticalFound.includes(d.type)) {
      criticalFound.push(d.type);
    }
  });

  let grade;
  if (criticalFound.length > 0 || totalScore > 60) {
    grade = 'RESTRICTED';
  } else if (totalScore >= 20) {
    grade = 'CONFIDENTIAL';
  } else if (totalScore >= 1) {
    grade = 'INTERNAL';
  } else {
    grade = 'PUBLIC';
  }

  // Top-3 type contributors (by accumulated weight)
  const drivers = Object.entries(typeScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => GRADE_WEIGHTS[type]?.label || type);

  return { grade, totalScore, drivers, criticalFound };
}

function renderGradeCard() {
  const card = document.getElementById('gradeCard');
  const riskCard = document.getElementById('riskCard');
  if (!card) return;

  if (!currentDetections || currentDetections.length === 0) {
    if (riskCard) riskCard.style.display = 'none';
    return;
  }
  if (riskCard) riskCard.style.display = 'block';

  const { grade, totalScore, drivers, criticalFound } = computeDocumentGrade();

  const GRADE_CONFIG = {
    RESTRICTED: {
      badge: 'L4',
      title: 'Level 4',
      desc: criticalFound.length > 0
        ? `Contains unmasked critical identifier${criticalFound.length > 1 ? 's' : ''} — not safe for external LLMs.`
        : 'Very high PII density — not safe for external LLMs.',
      rec: 'Review and mask PII fields before any external use.'
    },
    CONFIDENTIAL: {
      badge: 'L3',
      title: 'Level 3',
      desc: 'Significant PII present — handle with care.',
      rec: 'Review and mask PII fields before any external use.'
    },
    INTERNAL: {
      badge: 'L2',
      title: 'Level 2',
      desc: 'Low-level PII detected — suitable for internal use only.',
      rec: 'Consider masking remaining items before sharing externally.'
    },
    PUBLIC: {
      badge: 'L1',
      title: 'Level 1',
      desc: 'No active PII detected — document appears clean.',
      rec: 'Safe to use with external LLMs.'
    },
  };

  const cfg = GRADE_CONFIG[grade];
  const driversHtml = drivers.length > 0
    ? `<div class="grade-drivers">${drivers.map(d => `<span class="grade-driver-chip">${escapeHTML(d)}</span>`).join('')}</div>`
    : '';

  card.className = `grade-card grade-${grade}`;
  card.style.display = 'flex';
  card.innerHTML = `
    <div class="grade-badge">${cfg.badge}</div>
    <div class="grade-body">
      <div class="grade-title">${cfg.title}</div>
      <div class="grade-desc">${cfg.desc}</div>
      ${driversHtml}
      <div class="grade-meta">💡 ${cfg.rec}</div>
    </div>
  `;
}

function rerenderResults() {
  const catDetections = activeCategory === 'All'
    ? currentDetections
    : currentDetections.filter(d => (CATEGORY_MAP[d.type] || 'Universal') === activeCategory);
  renderTypeGrid(catDetections);
  renderDetectionList(catDetections);
  updateRedactionCounter();
  showQwenReviewPanel();
  renderGradeCard();
  renderDocumentEditor();
}

/**
 * Render PDF pages as canvases with an absolutely-positioned PII highlight overlay.
 * Pages are rendered once and cached; only the overlay is rebuilt on rerenderResults().
 */
async function renderPDFEditor() {
  const editor = document.getElementById('documentEditor');
  if (!editor) return;

  editor.classList.add('pdf-canvas-mode');
  editor.classList.remove('formatted-mode');
  editor.contentEditable = 'false';

  const pdfData  = window.currentPDFData;
  const pdfjsLib = window.pdfHandler.pdfjsLib;

  // ── Phase 1: one-time canvas + textContent render (expensive) ──────────────
  if (!pdfCanvasCache) {
    editor.innerHTML = '<div class="pdf-rendering-msg">Rendering PDF preview…</div>';
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfData.arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;

      // Auto-fit scale to editor inner width
      const editorInnerWidth = Math.max(editor.clientWidth - 20, 400);
      const nativeVp = (await pdf.getPage(1)).getViewport({ scale: 1 });
      const scale    = Math.min(Math.max(editorInnerWidth / nativeVp.width, 0.6), 2.5);

      const pages = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page     = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Render canvas
        const canvas = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        // Fetch textContent (plain object — safe to cache and reuse)
        const textContent = await page.getTextContent();

        // Build a mapping: textContent.items[i] → pdfData.textItem (for this page).
        // pdfData.textItems skips empty strings; textContent.items does not.
        // Walk both arrays together to align them.
        const pageItems = pdfData.textItems.filter(ti => ti.page === pageNum);
        const itemByTCIndex = {}; // textContent.items index → pdfData textItem
        let piIdx = 0;
        for (let i = 0; i < textContent.items.length && piIdx < pageItems.length; i++) {
          if (textContent.items[i].str) {
            itemByTCIndex[i] = pageItems[piIdx++];
          }
        }

        pages.push({ canvas, pageNum, viewport, textContent, itemByTCIndex });
      }

      pdfCanvasCache = { pages, scale };
    } catch (err) {
      console.error('[PDF Editor] Render error:', err);
      editor.innerHTML = '<div class="pdf-rendering-msg" style="color:#dc2626;">PDF preview failed — try re-uploading the file.</div>';
      return;
    }
  }

  // ── Phase 2: rebuild DOM on every call (cheap — canvas is reused) ──────────
  const { pages, scale } = pdfCanvasCache;

  // Group active detections by page
  const detByPage = {};
  currentDetections.forEach((d, origIdx) => {
    if (!selectedTypes.has(d.type)) return;
    const items = window.pdfHandler.findMatchingTextItems(d.start, d.end, pdfData.textItems);
    for (const item of items) {
      if (!detByPage[item.page]) detByPage[item.page] = [];
      detByPage[item.page].push({ d, origIdx, item });
    }
  });

  editor.innerHTML = '';

  for (const { canvas, pageNum, viewport, textContent, itemByTCIndex } of pages) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page-wrapper';
    wrapper.style.width  = canvas.width  + 'px';
    wrapper.style.height = canvas.height + 'px';
    wrapper.appendChild(canvas); // z-index 0

    // ── Text layer (z:2) — transparent spans for text selection ────────────
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'pdf-text-layer';

    const freshTextDivs = [];
    const renderTask = pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container:         textLayerDiv,
      viewport:          viewport,
      textDivs:          freshTextDivs,
    });
    await renderTask.promise;

    // Build span → pdfData.textItem map using freshTextDivs
    const spanToItem = new Map();
    for (let i = 0; i < freshTextDivs.length; i++) {
      const ti = itemByTCIndex[i];
      if (ti) spanToItem.set(freshTextDivs[i], ti);
    }

    // Wire mouseup on text layer for manual detection
    textLayerDiv.addEventListener('mouseup', () =>
      handlePDFTextSelection(spanToItem));

    wrapper.appendChild(textLayerDiv);

    // ── Highlight layer (z:3) — coloured boxes + dismiss buttons ───────────
    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'pdf-highlight-layer';

    for (const { d, origIdx, item } of (detByPage[pageNum] || [])) {
      const pad = 2;
      // PDF bottom-left origin → CSS top-left origin
      const x = (item.x - pad) * scale;
      const y = viewport.height - (item.y + item.height + pad) * scale;
      const w = (item.width  + pad * 2) * scale;
      const h = (item.height + pad * 2) * scale;
      if (w <= 0 || h <= 0) continue;

      const isExcluded = excludedDetections.has(origIdx);
      const box = document.createElement('div');
      box.className = 'pdf-highlight-box' +
        (isExcluded  ? ' unchecked' : ' checked') +
        (d.manual    ? ' manual-det' : '');
      box.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
      box.dataset.idx   = origIdx;

      // Type label (visible on hover)
      const typeLabel = document.createElement('span');
      typeLabel.className   = 'pdf-highlight-type';
      typeLabel.textContent = d.type;
      box.appendChild(typeLabel);

      // Dismiss / restore button (visible on hover)
      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'pdf-dismiss-btn';
      dismissBtn.title     = isExcluded ? 'Restore redaction' : 'Skip redaction';
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(box.dataset.idx, 10);
        if (excludedDetections.has(idx)) {
          excludedDetections.delete(idx);
        } else {
          excludedDetections.add(idx);
        }
        rerenderResults();
      });
      box.appendChild(dismissBtn);

      // Click body → scroll + flash the detection row in the list
      box.addEventListener('click', () => {
        const row = document.querySelector(`.detection-row[data-idx="${origIdx}"]`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          row.classList.add('det-row-flash');
          setTimeout(() => row.classList.remove('det-row-flash'), 800);
        }
      });

      highlightLayer.appendChild(box);
    }

    wrapper.appendChild(highlightLayer);
    editor.appendChild(wrapper);
  }
}

/**
 * Handle mouseup on a PDF text layer span — maps the browser selection back to
 * globalOffset positions in currentOriginalText, then shows the manual-add toolbar.
 */
function handlePDFTextSelection(spanToItem) {
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    // Resolve start/end elements (may be text nodes inside spans)
    const startEl = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement : range.startContainer;
    const endEl   = range.endContainer.nodeType === Node.TEXT_NODE
      ? range.endContainer.parentElement   : range.endContainer;

    const startItem = spanToItem.get(startEl);
    const endItem   = spanToItem.get(endEl);
    if (!startItem || !endItem) return;

    const globalStart = startItem.globalOffset + range.startOffset;
    const globalEnd   = endItem.globalOffset   + range.endOffset;

    if (globalStart >= globalEnd) return;
    if (!currentOriginalText.slice(globalStart, globalEnd).trim()) return;

    _manualSelection      = { start: globalStart, end: globalEnd };
    _manualFormattedValue = null;
    showManualToolbar(range.getBoundingClientRect());
  }, 10);
}

function renderDocumentEditor() {
  const editor = document.getElementById('documentEditor');
  if (!editor || !currentOriginalText) return;

  // Formatted mode: render mammoth HTML with injected marks
  if (editorViewMode === 'formatted' && currentFormattedHtml) {
    renderFormattedEditor();
    return;
  }

  // PDF mode: render canvas pages with highlight overlay
  const isPDF = window.currentFileType === 'application/pdf' ||
                (currentFilename && currentFilename.toLowerCase().endsWith('.pdf'));
  if (isPDF && window.currentPDFData && window.pdfHandler?.initialized) {
    renderPDFEditor();
    return;
  }

  // Plain text mode
  editor.classList.remove('formatted-mode', 'pdf-canvas-mode', 'masked-view');

  // Masked preview branch (read-only, replacement text inside marks)
  if (editorMaskedView) {
    editor.classList.add('masked-view');
    editor.contentEditable = 'false';
    const strategy = document.getElementById('maskingStrategy').value;
    const strategyConfig = CONFIG.masking.strategies[strategy];

    // Use EXACTLY the same filtered set as the download so indexes match.
    // getFilteredDetections() applies selectedTypes + confidence threshold + !excluded.
    const downloadDets = getFilteredDetections();
    const maskedOrigIdxSet = new Set(downloadDets.map(d => currentDetections.indexOf(d)));
    const repMap = new Map(
      downloadDets.map((det, idx) => [
        currentDetections.indexOf(det),
        _applyFormat(strategyConfig, det.value || '', det.type, idx)
      ])
    );

    const sorted = currentDetections
      .map((d, i) => ({ ...d, origIdx: i }))
      .filter(d => selectedTypes.has(d.type))
      .sort((a, b) => a.start - b.start);

    let html = '';
    let pos = 0;
    for (const det of sorted) {
      if (det.start < pos) continue;
      if (det.start > pos) html += escapeHTML(currentOriginalText.slice(pos, det.start));
      const manCls = currentDetections[det.origIdx]?.manual ? ' manual-det' : '';
      if (maskedOrigIdxSet.has(det.origIdx)) {
        // Will be masked in download — show replacement text, blue highlight
        const rep = repMap.get(det.origIdx) ?? escapeHTML(det.value ?? '');
        html += `<mark class="det-highlight checked will-mask${manCls}" data-idx="${det.origIdx}" contenteditable="false">`
              + `<span class="det-text">${escapeHTML(rep)}</span>`
              + `</mark>`;
      } else {
        // Not masked in download (low confidence or excluded) — show as normal view
        const cls = excludedDetections.has(det.origIdx) ? 'unchecked' : 'checked';
        html += `<mark class="det-highlight ${cls}${manCls}" data-idx="${det.origIdx}" contenteditable="false">`
              + `<span class="det-text">${escapeHTML(det.value ?? '')}</span>`
              + `</mark>`;
      }
      pos = det.end;
    }
    if (pos < currentOriginalText.length) html += escapeHTML(currentOriginalText.slice(pos));
    editor.innerHTML = html;
    return;
  }

  editor.contentEditable = 'true';

  // Preserve active selection across re-renders (e.g. during drag)
  const savedActiveIdx = activeDetectionIdx;
  activeDetectionIdx = null;

  const sorted = currentDetections
    .map((d, i) => ({ ...d, origIdx: i }))
    .filter(d => selectedTypes.has(d.type))
    .sort((a, b) => a.start - b.start);

  let html = '';
  let pos = 0;

  for (const det of sorted) {
    if (det.start < pos) continue;
    if (det.start > pos)
      html += escapeHTML(currentOriginalText.slice(pos, det.start));

    const cls = excludedDetections.has(det.origIdx) ? 'unchecked' : 'checked';
    const manualCls = currentDetections[det.origIdx]?.manual ? ' manual-det' : '';
    const dismissTitle = currentDetections[det.origIdx]?.manual ? 'Remove detection' : 'Skip redaction';
    html += `<mark class="det-highlight ${cls}${manualCls}" data-idx="${det.origIdx}" contenteditable="false">`
          + `<span class="det-handle det-handle-left" contenteditable="false"></span>`
          + `<span class="det-text">${escapeHTML(det.value ?? '')}</span>`
          + `<span class="det-handle det-handle-right" contenteditable="false"></span>`
          + `<button class="det-dismiss" contenteditable="false" tabindex="-1" title="${dismissTitle}">×</button>`
          + `</mark>`;
    pos = det.end;
  }

  if (pos < currentOriginalText.length)
    html += escapeHTML(currentOriginalText.slice(pos));

  editor.innerHTML = html;

  // Restore active mark highlight if one was set
  if (savedActiveIdx !== null) {
    const mark = editor.querySelector(`.det-highlight[data-idx="${savedActiveIdx}"]`);
    if (mark) mark.classList.add('det-active');
    activeDetectionIdx = savedActiveIdx;
  }
}

/**
 * Render the formatted (mammoth HTML) view of the document with PII marks injected.
 * Called by renderDocumentEditor() when editorViewMode === 'formatted'.
 */
function renderFormattedEditor() {
  const editor = document.getElementById('documentEditor');
  if (editorMaskedView) { renderMaskedFormattedEditor(); return; }

  editor.classList.remove('masked-view');
  const savedActiveIdx = activeDetectionIdx;
  activeDetectionIdx = null;

  const sorted = currentDetections
    .map((d, i) => ({ ...d, origIdx: i }))
    .filter(d => selectedTypes.has(d.type))
    .sort((a, b) => a.start - b.start);

  // Parse mammoth HTML into a temporary element
  const temp = document.createElement('div');
  temp.innerHTML = currentFormattedHtml;

  // Strip hyperlinks — replace every <a> with its plain-text children so that
  // email addresses (mailto:) and URLs are not rendered as clickable links.
  for (const anchor of Array.from(temp.querySelectorAll('a'))) {
    const frag = document.createDocumentFragment();
    while (anchor.firstChild) frag.appendChild(anchor.firstChild);
    anchor.replaceWith(frag);
  }

  // Inject PII mark spans by searching for each detection's value in text nodes
  injectFormattedMarks(temp, sorted);

  // Apply formatted styling: normal whitespace, read-only
  editor.classList.add('formatted-mode');
  editor.contentEditable = 'false';
  editor.innerHTML = temp.innerHTML;

  // Restore active mark highlight
  if (savedActiveIdx !== null) {
    const mark = editor.querySelector(`.det-highlight[data-idx="${savedActiveIdx}"]`);
    if (mark) mark.classList.add('det-active');
    activeDetectionIdx = savedActiveIdx;
  }
}

/**
 * Walk the DOM rooted at rootEl, find each detection's value in text nodes,
 * and wrap it in a <mark class="det-highlight"> element.
 * Uses value-based search (not char-offset based) to avoid offset mismatches
 * between currentOriginalText and the mammoth HTML text content.
 */
function injectFormattedMarks(rootEl, sortedDets) {
  if (!sortedDets.length) return;

  // Collect all non-empty text nodes in document order
  const segments = [];
  (function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.length > 0) segments.push(node);
    } else {
      for (const child of Array.from(node.childNodes)) walk(child);
    }
  })(rootEl);

  if (!segments.length) return;

  // Build the full concatenated text and per-segment start offsets
  const segStarts = [];
  let fullText = '';
  for (const tn of segments) {
    segStarts.push(fullText.length);
    fullText += tn.textContent;
  }

  // ── Match: find ALL occurrences of each detected value in fullText ─────────
  //
  // Mirrors _redactParagraph in docx-handler.js: every occurrence of a detected
  // value string is highlighted, not just the one detected span. This ensures
  // the editor panel and the downloaded document show the same coverage.
  //
  // For the data-idx attribute (used for exclude/dismiss interactions), each
  // occurrence is assigned to the detection whose det.start is closest to that
  // occurrence's position in fullText.

  // Group detections by their search value
  const valueToDets = new Map();
  for (const det of sortedDets) {
    const searchVal = det.formattedValue || det.value;
    if (!searchVal) continue;
    if (!valueToDets.has(searchVal)) valueToDets.set(searchVal, []);
    valueToDets.get(searchVal).push(det);
  }

  // matches: [{ det, chunks: [{segIdx, localStart, localEnd, isFirst, isLast}] }]
  const matches = [];
  const usedRanges = []; // prevent double-marking overlapping spans

  for (const [searchVal, dets] of valueToDets) {
    const valLen = searchVal.length;
    let from = 0;
    while (from <= fullText.length - valLen) {
      const pos = fullText.indexOf(searchVal, from);
      if (pos === -1) break;
      const posEnd = pos + valLen;
      from = pos + 1;

      if (usedRanges.some(r => pos < r.end && posEnd > r.start)) continue;
      usedRanges.push({ start: pos, end: posEnd });

      // Assign to the detection whose det.start is closest to this occurrence
      const det = dets.reduce((best, d) =>
        Math.abs(d.start - pos) < Math.abs(best.start - pos) ? d : best
      );

      // Collect every segment that overlaps [pos, posEnd)
      const chunks = [];
      for (let i = 0; i < segments.length; i++) {
        const segStart = segStarts[i];
        const segEnd = segStart + segments[i].textContent.length;
        if (segStart >= posEnd) break;
        if (segEnd <= pos) continue;
        chunks.push({
          segIdx: i,
          localStart: Math.max(0, pos - segStart),
          localEnd: Math.min(segments[i].textContent.length, posEnd - segStart),
          isFirst: false,
          isLast: false,
        });
      }
      if (!chunks.length) continue;
      chunks[0].isFirst = true;
      chunks[chunks.length - 1].isLast = true;
      matches.push({ det, chunks });
    }
  }

  // ── Inject marks into the DOM ─────────────────────────────────────────────
  //
  // Process in REVERSE document order (highest first-segment index first) so
  // that splitting a text node never shifts the offsets of earlier matches.
  // Within a multi-chunk match the chunks are processed in reverse chunk order
  // for the same reason.

  matches.sort((a, b) => a.chunks[0].segIdx - b.chunks[0].segIdx);
  matches.reverse();

  // Guard against overlapping matches (later detection already consumed a seg)
  const usedSegs = new Set();

  for (const { det, chunks } of matches) {
    if (chunks.some(c => usedSegs.has(c.segIdx))) continue;
    chunks.forEach(c => usedSegs.add(c.segIdx));

    const cls      = excludedDetections.has(det.origIdx) ? 'unchecked' : 'checked';
    const manCls   = currentDetections[det.origIdx]?.manual ? ' manual-det' : '';
    const dimTitle = currentDetections[det.origIdx]?.manual ? 'Remove detection' : 'Skip redaction';
    const multiSeg = chunks.length > 1;

    // Process chunks in reverse order for DOM stability
    for (let ci = chunks.length - 1; ci >= 0; ci--) {
      const { segIdx, localStart, localEnd, isFirst, isLast } = chunks[ci];
      const tn   = segments[segIdx];
      if (!tn.parentNode) continue;

      const text   = tn.textContent;
      const parent = tn.parentNode;

      const mark = document.createElement('mark');
      mark.className   = `det-highlight ${cls}${manCls}`;
      mark.dataset.idx = String(det.origIdx);
      mark.setAttribute('contenteditable', 'false');

      // Drag handles only make sense for single-segment marks; for cross-
      // formatting-boundary matches just show the text and a dismiss button.
      if (!multiSeg) {
        const lh = document.createElement('span');
        lh.className = 'det-handle det-handle-left';
        lh.setAttribute('contenteditable', 'false');
        mark.appendChild(lh);
      }

      const textSpan = document.createElement('span');
      textSpan.className   = 'det-text';
      textSpan.textContent = text.slice(localStart, localEnd);
      mark.appendChild(textSpan);

      if (!multiSeg) {
        const rh = document.createElement('span');
        rh.className = 'det-handle det-handle-right';
        rh.setAttribute('contenteditable', 'false');
        mark.appendChild(rh);
      }

      // Dismiss button on every chunk so the user can click anywhere to remove
      if (isLast || !multiSeg) {
        const btn = document.createElement('button');
        btn.className   = 'det-dismiss';
        btn.setAttribute('contenteditable', 'false');
        btn.tabIndex    = -1;
        btn.title       = dimTitle;
        btn.textContent = '×';
        mark.appendChild(btn);
      }

      // Split the text node and insert the mark
      const before = text.slice(0, localStart);
      const after  = text.slice(localEnd);
      if (before) parent.insertBefore(document.createTextNode(before), tn);
      parent.insertBefore(mark, tn);
      if (after)  parent.insertBefore(document.createTextNode(after),  tn);
      parent.removeChild(tn);
    }
  }
}

/**
 * Render the masked (replacement text) view of a formatted DOCX document.
 * Called by renderFormattedEditor() when editorMaskedView is true.
 */
function renderMaskedFormattedEditor() {
  const editor = document.getElementById('documentEditor');
  const strategy = document.getElementById('maskingStrategy').value;
  const strategyConfig = CONFIG.masking.strategies[strategy];

  // Use EXACTLY the same filtered set as the download so indexes match.
  const downloadDets = getFilteredDetections();
  const maskedOrigIdxSet = new Set(downloadDets.map(d => currentDetections.indexOf(d)));
  const repMap = new Map(
    downloadDets.map((det, idx) => [
      currentDetections.indexOf(det),
      _applyFormat(strategyConfig, det.value || '', det.type, idx)
    ])
  );

  const sorted = currentDetections
    .map((d, i) => ({ ...d, origIdx: i }))
    .filter(d => selectedTypes.has(d.type))
    .sort((a, b) => a.start - b.start);

  const temp = document.createElement('div');
  temp.innerHTML = currentFormattedHtml;
  for (const anchor of Array.from(temp.querySelectorAll('a'))) {
    const frag = document.createDocumentFragment();
    while (anchor.firstChild) frag.appendChild(anchor.firstChild);
    anchor.replaceWith(frag);
  }

  injectMaskedMarks(temp, sorted, repMap, maskedOrigIdxSet);

  editor.classList.add('formatted-mode', 'masked-view');
  editor.contentEditable = 'false';
  editor.innerHTML = temp.innerHTML;
}

/**
 * Walk the DOM rooted at rootEl, find each detection's value in text nodes,
 * and wrap it in a <mark> element containing the replacement text.
 * Read-only masked view — no drag handles or dismiss buttons.
 * Mirrors injectFormattedMarks() exactly except for mark construction.
 */
function injectMaskedMarks(rootEl, sortedDets, repMap, maskedOrigIdxSet) {
  if (!sortedDets.length) return;

  const segments = [];
  (function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.length > 0) segments.push(node);
    } else {
      for (const child of Array.from(node.childNodes)) walk(child);
    }
  })(rootEl);
  if (!segments.length) return;

  const segStarts = [];
  let fullText = '';
  for (const tn of segments) { segStarts.push(fullText.length); fullText += tn.textContent; }

  // Same as injectFormattedMarks: find ALL occurrences of each detected value,
  // not just the one detected span. Mirrors _redactParagraph in docx-handler.js.
  const valueToDets = new Map();
  for (const det of sortedDets) {
    const searchVal = det.formattedValue || det.value;
    if (!searchVal) continue;
    if (!valueToDets.has(searchVal)) valueToDets.set(searchVal, []);
    valueToDets.get(searchVal).push(det);
  }

  const matches = [];
  const usedRanges = [];

  for (const [searchVal, dets] of valueToDets) {
    const valLen = searchVal.length;
    let from = 0;
    while (from <= fullText.length - valLen) {
      const pos = fullText.indexOf(searchVal, from);
      if (pos === -1) break;
      const posEnd = pos + valLen;
      from = pos + 1;
      if (usedRanges.some(r => pos < r.end && posEnd > r.start)) continue;
      usedRanges.push({ start: pos, end: posEnd });
      const det = dets.reduce((best, d) =>
        Math.abs(d.start - pos) < Math.abs(best.start - pos) ? d : best
      );
      const chunks = [];
      for (let i = 0; i < segments.length; i++) {
        const segEnd = segStarts[i] + segments[i].textContent.length;
        if (segStarts[i] >= posEnd) break;
        if (segEnd <= pos) continue;
        chunks.push({
          segIdx: i,
          localStart: Math.max(0, pos - segStarts[i]),
          localEnd: Math.min(segments[i].textContent.length, posEnd - segStarts[i]),
          isFirst: false, isLast: false
        });
      }
      if (!chunks.length) continue;
      chunks[0].isFirst = true; chunks[chunks.length - 1].isLast = true;
      matches.push({ det, chunks });
    }
  }

  matches.sort((a, b) => a.chunks[0].segIdx - b.chunks[0].segIdx);
  matches.reverse();
  const usedSegs = new Set();

  for (const { det, chunks } of matches) {
    if (chunks.some(c => usedSegs.has(c.segIdx))) continue;
    chunks.forEach(c => usedSegs.add(c.segIdx));

    const willMask = maskedOrigIdxSet.has(det.origIdx);
    const cls      = excludedDetections.has(det.origIdx) ? 'unchecked' : 'checked';
    const manCls   = currentDetections[det.origIdx]?.manual ? ' manual-det' : '';
    const rep      = willMask ? (repMap.get(det.origIdx) ?? '') : null;

    for (let ci = chunks.length - 1; ci >= 0; ci--) {
      const { segIdx, localStart, localEnd, isFirst } = chunks[ci];
      const tn = segments[segIdx];
      if (!tn.parentNode) continue;
      const text = tn.textContent, parent = tn.parentNode;

      const mark = document.createElement('mark');
      // will-mask → blue highlight in masked view; others keep normal green/yellow
      mark.className = `det-highlight ${cls}${willMask ? ' will-mask' : ''}${manCls}`;
      mark.dataset.idx = String(det.origIdx);
      mark.setAttribute('contenteditable', 'false');

      const textSpan = document.createElement('span');
      textSpan.className = 'det-text';
      if (willMask) {
        // First chunk carries the full replacement; subsequent chunks are emptied
        textSpan.textContent = isFirst ? rep : '';
      } else {
        // Not masked — show original text from the mammoth HTML (like normal view)
        textSpan.textContent = text.slice(localStart, localEnd);
      }
      mark.appendChild(textSpan);

      const before = text.slice(0, localStart);
      const after  = text.slice(localEnd);
      if (before) parent.insertBefore(document.createTextNode(before), tn);
      parent.insertBefore(mark, tn);
      if (after)  parent.insertBefore(document.createTextNode(after), tn);
      parent.removeChild(tn);
    }
  }
}

function updateEditorHighlight(origIdx, isChecked) {
  const editor = document.getElementById('documentEditor');
  if (!editor) return;
  const mark = editor.querySelector(`.det-highlight[data-idx="${origIdx}"]`);
  if (!mark) return;
  mark.classList.toggle('checked',   isChecked);
  mark.classList.toggle('unchecked', !isChecked);
}

let activeDetectionIdx = null;

function setActiveDetection(origIdx) {
  // Clear previous active state
  if (activeDetectionIdx !== null) {
    const prevMark = document.querySelector(`#documentEditor .det-highlight[data-idx="${activeDetectionIdx}"]`);
    if (prevMark) prevMark.classList.remove('det-active');
    const prevRow = document.querySelector(`.detection-row[data-idx="${activeDetectionIdx}"]`);
    if (prevRow) prevRow.classList.remove('det-active');
  }
  activeDetectionIdx = origIdx;
  const mark = document.querySelector(`#documentEditor .det-highlight[data-idx="${origIdx}"]`);
  if (mark) mark.classList.add('det-active');
  const row = document.querySelector(`.detection-row[data-idx="${origIdx}"]`);
  if (row) row.classList.add('det-active');
}

function scrollEditorToDetection(origIdx) {
  const editor = document.getElementById('documentEditor');
  if (!editor) return;
  const mark = editor.querySelector(`.det-highlight[data-idx="${origIdx}"]`);
  if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setActiveDetection(origIdx);
}

function getMaskedTextFromEditor(strategy) {
  // Formatted mode renders mammoth HTML — can't walk it for masking; fall back.
  if (editorViewMode === 'formatted') return null;
  const editor = document.getElementById('documentEditor');
  if (!editor || !editor.childNodes.length) return null;

  const strategyConfig = CONFIG.masking.strategies[strategy];
  let result = '';
  let tokenIdx = 0;

  for (const node of editor.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'MARK') {
      const idx = parseInt(node.dataset.idx, 10);
      const det = currentDetections[idx];
      const textNode = node.querySelector('.det-text');
      const rawValue = textNode ? textNode.textContent : node.textContent;
      if (det && node.classList.contains('checked')) {
        result += typeof strategyConfig.format === 'function'
          ? strategyConfig.format(rawValue, det.type, tokenIdx++)
          : strategyConfig.format;
      } else {
        result += rawValue;
      }
    }
  }
  return result;
}

// ── Drag-to-resize detection boundaries ──────────────────────────────────────
let _dragState = null;   // { idx, side, origStart, origEnd }
let _dragThrottle = null;

/**
 * Map a screen coordinate to a character offset in currentOriginalText.
 *
 * When the cursor is over a contenteditable=false mark we can't get an
 * intra-mark caret from the browser, so we interpolate the character position
 * from the mouse X fraction across the mark's bounding box.  For cursor
 * positions in plain text we use the standard caretRangeFromPoint API.
 */
function getEditorOffsetFromPoint(clientX, clientY) {
  const editor = document.getElementById('documentEditor');
  if (!editor || !currentOriginalText) return null;

  // If the cursor is directly over a mark, interpolate from its bounding box.
  // (caretRangeFromPoint can't reach inside contenteditable=false elements.)
  const topEl = document.elementFromPoint(clientX, clientY);
  const overMark = topEl?.closest('#documentEditor .det-highlight');
  if (overMark) {
    const markIdx = parseInt(overMark.dataset.idx, 10);
    const det = currentDetections[markIdx];
    if (det) {
      const rect = overMark.getBoundingClientRect();
      if (rect.width > 0) {
        const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(det.start + fraction * (det.end - det.start));
      }
    }
  }

  // Cursor is over plain text — use the caret API.
  let domNode, domOffset;
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(clientX, clientY);
    if (!r) return null;
    domNode   = r.startContainer;
    domOffset = r.startOffset;
  } else if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(clientX, clientY);
    if (!p) return null;
    domNode   = p.offsetNode;
    domOffset = p.offset;
  } else {
    return null;
  }

  // Walk editor direct children, accumulating position in currentOriginalText.
  let origPos = 0;
  for (const child of editor.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child === domNode)
        return origPos + Math.min(domOffset, child.textContent.length);
      origPos += child.textContent.length;
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'MARK') {
      const markIdx = parseInt(child.dataset.idx, 10);
      const det = currentDetections[markIdx];
      if (!det) continue;
      origPos = det.end;
    }
  }
  return origPos;
}

/** Finalise detection row context after a drag. */
function _updateRowContext(idx) {
  const det = currentDetections[idx];
  const row = document.querySelector(`.detection-row[data-idx="${idx}"]`);
  if (!row || !det || !currentOriginalText) return;
  const tLen  = currentOriginalText.length;
  const before = currentOriginalText.slice(Math.max(0, det.start - 25), det.start).replace(/[\r\n]+/g, ' ');
  const after  = currentOriginalText.slice(det.end, Math.min(tLen, det.end + 25)).replace(/[\r\n]+/g, ' ');
  const ctxEl  = row.querySelector('.det-context');
  if (ctxEl) ctxEl.innerHTML = `…${escapeHTML(before)}<mark>${escapeHTML(det.value)}</mark>${escapeHTML(after)}…`;
}

// ── Manual PII detection ──────────────────────────────────────────────────────

let _manualSelection      = null; // { start, end } char offsets saved at mouseup
let _manualFormattedValue = null; // exact mammoth DOM text at selection time (formatted mode only)

/**
 * Map a Selection range endpoint (domNode, domOffset) to a character offset
 * in currentOriginalText by walking the editor's child nodes.
 */
function getRangeEndpointOffset(domNode, domOffset) {
  const editor = document.getElementById('documentEditor');
  if (!editor) return null;
  let origPos = 0, ci = 0;
  for (const child of editor.childNodes) {
    if (domNode === editor && domOffset === ci) return origPos;
    if (child.nodeType === Node.TEXT_NODE) {
      if (child === domNode)
        return origPos + Math.min(domOffset, child.textContent.length);
      origPos += child.textContent.length;
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'MARK') {
      const det = currentDetections[parseInt(child.dataset.idx, 10)];
      if (!det) { ci++; continue; }
      if (child === domNode || child.contains(domNode))
        return domOffset === 0 ? det.start : det.end;
      origPos = det.end;
    }
    ci++;
  }
  return origPos;
}

/**
 * Show the manual-add toolbar anchored just below a selection bounding rect.
 */
function showManualToolbar(selRect) {
  const toolbar = document.getElementById('manualAddToolbar');
  if (!toolbar) return;
  let top  = selRect.bottom + 6;
  let left = selRect.left;
  const vpW = window.innerWidth, vpH = window.innerHeight;
  if (left + 320 > vpW) left = Math.max(4, vpW - 324);
  if (top  + 52  > vpH) top  = selRect.top - 52;
  toolbar.style.left = left + 'px';
  toolbar.style.top  = top  + 'px';
  toolbar.style.display = 'flex';
  // Sync custom-type input visibility
  const sel = document.getElementById('manualPiiType');
  const inp = document.getElementById('manualPiiTypeCustom');
  if (sel && inp) inp.style.display = sel.value === 'CUSTOM' ? 'inline-block' : 'none';
}

function hideManualToolbar() {
  const toolbar = document.getElementById('manualAddToolbar');
  if (toolbar) toolbar.style.display = 'none';
  _manualSelection = null;
}

/**
 * Add a manual detection to currentDetections and re-render everything.
 */
function addManualDetection(start, end, type, formattedValue = null) {
  if (!currentOriginalText || start >= end) return;
  const value = currentOriginalText.slice(start, end);
  if (!value.trim()) return;

  const det = { type, value, start, end, confidence: 1.0, method: 'manual', manual: true };
  if (formattedValue && formattedValue !== value) det.formattedValue = formattedValue;
  currentDetections.push(det);

  // Persist to Local Training so future documents auto-detect this value+type.
  savePIICorrection({ type, method: 'manual', originalValue: value, correctedValue: value, action: 'custom' });

  // Ensure the results card is visible (may not be if scan found nothing)
  document.getElementById('resultsCard').style.display = 'block';
  document.getElementById('riskCard').style.display = 'block';

  // Rebuild type groups so the new type (or new manual detection) is reflected
  typeGroups = buildTypeGroups(currentDetections);
  selectedTypes.add(type);
  if (!activeCategory) activeCategory = 'All';

  renderCategoryTabs(currentDetections);
  rerenderResults();

  // Activate the new mark in the editor
  scrollEditorToDetection(currentDetections.length - 1);
}

/**
 * Permanently remove a manual detection from currentDetections.
 * Shifts all stored index references (excludedDetections, activeDetectionIdx).
 */
function removeManualDetection(idx) {
  currentDetections.splice(idx, 1);

  // Shift index-based state
  const newExcluded = new Set();
  for (const i of excludedDetections) {
    if (i < idx) newExcluded.add(i);
    else if (i > idx) newExcluded.add(i - 1);
  }
  excludedDetections = newExcluded;

  if (activeDetectionIdx === idx) activeDetectionIdx = null;
  else if (activeDetectionIdx !== null && activeDetectionIdx > idx) activeDetectionIdx--;

  typeGroups = buildTypeGroups(currentDetections);
  renderCategoryTabs(currentDetections);
  rerenderResults();
}

// syncEditorPanelHeight is no longer needed — both panels fill 100vh via CSS.

function displayResults(detections) {
  // Swap placeholder → editor content
  const ph = document.getElementById('editorPlaceholder');
  const tb = document.getElementById('editorToolbar');
  const ed = document.getElementById('documentEditor');
  if (ph) ph.style.display = 'none';
  if (tb) tb.style.display = '';
  if (ed) ed.style.display = '';

  editorMaskedView = false;
  const mpt = document.getElementById('maskPreviewToggle');
  if (mpt) {
    const isPDF = window.currentFileType === 'application/pdf' ||
      (currentFilename && currentFilename.toLowerCase().endsWith('.pdf'));
    mpt.style.display = isPDF ? 'none' : '';
    mpt.textContent = 'Show Masked';
  }

  if (detections.length === 0) {
    showStatus('No PII detected in this document!', 'success');
    renderDocumentEditor();
    return;
  }

  showStatus(`Detected ${detections.length} PII item(s)`, 'success');
  document.getElementById('resultsCard').style.display = 'block';
  document.getElementById('riskCard').style.display = 'block';

  // Reset per-session state
  excludedDetections = new Set();
  activeCategory = 'All';

  // Clear Qwen review results from previous file
  const _qrl = document.getElementById('qwenResultsList');
  const _qrp = document.getElementById('qwenReviewProgress');
  if (_qrl) _qrl.innerHTML = '';
  if (_qrp) { _qrp.style.display = 'none'; _qrp.textContent = ''; }

  // Build type groups and initialise selectedTypes (all on by default)
  typeGroups = buildTypeGroups(detections);
  selectedTypes = new Set(Object.keys(typeGroups));

  renderCategoryTabs(detections);
  rerenderResults();
  showQwenReviewPanel();
}

// ============================================================================
// QWEN POST-DETECTION REVIEW
// ============================================================================

// Words that NER frequently misidentifies as ORGANIZATION/LOCATION entities
// but are never genuine PII on their own. Checked against the normalised
// entity value (all non-alpha stripped, lowercased) and — for ORGANIZATION —
// also against the last word of the value to catch phrases like
// "Credit Risk Management Department" or "Corporate Banking Unit".
const QWEN_GENERIC_FP = new Set([
  // Generic organisational role/type words
  'committee','unit','branch','department','company','group','fund','office',
  'area','division','board','bureau','council','section','team','agency',
  'association','centre','center','institute','foundation','authority',
  'commission','ministry','chamber','society','annex','zone','district',
  'division','corridor','wing',
  // Document / form labels
  'ref','reference','number','code','type','page','total','annex','item',
  // Trade / compliance acronyms (categories, not entity names)
  'pii','aml','kyc','pep','fatf','gdpr','pdpa','cdd','edd',
  // Currency codes
  'cny','usd','eur','gbp','jpy','sgd','hkd','aud','cad','chf','rmb',
  // Generic nouns NER mistakes for entities
  'bank','loan','credit','risk','capital','working','general','alloy',
  'aluminum','aluminium','equipment','machinery','material',
  'persons','person','individual','entity','corporate','domestic',
  'exposed','joint','venture','industry','industrial','supreme',
  'blacklist','senior','junior','director','manager','officer',
  'building','tower','road','street','avenue','boulevard','lane',
]);

function getQwenEligible() {
  return currentDetections
    .map((d, i) => ({ d, origIdx: i }))
    .filter(({ d, origIdx }) => {
      if (!d.method.startsWith('ner-'))    return false;
      if (d.confidence >= 0.90)            return false;
      if (d.method.includes('+qwen'))      return false;
      if (excludedDetections.has(origIdx)) return false;

      // Strip all non-alpha chars and lowercase for blocklist comparison.
      // Single-word entities like "Committee", "CNY", "Ref:" all collapse to
      // their bare word; multi-word entities collapse to a concatenation that
      // won't match any blocklist entry, so they pass through.
      const norm = d.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (QWEN_GENERIC_FP.has(norm)) return false;

      if (d.type === 'ORGANIZATION') {
        // All-caps tokens ≤ 5 alpha chars are almost always acronyms or codes
        // (AML, KYC, CNY, PEP) — skip them even if not in the blocklist above.
        const alpha = d.value.replace(/[^a-zA-Z]/g, '');
        if (alpha.length > 0 && alpha === alpha.toUpperCase() && alpha.length <= 5) return false;

        // Check the last meaningful word of the phrase: "Credit Risk Management
        // Department" → last word "department" → generic type, not an org name.
        const words = d.value.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase().split(/\s+/);
        const lastWord = words[words.length - 1] ?? '';
        if (lastWord && QWEN_GENERIC_FP.has(lastWord)) return false;
      }

      return true;
    })
    .sort((a, b) => a.d.confidence - b.d.confidence);
}

function showQwenReviewPanel() {
  const section     = document.getElementById('qwenSection');
  const infoEl      = document.getElementById('qwenReviewInfo');
  const badge       = document.getElementById('qwenSectionBadge');
  const topBtn      = document.getElementById('qwenReviewTopBtn');
  const allBtn      = document.getElementById('qwenReviewAllBtn');
  const resultsList = document.getElementById('qwenResultsList');
  if (!section) return;

  if (!CONFIG.detection.methods.qwen) { section.style.display = 'none'; return; }

  const eligible   = getQwenEligible();
  const hasResults = resultsList && resultsList.children.length > 0;

  // Hide only if nothing pending and no prior results to show
  if (eligible.length === 0 && !hasResults) { section.style.display = 'none'; return; }

  section.style.display = 'block';

  if (eligible.length === 0) {
    // Review complete — keep results visible, hide the action row
    if (badge)   badge.textContent  = 'Review complete';
    if (infoEl)  infoEl.textContent = '';
    topBtn.style.display = 'none';
    if (allBtn) allBtn.style.display = 'none';
    return;
  }

  const low   = eligible.filter(e => e.d.confidence < 0.6).length;
  const med   = eligible.filter(e => e.d.confidence >= 0.6).length;
  const parts = [];
  if (low) parts.push(`${low} LOW`);
  if (med) parts.push(`${med} MEDIUM`);
  if (badge)  badge.textContent   = `${eligible.length} to review`;
  if (infoEl) infoEl.textContent  = `${eligible.length} uncertain NER detection${eligible.length !== 1 ? 's' : ''} (${parts.join(', ')}) awaiting validation.`;

  const batchSize = 15;
  if (eligible.length <= batchSize) {
    topBtn.textContent    = `Review all ${eligible.length}`;
    topBtn.dataset.limit  = eligible.length;
    allBtn.style.display  = 'none';
  } else {
    topBtn.textContent    = `Review top ${batchSize}`;
    topBtn.dataset.limit  = batchSize;
    allBtn.textContent    = `Review all ${eligible.length}`;
    allBtn.dataset.limit  = eligible.length;
    allBtn.disabled       = false;
    allBtn.style.display  = '';
  }
  topBtn.disabled      = false;
  topBtn.style.display = '';
}

async function runQwenReview(limit) {
  const topBtn      = document.getElementById('qwenReviewTopBtn');
  const allBtn      = document.getElementById('qwenReviewAllBtn');
  const progressEl  = document.getElementById('qwenReviewProgress');
  const resultsList = document.getElementById('qwenResultsList');

  if (topBtn)     topBtn.disabled = true;
  if (allBtn)     allBtn.disabled = true;
  if (progressEl) { progressEl.style.display = 'block'; progressEl.textContent = ''; }
  if (resultsList) resultsList.innerHTML = '';

  const eligible = getQwenEligible();
  const batch    = eligible.slice(0, limit);

  for (let i = 0; i < batch.length; i++) {
    const { d, origIdx } = batch[i];
    if (progressEl) progressEl.textContent = `🤖 Reviewing ${i + 1} / ${batch.length}…`;
    await new Promise(r => setTimeout(r, 0));

    // Add a live "reviewing" row to the results list
    const safeValue = d.value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let resultRow = null;
    if (resultsList) {
      resultRow = document.createElement('div');
      resultRow.className = 'qwen-result-row qwen-reviewing';
      resultRow.innerHTML =
        `<span>🔄</span>` +
        `<span class="qwen-result-value" title="${safeValue}">${safeValue}</span>` +
        `<span class="qwen-result-type">${d.type}</span>` +
        `<span class="qwen-result-label">Reviewing…</span>`;
      resultsList.appendChild(resultRow);
      resultsList.scrollTop = resultsList.scrollHeight;
    }

    // Multi-sentence context: hop back two sentence boundaries before the entity
    // and forward two after, so Qwen sees the preceding sentence, the entity's
    // full sentence, and the following sentence.
    const txt = currentOriginalText;
    const SENT = /[.!?\n]/;

    // Hop 1 backward → start of entity's own sentence
    let sentStart = 0;
    for (let p = d.start - 1; p >= 0; p--) {
      if (SENT.test(txt[p])) { sentStart = p + 1; break; }
    }
    // Hop 2 backward → start of the preceding sentence
    let winStart = 0;
    if (sentStart > 1) {
      for (let p = sentStart - 2; p >= Math.max(0, sentStart - 400); p--) {
        if (SENT.test(txt[p])) { winStart = p + 1; break; }
      }
    }
    // Hop 1 forward → end of entity's own sentence
    let sentEnd = txt.length;
    for (let p = d.end; p < txt.length; p++) {
      if (SENT.test(txt[p])) { sentEnd = p + 1; break; }
    }
    // Hop 2 forward → end of the following sentence
    let winEnd = txt.length;
    for (let p = sentEnd; p < Math.min(txt.length, sentEnd + 400); p++) {
      if (SENT.test(txt[p])) { winEnd = p + 1; break; }
    }
    const localCtx =
      txt.slice(winStart, d.start).trimStart() +
      '<<<' + d.value + '>>>' +
      txt.slice(d.end, winEnd).trimEnd();

    const keep = await window.qwenClassifier.classify(d.value, d.type, localCtx, d.confidence);

    // Update the result row to its final verdict
    if (resultRow) {
      resultRow.className = `qwen-result-row ${keep ? 'qwen-confirmed' : 'qwen-discarded'}`;
      resultRow.innerHTML =
        `<span>${keep ? '✅' : '❌'}</span>` +
        `<span class="qwen-result-value" title="${safeValue}">${safeValue}</span>` +
        `<span class="qwen-result-type">${d.type}</span>` +
        `<span class="qwen-result-label">${keep ? 'Confirmed PII' : 'False positive'}</span>`;
    }

    currentDetections[origIdx] = { ...d, method: d.method + '+qwen' };

    if (!keep) {
      excludedDetections.add(origIdx);
      const row = document.querySelector(`.detection-row[data-idx="${origIdx}"]`);
      if (row) {
        row.classList.add('excluded');
        const cb = row.querySelector('.det-checkbox');
        if (cb) cb.checked = false;
      }
    } else {
      const row = document.querySelector(`.detection-row[data-idx="${origIdx}"]`);
      if (row) {
        const header = row.querySelector('.det-header');
        if (header && !header.querySelector('.qwen-badge')) {
          const badge = document.createElement('span');
          badge.className = 'qwen-badge';
          badge.title = 'Confirmed by Qwen';
          badge.textContent = '🤖';
          badge.style.cssText = 'font-size:0.72rem;color:#6d28d9;';
          header.appendChild(badge);
        }
      }
    }

    updateRedactionCounter();
  }

  if (progressEl) {
    progressEl.textContent = `✅ Review complete — ${batch.length} detection${batch.length !== 1 ? 's' : ''} reviewed.`;
  }

  // Rebuild so exclusions, badges, counts, and panel state reflect the review.
  rerenderResults();
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Card collapse/expand
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.card-toggle');
  if (!btn) return;
  e.stopPropagation();
  const card = btn.closest('.card');
  if (card) {
    card.classList.toggle('card-collapsed');
    btn.title = card.classList.contains('card-collapsed') ? 'Expand' : 'Collapse';
  }
});

// Privacy Policy link - open in new tab
document.getElementById('privacyPolicyLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://github.com/your-org/local-pii-masking/blob/main/PRIVACY_POLICY.md' });
});

document.getElementById('maskPreviewToggle').addEventListener('click', () => {
  editorMaskedView = !editorMaskedView;
  document.getElementById('maskPreviewToggle').textContent =
    editorMaskedView ? 'Show Original' : 'Show Masked';
  renderDocumentEditor();
});

document.getElementById('maskingStrategy').addEventListener('change', () => {
  if (editorMaskedView) renderDocumentEditor();
});

document.getElementById('uploadZone').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('changeFileBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('clearDocumentLink').addEventListener('click', () => {
  // Reset file UI
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('uploadZone').style.display = 'block';
  document.getElementById('fileInput').value = '';
  
  // Toggle header back to default state
  document.getElementById('headerDefault').classList.add('active');
  document.getElementById('headerFile').classList.remove('active');
  
  // Show features list when file is cleared
  document.getElementById('featuresList').style.display = 'block';

  // Reset detection state
  currentDetections = [];
  currentOriginalText = '';
  currentFormattedHtml = null;
  editorViewMode = 'plain';
  pdfCanvasCache = null;
  excludedDetections = new Set();
  activeCategory = 'All';
  currentFilename = '';
  window.currentFile = null;

  // Hide results and restore editor placeholder
  document.getElementById('resultsCard').style.display = 'none';
  document.getElementById('riskCard').style.display = 'none';
  const ph = document.getElementById('editorPlaceholder');
  const tb = document.getElementById('editorToolbar');
  const ed = document.getElementById('documentEditor');
  if (ph) ph.style.display = '';
  if (tb) tb.style.display = 'none';
  if (ed) { ed.style.display = 'none'; ed.innerHTML = ''; }

  editorMaskedView = false;
  const mptClear = document.getElementById('maskPreviewToggle');
  if (mptClear) { mptClear.style.display = 'none'; mptClear.textContent = 'Show Masked'; }

  // Clear Qwen review state
  const qrl = document.getElementById('qwenResultsList');
  if (qrl) qrl.innerHTML = '';
  const qrp = document.getElementById('qwenReviewProgress');
  if (qrp) qrp.textContent = '';
  const qwenSection = document.getElementById('qwenSection');
  if (qwenSection) qwenSection.style.display = 'none';

  hideStatus();
});

document.getElementById('fileInput').addEventListener('change', async (e) => {
  if (!e.target.files[0]) return;

  const file = e.target.files[0];
  currentFilename = file.name;
  resetSyntheticData();
  window.currentFile = file; // Store for later use
  window.currentFileType = file.type;

  // Validate file size (30MB limit)
  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    showStatus(`File too large (${fileSizeMB}MB). Maximum file size is 30MB.`, 'error');
    return;
  }

  // Show file info instead of upload zone
  document.getElementById('uploadZone').style.display = 'none';
  document.getElementById('fileInfo').style.display = 'block';
  
  // Toggle header to file info state
  document.getElementById('headerDefault').classList.remove('active');
  document.getElementById('headerFile').classList.add('active');
  document.getElementById('headerFileName').textContent = file.name;
  
  // Hide features list when file is loaded
  document.getElementById('featuresList').style.display = 'none';
  
  document.getElementById('fileName').textContent = file.name;
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const fileSizeKB = (file.size / 1024).toFixed(0);
  const fileSizeText = file.size > 1024 * 1024
    ? `${fileSizeMB} MB`
    : `${fileSizeKB} KB`;
  document.getElementById('fileSize').textContent = fileSizeText;
  document.getElementById('headerFileMeta').textContent = fileSizeText;

  hideStatus();
  showProgress(true, 'Parsing document...');

  // Create history item for this file
  createHistoryItem(file.name, file.size, file.type);

  try {
    // Parse document
    currentOriginalText = await parseDocument(file);

    // For DOCX: extract formatted HTML using mammoth.convertToHtml() so the
    // editor panel can offer a Formatted view that mirrors the original Word layout.
    currentFormattedHtml = null;
    editorViewMode = 'plain';
    const _fileExt  = file.name.split('.').pop().toLowerCase();
    const _isDocx   = _fileExt === 'docx' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (_isDocx && window.mammoth && window.DOCXHandler?._lastBuffer) {
      try {
        const _htmlResult = await window.mammoth.convertToHtml(
          { arrayBuffer: window.DOCXHandler._lastBuffer }
        );
        if (_htmlResult.value && _htmlResult.value.trim()) {
          currentFormattedHtml = _htmlResult.value;
          editorViewMode = 'formatted'; // default to formatted view for DOCX
        }
      } catch (e) {
        console.warn('[DOCX] convertToHtml failed, formatted view unavailable:', e);
      }
    }

    // Start timing detection
    detectionStartTime = Date.now();
    showProgress(true, 'Detecting PII...');

    // Detect PII (regex + NER if available)
    const detectionResult = await detectAllPII(currentOriginalText);
    currentDetections = detectionResult.detections;
    const modelsInfo = detectionResult.modelsInfo;

    // End timing detection
    detectionEndTime = Date.now();
    const totalTimeMs = detectionEndTime - detectionStartTime; // Keep in milliseconds
    const totalTimeSec = totalTimeMs / 1000; // Convert to seconds for history

    // Update history with detection results (uses seconds)
    updateHistoryWithDetections(currentDetections, totalTimeSec, modelsInfo);

    showProgress(false);
    displayResults(currentDetections);

    // Show success message with total time (uses milliseconds for formatElapsedTime)
    const detectionCount = currentDetections.length;
    const timeStr = formatElapsedTime(totalTimeMs);
    showStatus(
      `✅ Detected ${detectionCount} PII item${detectionCount !== 1 ? 's' : ''} in ${timeStr}`,
      'success'
    );

    // Update download button text based on file type
    const downloadBtn = document.getElementById('downloadMasked');
    const mdBtn = document.getElementById('downloadMarkdown');
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      downloadBtn.textContent = 'Download Redacted PDF';
      if (mdBtn) mdBtn.style.display = 'none';
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      downloadBtn.textContent = 'Download Redacted DOCX';
      if (mdBtn) mdBtn.style.display = '';
    } else {
      downloadBtn.textContent = 'Download Masked';
      if (mdBtn) mdBtn.style.display = '';
    }

  } catch (error) {
    showProgress(false);
    showStatus(`Error: ${error.message}`, 'error');
    console.error(error);
  }
});

document.getElementById('downloadMasked').addEventListener('click', async () => {
  if (!currentDetections || currentDetections.length === 0) {
    showStatus('No masked document available', 'error');
    return;
  }

  try {
    // Check file type
    const isPDF = window.currentFileType === 'application/pdf' ||
                  (currentFilename && currentFilename.endsWith('.pdf'));
    const isDOCX = window.currentFileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   (currentFilename && currentFilename.endsWith('.docx'));

    if (isPDF && window.currentPDFData) {
      const strategy = document.getElementById('maskingStrategy').value;
      const isRedaction = strategy === 'REDACTION';
      showProgress(true, isRedaction
        ? 'Flattening PDF and removing PII text completely...'
        : 'Creating masked PDF with highlighted replacements...');

      const enrichedDetections = withReplacements(getFilteredDetections(), strategy);
      const pdfBlob = await window.pdfHandler.createRedactedPDF(
        window.currentPDFData.arrayBuffer,
        enrichedDetections,
        window.currentPDFData.textItems,
        strategy
      );

      showProgress(false);

      // Download the redacted PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const downloadFilename = `redacted_${currentFilename || 'document.pdf'}`;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);

      // Update history with download info
      updateHistoryWithDownload(downloadFilename, strategy);

      // Cache the redacted file for re-download
      if (currentHistoryItem) {
        await cacheRedactedFile(currentHistoryItem.id, pdfBlob, downloadFilename);
      }

      showStatus(`✅ PDF downloaded (${CONFIG.masking.strategies[strategy].name}) — flattened to images`, 'success');
      console.log(`[PDF] ℹ️  Strategy: ${strategy} — PDF flattened to images`);
      console.log('[PDF] ℹ️  File size may be larger than original (images vs text)');
    } else if (isDOCX && window.DOCXHandler) {
      const strategy = document.getElementById('maskingStrategy').value;
      const isRedaction = strategy === 'REDACTION';
      showProgress(true, isRedaction
        ? 'Creating redacted Word document with black boxes...'
        : 'Creating masked Word document with highlighted replacements...');

      const enrichedDetections = withReplacements(getFilteredDetections(), strategy);
      const docxBlob = window.DOCXHandler.createRedactedDOCX(
        enrichedDetections,
        currentFilename,
        currentOriginalText,
        strategy
      );

      showProgress(false);

      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      const downloadFilename = `masked_${currentFilename || 'document.docx'}`;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);

      updateHistoryWithDownload(downloadFilename, strategy);

      // Cache the redacted file for re-download
      if (currentHistoryItem) {
        await cacheRedactedFile(currentHistoryItem.id, docxBlob, downloadFilename);
      }

      showStatus(`✅ Word document downloaded (${CONFIG.masking.strategies[strategy].name})`, 'success');
      console.log(`[DOCX] ℹ️  Strategy: ${strategy}`);
    } else {
      // Download masked text file (computed at download time so it respects type toggles).
      // When editorMaskedView is active, getMaskedTextFromEditor would read replacement
      // text that is already in the DOM and re-apply the format, producing wrong output.
      // Always derive the content from the source text in that case.
      const strategy = document.getElementById('maskingStrategy').value;
      const editorMasked = editorMaskedView ? null : getMaskedTextFromEditor(strategy);
      const maskedContent = editorMasked
        ?? maskPII(currentOriginalText, getFilteredDetections(), strategy).content;
      const blob = new Blob([maskedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const downloadFilename = `masked_${currentFilename || 'document.txt'}`;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);

      // Update history with download info
      updateHistoryWithDownload(downloadFilename, strategy);

      // Cache the redacted file for re-download
      if (currentHistoryItem) {
        await cacheRedactedFile(currentHistoryItem.id, blob, downloadFilename);
      }

      showStatus('Masked document downloaded', 'success');
    }
  } catch (error) {
    showProgress(false);
    showStatus(`Error creating masked document: ${error.message}`, 'error');
    console.error('Download error:', error);
  }
});

document.getElementById('downloadReport').addEventListener('click', () => {
  const filtered = getFilteredDetections();
  if (filtered.length === 0) {
    showStatus('No detections to report', 'error');
    return;
  }

  const report = {
    reportId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    document: {
      name: currentFilename,
      size: currentOriginalText.length
    },
    summary: {
      totalDetections: filtered.length,
      byType: {}
    },
    detections: filtered.map(d => ({
      type: d.type,
      method: getMethodLabel(d.method),
      confidence: d.confidence,
      location: getLocationString(d.start),
      position: {
        start: d.start,
        end: d.end
      },
      hash: d.hash
    }))
  };

  filtered.forEach(d => {
    report.summary.byType[d.type] = (report.summary.byType[d.type] || 0) + 1;
  });

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pii-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showStatus('Report downloaded', 'success');
});

document.getElementById('downloadMarkdown').addEventListener('click', () => {
  if (!currentDetections || currentDetections.length === 0) {
    showStatus('No detections available', 'error');
    return;
  }

  try {
    const strategy = document.getElementById('maskingStrategy').value;

    // Build Markdown source from mammoth HTML when available (DOCX), otherwise
    // fall back to the plain originalText (TXT files).
    let mdSource;
    if (currentFormattedHtml) {
      mdSource = htmlToMarkdown(currentFormattedHtml);
    } else if (currentOriginalText) {
      mdSource = currentOriginalText;
    } else {
      showStatus('No document content available', 'error');
      return;
    }

    const maskedMd = maskMarkdown(mdSource, strategy);

    const baseName = (currentFilename || 'document').replace(/\.[^.]+$/, '');
    const downloadFilename = `masked_${baseName}.md`;

    const blob = new Blob([maskedMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    a.click();
    URL.revokeObjectURL(url);

    showStatus(`✅ Markdown downloaded (${CONFIG.masking.strategies[strategy].name})`, 'success');
  } catch (error) {
    showStatus(`Error creating Markdown: ${error.message}`, 'error');
    console.error('Markdown download error:', error);
  }
});

// Type toggle cards — event delegation on #summary
document.getElementById('summary').addEventListener('click', (e) => {
  const card = e.target.closest('.summary-card');
  if (!card || !card.dataset.type) return;
  const type = card.dataset.type;
  if (selectedTypes.has(type)) {
    selectedTypes.delete(type);
    card.classList.replace('enabled', 'disabled');
  } else {
    selectedTypes.add(type);
    card.classList.replace('disabled', 'enabled');
  }
  // Update row visibility and checkbox state in detection list
  document.querySelectorAll(`.detection-row[data-type="${CSS.escape(type)}"]`).forEach(row => {
    const isEnabled = selectedTypes.has(type);
    row.classList.toggle('type-hidden', !isEnabled);
    const cb = row.querySelector('.det-checkbox');
    if (cb) cb.disabled = !isEnabled;
  });
  // Recount visible
  const catDetections = activeCategory === 'All'
    ? currentDetections
    : currentDetections.filter(d => (CATEGORY_MAP[d.type] || 'Universal') === activeCategory);
  const visibleCount = catDetections.filter(d => selectedTypes.has(d.type)).length;
  const label = document.getElementById('visibleCountLabel');
  if (label) label.innerHTML = `<b>${visibleCount}</b> detection${visibleCount !== 1 ? 's' : ''} visible`;
  updateRedactionCounter();
  renderDocumentEditor();
});

// Category tab clicks — event delegation on #categoryTabs
document.getElementById('categoryTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.cat-tab');
  if (!tab) return;
  activeCategory = tab.dataset.cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t === tab));
  rerenderResults();
});

// Per-detection checkbox — event delegation on #detectionsList
document.getElementById('detectionsList').addEventListener('change', (e) => {
  const cb = e.target.closest('.det-checkbox');
  if (!cb) return;
  const idx = parseInt(cb.dataset.idx, 10);
  const row = cb.closest('.detection-row');
  if (cb.checked) {
    excludedDetections.delete(idx);
    if (row) row.classList.remove('excluded');
  } else {
    excludedDetections.add(idx);
    if (row) row.classList.add('excluded');
  }
  updateRedactionCounter();
  updateEditorHighlight(idx, cb.checked);
});

// Detection row body click → scroll editor / remove manual detection
document.getElementById('detectionsList').addEventListener('click', (e) => {
  // Manual remove button
  const removeBtn = e.target.closest('.det-manual-remove');
  if (removeBtn) {
    removeManualDetection(parseInt(removeBtn.dataset.idx, 10));
    return;
  }
  if (e.target.closest('.det-checkbox')) return;
  const row = e.target.closest('.detection-row');
  if (!row) return;
  const idx = parseInt(row.dataset.idx, 10);
  scrollEditorToDetection(idx);
});

// Editor clicks: X dismiss button or mark body (handles use mousedown/mousemove/mouseup)
document.getElementById('documentEditor').addEventListener('click', (e) => {
  // Ignore clicks that started as a drag
  if (_dragState !== null) return;

  // ── X button: remove manual detection OR uncheck auto detection ──────────
  if (e.target.closest('.det-dismiss')) {
    const mark = e.target.closest('.det-highlight');
    if (!mark) return;
    const idx = parseInt(mark.dataset.idx, 10);
    const det = currentDetections[idx];

    if (det?.manual) {
      // Permanently remove manual detections
      removeManualDetection(idx);
      return;
    }

    excludedDetections.add(idx);
    updateEditorHighlight(idx, false);

    const cb = document.querySelector(`.detection-row[data-idx="${idx}"] .det-checkbox`);
    if (cb) cb.checked = false;
    const row = document.querySelector(`.detection-row[data-idx="${idx}"]`);
    if (row) row.classList.add('excluded');

    // Learn: this value+type was explicitly dismissed as not PII in context
    if (det) {
      savePIICorrection({ type: det.type, method: det.method,
        originalValue: det.value, correctedValue: '', action: 'suppress' });
    }

    updateRedactionCounter();
    return;
  }

  // Ignore clicks on drag handles (handled by mousedown)
  if (e.target.closest('.det-handle')) return;

  // ── Mark body click: highlight mark + scroll detection row into view ──────
  const mark = e.target.closest('.det-highlight');
  if (!mark) return;
  const idx = parseInt(mark.dataset.idx, 10);
  const row = document.querySelector(`.detection-row[data-idx="${idx}"]`);
  if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setActiveDetection(idx);
});

// ── Drag-to-resize: mousedown starts a drag on a handle ──────────────────────
document.getElementById('documentEditor').addEventListener('mousedown', (e) => {
  const handle = e.target.closest('.det-handle');
  if (!handle) return;
  e.preventDefault(); // prevent text-selection cursor during drag

  const mark = handle.closest('.det-highlight');
  if (!mark) return;
  const idx  = parseInt(mark.dataset.idx, 10);
  const det  = currentDetections[idx];
  if (!det) return;

  const side = handle.classList.contains('det-handle-left') ? 'left' : 'right';

  if (editorViewMode === 'formatted') {
    // In formatted mode the DOM text offsets don't align with currentOriginalText,
    // so use pixel-delta drag: measure px/char at drag-start and convert mouse
    // movement to character count throughout the drag.
    const rect = mark.getBoundingClientRect();
    const charWidth = det.value.length > 0 ? rect.width / det.value.length : 8;
    _dragState = { idx, side, origStart: det.start, origEnd: det.end,
                   startClientX: e.clientX, charWidth, originalValue: det.value };
  } else {
    _dragState = { idx, side, origStart: det.start, origEnd: det.end, originalValue: det.value };
  }

  document.body.style.cursor = 'ew-resize';
  setActiveDetection(idx);
});

// ── Drag-to-resize: mousemove updates the boundary (throttled to ~30 fps) ────
document.addEventListener('mousemove', (e) => {
  if (!_dragState || _dragThrottle) return;
  _dragThrottle = setTimeout(() => { _dragThrottle = null; }, 33);

  const { idx, side, origStart, origEnd } = _dragState;
  const det = currentDetections[idx];
  if (!det || !currentOriginalText) return;

  // Adjacent-detection boundaries (anchored to origStart/origEnd so we don't
  // chase a moving target as the mark shrinks/grows during drag).
  const prevEnd = currentDetections.reduce(
    (max, d, i) => (i !== idx && d.end <= origStart ? Math.max(max, d.end) : max), 0
  );
  const nextStart = currentDetections.reduce(
    (min, d, i) => (i !== idx && d.start >= origEnd ? Math.min(min, d.start) : min),
    currentOriginalText.length
  );

  let newStart = det.start, newEnd = det.end;

  if (editorViewMode === 'formatted') {
    // Formatted mode: the DOM text doesn't align with currentOriginalText offsets,
    // so translate pixel movement → character count using the initial px/char ratio.
    const { startClientX, charWidth } = _dragState;
    const charDelta = Math.round((e.clientX - startClientX) / (charWidth || 8));
    if (side === 'left') {
      newStart = Math.max(prevEnd,    Math.min(origStart + charDelta, origEnd - 1));
    } else {
      newEnd   = Math.min(nextStart,  Math.max(origEnd   + charDelta, origStart + 1));
    }
  } else {
    // Plain mode: map cursor screen position directly to a currentOriginalText offset.
    const rawOffset = getEditorOffsetFromPoint(e.clientX, e.clientY);
    if (rawOffset === null) return;
    if (side === 'left') {
      newStart = Math.max(prevEnd,   Math.min(rawOffset, det.end - 1));
    } else {
      newEnd   = Math.min(nextStart, Math.max(rawOffset, det.start + 1));
    }
  }

  if (newStart === det.start && newEnd === det.end) return;

  det.start = newStart;
  det.end   = newEnd;
  det.value = currentOriginalText.slice(newStart, newEnd);

  renderDocumentEditor(); // preserves activeDetectionIdx via savedActiveIdx
  document.body.style.cursor = 'ew-resize'; // restore after re-render
});

// ── Drag-to-resize: mouseup commits the final boundary ───────────────────────
document.addEventListener('mouseup', () => {
  if (!_dragState) return;
  const { idx, originalValue } = _dragState;   // capture before clearing
  _dragState = null;
  document.body.style.cursor = '';

  const det = currentDetections[idx];
  if (!det) return;

  // If the user actually changed the boundary, record the correction.
  if (originalValue !== undefined && det.value !== originalValue) {
    savePIICorrection({
      type:           det.type,
      method:         det.method,
      originalValue,
      correctedValue: det.value,
      action:         det.value.length > originalValue.length ? 'expand' : 'contract',
    });
  }

  // Final re-render + scroll to adjusted mark
  renderDocumentEditor();
  const editor = document.getElementById('documentEditor');
  const newMark = editor?.querySelector(`.det-highlight[data-idx="${idx}"]`);
  if (newMark) newMark.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Update context snippet in the detection list
  _updateRowContext(idx);
});

// ── Manual selection: show toolbar when user selects text in the editor ───────
document.getElementById('documentEditor').addEventListener('mouseup', (e) => {
  // Ignore if a resize drag just ended
  if (_dragState) return;
  // PDF mode handles its own selection via handlePDFTextSelection()
  if (document.getElementById('documentEditor').classList.contains('pdf-canvas-mode')) return;

  // Small delay so the browser has settled the selection
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideManualToolbar(); return; }

    const range = sel.getRangeAt(0);
    const editor = document.getElementById('documentEditor');
    if (!editor || !editor.contains(range.commonAncestorContainer)) { hideManualToolbar(); return; }

    let start, end;

    if (editorViewMode === 'formatted') {
      // In formatted mode the DOM is nested HTML, so DOM offsets don't map
      // directly to currentOriginalText positions.  Instead:
      //  1. Get the raw selected string from the browser.
      //  2. Use the injected det-highlight marks that bracket the selection as
      //     anchors — their det.start/det.end are exact positions in
      //     currentOriginalText, giving us a bounded search window.
      //  3. indexOf(selectedStr, searchStart) within that window.
      const selectedStr = sel.toString();
      if (!selectedStr.trim()) { hideManualToolbar(); return; }

      // Find the nearest marks before and after the selection start in the DOM.
      let searchStart = 0;
      let searchEnd   = currentOriginalText.length;
      const allMarks  = Array.from(editor.querySelectorAll('.det-highlight'));
      for (const mark of allMarks) {
        const pos = range.startContainer.compareDocumentPosition(mark);
        const det = currentDetections[parseInt(mark.dataset.idx, 10)];
        if (!det) continue;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
          // mark is before the selection start → tighten lower bound
          searchStart = Math.max(searchStart, det.end);
        } else if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
          // mark is after the selection start → tighten upper bound
          searchEnd = Math.min(searchEnd, det.start);
          break; // marks are in DOM order; first following mark is the nearest
        }
      }

      const pos = currentOriginalText.indexOf(selectedStr, searchStart);
      if (pos === -1 || pos > searchEnd) {
        hideManualToolbar(); return;
      }
      start = pos;
      end   = pos + selectedStr.length;
      _manualFormattedValue = selectedStr; // preserve exact mammoth text for injectFormattedMarks
    } else {
      // Plain mode: walk direct editor children to map DOM offsets → text offsets.
      start = getRangeEndpointOffset(range.startContainer, range.startOffset);
      end   = getRangeEndpointOffset(range.endContainer,   range.endOffset);
      if (start === null || end === null) { hideManualToolbar(); return; }
      _manualFormattedValue = null;
    }

    if (start >= end) { hideManualToolbar(); return; }
    if (!currentOriginalText.slice(start, end).trim()) { hideManualToolbar(); return; }

    _manualSelection = { start, end };
    showManualToolbar(range.getBoundingClientRect());
  }, 10);
});

// Hide toolbar when clicking outside it (but not inside the editor while selecting)
document.addEventListener('mousedown', (e) => {
  const toolbar = document.getElementById('manualAddToolbar');
  if (toolbar && !toolbar.contains(e.target)) hideManualToolbar();
});

// Custom type input visibility
document.getElementById('manualPiiType').addEventListener('change', () => {
  const sel = document.getElementById('manualPiiType');
  const inp = document.getElementById('manualPiiTypeCustom');
  inp.style.display = sel.value === 'CUSTOM' ? 'inline-block' : 'none';
  if (sel.value === 'CUSTOM') inp.focus();
});

// Add button
document.getElementById('manualAddBtn').addEventListener('click', () => {
  if (!_manualSelection) return;
  const selEl = document.getElementById('manualPiiType');
  let type = selEl.value;
  if (type === 'CUSTOM') {
    type = (document.getElementById('manualPiiTypeCustom').value || '').trim().toUpperCase();
    if (!type) return;
  }
  addManualDetection(_manualSelection.start, _manualSelection.end, type, _manualFormattedValue);
  _manualFormattedValue = null;
  hideManualToolbar();
  // Clear the text selection
  window.getSelection()?.removeAllRanges();
});

// Cancel button
document.getElementById('manualCancelBtn').addEventListener('click', () => {
  hideManualToolbar();
  window.getSelection()?.removeAllRanges();
});


// Bulk action: Deselect LOW confidence detections (< 0.6, matching badge threshold)
document.getElementById('deselectLowBtn').addEventListener('click', () => {
  const catDetections = activeCategory === 'All'
    ? currentDetections
    : currentDetections.filter(d => (CATEGORY_MAP[d.type] || 'Universal') === activeCategory);
  catDetections.forEach(d => {
    if (d.confidence < 0.6) {
      const idx = currentDetections.indexOf(d);
      excludedDetections.add(idx);
      const row = document.querySelector(`.detection-row[data-idx="${idx}"]`);
      if (row) {
        row.classList.add('excluded');
        const cb = row.querySelector('.det-checkbox');
        if (cb) cb.checked = false;
      }
      updateEditorHighlight(idx, false);
    }
  });
  updateRedactionCounter();
});

// Bulk action: Deselect MEDIUM confidence detections (0.6–0.89, matching badge threshold)
document.getElementById('deselectMediumBtn').addEventListener('click', () => {
  const catDetections = activeCategory === 'All'
    ? currentDetections
    : currentDetections.filter(d => (CATEGORY_MAP[d.type] || 'Universal') === activeCategory);
  catDetections.forEach(d => {
    if (d.confidence >= 0.6 && d.confidence < 0.9) {
      const idx = currentDetections.indexOf(d);
      excludedDetections.add(idx);
      const row = document.querySelector(`.detection-row[data-idx="${idx}"]`);
      if (row) {
        row.classList.add('excluded');
        const cb = row.querySelector('.det-checkbox');
        if (cb) cb.checked = false;
      }
      updateEditorHighlight(idx, false);
    }
  });
  updateRedactionCounter();
});

// Bulk action: Select all visible detections
document.getElementById('selectVisibleBtn').addEventListener('click', () => {
  const catDetections = activeCategory === 'All'
    ? currentDetections
    : currentDetections.filter(d => (CATEGORY_MAP[d.type] || 'Universal') === activeCategory);
  catDetections.forEach(d => {
    if (!selectedTypes.has(d.type)) return; // skip type-disabled detections
    const idx = currentDetections.indexOf(d);
    excludedDetections.delete(idx);
    const row = document.querySelector(`.detection-row[data-idx="${idx}"]`);
    if (row) {
      row.classList.remove('excluded');
      const cb = row.querySelector('.det-checkbox');
      if (cb) cb.checked = true;
    }
    updateEditorHighlight(idx, true);
  });
  updateRedactionCounter();
});

// Qwen review buttons
document.getElementById('qwenReviewTopBtn').addEventListener('click', () => {
  const limit = parseInt(document.getElementById('qwenReviewTopBtn').dataset.limit, 10);
  runQwenReview(limit);
});

document.getElementById('qwenReviewAllBtn').addEventListener('click', () => {
  const limit = parseInt(document.getElementById('qwenReviewAllBtn').dataset.limit, 10);
  runQwenReview(limit);
});

// ============================================================================
// LEARNED CORRECTIONS
// ============================================================================

/**
 * Persist a boundary correction made by the user.
 * Deduplicates on {type, originalValue, correctedValue} — repeated identical
 * corrections increment a count rather than create a new record.
 */
async function savePIICorrection({ type, method, originalValue, correctedValue, action }) {
  try {
    const stored     = await chrome.storage.local.get('pii_corrections');
    const corrections = stored.pii_corrections ?? [];

    const existing = corrections.find(
      c => c.type === type && c.originalValue === originalValue && c.correctedValue === correctedValue
    );
    if (existing) {
      existing.count    = (existing.count ?? 1) + 1;
      existing.lastSeen = new Date().toISOString();
    } else {
      corrections.push({
        id:             `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        savedAt:        new Date().toISOString(),
        lastSeen:       new Date().toISOString(),
        count:          1,
        type, method, originalValue, correctedValue, action,
      });
    }

    await chrome.storage.local.set({ pii_corrections: corrections });
    loadedCorrections = corrections;
    renderCorrectionsCard(corrections);
  } catch (e) {
    console.warn('[Corrections] Failed to save:', e);
  }
}

async function deletePIICorrection(id) {
  try {
    const stored      = await chrome.storage.local.get('pii_corrections');
    const corrections = (stored.pii_corrections ?? []).filter(c => c.id !== id);
    await chrome.storage.local.set({ pii_corrections: corrections });
    loadedCorrections = corrections;
    renderCorrectionsCard(corrections);
  } catch (e) {
    console.warn('[Corrections] Failed to delete:', e);
  }
}

function renderCorrectionsCard(corrections) {
  const card  = document.getElementById('correctionsCard');
  const list  = document.getElementById('correctionsList');
  const badge = document.getElementById('correctionsBadge');
  if (!card || !list) return;

  card.style.display  = corrections.length > 0 ? 'block' : 'none';
  if (badge) badge.textContent = corrections.length > 0 ? String(corrections.length) : '';

  if (corrections.length === 0) {
    list.innerHTML = '<div class="corrections-empty">No training data yet. Manually add a detection, drag boundaries to adjust spans, or click × to mark something as not PII.</div>';
    return;
  }

  list.innerHTML = corrections.map(c => {
    const safeOrig  = c.originalValue.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const countHtml = c.count > 1
      ? `<span class="correction-count">×${c.count}</span>` : '';

    if (c.action === 'suppress') {
      return `
        <div class="correction-row">
          <span class="correction-type">${c.type}</span>
          <span class="correction-values">
            <span class="correction-original" style="text-decoration:none;">${safeOrig}</span>
            <span class="correction-arrow">→</span>
            <span class="correction-suppressed">not PII</span>
          </span>
          ${countHtml}
          <span class="correction-action" style="color:#dc2626;">suppress</span>
          <button class="correction-delete" data-correction-id="${c.id}" title="Remove">×</button>
        </div>`;
    }

    if (c.action === 'custom') {
      return `
        <div class="correction-row">
          <span class="correction-type">${c.type}</span>
          <span class="correction-values">
            <span class="correction-original" style="text-decoration:none;">${safeOrig}</span>
            <span class="correction-arrow">→</span>
            <span class="correction-custom">always detect</span>
          </span>
          ${countHtml}
          <span class="correction-action" style="color:#0369a1;">custom</span>
          <button class="correction-delete" data-correction-id="${c.id}" title="Remove">×</button>
        </div>`;
    }

    const safeCorr = (c.correctedValue || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="correction-row">
        <span class="correction-type">${c.type}</span>
        <span class="correction-values">
          <span class="correction-original">${safeOrig}</span>
          <span class="correction-arrow">→</span>
          <span class="correction-corrected">${safeCorr}</span>
        </span>
        ${countHtml}
        <span class="correction-action">${c.action}</span>
        <button class="correction-delete" data-correction-id="${c.id}" title="Remove">×</button>
      </div>`;
  }).join('');
}

// History buttons
document.getElementById('clearHistory').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all processing history? This cannot be undone.')) {
    await clearHistory();
  }
});

document.getElementById('exportHistory').addEventListener('click', async () => {
  await exportHistory();
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Corrections card — delete individual / clear all
document.getElementById('correctionsList').addEventListener('click', e => {
  const btn = e.target.closest('.correction-delete');
  if (btn) deletePIICorrection(btn.dataset.correctionId);
});

document.getElementById('clearCorrections').addEventListener('click', async () => {
  if (confirm('Clear all learned corrections? This cannot be undone.')) {
    await chrome.storage.local.set({ pii_corrections: [] });
    loadedCorrections = [];
    renderCorrectionsCard([]);
  }
});

// Load and display history on startup
displayHistory();

// Load and display saved corrections on startup
chrome.storage.local.get('pii_corrections', result => {
  loadedCorrections = result.pii_corrections ?? [];
  renderCorrectionsCard(loadedCorrections);
});

// Both panels fill 100vh via CSS — no JS height sync needed.

// ============================================================================
// PANEL RESIZER
// ============================================================================

(function () {
  const resizer   = document.getElementById('panelResizer');
  const mainPanel = document.querySelector('.main-panel');
  if (!resizer || !mainPanel) return;

  const MIN_WIDTH = 360;
  const MAX_WIDTH = 600;

  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener('mousedown', (e) => {
    startX     = e.clientX;
    startWidth = mainPanel.offsetWidth;
    resizer.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!resizer.classList.contains('dragging')) return;
    const delta    = e.clientX - startX;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
    mainPanel.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!resizer.classList.contains('dragging')) return;
    resizer.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
  });
})();

// ============================================================================
// ML MODEL AUTO-LOADING
// ============================================================================

/**
 * Load ML model (called automatically on startup)
 */
async function loadMLModel() {
  const modelStatus = document.getElementById('modelStatus');
  const btn = document.getElementById('preloadBtn');

  // Check if already loaded (support both dual and single pipeline)
  const hasDualModels = window.nerPipelines && window.nerPipelines.english && window.nerPipelines.chinese;
  const hasSingleModel = window.nerPipeline;

  if ((hasDualModels || hasSingleModel) && CONFIG.detection.methods.ner) {
    console.log('[ML] Model(s) already loaded, skipping');
    // Hide status when model is ready (only show on error)
    modelStatus.style.display = 'none';
    modelStatus.classList.remove('active');
    if (btn) {
      btn.style.display = 'none'; // Hide retry button
      btn.disabled = true;
    }
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.style.display = 'none'; // Hide while loading
    }
    modelStatus.style.display = 'block';
    modelStatus.classList.add('active');
    modelStatus.textContent = 'Auto-loading ML model (step 1/4)...';

    // STEP 1: DISABLE WEB WORKERS COMPLETELY (CRITICAL for extension CSP)
    // Keep Workers disabled throughout the ENTIRE ML loading process
    const OriginalWorker = window.Worker;

    // Monkey-patch Worker to prevent ANY worker creation
    window.Worker = class {
      constructor(url, options) {
        console.warn('[ML] ⛔ Blocked Worker creation:', url);
        throw new Error('Workers disabled for Chrome extension compatibility');
      }
    };
    console.log('[ML] 🔒 Worker constructor DISABLED for ML loading');

    // STEP 2: Load and configure ONNX Runtime
    if (!window.ort) {
      const ortUrl = chrome.runtime.getURL('libs/onnx/ort.min.js');
      const script = document.createElement('script');
      script.src = ortUrl;

      await new Promise((resolve, reject) => {
        script.onload = () => {
          setTimeout(() => {
            if (window.ort) {
              // Configure for single-threaded mode
              window.ort.env.wasm.numThreads = 1;
              window.ort.env.wasm.simd = true;
              window.ort.env.wasm.proxy = false;
              window.ort.env.wasm.wasmPaths = chrome.runtime.getURL('libs/onnx/');

              console.log('[ML] ✓ ONNX configured:', {
                threads: window.ort.env.wasm.numThreads,
                proxy: window.ort.env.wasm.proxy
              });

              resolve();
            } else {
              reject(new Error('ONNX Runtime loaded but not available'));
            }
          }, 100);
        };
        script.onerror = () => reject(new Error('ONNX Runtime not found. Run: ./download-ml-libs.sh'));
        document.head.appendChild(script);
      });
    } else {
      window.ort.env.wasm.numThreads = 1;
      window.ort.env.wasm.simd = true;
      window.ort.env.wasm.proxy = false;
      window.ort.env.wasm.wasmPaths = chrome.runtime.getURL('libs/onnx/');
    }

    modelStatus.textContent = 'Loading bundled NER models from local files (step 3/4)...';

    // STEP 3: Use Custom NER Loader for DUAL models (English + Chinese)
    // MUST use chrome.runtime.getURL() for extension resources
    if (!window.nerPipelines) {
      console.log('[ML] Loading dual NER models (English + Chinese)...');

      // Show detailed model status
      const modelDetails = document.getElementById('modelDetails');
      const englishStatus = document.getElementById('englishNerStatus');
      const chineseStatus = document.getElementById('chineseNerStatus');

      if (modelDetails) modelDetails.style.display = 'block';

      // Initialize dual pipeline structure
      window.nerPipelines = {
        english: new window.PiiranhaLoader(),
        chinese: new window.CustomNERLoader()
      };

      // Load English NER model
      const englishModelPath = chrome.runtime.getURL('models/piiranha-v1');
      console.log('[ML] Loading English model from:', englishModelPath);
      modelStatus.textContent = 'Loading English model (step 3a/4)...';
      if (englishStatus) englishStatus.textContent = 'Loading...';

      await window.nerPipelines.english.load(englishModelPath);

      console.log('[ML] ✅ English model loaded successfully');
      if (englishStatus) englishStatus.textContent = '✅ piiranha-v1 · multilingual PII, 17 types';

      // Load Chinese NER model
      const chineseModelPath = chrome.runtime.getURL('models/bert-base-chinese-ner');
      console.log('[ML] Loading Chinese model from:', chineseModelPath);
      modelStatus.textContent = 'Loading Chinese model (step 3b/4)...';
      if (chineseStatus) chineseStatus.textContent = 'Loading...';

      await window.nerPipelines.chinese.load(chineseModelPath);

      console.log('[ML] ✅ Chinese model loaded successfully');
      if (chineseStatus) chineseStatus.textContent = '✅ bert-base-chinese-ner · persons, orgs & locations';

      console.log('[ML] ✅ Both noun entity recognition models (English + Chinese) initialized');
    }

    modelStatus.textContent = 'Initializing NER pipeline (step 4/4)...';

    // STEP 6: Restore Worker constructor AFTER everything is loaded
    window.Worker = OriginalWorker;
    console.log('[ML] 🔓 Worker constructor restored (ML fully loaded)');

    console.log('[ML] NER pipeline ready!');

    // Update config to enable NER
    CONFIG.detection.methods.ner = true;

    // Save model cache status
    try {
      await chrome.runtime.sendMessage({
        action: 'cacheModel'
      });
    } catch (e) {
      console.warn('Could not save model cache status:', e);
    }

    // Hide status when model loads successfully (only show on error)
    modelStatus.style.display = 'none';
    modelStatus.classList.remove('active');

    // Keep retry button hidden on success
    if (btn) {
      btn.style.display = 'none';
    }

    showStatus('✅ ML model auto-loaded! Detecting emails, IDs, phones, names, organizations, and locations.', 'success');

    // Attempt to load Qwen if it was previously downloaded
    const qwenInstalled = await isModelInDB('Qwen2.5-1.5B-Instruct').catch(() => false);
    if (qwenInstalled) {
      try {
        await loadQwenClassifier(document.getElementById('qwenStatus'));
        showStatus('✅ AI models loaded!', 'success');
      } catch (qErr) {
        // GPU unavailable — loadQwenClassifier already updated qwenStatus
        console.warn('[Qwen] Not activated (GPU unavailable):', qErr.message);
      }
    }

    console.log('[ML] Auto-load complete. Single-threaded mode, LOCAL bundled model (100% offline).');

  } catch (error) {
    // Show error status (only show modelStatus on errors)
    modelStatus.style.display = 'block';
    modelStatus.textContent = `✗ ML auto-load failed (regex detection still works)`;
    modelStatus.style.background = '#fee2e2';
    modelStatus.style.borderColor = '#ef4444';
    modelStatus.style.color = '#991b1b';
    modelStatus.classList.add('active');

    if (error.message.includes('download-ml-libs.sh')) {
      showStatus('⚠️ ML libraries not found. Run ./download-ml-libs.sh to enable ML. Regex detection works!', 'info');
    } else if (error.message.includes('Worker') || error.message.includes('blob')) {
      showStatus('⚠️ ML loading error. Regex detection works! Click retry button to try again.', 'info');
    } else {
      showStatus('⚠️ ML auto-load failed. Regex detection works! Click retry button to try again.', 'info');
    }

    console.error('[ML] Model loading error:', error);
    console.error('[ML] Error details:', error.message);
    console.error('[ML] Error stack:', error.stack);
    console.error('[ML] ONNX config:', window.ort?.env?.wasm);

    // Show retry button on error
    if (btn) {
      btn.disabled = false;
      btn.style.display = 'inline-block';
      btn.textContent = 'Retry Loading ML Model';
    }
  }
}

// Button click handler - manual retry
document.getElementById('preloadBtn').addEventListener('click', async () => {
  await loadMLModel();
});

/**
 * Check whether a model directory is present in the extension package
 * by probing its config.json.
 */
async function modelExists(modelDir) {
  try {
    const url = chrome.runtime.getURL(`models/${modelDir}/config.json`);
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// Saved reference to the original Worker constructor (for restoration after ONNX loads)
let _originalWorker = null;

/**
 * Prepare the ONNX Runtime for in-page inference.
 * Disables Workers (required for Manifest V3 CSP) and loads/configures ort.
 * Safe to call multiple times — subsequent calls reconfigure wasm paths only.
 */
async function loadONNXRuntime() {
  // Disable Worker (required for extension CSP compatibility)
  if (_originalWorker === null) {
    _originalWorker = window.Worker;
    window.Worker = class {
      constructor(url) {
        console.warn('[ML] ⛔ Blocked Worker creation:', url);
        throw new Error('Workers disabled for Chrome extension compatibility');
      }
    };
    console.log('[ML] 🔒 Worker constructor DISABLED');
  }

  if (!window.ort) {
    const ortUrl = chrome.runtime.getURL('libs/onnx/ort.min.js');
    const script = document.createElement('script');
    script.src = ortUrl;
    await new Promise((resolve, reject) => {
      script.onload = () => {
        setTimeout(() => {
          if (window.ort) {
            window.ort.env.wasm.numThreads = 1;
            window.ort.env.wasm.simd = true;
            window.ort.env.wasm.proxy = false;
            window.ort.env.wasm.wasmPaths = chrome.runtime.getURL('libs/onnx/');
            console.log('[ML] ✓ ONNX Runtime configured');
            resolve();
          } else {
            reject(new Error('ONNX Runtime loaded but not available'));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('ONNX Runtime not found'));
      document.head.appendChild(script);
    });
  } else {
    window.ort.env.wasm.numThreads = 1;
    window.ort.env.wasm.simd = true;
    window.ort.env.wasm.proxy = false;
    window.ort.env.wasm.wasmPaths = chrome.runtime.getURL('libs/onnx/');
  }
}

/**
 * Restore the Worker constructor that was saved by loadONNXRuntime().
 */
function restoreWorker() {
  if (_originalWorker !== null) {
    window.Worker = _originalWorker;
    _originalWorker = null;
    console.log('[ML] 🔓 Worker constructor restored');
  }
}

/**
 * Check both models (extension package + IndexedDB) and either show the
 * install UI or load the models from whichever source has them.
 */
async function initMLModels() {
  const [englishPkg, chinesePkg] = await Promise.all([
    modelExists('piiranha-v1'),
    modelExists('bert-base-chinese-ner')
  ]);
  const [englishDB, chineseDB, qwenDB] = await Promise.all([
    isModelInDB('piiranha-v1'),
    isModelInDB('bert-base-chinese-ner'),
    isModelInDB('Qwen2.5-1.5B-Instruct'),
  ]);

  const englishOk = englishPkg || englishDB;
  const chineseOk = chinesePkg || chineseDB;
  const qwenOk    = qwenDB; // Qwen is download-only (never bundled in extension package)

  if (!englishOk || !chineseOk || !qwenOk) {
    // Show setup card — all 3 models are required before the user can proceed
    const setupCard = document.getElementById('setupCard');
    if (setupCard) setupCard.style.display = 'block';

    // Mark whichever models are already present
    if (englishOk) markModelInstalled('piiranha-v1');
    if (chineseOk) markModelInstalled('bert-base-chinese-ner');
    if (qwenOk)   markModelInstalled('Qwen2.5-1.5B-Instruct');

    const modelStatus = document.getElementById('modelStatus');
    if (modelStatus) modelStatus.style.display = 'none';

    const missing = [
      !englishOk && 'English NER',
      !chineseOk && 'Chinese NER',
      !qwenOk && 'Qwen',
    ].filter(Boolean).join(', ');
    const plural = missing.includes(',') ? 's' : '';
    showStatus(`⚠️ ${missing} model${plural} not installed. Install all 3 models below to proceed.`, 'info');
    return;
  }

  // Both BERT models available in extension package — use the bundled fast path
  if (englishPkg && chinesePkg) {
    console.log('[ML] Both models in extension package, auto-loading...');
    loadMLModel().catch(err => console.error('[ML] Auto-load failed:', err));
    return;
  }

  // At least one BERT model is from IndexedDB — load via the DB path
  console.log('[ML] Loading models from IndexedDB cache...');
  const modelStatus = document.getElementById('modelStatus');
  const modelDetails = document.getElementById('modelDetails');
  const englishStatus = document.getElementById('englishNerStatus');
  const chineseStatus = document.getElementById('chineseNerStatus');
  const qwenStatus    = document.getElementById('qwenStatus');

  try {
    if (modelStatus) {
      modelStatus.style.display = 'block';
      modelStatus.classList.add('active');
      modelStatus.textContent = 'Loading ML models from local cache…';
    }

    await loadONNXRuntime();

    if (!window.nerPipelines) {
      window.nerPipelines = {
        english: new window.PiiranhaLoader(),
        chinese: new window.CustomNERLoader()
      };
    }
    if (modelDetails) modelDetails.style.display = 'block';

    // English model (piiranha-v1)
    if (englishStatus) englishStatus.textContent = 'Loading…';
    if (englishPkg) {
      await window.nerPipelines.english.load(chrome.runtime.getURL('models/piiranha-v1'));
    } else {
      const data = await loadModelFromDB('piiranha-v1');
      await window.nerPipelines.english.loadFromData(data);
    }
    if (englishStatus) englishStatus.textContent = '✅ piiranha-v1 · multilingual PII, 17 types';

    // Chinese BERT model
    if (chineseStatus) chineseStatus.textContent = 'Loading…';
    if (chinesePkg) {
      await window.nerPipelines.chinese.load(chrome.runtime.getURL('models/bert-base-chinese-ner'));
    } else {
      const data = await loadModelFromDB('bert-base-chinese-ner');
      await window.nerPipelines.chinese.loadFromData(data);
    }
    if (chineseStatus) chineseStatus.textContent = '✅ bert-base-chinese-ner · persons, orgs & locations';

    restoreWorker();
    CONFIG.detection.methods.ner = true;

    if (modelStatus) {
      modelStatus.style.display = 'none';
      modelStatus.classList.remove('active');
    }
    showStatus('✅ AI models loaded! Full PII detection active.', 'success');

    // Load Qwen — always present at this point (all 3 models are required before setup completes)
    if (qwenOk) {
      try {
        if (modelStatus) { modelStatus.style.display = 'block'; modelStatus.textContent = 'Loading Qwen classifier…'; }
        await loadQwenClassifier(qwenStatus);
        if (modelStatus) { modelStatus.style.display = 'none'; }
        showStatus('✅ AI models plus Qwen loaded!', 'success');
      } catch (qErr) {
        // loadQwenClassifier already set qwenStatus — just hide the loading spinner
        if (modelStatus) modelStatus.style.display = 'none';
      }
    }

  } catch (error) {
    console.error('[ML] DB model load failed:', error);
    restoreWorker();
    if (modelStatus) {
      modelStatus.style.display = 'block';
      modelStatus.textContent = '✗ ML load failed (regex detection still works)';
      modelStatus.style.background = '#fee2e2';
      modelStatus.style.borderColor = '#ef4444';
      modelStatus.style.color = '#991b1b';
      modelStatus.classList.add('active');
    }
    showStatus('⚠️ Failed to load ML models from cache. Regex detection works!', 'info');
  }
}

// ============================================================================
// IN-BROWSER MODEL INSTALL HANDLERS
// ============================================================================

/**
 * Update the install row for a model to show "✅ Installed" and hide progress.
 * @param {string} modelName  Key in MODEL_REGISTRY
 */
function markModelInstalled(modelName) {
  const UI_MAP = {
    'piiranha-v1':       { progressId: 'progressEnglish', btnId: 'installEnglishBtn' },
    'bert-base-chinese-ner':   { progressId: 'progressChinese', btnId: 'installChineseBtn' },
    'Qwen2.5-1.5B-Instruct':   { progressId: 'progressQwen',   btnId: 'installQwenBtn'    },
  };
  const ids = UI_MAP[modelName];
  if (!ids) return;

  const progressEl = document.getElementById(ids.progressId);
  if (progressEl) progressEl.style.display = 'none';

  const btn = document.getElementById(ids.btnId);
  if (btn) {
    const badge = document.createElement('span');
    badge.className = 'model-installed';
    badge.textContent = '✅ Installed';
    btn.replaceWith(badge);
  }
}

/**
 * Download a model, show progress, then auto-load if both models are ready.
 */
async function runInstall(modelName, progressId, fillId, labelId, btnId) {
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = true;

  const progressEl = document.getElementById(progressId);
  if (progressEl) progressEl.style.display = 'block';

  try {
    const customBase = getCustomBaseUrl(modelName);
    await downloadModel(modelName, (filePath, received, total) => {
      const pct = total ? Math.round(received / total * 100) : 0;
      const mb = (received / 1048576).toFixed(1);
      const totalMb = total ? (total / 1048576).toFixed(0) : '?';
      const fillEl = document.getElementById(fillId);
      const labelEl = document.getElementById(labelId);
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (labelEl) {
        labelEl.textContent = filePath.includes('.onnx')
          ? `Downloading model… ${mb} MB / ${totalMb} MB`
          : `Downloading ${filePath}…`;
      }
    }, customBase);

    markModelInstalled(modelName);

    // After any individual install, check whether all 3 models are now present.
    // Only then hide the setup card and proceed — all 3 are required.
    const [englishReady, chineseReady, qwenReady] = await Promise.all([
      Promise.any([
        modelExists('piiranha-v1').then(ok => { if (!ok) throw 0; return true; }),
        isModelInDB('piiranha-v1').then(ok => { if (!ok) throw 0; return true; })
      ]).catch(() => false),
      Promise.any([
        modelExists('bert-base-chinese-ner').then(ok => { if (!ok) throw 0; return true; }),
        isModelInDB('bert-base-chinese-ner').then(ok => { if (!ok) throw 0; return true; })
      ]).catch(() => false),
      isModelInDB('Qwen2.5-1.5B-Instruct'),
    ]);

    if (englishReady && chineseReady && qwenReady) {
      const setupCard = document.getElementById('setupCard');
      if (setupCard) setupCard.style.display = 'none';
      showStatus('✅ All models installed! Loading now…', 'success');
      await initMLModels();
    } else {
      const stillMissing = [
        !englishReady && 'English NER',
        !chineseReady && 'Chinese NER',
        !qwenReady && 'Qwen',
      ].filter(Boolean).join(', ');
      showStatus(`✅ ${MODEL_REGISTRY[modelName].label} installed. Still needed: ${stillMissing}.`, 'info');
    }

  } catch (error) {
    console.error('[Install] Download failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = 'Retry'; }
    showStatus(`❌ Download failed: ${error.message}`, 'error');
  }
}

// Network settings toggle
document.getElementById('networkSettingsToggle').addEventListener('click', () => {
  const panel = document.getElementById('networkSettingsPanel');
  const btn = document.getElementById('networkSettingsToggle');
  const opening = panel.style.display === 'none';
  panel.style.display = opening ? 'block' : 'none';
  btn.textContent = opening ? '⚙ Network settings ▾' : '⚙ Network settings ▸';
});

// Persist the mirror URL so it survives popup close/reopen during a failed install
document.getElementById('proxyBaseUrl').addEventListener('change', (e) => {
  chrome.storage.local.set({ proxyBaseUrl: e.target.value.trim() });
});

// Restore saved mirror URL on load (auto-expands panel if a value was saved)
chrome.storage.local.get('proxyBaseUrl', (result) => {
  if (result.proxyBaseUrl) {
    const input = document.getElementById('proxyBaseUrl');
    const panel = document.getElementById('networkSettingsPanel');
    const btn = document.getElementById('networkSettingsToggle');
    if (input) input.value = result.proxyBaseUrl;
    if (panel) panel.style.display = 'block';
    if (btn) btn.textContent = '⚙ Network settings ▾';
  }
});

document.getElementById('installQwenBtn').addEventListener('click', () =>
  runInstall('Qwen2.5-1.5B-Instruct', 'progressQwen', 'progressQwenFill', 'progressQwenLabel', 'installQwenBtn')
);

document.getElementById('installEnglishBtn').addEventListener('click', () =>
  runInstall('piiranha-v1', 'progressEnglish', 'progressEnglishFill', 'progressEnglishLabel', 'installEnglishBtn')
);

document.getElementById('installChineseBtn').addEventListener('click', () =>
  runInstall('bert-base-chinese-ner', 'progressChinese', 'progressChineseFill', 'progressChineseLabel', 'installChineseBtn')
);

// Install All — Qwen first, then English + Chinese BERT models
document.getElementById('installAllBtn').addEventListener('click', async () => {
  const allBtn = document.getElementById('installAllBtn');
  if (allBtn) allBtn.disabled = true;
  try {
    await runInstall('Qwen2.5-1.5B-Instruct', 'progressQwen', 'progressQwenFill', 'progressQwenLabel', 'installQwenBtn');
    await runInstall('piiranha-v1', 'progressEnglish', 'progressEnglishFill', 'progressEnglishLabel', 'installEnglishBtn');
    await runInstall('bert-base-chinese-ner', 'progressChinese', 'progressChineseFill', 'progressChineseLabel', 'installChineseBtn');
  } finally {
    if (allBtn) allBtn.disabled = false;
  }
});

initMLModels();

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('Local PII Masking Extension Loaded');
showStatus('Ready to detect PII. Upload a document to begin.', 'info');
