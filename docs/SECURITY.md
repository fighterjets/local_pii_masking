# Security Documentation

## Security Architecture

Local PII Masking is designed with security as the foundational principle. This document details all security measures implemented in the system.

## Threat Model

### Assets Protected
1. **User Documents**: PDFs, DOCX, TXT files containing PII
2. **Detected PII**: Personal information identified in documents
3. **Processing Metadata**: Audit logs and detection reports

### Threats Mitigated
1. **Data Exfiltration**: No data leaves the browser
2. **XSS Attacks**: Strict CSP and input sanitization
3. **File Type Spoofing**: Magic byte validation
4. **Code Injection**: No eval(), no innerHTML with user data
5. **DoS Attacks**: Rate limiting and file size limits
6. **MITM Attacks**: HTTPS enforcement in production

### Out of Scope
- Physical access to user's device
- Browser vulnerabilities (zero-days)
- Malicious browser extensions
- User error (intentional PII disclosure)

## Defense in Depth

### Layer 1: Network Security

**Content Security Policy (CSP)**
```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co;
img-src 'self' data:;
object-src 'none';
base-uri 'self';
```

**Why WASM-unsafe-eval?**
- Required for Transformers.js (WebAssembly execution)
- Scoped to specific CDN origins
- No dynamic JavaScript evaluation allowed

**HTTPS Enforcement**
```javascript
// config.js
if (ENVIRONMENT.isProduction && location.protocol !== 'https:') {
  // Redirect to HTTPS
}
```

### Layer 2: Input Validation

**File Upload Validation**

1. **File Size Check**
```javascript
if (file.size > 50MB) reject();
if (file.size === 0) reject();
```

2. **MIME Type Check**
```javascript
allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];
```

3. **Magic Bytes Verification**
```javascript
// Prevents extension spoofing
const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
if (!magicBytesMatch(bytes, declaredType)) reject();
```

4. **Rate Limiting**
```javascript
// Max 10 files per minute per client
if (uploadCount > 10 in 60s) reject();
```

**Text Sanitization**
```javascript
// Remove dangerous patterns before display
sanitizeText(text) {
  return text
    .replace(/[<>]/g, '')           // No HTML tags
    .replace(/javascript:/gi, '')   // No JS protocol
    .replace(/on\w+=/gi, '');       // No event handlers
}
```

**Filename Sanitization**
```javascript
sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Allow only safe chars
    .replace(/\.{2,}/g, '.')           // Prevent ../
    .substring(0, 255);                // Limit length
}
```

### Layer 3: Cryptographic Controls

**SHA-256 Hashing**
```javascript
// All PII values are hashed before storage
async hashPII(value, salt) {
  const content = `${salt}${value}${salt}`;
  const buffer = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(content));
  return hex(buffer);
}
```

**Secure Random Generation**
```javascript
// Cryptographically secure IDs
function generateSecureId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return hex(array);
}
```

### Layer 4: Data Handling

**No PII Persistence**
- ✅ PII values exist only in memory during processing
- ✅ Cleared when page reloads
- ✅ Never written to localStorage/IndexedDB
- ✅ Never sent to servers
- ✅ Only hashes stored in logs/reports

**Memory Management**
```javascript
// Large documents processed in chunks
processText(text, chunkSize = 10000) {
  const chunks = splitIntoChunks(text, chunkSize);
  // Process each chunk separately
  // Allows garbage collection of intermediate results
}
```

**Secure Cleanup**
```javascript
// After processing, clear sensitive data
processDocument(doc) {
  try {
    // ... processing ...
  } finally {
    doc = null;
    detections = null;
    // Force garbage collection eligibility
  }
}
```

### Layer 5: Code Security

**No Dynamic Code Execution**
```javascript
// NEVER use:
eval(userInput)              // ❌
new Function(userInput)()    // ❌
setTimeout(userInput, 100)   // ❌
innerHTML = userInput        // ❌

// ALWAYS use:
textContent = userInput      // ✅
JSON.parse(trustedData)      // ✅
```

**Dependency Security**

All libraries are:
1. **Well-Vetted**: Industry-standard libraries
2. **Actively Maintained**: Regular security updates
3. **Loaded from Trusted CDNs**: jsdelivr.net with SRI (future)

| Library | Stars | Last Update | Vendor |
|---------|-------|-------------|--------|
| PDF.js | 43k+ | Active | Mozilla |
| mammoth.js | 11k+ | Active | Open Source |
| Transformers.js | 5k+ | Active | Hugging Face |

**Future Enhancement: Subresource Integrity (SRI)**
```html
<script src="https://cdn.jsdelivr.net/..."
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

### Layer 6: Audit & Monitoring

**Comprehensive Logging**
```javascript
// All operations logged
logger.log(level, category, message, metadata)

// Categories:
- FILE_PROCESSING  // Document uploads
- DETECTION        // PII found
- MASKING          // PII redacted
- SECURITY         // Security events
- MODEL            // ML model operations
- PERFORMANCE      // Timing data
```

**Security Event Logging**
```javascript
logSecurityEvent(event, severity, details) {
  // Examples:
  - File validation failed (medium)
  - Rate limit exceeded (high)
  - Magic bytes mismatch (high)
  - Suspicious file patterns (high)
}
```

**Audit Trail Export**
```javascript
// Download complete audit log
logger.downloadLogs('audit.json');

// Includes:
- Session ID
- Timestamps
- Operation types
- Error messages
- Performance metrics
- NO raw PII values (only hashes)
```

## Compliance

### GDPR (General Data Protection Regulation)

**Right to Erasure**
- ✅ No data stored; all processing in-memory
- ✅ Data cleared on page reload

**Data Minimization**
- ✅ Only hashes stored in reports
- ✅ No cookies or tracking

**Privacy by Design**
- ✅ Zero-server architecture
- ✅ Client-side only processing

**Transparency**
- ✅ Open source code
- ✅ Clear documentation
- ✅ Audit logs available

### PDPA (Singapore Personal Data Protection Act)

**Consent**
- ✅ User explicitly uploads documents
- ✅ Clear purpose communication

**Purpose Limitation**
- ✅ Only used for PII detection
- ✅ No secondary use of data

**Accuracy**
- ✅ Reports show confidence scores
- ✅ User can review before masking

**Protection**
- ✅ No transmission over network
- ✅ No storage on servers

### HIPAA Considerations

While Local PII Masking is not HIPAA-certified, it implements relevant controls:
- ✅ No ePHI leaves device
- ✅ Audit logging
- ✅ Access controls (future: authentication)
- ⚠️ Not suitable for HIPAA environments without additional controls

## Security Testing

### Recommended Tests

**1. Input Validation Testing**
```bash
# Test file type spoofing
cp malicious.exe fake.pdf
# Should reject based on magic bytes

# Test path traversal
filename = "../../../etc/passwd.pdf"
# Should sanitize to "etc_passwd.pdf"

# Test oversized files
dd if=/dev/zero of=large.pdf bs=1M count=100
# Should reject (> 50MB)
```

**2. XSS Testing**
```javascript
// Test in browser console
document.getElementById('uploadZone').innerHTML = '<img src=x onerror=alert(1)>';
// Should not execute (CSP blocks)

// Test filename injection
file.name = '<script>alert(1)</script>.pdf';
// Should sanitize to "script_alert_1__script_.pdf"
```

**3. CSP Validation**
```bash
# Use CSP Evaluator
https://csp-evaluator.withgoogle.com/

# Test inline script blocking
# Should block: <script>alert(1)</script>
# Should allow: <script src="app.js"></script>
```

**4. HTTPS Enforcement**
```bash
# In production, test HTTP redirect
curl -I http://your-domain.com
# Should return 301/302 to https://
```

## Vulnerability Disclosure

If you discover a security vulnerability:

1. **Do NOT** disclose publicly
2. Document the issue with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)
3. Report to your security team
4. Allow time for patch development

## Security Checklist for Deployment

### Pre-Deployment

- [ ] Enable HTTPS (required)
- [ ] Review and customize CSP
- [ ] Configure rate limiting
- [ ] Set appropriate file size limits
- [ ] Test file upload validation
- [ ] Verify dependency integrity
- [ ] Review audit log configuration

### Post-Deployment

- [ ] Monitor audit logs for security events
- [ ] Test with sample documents
- [ ] Verify CSP in browser console
- [ ] Check HTTPS certificate validity
- [ ] Review access logs (server-side)
- [ ] Plan for dependency updates

### Ongoing Maintenance

- [ ] Monthly: Review audit logs
- [ ] Quarterly: Update dependencies
- [ ] Annually: Security audit
- [ ] As needed: Respond to CVEs

## Known Limitations

1. **Browser Vulnerabilities**
   - Relies on browser security sandbox
   - No protection against browser zero-days

2. **Malicious Extensions**
   - Browser extensions can access page content
   - Recommend disabling extensions for sensitive work

3. **Screen Recording**
   - Cannot prevent screen capture tools
   - Cannot prevent screenshots

4. **Copy-Paste**
   - User can manually copy detected PII
   - Cannot prevent keyboard/mouse actions

5. **File System Access**
   - Downloaded files written to disk
   - User responsible for secure deletion

## Future Security Enhancements

### Short-term
- [ ] Subresource Integrity (SRI) for CDN scripts
- [ ] Self-hosted option for all dependencies
- [ ] Enhanced rate limiting (per-IP via server)
- [ ] Automated security scanning in CI/CD

### Long-term
- [ ] End-to-end encrypted collaboration
- [ ] Hardware security module (HSM) integration
- [ ] Advanced threat detection (ML-based)
- [ ] Multi-party computation for team environments
- [ ] Zero-knowledge proof for compliance verification

## Security Principles

This implementation follows these security principles:

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions requested
3. **Secure by Default**: Conservative default settings
4. **Privacy First**: No data collection
5. **Transparency**: Open source, auditable code
6. **Fail Secure**: Errors reject operations (not bypass)
7. **Simplicity**: Less code = smaller attack surface

---

**Last Updated:** 2024-02-11
**Version:** 1.0
**Review Cycle:** Quarterly
