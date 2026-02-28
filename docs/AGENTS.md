# AGENTS.md - Local PII Masking

This document provides essential context for AI coding agents working on the Local PII Masking project.

## Project Overview

**Local PII Masking** is an enterprise-grade, client-side PII (Personally Identifiable Information) detection and masking solution that runs entirely in the browser. It processes sensitive documents (PDF, DOCX, TXT) locally without any server communication, ensuring complete data privacy.

### Key Features

- **Zero Server Communication**: All processing happens client-side using Web APIs and WebAssembly
- **Multi-Stage Detection**: Combines regex (deterministic) and ML-based NER (probabilistic) detection
- **Document Support**: PDF, DOCX, TXT with format-preserving redaction for DOCX
- **Security-First Design**: Strict CSP, magic byte validation, SHA-256 hashing, comprehensive audit logging
- **Compliance**: GDPR and PDPA (Singapore) compliant by design

### Detection Pipeline

```
User Upload → File Validation → Document Parsing → Regex Detection → NER Detection → 
Deduplication → Masking → Report Generation → Audit Logging
```

## Technology Stack

### Core Technologies

| Component | Technology | Version/Notes |
|-----------|------------|---------------|
| Language | JavaScript (ES6 Modules) | Modern browser features required |
| ML Inference | Transformers.js + ONNX Runtime | WebAssembly-based |
| PDF Parsing | PDF.js (Mozilla) | v4.0.379, loaded from CDN |
| DOCX Parsing | mammoth.js | v1.6.0, loaded from CDN |
| Cryptography | Web Crypto API | Native browser SHA-256 |
| Testing | Custom test framework | Zero dependencies |

### Browser Requirements

- Chrome 87+, Firefox 78+, Safari 14+, Edge 87+
- WebAssembly support (required for ML models)
- Web Crypto API support
- ES6 Modules support
- FileReader API support

### External Dependencies (CDN)

All external libraries are loaded from trusted CDNs (jsdelivr.net):

- `pdfjs-dist@4.0.379` - Mozilla PDF.js (Apache-2.0)
- `mammoth@1.6.0` - DOCX parser (BSD-2-Clause)
- `@xenova/transformers@2.17.2` - ML models (Apache-2.0)

## Project Structure

```
local_pii_masking/
├── core/                           # Core detection and processing
│   ├── pii-detector.js             # Main orchestrator (detect, mask, deduplicate)
│   ├── regex-detector.js           # Pattern-based detection (fast, deterministic)
│   ├── ner-detector.js             # ML-based Named Entity Recognition
│   ├── audit-logger.js             # Security and compliance logging
│   └── report-generator.js         # JSON/Markdown/CSV report generation
│
├── parsers/                        # Document format handlers
│   ├── document-parser.js          # Router that delegates to specific parsers
│   ├── pdf-parser.js               # PDF.js integration
│   ├── docx-parser.js              # mammoth.js integration
│   └── text-parser.js              # Plain text handling
│
├── utils/                          # Security and helper utilities
│   └── security.js                 # File validation, sanitization, hashing
│
├── test/                           # Test suite (200+ tests, zero dependencies)
│   ├── test-framework.js           # Custom minimal test framework
│   ├── fixtures.js                 # Shared test data
│   ├── security.test.js            # Security utility tests
│   ├── regex-detector.test.js      # Pattern matching tests
│   ├── audit-logger.test.js        # Logging system tests
│   ├── report-generator.test.js    # Report generation tests
│   ├── integration.test.js         # End-to-end workflow tests
│   └── test-runner.html            # Browser-based test UI
│
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── manifest.json               # Extension configuration
│   ├── popup.html / popup.js       # Extension UI
│   ├── background.js               # Service worker
│   ├── libs/                       # Bundled libraries (for offline use)
│   ├── models/                     # Bundled ML models
│   └── *.md                        # Extension-specific documentation
│
├── config.js                       # Centralized configuration
├── app.js                          # Main application UI logic
├── index.html                      # Primary web application
├── standalone.html                 # Minimal version without CDN dependencies
└── *.md                            # Project documentation
```

## Build and Development Commands

### Running the Application

```bash
# Using Python (recommended)
npm start
# or
python3 -m http.server 8000

# Using Node.js
npm run start:node

# Then open: http://localhost:8000
```

**Important**: The application MUST be served over HTTP/HTTPS due to ES6 module requirements. Opening `index.html` directly via `file://` protocol will not work.

### Running Tests

```bash
# Start server and open test runner
npm test
# Then navigate to: http://localhost:8000/test/test-runner.html

# Or manually:
python3 -m http.server 8000
# Open: http://localhost:8000/test/test-runner.html
```

The test suite includes 200+ tests covering:
- Security utilities (40+ tests)
- Regex detector (60+ tests)
- Audit logger (30+ tests)
- Report generator (25+ tests)
- Integration workflows (45+ tests)

### Linting

```bash
npm run lint
```

## Code Style Guidelines

### JavaScript Conventions

1. **ES6 Modules**: All files use ES6 module syntax (`import`/`export`)
2. **JSDoc Comments**: All public functions must have JSDoc documentation
3. **Strict Mode**: Implicit strict mode via ES6 modules
4. **Naming**:
   - Classes: `PascalCase` (e.g., `PIIDetector`, `RegexDetector`)
   - Functions/variables: `camelCase` (e.g., `detectPii`, `maskedText`)
   - Constants: `UPPER_SNAKE_CASE` (e.g., `CONFIG`, `MAX_FILE_SIZE`)

### Code Patterns

#### Detection Orchestration
```javascript
// Always use the PIIDetector class as the entry point
import { PIIDetector } from './core/pii-detector.js';
const detector = new PIIDetector(CONFIG);
const detections = await detector.detect(text);
```

#### Security-First Input Handling
```javascript
// Always validate files before processing
import { validateFile } from './utils/security.js';
const validation = await validateFile(file);
if (!validation.valid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}
```

#### Audit Logging
```javascript
// All operations must be logged (but NEVER log raw PII values)
import logger from './core/audit-logger.js';
import { hashPII } from './utils/security.js';

// CORRECT: Log hash only
logger.logDetection('EMAIL', 'regex', 1.0, position, await hashPII(value));

// WRONG: Never log raw values
// logger.log('detection', { value: 'john@example.com' }); // ❌
```

### Security Constraints

**Never use:**
- `eval()` or `new Function()`
- `innerHTML` with unsanitized content (use `textContent` instead)
- Inline event handlers (`onclick=` attributes)
- `localStorage`, `sessionStorage`, or `IndexedDB` for PII data
- Server API calls (all processing must be client-side)

**Always use:**
- `textContent` for displaying user data
- `sanitizeFilename()` for file names
- `sanitizeText()` for text content
- `hashPII()` for storing references to PII in logs

## Testing Instructions

### Writing New Tests

Tests use a custom minimal framework (zero dependencies):

```javascript
import { describe, it, assertEqual, assertTrue } from './test-framework.js';
import { VALID_NRIC, INVALID_NRIC } from './fixtures.js';

describe('Component Name', () => {
  describe('Feature Name', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = VALID_NRIC[0];
      
      // Act
      const result = await detect(input);
      
      // Assert
      assertEqual(result.length, 1);
      assertEqual(result[0].type, 'NRIC');
    });
  });
});
```

### Test Data (Fixtures)

Add test data to `test/fixtures.js`:

```javascript
// Valid test samples
export const VALID_NRIC = ['S1234567D', 'T2345678E', 'F3456789N'];
export const VALID_EMAIL = ['test@example.com', 'user+tag@domain.co.uk'];

// Invalid test samples  
export const INVALID_NRIC = ['S1234567A', 'X1234567D']; // Wrong checksum/prefix
export const XSS_PATTERNS = ['<script>alert(1)</script>', 'javascript:alert(1)'];
```

### Running Specific Tests

To run only specific test files, edit `test/run-tests.js` and comment out unwanted imports.

## Security Considerations

### Content Security Policy (CSP)

The application uses a strict CSP defined in `index.html`:

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co;
img-src 'self' data:;
object-src 'none';
base-uri 'self';
```

**Why 'wasm-unsafe-eval'?**
- Required for Transformers.js (ONNX WebAssembly execution)
- Scoped to specific CDN origins
- No dynamic JavaScript evaluation allowed

### File Validation

Files are validated using magic bytes (not extensions) to prevent spoofing:

```javascript
// config.js - Magic byte signatures
magicBytes: {
  pdf: [0x25, 0x50, 0x44, 0x46],  // %PDF
  docx: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP)
  doc: [0xD0, 0xCF, 0x11, 0xE0]   // Legacy DOC
}
```

### Cryptographic Controls

- **SHA-256 Hashing**: All PII values are hashed before storage in logs/reports
- **Secure Random IDs**: Using `crypto.getRandomValues()` for audit trail IDs
- **Web Crypto API**: Native browser implementation (no external libraries)

### Data Handling Principles

- ❌ No server communication
- ❌ No cookies
- ❌ No localStorage/sessionStorage for PII
- ❌ No third-party analytics
- ✅ 100% client-side processing
- ✅ Only hashes stored in logs (no raw PII)
- ✅ In-memory processing only

## Configuration System

### Adding New PII Patterns

Edit `config.js` to add detection patterns:

```javascript
detection: {
  universalPatterns: {
    ipAddress: {
      pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      type: 'IP_ADDRESS',
      description: 'IPv4 address'
    }
  }
}
```

If validation beyond regex is needed, add to `core/regex-detector.js`:

```javascript
async validateMatch(value, pattern) {
  if (pattern.type === 'IP_ADDRESS') {
    const octets = value.split('.');
    return octets.every(o => parseInt(o) <= 255);
  }
  // ...
}
```

### Adding New Masking Strategies

Edit `config.js` masking section:

```javascript
masking: {
  strategies: {
    CUSTOM: {
      name: 'Custom Strategy',
      format: (value, type, index) => `[CUSTOM_${type}_${index}]`
    }
  }
}
```

### Threshold Configuration

Adjust detection sensitivity in `config.js`:

```javascript
detection: {
  thresholds: {
    regex: 1.0,  // Regex is deterministic (always 1.0)
    ner: 0.85    // NER confidence threshold (0.0-1.0)
  }
}
```

## ML Model Integration

### Model Loading

Models are loaded on-demand from Hugging Face via CDN:

```javascript
// core/ner-detector.js
const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
this.nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER');
```

### Model Information

- **Model**: Xenova/bert-base-NER (quantized for browser)
- **Size**: ~50MB download
- **First Load**: 30-60 seconds
- **Cached**: 2-3 seconds on reload
- **Inference**: ~100-200ms per chunk

### Preloading

Use `detector.preloadModel()` to load the model before processing:

```javascript
const detector = new PIIDetector(CONFIG);
await detector.preloadModel((stage, progress, message) => {
  console.log(`${stage}: ${progress}% - ${message}`);
});
```

## Browser Extension

The `extension/` folder contains a Chrome Extension version with key differences:

### Limitations (Manifest V3 CSP)
- Cannot load libraries from CDN dynamically
- All libraries must be bundled locally
- PDF/DOCX support requires bundled parsers

### Architecture
```
extension/
├── manifest.json          # Manifest V3 config
├── popup.html/js          # Extension UI
├── background.js          # Service worker
├── libs/                  # Bundled libraries
│   ├── transformers/      # Transformers.js
│   ├── pdfjs/             # PDF.js
│   ├── pdflib/            # PDF-lib (for redaction)
│   └── docx/              # mammoth.js + docx handling
└── models/                # Bundled ML models
```

See `extension/README.md` for detailed extension documentation.

## Common Tasks

### Adding a New Document Parser

1. Create `parsers/new-format-parser.js`
2. Export `parseNewFormat(file)` function returning `{ name, content, type }`
3. Add MIME type to `config.js` allowed types
4. Add magic bytes to `config.js` if applicable
5. Update `parsers/document-parser.js` router
6. Add tests to `test/` directory

### Debugging Detection Issues

1. Check audit logs (download via UI)
2. Test regex in isolation: `test/regex-detector.test.js`
3. Verify validation logic isn't rejecting valid matches
4. Check confidence thresholds in config
5. Test with known fixtures from `test/fixtures.js`

### Performance Optimization

For large documents (>10MB):
- Reduce `performance.chunkSize` in config (default: 10000 chars)
- Disable NER if not needed (`detection.methods.ner: false`)
- Preload model before processing
- Process in smaller chunks

## Deployment

### Production Checklist

- [ ] Serve over HTTPS only (required for Web Crypto API)
- [ ] Configure CSP headers on server
- [ ] Test in target browsers
- [ ] Verify WASM support available
- [ ] Test with large files (near 50MB limit)
- [ ] Verify audit logs downloadable
- [ ] Test all masking strategies
- [ ] Verify no data persistence

### Self-Hosting Dependencies

For air-gapped environments:

1. Download libraries from CDN URLs in `package.json`
2. Place in `libs/` folder
3. Update URLs in `app.js` and `standalone.html`
4. Update CSP to allow local script loading
5. Test thoroughly

## Documentation Index

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `QUICKSTART.md` | 2-minute setup guide |
| `USAGE.md` | Comprehensive usage guide |
| `SECURITY.md` | Security architecture and compliance |
| `PROJECT_OVERVIEW.md` | Detailed project statistics and features |
| `TEST_SUMMARY.md` | Test suite documentation |
| `ROADMAP.md` | Detection accuracy improvement roadmap |
| `CLAUDE.md` | Claude Code specific guidance |
| `MODEL_LOADING_UX.md` | ML model loading UX documentation |
| `extension/README.md` | Browser extension documentation |

## Key Contacts & Maintenance

- **Version**: 2.3.5
- **License**: MIT
- **Status**: Production Ready
- **Maintainer**: Your Organization

---

**Last Updated**: 2024-02-11
**Documentation Language**: English
