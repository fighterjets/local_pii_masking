# TODOS

Items considered and deferred during planning. Pick these up post-v1 or when demand warrants.

---

## P1 — Pre-launch required

### Homebrew tap automation
**What:** GitHub Actions workflow that automatically bumps the Homebrew formula on release tag push.
**Why:** Manual formula updates = stale installs = users running old versions with security bugs.
**Effort:** S (human) / S (CC+gstack)
**Approach:** Use `homebrew-releaser` or a custom workflow triggered on `v*` tag. Workflow checksums the release binary and opens a PR to the tap repo.
**How to start:** Create `.github/workflows/release.yml` that triggers on `release` event; use `Homebrew/brew-releaser` action.

---

## P2 — Post-launch, high value

### Auto-updater
**What:** `electron-updater` integration via electron-forge. Auto-download updates in the background + prompt user to install on next launch.
**Why:** Security patches won't reach users who forget to check manually.
**Effort:** M (human) / S (CC+gstack)
**Prerequisite:** Need a release hosting endpoint (GitHub Releases works with `electron-updater`). Ship manual "Check for updates" button in v1 as placeholder.
**How to start:** Add `update-electron-app` or `electron-updater` to package.json; configure `publish` in electron-forge config to target GitHub Releases.

### Image / OCR support (Tesseract.js)
**What:** OCR pass before NER on image-only PDFs. Detect when text extraction yields 0 characters, run Tesseract.js, feed OCR output into existing NER pipeline.
**Why:** Scanned HR documents, medical records, and legal contracts are frequently image PDFs. Current tool returns 0 detections and a warning — correct behavior but unhelpful.
**Effort:** L (human) / M (CC+gstack)
**Complexity:** Tesseract.js WASM is ~15MB addition to bundle. Must handle: multi-page OCR, orientation detection, language packs (English default, others as opt-in). OCR output coordinates won't align with pdf-lib coordinates — need a separate "blank page + insert text" redaction path for OCR-sourced detections.
**How to start:** Add `tesseract.js` to renderer; hook into PDF parser fallback path when `text_extracted === false`.

### Custom entity types (user-defined PII patterns)
**What:** User-defined regex patterns in the Settings panel (e.g., `EMP-\d{6}` for employee IDs, `PT-\d{8}` for patient IDs).
**Why:** Industry-specific PII is invisible to built-in NER. Enterprise customers will always have internal identifier formats.
**Effort:** M (human) / S (CC+gstack)
**Storage:** `~/.config/pii-mask/custom-entities.json` — array of `{name, pattern, redactWith}` objects.
**UI:** Settings panel: list of patterns, add/edit/delete, test pattern against sample text.
**How to start:** Add custom entity loader that runs regexes against extracted text before NER pass; merge results with NER detections.

### Audit logging for REST API
*(Already added to v1 scope — this entry is here for reference if it needs to be expanded into a more structured audit trail in future.)*
**Future scope:** structured JSONL audit log exportable to CSV, filterable by date/filename, with tamper-evident signatures. Needed for SOC2 Type II.

---

## P3 — Future, investigative

### Mac App Store submission
**What:** Investigate sandbox entitlement compatibility and submit for App Store review.
**Why:** App Store = discoverability for non-technical users + Apple handles billing for paid tiers.
**Effort:** XL (human) / L (CC+gstack)
**Blockers:**
- App Store sandboxing requires `com.apple.security.files.user-selected.read-write` entitlement for arbitrary file access — may not cover folder watching patterns
- ONNX WASM execution in sandbox needs `com.apple.security.cs.allow-jit` — Apple may reject apps that JIT-compile
- Finder Quick Action as an App Extension requires App Store submission of the extension separately
**How to start:** Build a sandboxed test build with required entitlements; test folder watching and ONNX inference; submit for TestFlight review before App Store.

### Enterprise policy management UI
**What:** Admin panel for deploying PII Masking via MDM with a policy file (allowed entity types, output directory, API access controls).
**Why:** Enterprise IT needs to configure and lock down settings at scale, not per-user.
**Effort:** XL (human) / L (CC+gstack)
**Depends on:** custom entity types (P2), SSO/auth overhaul

### SSO / MDM policy file
**What:** Policy file (JSON or plist) that IT admins deploy via MDM to pre-configure the app (port, allowed directories, entity types, auth method).
**Why:** Enterprise IT won't roll out a tool that requires each user to configure manually.
**Effort:** L (human) / M (CC+gstack)

---

## Deferred from v1 scope (not planned)

- Drag onto tray icon directly — non-standard Electron API, not supported in electron-forge
- Multiple concurrent renderer instances (parallelism) — single renderer is v1; revisit if throughput becomes a bottleneck
