/**
 * DOCX Handler - Redact Word documents while preserving original formatting
 * Uses PizZip (ZIP layer) + DOMParser (XML layer) for round-trip redaction.
 * Falls back to building a new minimal DOCX if round-trip is not possible.
 * Local PII Masking Extension - 100% Offline
 */

window.DOCXHandler = {
  // Stores the original ArrayBuffer from the last parsed DOCX file.
  // Used by createRedactedDOCX to open the original ZIP and do in-place XML edits.
  _lastBuffer: null,

  /**
   * Parse DOCX file and extract plain text for PII detection.
   * Also stores the original ArrayBuffer for formatting-preserving redaction later.
   * @param {File} file - The DOCX file
   * @returns {Promise<string>} Extracted plain text
   */
  async parseDOCX(file) {
    if (!window.mammoth) {
      throw new Error('Mammoth library not loaded. Cannot parse DOCX files.');
    }

    console.log('[DOCX] Parsing DOCX file:', file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Store for round-trip redaction in createRedactedDOCX
      this._lastBuffer = arrayBuffer;

      // Try XML-based NER-optimised formatting first.
      // This preserves table structure (label: value rows, column headers as
      // context) so NER models receive properly labelled text rather than a
      // flat stream of cell values.
      const formatted = this.formatDOCXForNER(arrayBuffer);
      if (formatted && formatted.trim().length > 0) {
        console.log('[DOCX] Using NER-formatted extraction:', formatted.length, 'characters');
        return formatted;
      }

      // Fall back to mammoth raw text extraction
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.messages && result.messages.length > 0) {
        console.log('[DOCX] Parsing messages:', result.messages);
      }
      const text = result.value;
      console.log('[DOCX] Extracted text length (mammoth fallback):', text.length);
      return text;
    } catch (error) {
      console.error('[DOCX] Parse error:', error);
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  },

  // ============================================================================
  // NER-OPTIMISED TEXT EXTRACTION
  // ============================================================================

  /**
   * Parse word/document.xml directly and reconstruct document text in a form
   * that is more useful for NER:
   *
   *   • Plain paragraphs  → emitted as-is (one per line)
   *   • 2-column tables   → "Label: Value" per row
   *   • Multi-column tables with a detectable header row
   *                       → "Header1: Cell1, Header2: Cell2, …" per data row
   *   • Other tables      → cells joined with " | "
   *
   * This gives NER models the field-name context they need to recognise that,
   * for example, "John Smith" lives in a "Name" column and is a person, not
   * an organisation.
   *
   * @param {ArrayBuffer} arrayBuffer  Original DOCX binary
   * @returns {string|null}  Formatted text, or null on any parse error
   */
  formatDOCXForNER(arrayBuffer) {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    try {
      const zip = new PizZip(arrayBuffer);
      const xmlFile = zip.file('word/document.xml');
      if (!xmlFile) return null;

      const doc = new DOMParser().parseFromString(xmlFile.asText(), 'text/xml');
      if (doc.querySelector('parsererror')) return null;

      const body = doc.getElementsByTagNameNS(W, 'body')[0];
      if (!body) return null;

      const lines = [];
      for (const child of Array.from(body.childNodes)) {
        if (child.nodeType !== Node.ELEMENT_NODE) continue;

        if (child.localName === 'p') {
          const text = this._extractText(child, W);
          const normalized = this._normalizeLine(text);
          if (normalized) lines.push(normalized);

        } else if (child.localName === 'tbl') {
          // Blank line before table so it doesn't run into the preceding paragraph.
          if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
          lines.push(...this._formatTableForNER(child, W));
        }
      }

      return this._normalizeDocText(lines.join('\n'));
    } catch (e) {
      console.warn('[DOCX] formatDOCXForNER error:', e);
      return null;
    }
  },

  /**
   * Walk a DOCX XML element and collect its plain-text content, handling
   * structural run elements that <w:t>-only extraction misses:
   *
   *   <w:t>           → text content (the actual characters)
   *   <w:tab>         → '\t'  (column separators in forms / tab-aligned text)
   *   <w:br>          → '\n'  (in-paragraph line break or page break)
   *   <w:noBreakHyphen> → '-'
   *   <w:softHyphen>  → ''   (invisible unless at line-end; omit)
   *   <w:delText>     → ''   (deleted text in tracked changes; omit)
   *   property elements (pPr, rPr, …) → skipped entirely
   *
   * @param {Element} el - Any XML element (paragraph, cell, etc.)
   * @param {string}  W  - WordprocessingML namespace URI
   * @returns {string}
   */
  _extractText(el, W) {
    // Elements that carry formatting metadata, not document text.
    const SKIP = new Set([
      'pPr', 'rPr', 'tblPr', 'trPr', 'tcPr', 'sectPr',
      'pPrChange', 'rPrChange', 'numPr',
      'bookmarkStart', 'bookmarkEnd',
      'proofErr', 'lastRenderedPageBreak',
      'commentReference', 'annotationRef',
      'fldChar', 'instrText',
    ]);

    const parts = [];
    const walk = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const ln = node.localName;
      if (SKIP.has(ln)) return;
      switch (ln) {
        case 't':           parts.push(node.textContent); break;
        case 'tab':         parts.push('\t');             break;
        case 'br':          parts.push('\n');             break;
        case 'noBreakHyphen': parts.push('-');            break;
        case 'softHyphen':  /* intentionally omitted */   break;
        case 'delText':     /* tracked deletion; skip */  break;
        default:
          for (const child of Array.from(node.childNodes)) walk(child);
      }
    };
    for (const child of Array.from(el.childNodes)) walk(child);
    return parts.join('');
  },

  /**
   * Normalise a single paragraph's extracted text:
   * • collapse runs of tabs/spaces to a single space
   * • trim leading/trailing whitespace
   */
  _normalizeLine(text) {
    return text
      .replace(/\t/g, ' ')           // tab → space within a paragraph
      .replace(/[^\S\n]{2,}/g, ' ')  // multiple spaces → one (preserve \n)
      .trim();
  },

  /**
   * Post-process the full extracted document text:
   * 1. Ensure common English abbreviations are followed by a space so that
   *    "Mr.Smith" (runs merged with no space) becomes "Mr. Smith" and NER
   *    treats the phrase as one unit rather than splitting at the dot.
   * 2. Collapse 3+ consecutive newlines to two (preserve deliberate blank lines).
   * 3. Final trim.
   */
  _normalizeDocText(text) {
    // English title / positional / corporate abbreviations
    const ABBREV = [
      'Mr','Mrs','Ms','Miss','Mx',
      'Dr','Prof','Rev','Rt Hon',
      'Sr','Jr','Esq',
      'Capt','Maj','Gen','Lt','Col','Sgt','Cpl','Pvt','Brig','Cdr',
      'Amb','Gov','Pres','Sen','Rep',
      'St','Mt','Ft',
      'Corp','Inc','Ltd','Co','LLC','PLC','LLP','Assoc','Bros',
      'Dept','Div','Mgr','Dir',
      'etc','vs','approx','est','cont','cf','viz','viz',
      'Jan','Feb','Mar','Apr','Jun','Jul','Aug','Sep','Oct','Nov','Dec',
    ].join('|');

    // "Abbr.NextWord" → "Abbr. NextWord"  (only when next char is a letter/digit)
    text = text.replace(
      new RegExp(`\\b(${ABBREV})\\.([A-Za-z0-9])`, 'g'),
      (_, abbr, next) => `${abbr}. ${next}`
    );

    // Collapse 3+ newlines → 2
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  },

  /** Concatenate all <w:t> text nodes within an element (kept for redaction path). */
  _getNodeText(el, W) {
    return Array.from(el.getElementsByTagNameNS(W, 't'))
      .map(t => t.textContent)
      .join('');
  },

  /** Return direct child elements whose localName matches. */
  _directChildren(el, localName) {
    return Array.from(el.childNodes).filter(
      n => n.nodeType === Node.ELEMENT_NODE && n.localName === localName
    );
  },

  /**
   * Convert a <w:tbl> element into NER-friendly text lines.
   *
   * Formatting rules (applied in order):
   *  1. Single column  → plain text lines
   *  2. Two columns    → "Col0: Col1" (label–value pairs)
   *  3. Multi-column, first row looks like headers
   *                   → "Header0: Cell0, Header1: Cell1, …" per data row
   *  4. Multi-column, no detectable headers
   *                   → cells joined with " | "
   */
  _formatTableForNER(tblEl, W) {
    const rows = this._directChildren(tblEl, 'tr');
    if (rows.length === 0) return [];

    // Collect cell text for every row
    const tableData = rows.map(row => {
      const cells = this._directChildren(row, 'tc');
      return cells.map(cell => {
        const paras = this._directChildren(cell, 'p');
        return paras.map(p => this._getNodeText(p, W)).join(' ').trim();
      });
    });

    const colCount = Math.max(...tableData.map(r => r.length), 0);
    if (colCount === 0) return [];

    const lines = [];

    if (colCount === 1) {
      // ── Single column ──────────────────────────────────────────────────
      for (const row of tableData) {
        const v = (row[0] || '').trim();
        if (v) lines.push(v);
      }

    } else if (colCount === 2) {
      // ── Two columns: label–value ────────────────────────────────────────
      for (const row of tableData) {
        const label = (row[0] || '').trim();
        const value = (row[1] || '').trim();
        if (label && value) lines.push(`${label}: ${value}`);
        else if (value)     lines.push(value);
        else if (label)     lines.push(label);
      }

    } else {
      // ── Multi-column ────────────────────────────────────────────────────
      // Detect a header row: all cells non-empty, short, and at least one
      // starts with a capital letter (typical for column headings).
      const firstRow = tableData[0].map(c => c.trim());
      const looksLikeHeader = tableData.length > 1
        && firstRow.every(h => h.length > 0 && h.length < 50)
        && firstRow.some(h => /^[A-Z]/.test(h));

      if (looksLikeHeader) {
        const headers = firstRow;
        for (let i = 1; i < tableData.length; i++) {
          const parts = tableData[i].map((cell, j) => {
            const h = headers[j] || '';
            const v = cell.trim();
            return h && v ? `${h}: ${v}` : v;
          }).filter(Boolean);
          if (parts.length) lines.push(parts.join(', '));
        }
      } else {
        for (const row of tableData) {
          const rowText = row.filter(c => c.trim()).join(' | ');
          if (rowText.trim()) lines.push(rowText);
        }
      }
    }

    if (lines.length > 0) lines.push(''); // blank separator after table
    return lines;
  },

  /**
   * Create a redacted DOCX file by modifying the original document's XML in-place.
   * Preserves all formatting (tables, bold, italic, styles, images, etc.).
   * Falls back to building a plain DOCX if round-trip is not available.
   *
   * @param {Array} detections - Array of PII detections with { value, type, start, end }
   * @param {string} originalFilename - Original filename for logging
   * @param {string} [fallbackText] - Plain text used only if round-trip fails (optional)
   * @returns {Blob} Redacted DOCX file as a Blob
   */
  createRedactedDOCX(detections, originalFilename = 'document.docx', fallbackText = '', strategy = 'REDACTION') {
    if (!window.PizZip) {
      throw new Error('PizZip library not loaded');
    }

    console.log('[DOCX] Creating masked DOCX with', detections.length, 'detections, strategy:', strategy);

    // --- Round-trip path: modify the original DOCX XML in-place ---
    if (this._lastBuffer) {
      try {
        return this._roundTripRedact(detections, originalFilename, strategy);
      } catch (err) {
        console.warn('[DOCX] Round-trip redaction failed, falling back to plain DOCX:', err);
      }
    }

    // --- Fallback path: build a minimal DOCX from plain text ---
    console.log('[DOCX] Using fallback plain-text DOCX builder');
    return this._buildPlainDOCX(fallbackText, detections, originalFilename, strategy);
  },

  // ============================================================================
  // ROUND-TRIP REDACTION (preserves original formatting)
  // ============================================================================

  /**
   * Open the original DOCX ZIP, parse word/document.xml, redact PII values
   * directly within <w:t> text nodes, then repack and return as a Blob.
   * @private
   */
  _roundTripRedact(detections, originalFilename, strategy = 'REDACTION') {
    const zip = new PizZip(this._lastBuffer);

    // word/document.xml must exist; headers and footers are optional
    if (!zip.file('word/document.xml')) {
      throw new Error('word/document.xml not found in DOCX archive');
    }

    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const serializer = new XMLSerializer();

    // All XML parts that can contain user-visible text with PII
    const partsToRedact = [
      'word/document.xml',
      'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    ];

    for (const partName of partsToRedact) {
      const xmlFile = zip.file(partName);
      if (!xmlFile) continue; // part not present in this document

      const xmlStr = xmlFile.asText();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'text/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        // Non-fatal: skip this part and leave it unmodified
        console.warn('[DOCX] XML parse error in', partName, '- skipping:', parseError.textContent.slice(0, 120));
        continue;
      }

      // Redact all paragraphs (includes paragraphs nested inside table cells)
      const paragraphs = doc.getElementsByTagNameNS(W, 'p');
      for (let i = 0; i < paragraphs.length; i++) {
        this._redactParagraph(paragraphs[i], detections, W, doc, strategy);
      }

      zip.file(partName, serializer.serializeToString(doc));
      console.log('[DOCX] Redacted', partName);
    }

    const blob = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE'
    });

    console.log('[DOCX] Round-trip redaction complete:', originalFilename);
    return blob;
  },

  /**
   * Redact all PII detections within a single <w:p> paragraph element.
   *
   * Strategy:
   * 1. Collect all <w:t> nodes in document order, tracking their character offsets
   *    within the reconstructed paragraph text.
   * 2. For each detection value, find every occurrence in the paragraph text.
   * 3. Map those character positions back to the specific <w:t> nodes that own them.
   * 4. Replace the text in those nodes with '█' characters and apply black shading
   *    to the parent <w:r> run element.
   *
   * Handles PII values that span multiple <w:t> nodes (split runs).
   * @private
   */
  _redactParagraph(para, detections, W, doc, strategy = 'REDACTION') {
    // Collect all <w:t> nodes with their start offset in the paragraph text
    const wtNodes = para.getElementsByTagNameNS(W, 't');
    if (wtNodes.length === 0) return;

    const nodeMap = []; // [{ node, start, end }] — original offsets, never mutated
    let cursor = 0;

    for (let i = 0; i < wtNodes.length; i++) {
      const node = wtNodes[i];
      const text = node.textContent || '';
      nodeMap.push({ node, start: cursor, end: cursor + text.length });
      cursor += text.length;
    }

    const paragraphText = nodeMap.map(n => n.node.textContent).join('');
    if (!paragraphText) return;

    const isRedaction = strategy === 'REDACTION';

    // ── Phase 1: collect all match events from the original paragraph text ────
    // We must NOT modify any nodes here — doing so would invalidate the nodeMap
    // offsets used by later detections in the same paragraph.
    const events = [];
    for (const detection of detections) {
      const value = detection.value;
      if (!value || value.length === 0) continue;
      const replacement = detection.replacement != null ? detection.replacement : value;

      let searchFrom = 0;
      while (searchFrom < paragraphText.length) {
        const matchStart = paragraphText.indexOf(value, searchFrom);
        if (matchStart === -1) break;

        const matchEnd = matchStart + value.length;
        const affected = nodeMap.filter(n => n.end > matchStart && n.start < matchEnd);
        if (affected.length > 0) {
          events.push({ matchStart, matchEnd, affected, replacement });
        }
        searchFrom = matchEnd;
      }
    }

    if (events.length === 0) return;

    // ── Phase 2: apply events right-to-left ──────────────────────────────────
    // Sorting by matchStart descending ensures that when we modify a node's text
    // (which changes its length for non-REDACTION strategies), the nodeMap offsets
    // for all earlier (leftward) events remain valid.  Each event reads
    // node.textContent at apply-time so it correctly picks up any already-applied
    // rightward replacements within the same node.
    events.sort((a, b) => b.matchStart - a.matchStart);

    // Track applied ranges to skip events that overlap a previously applied one
    const applied = [];

    for (const { matchStart, matchEnd, affected, replacement } of events) {
      if (applied.some(r => r.start < matchEnd && r.end > matchStart)) continue;
      applied.push({ start: matchStart, end: matchEnd });

      for (let i = 0; i < affected.length; i++) {
        const { node, start: nodeStart, end: nodeEnd } = affected[i];
        // localStart/localEnd are original-offset positions within this node.
        // For the first node the PII may start mid-node; for subsequent nodes
        // the PII started in a prior node so we consume from position 0.
        const localStart = i === 0 ? Math.max(0, matchStart - nodeStart) : 0;
        const localEnd = Math.min(nodeEnd - nodeStart, matchEnd - nodeStart);
        // Read current text at apply-time (may differ from original if a rightward
        // event already modified this node, but only the suffix beyond localEnd
        // is affected, which is exactly what we want to preserve).
        const currentText = node.textContent;

        if (isRedaction) {
          node.textContent =
            currentText.slice(0, localStart) +
            '█'.repeat(localEnd - localStart) +
            currentText.slice(localEnd);
          this._applyBlackShading(node.parentNode, W, doc);
        } else {
          if (i === 0) {
            node.textContent =
              currentText.slice(0, localStart) + replacement + currentText.slice(localEnd);
          } else {
            node.textContent = currentText.slice(localEnd);
          }
          this._applyYellowHighlight(node.parentNode, W, doc);
        }
      }
    }
  },

  /**
   * Add black shading run properties to a <w:r> element.
   * If <w:rPr> already exists, appends shading elements to it.
   * Idempotent: skips if black shading is already present.
   * @private
   */
  _applyBlackShading(runElement, W, doc) {
    if (!runElement) return;

    let rPr = runElement.getElementsByTagNameNS(W, 'rPr')[0];
    if (!rPr) {
      rPr = doc.createElementNS(W, 'w:rPr');
      // Insert rPr as the first child of the run (OOXML requires it first)
      runElement.insertBefore(rPr, runElement.firstChild);
    }

    // Skip if black shading already applied
    const existingShd = rPr.getElementsByTagNameNS(W, 'shd')[0];
    if (existingShd && existingShd.getAttributeNS(W, 'fill') === '000000') return;

    // <w:shd w:val="clear" w:color="auto" w:fill="000000"/>
    const shd = doc.createElementNS(W, 'w:shd');
    shd.setAttribute('w:val', 'clear');
    shd.setAttribute('w:color', 'auto');
    shd.setAttribute('w:fill', '000000');
    rPr.appendChild(shd);

    // <w:color w:val="000000"/> (makes the █ chars invisible against the black background)
    const color = doc.createElementNS(W, 'w:color');
    color.setAttribute('w:val', '000000');
    rPr.appendChild(color);
  },

  /**
   * Add yellow highlight run properties to a <w:r> element.
   * @private
   */
  _applyYellowHighlight(runElement, W, doc) {
    if (!runElement) return;

    let rPr = runElement.getElementsByTagNameNS(W, 'rPr')[0];
    if (!rPr) {
      rPr = doc.createElementNS(W, 'w:rPr');
      runElement.insertBefore(rPr, runElement.firstChild);
    }

    // Skip if yellow highlight already applied
    if (rPr.getElementsByTagNameNS(W, 'highlight')[0]) return;

    const highlight = doc.createElementNS(W, 'w:highlight');
    highlight.setAttribute('w:val', 'yellow');
    rPr.appendChild(highlight);
  },

  // ============================================================================
  // FALLBACK: BUILD PLAIN DOCX FROM SCRATCH
  // ============================================================================

  /**
   * Fallback: builds a minimal, formatting-free DOCX from plain text.
   * Used when round-trip redaction is unavailable or fails.
   * @private
   */
  _buildPlainDOCX(originalText, detections, originalFilename, strategy = 'REDACTION') {
    const zip = new PizZip();

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const redactedContent = this._buildRedactedContent(originalText, detections, strategy);

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${redactedContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    zip.file('[Content_Types].xml', contentTypes);
    zip.folder('_rels').file('.rels', rels);
    zip.folder('word').file('document.xml', documentXml);

    return zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE'
    });
  },

  /**
   * Build redacted paragraph XML from plain text + detections.
   * Used only by the fallback plain-DOCX builder.
   * @private
   */
  _buildRedactedContent(originalText, detections, strategy = 'REDACTION') {
    const sortedDetections = [...detections].sort((a, b) => a.start - b.start);
    const lines = originalText.split('\n');
    let globalPosition = 0;
    const paragraphs = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineStart = globalPosition;
      const lineEnd = globalPosition + line.length;

      const lineDetections = sortedDetections.filter(d =>
        (d.start >= lineStart && d.start < lineEnd) ||
        (d.end > lineStart && d.end <= lineEnd) ||
        (d.start < lineStart && d.end > lineEnd)
      );

      const runs = this._buildLineRuns(line, lineStart, lineDetections, strategy);
      paragraphs.push(`    <w:p>\n${runs}\n    </w:p>`);
      globalPosition = lineEnd + 1;
    }

    return paragraphs.join('\n');
  },

  /**
   * Build Word runs for a plain-text line with black-box redactions.
   * @private
   */
  _buildLineRuns(line, lineStart, detections, strategy = 'REDACTION') {
    if (detections.length === 0) {
      const escaped = this._escapeXml(line);
      return `      <w:r>\n        <w:t xml:space="preserve">${escaped}</w:t>\n      </w:r>`;
    }

    const isRedaction = strategy === 'REDACTION';
    const runs = [];
    let position = 0;

    const sortedDets = [...detections].sort((a, b) =>
      (a.start - lineStart) - (b.start - lineStart)
    );

    for (const detection of sortedDets) {
      const relStart = Math.max(0, detection.start - lineStart);
      const relEnd = Math.min(line.length, detection.end - lineStart);

      if (position < relStart) {
        const escaped = this._escapeXml(line.substring(position, relStart));
        runs.push(`      <w:r>\n        <w:t xml:space="preserve">${escaped}</w:t>\n      </w:r>`);
      }

      const piiLength = relEnd - relStart;
      if (isRedaction) {
        const blackBox = '█'.repeat(piiLength);
        runs.push(`      <w:r>
        <w:rPr>
          <w:shd w:val="clear" w:color="auto" w:fill="000000"/>
          <w:color w:val="000000"/>
        </w:rPr>
        <w:t xml:space="preserve">${blackBox}</w:t>
      </w:r>`);
      } else {
        const replacementText = this._escapeXml(
          detection.replacement != null ? detection.replacement : '█'.repeat(piiLength)
        );
        runs.push(`      <w:r>
        <w:rPr>
          <w:highlight w:val="yellow"/>
        </w:rPr>
        <w:t xml:space="preserve">${replacementText}</w:t>
      </w:r>`);
      }

      position = relEnd;
    }

    if (position < line.length) {
      const escaped = this._escapeXml(line.substring(position));
      runs.push(`      <w:r>\n        <w:t xml:space="preserve">${escaped}</w:t>\n      </w:r>`);
    }

    return runs.join('\n');
  },

  /**
   * Escape XML special characters.
   * @private
   */
  _escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
};

console.log('[DOCX] DOCX Handler loaded successfully');
