# Detection Accuracy Roadmap — Towards ~100% PII Recall

**Goal:** Maximise PII recall while maintaining acceptable precision using the existing
regex, NER, and Qwen capabilities — without requiring a backend server.

---

## Where the gaps are

### Failure mode 1 — Regex misses (structured PII)
Regex is already near-perfect for explicitly-defined patterns. The gap is coverage, not algorithm:
- Phone number variants (optional country code, parenthesised area codes, mixed separators)
- Regional IDs not yet covered: Malaysian IC, Thai ID, Indonesian NIK (common in SG documents)
- Bank account numbers, IBAN, routing numbers
- Licence plate numbers (SG format)
- Employee IDs and membership numbers with company-specific formats

**Fix: pattern work only, no ML needed.**

### Failure mode 2 — NER misses (unstructured named entities)
The largest quantitative gap. BERT NER struggles with:
- Short or single-syllable names ("Li", "Ng", "Jo")
- Names immediately following punctuation or in ALL CAPS
- Organisation names outside training distribution (startups, SG holding-company naming conventions)
- Locations used as addresses rather than place names
- Bilingual mixed-script text ("Mr 陈 Wei Liang is the director")

### Failure mode 3 — Contextual / implicit PII (neither catches it)
The ceiling-breaker. Examples:
- "The account holder, born in 1985, residing at Blk 45…" — no name given, but position + DOB + address together are PII
- Role-based reference: "the CEO of [Company]" — identifiable without a name
- Unlabelled IDs in prose: "Reference: 8823741 is flagged"
- Partial information spread across paragraphs that assembles into a PII profile

Only a model with strong language understanding can catch these. This is Qwen's domain.

### Failure mode 4 — Qwen over-filtering
Qwen is currently used as a validator that discards borderline NER detections. If the
threshold is too aggressive, recall is traded for precision. Worth auditing how often
Qwen discards genuine PII.

---

## Tool roles

| Tool | Fixes | Doesn't fix |
|------|-------|-------------|
| Regex expansion | Mode 1 | Modes 2, 3 |
| BERT NER fine-tune | Mode 2 | Modes 1, 3 |
| Qwen extraction sweep (no training) | Modes 2, 3 | Mode 1 |
| Qwen fine-tuned for extraction | Modes 2, 3 (best) | Mode 1 |

---

## Realistic recall estimates

| Approach | Estimated overall recall |
|----------|--------------------------|
| Current (regex + NER + Qwen filter) | ~87–91% |
| + Regex pattern expansion | ~90–93% |
| + BERT NER fine-tune on domain data | ~93–95% |
| + Qwen extraction sweep (current model, no training) | ~95–97% |
| + Qwen fine-tuned for extraction | ~97–99% |

The last 1–2% is largely philosophical — implicit PII, assembling-from-parts, or truly
novel formats. The Qwen post-detection review panel (already built) provides human
oversight to close that gap.

---

## Recommended roadmap

### Phase 1 — No training required

**Regex pattern expansion**
- Systematic audit of missing structured PII patterns
- Priority additions: Malaysian IC, bank account numbers, SG vehicle plates, more phone variants

**Qwen extraction sweep**
The current Qwen model is underutilised — it only validates NER outputs (binary: keep/discard).
A higher-value use is document-level extraction: sweep the full document and find PII
that regex and NER both missed.

Architecture:
1. After regex + NER produce their results, chunk the document into ~400-char windows with ~80-char overlap
2. For each chunk, prompt Qwen: *"List any personally identifiable information in this text. Types: full names, phone numbers, emails, ID numbers, addresses, dates of birth, financial account numbers, organisations linked to individuals. Return only exact quoted strings you are certain are PII."*
3. Fuzzy-search each returned value in the original text to recover character positions
4. Add discovered entities as `method: 'llm-qwen'` detections at medium confidence
5. Deduplicate against existing regex / NER detections

No fine-tuning needed — the existing 1.5B model can already do this meaningfully with
a well-crafted prompt. Fine-tuning in Phase 3 makes it substantially better.

**Qwen false-negative audit**
- Sample cases where Qwen discarded a detection and verify whether any were genuine PII
- Adjust classifier prompt or confidence threshold if over-filtering

---

### Phase 2 — Fine-tune BERT NER

**Why NER first:**
- Weights slot into the existing inference pipeline with zero architectural changes
- Small model → fast training iteration (minutes per epoch on a consumer GPU)
- Full control over training distribution — domain-specific SG/HK/CN documents
- Expected recall improvement: ~5–10 percentage points over current NER

**Synthetic data pipeline:**
Real PII documents are unavailable for training. Generate synthetic data instead:
1. Use a capable LLM (GPT-4o / Claude) to generate realistic HR letters, contracts,
   medical summaries, financial statements, reference letters — in SG, HK, CN styles
2. Programmatically inject valid-format PII (use existing regex patterns in reverse
   to generate plausible NRICs, phone numbers, emails, etc.)
3. Auto-label with BIO tagging (positions are known because PII was injected)
4. Target 30,000–50,000 labeled sentences

**Training targets:**
- Better recall for short Asian names in SG/HK/CN document contexts
- Mixed-script sentences (English + Chinese in same span)
- Organisation names following SG/HK naming conventions
- Locations appearing as part of addresses

**Deliverable:** Drop-in replacement NER model weights, packaged for ONNX inference
in the browser.

---

### Phase 3 — Fine-tune Qwen for extraction

**What this unlocks:** Qwen becomes a primary detection engine for everything regex
doesn't cover. The extraction sweep from Phase 1 becomes dramatically more accurate.

**Approach:**
Train on instruction-following extraction examples:
```
Instruction: Identify all PII in the following text. Return a JSON list.
Text: "Please contact Sarah Tan Mei Ling at sarah.tan@fintech.sg or 8123 4567..."
Output: [{"type":"PERSON","value":"Sarah Tan Mei Ling"},{"type":"EMAIL","value":"sarah.tan@fintech.sg"},{"type":"PHONE_SG","value":"8123 4567"}]
```

Use QLoRA so the fine-tuned delta weights are small and can be layered onto the
base Qwen weights at runtime without increasing the packaged model size significantly.

**Infrastructure:** Qwen 2.5 1.5B with QLoRA needs ~8–16 GB VRAM. A cloud GPU
instance (A100/H100) for a few hours per training run. The Phase 2 synthetic data
pipeline can be reused — same documents, different output format (JSON extraction
instead of BIO tagging).

**Deliverable:** Fine-tuned LoRA adapter weights packaged alongside the base Qwen
model, loaded at inference time.

---

## What not to do

- **Don't fine-tune Qwen to replace regex.** LLMs are probabilistic; regex catches
  structured patterns deterministically. Use each tool for what it does best.
- **Don't lower NER confidence thresholds without more Qwen validation.** You'll trade
  precision for recall and drown in false positives. The right lever is fine-tuning.
- **Don't skip Phase 1.** The Qwen extraction sweep (no training required) will likely
  move the needle more in the short term than any training investment.

---

## Final pipeline (end state)

```
Document
  │
  ├─► Regex (structured PII)           ← deterministic, 100% confidence
  │
  ├─► Fine-tuned NER (named entities)  ← fast ML, high recall on domain data
  │
  ├─► Fine-tuned Qwen extraction       ← catches what both above miss
  │     (chunked sweep, JSON output)
  │
  ├─► Deduplication & merge
  │
  ├─► Qwen validation pass             ← reduces false positives
  │     (existing post-detection review panel)
  │
  └─► Results (~97–99% recall)
```

The Qwen post-detection review panel provides the human-in-the-loop layer for the
remaining edge cases that no automated system will catch reliably.
