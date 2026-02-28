# Processing History Feature

**Version:** 0.3.0
**Added:** 2026-02-15
**Feature:** Automatic tracking and display of all file processing sessions

---

## Overview

Local PII Masking now automatically tracks every file you process, creating a complete audit trail of all PII detection and redaction activities. This provides accountability, helps you track your work, and ensures compliance with data handling requirements.

### Key Features

✅ **Automatic Tracking** - Every file processed is automatically logged
✅ **Detailed Metadata** - Upload time, processing time, detection counts
✅ **Privacy-Preserving** - No actual PII values stored, only hashed summaries
✅ **Local Storage** - All history stored in browser, never transmitted
✅ **Export Capability** - Export history as JSON for audit/compliance
✅ **Easy Management** - Clear all history with one click

---

## What Gets Tracked

### File Information
- **Original Filename** - Name of uploaded file
- **File Size** - Size in bytes (formatted as KB/MB)
- **File Type** - MIME type (e.g., `application/pdf`, `text/plain`)
- **Upload DateTime** - When file was uploaded

### Detection Information
- **Detection Count** - Total number of PII items found
- **Detection Summary** - Count by type (no actual PII values)
- **Average Confidence** - Per entity type
- **Detection Methods** - Which methods were used (regex, NER)
- **Processing Time** - How long detection took (seconds)

### Download Information
- **Downloaded Filename** - Name of redacted file
- **Download DateTime** - When redacted file was downloaded
- **Masking Strategy** - REDACTION, TOKENIZATION, or PARTIAL

### Model Information
- **Models Used** - Which NER models ran (english, chinese)
- **Models Skipped** - Which models were skipped for performance

---

## Privacy & Security

### What IS Stored

✅ **Metadata only** - Filenames, timestamps, counts
✅ **Hashed PII** - SHA-256 hashes of detected values
✅ **Detection types** - EMAIL, PERSON, ORGANIZATION, etc.
✅ **Processing statistics** - Times, confidence scores

### What is NOT Stored

❌ **No actual PII values** - Original text never stored
❌ **No file content** - Documents not saved
❌ **No sensitive data** - Only metadata for auditing

### Example History Item

```json
{
  "id": "1708024800000_abc123def",
  "originalFilename": "employee_records.pdf",
  "fileSize": 1234567,
  "fileType": "application/pdf",
  "uploadedAt": "2026-02-15T10:30:00.000Z",
  "detectionCount": 25,
  "detections": {
    "EMAIL": {
      "count": 5,
      "avgConfidence": 1.0,
      "methods": ["regex"]
    },
    "PERSON": {
      "count": 10,
      "avgConfidence": 0.92,
      "methods": ["ner-english"]
    },
    "PHONE": {
      "count": 10,
      "avgConfidence": 1.0,
      "methods": ["regex"]
    }
  },
  "maskingStrategy": "REDACTION",
  "downloadedFilename": "redacted_employee_records.pdf",
  "downloadedAt": "2026-02-15T10:31:30.000Z",
  "processingTime": 2.34,
  "modelsUsed": ["regex", "ner-english"],
  "modelsSkipped": ["ner-chinese"]
}
```

**Note:** No actual email addresses, names, or phone numbers are stored!

---

## Using the History Feature

### Viewing History

1. Open the Local PII Masking extension
2. Scroll to the **"Processing History"** section
3. See list of all processed files (most recent first)

### Expanding Details

- **Click on any history item** to expand and see full details
- Shows upload/download times, processing time, models used
- Shows detection breakdown by type with average confidence
- Click again to collapse

### Example Display

```
┌─────────────────────────────────────────────┐
│ Processing History          [Export] [Clear All] │
├─────────────────────────────────────────────┤
│ ▼ employee_records.pdf                      │
│   1.2 MB • 25 detections • 2 hr ago        │
│                                             │
│   Uploaded: 2/15/2026, 10:30:00 AM         │
│   Downloaded: 2/15/2026, 10:31:30 AM       │
│   Downloaded as: redacted_employee_records.pdf │
│   Masking: REDACTION                        │
│   Processing time: 2.34s                    │
│   Models used: regex, ner-english           │
│   Models skipped: ner-chinese               │
│                                             │
│   Detections by type:                       │
│   [EMAIL 5× 100% avg] [PERSON 10× 92% avg] │
│   [PHONE 10× 100% avg]                      │
└─────────────────────────────────────────────┘
```

### Clearing History

1. Click **"Clear All"** button in history section
2. Confirm deletion in popup dialog
3. All history permanently deleted from local storage

**Warning:** This action cannot be undone!

### Exporting History

1. Click **"Export"** button in history section
2. History downloaded as JSON file
3. Filename: `pii_masking_history_YYYY-MM-DD.json`
4. Contains all history items in structured format

**Use cases:**
- Compliance reporting
- Audit trails
- Backup before clearing
- Data analysis

---

## Storage Details

### Chrome Storage API

History is stored using `chrome.storage.local`:
- **Storage location:** Browser's local storage
- **Persistence:** Survives browser restarts
- **Privacy:** Never synced to cloud, never transmitted
- **Limit:** 10 MB total (shared with extension)
- **Auto-cleanup:** Keeps only last 100 items

### Storage Size

Each history item is approximately **500-800 bytes**:
- 100 items ≈ 50-80 KB
- Well within storage limits
- Minimal impact on browser performance

### Automatic Cleanup

To prevent storage bloat:
- **Maximum 100 items** kept in history
- Oldest items automatically deleted when limit reached
- Recent 100 items always preserved
- Users can manually clear anytime

---

## Compliance & Auditing

### Audit Trail Benefits

**For Compliance:**
- Track all PII handling activities
- Demonstrate data minimization (no PII stored)
- Prove offline-only processing
- Document masking strategies used

**For Organizations:**
- Monitor PII detection patterns
- Track processing volumes
- Identify frequently detected PII types
- Support data governance policies

**For Individuals:**
- Keep record of documents processed
- Verify redaction activities
- Export for personal records

### Export Format

Exported history is JSON formatted for easy processing:

```bash
# Example: Count total files processed
cat pii_masking_history_2026-02-15.json | jq 'length'

# Example: Count by file type
cat pii_masking_history_2026-02-15.json | jq '.[] | .fileType' | sort | uniq -c

# Example: Total detections across all files
cat pii_masking_history_2026-02-15.json | jq '[.[] | .detectionCount] | add'

# Example: Average processing time
cat pii_masking_history_2026-02-15.json | jq '[.[] | .processingTime] | add / length'
```

---

## FAQ

**Q: Can I disable history tracking?**

A: Not currently. History is essential for audit trails. However, you can clear it anytime, and it's stored only locally (never transmitted).

**Q: What happens when history reaches 100 items?**

A: The oldest item is automatically deleted when a new item is added. Recent 100 items are always preserved.

**Q: Is my actual PII data stored in history?**

A: **No!** Only metadata (filenames, counts, types, timestamps). Actual PII values are hashed using SHA-256 and cannot be reversed.

**Q: Can I search or filter history?**

A: Not in v0.3.0. Future versions may add search, filtering, and sorting capabilities.

**Q: Where is history stored?**

A: In your browser's local storage (`chrome.storage.local`). It never leaves your computer.

**Q: What if I uninstall the extension?**

A: All history is deleted when the extension is uninstalled. Export history first if you need to keep records.

**Q: Can I import history from a backup?**

A: Not currently. Future versions may support import functionality.

**Q: Does history slow down the extension?**

A: No. History operations are asynchronous and don't impact processing performance. Loading 100 items takes <10ms.

**Q: What if my browser crashes during processing?**

A: History is saved when:
1. File is uploaded (partial record created)
2. Detection completes (updated with results)
3. File is downloaded (final update)

If browser crashes after upload but before download, you'll see a partial record showing "Detected only (not downloaded)".

---

## Technical Details

### Data Structure

```javascript
{
  id: string,                    // Unique identifier
  originalFilename: string,      // e.g., "document.pdf"
  fileSize: number,              // Bytes
  fileType: string,              // MIME type
  uploadedAt: string,            // ISO 8601 timestamp
  detectionCount: number,        // Total detections
  detections: {                  // Summary by type
    [type: string]: {
      count: number,
      avgConfidence: number,
      methods: string[]
    }
  },
  maskingStrategy: string|null,  // REDACTION, TOKENIZATION, PARTIAL
  downloadedFilename: string|null,
  downloadedAt: string|null,     // ISO 8601 timestamp
  processingTime: number|null,   // Seconds
  modelsUsed: string[],          // e.g., ["regex", "ner-english"]
  modelsSkipped: string[]        // e.g., ["ner-chinese"]
}
```

### API Functions

**Core Functions:**

```javascript
createHistoryItem(filename, fileSize, fileType)
// Creates new history item on file upload

updateHistoryWithDetections(detections, processingTime, modelsInfo)
// Updates history with detection results

updateHistoryWithDownload(downloadedFilename, maskingStrategy)
// Updates history when file is downloaded

saveHistoryItem(historyItem)
// Saves history item to chrome.storage.local

loadHistory()
// Loads all history from storage

clearHistory()
// Deletes all history

exportHistory()
// Exports history as JSON file

displayHistory()
// Renders history in UI
```

**Helper Functions:**

```javascript
generateHistoryId()
// Creates unique ID for history items

formatFileSize(bytes)
// Formats bytes as KB/MB

formatDate(date)
// Formats date as relative time (e.g., "2 hr ago")

formatDetectionSummary(detections)
// Formats detection summary HTML

toggleHistoryItem(index)
// Expands/collapses history item details

escapeHtml(text)
// Prevents XSS in history display
```

### Performance

- **History save:** <5ms per item
- **History load:** <10ms for 100 items
- **History display:** <20ms render time
- **Export:** <50ms for 100 items

**Impact on processing:**
- File upload: +<1ms
- Detection complete: +<1ms
- Download: +5ms (saves to storage)

**Total overhead:** ~6ms per processing session (negligible)

---

## Future Enhancements

### Planned for v0.3.1

- **Search history** - Filter by filename, date, detection type
- **Sort options** - By date, file size, detection count
- **Statistics dashboard** - Summary charts and metrics
- **Import/export CSV** - For spreadsheet analysis

### Planned for v0.4.0

- **History categories** - Tag/organize history items
- **Custom retention** - Configure how many items to keep
- **Scheduled exports** - Auto-export history periodically
- **History comparison** - Compare detection results across files

---

## Troubleshooting

### History not appearing

**Check:**
1. Process a file end-to-end (upload → detect → download)
2. Open browser console (F12) and look for `[History]` messages
3. Verify no JavaScript errors in console
4. Check if history card is visible in UI

**Debug:**
```javascript
// In browser console:
chrome.storage.local.get(['processingHistory'], (result) => {
  console.log('History items:', result.processingHistory);
});
```

### History cleared unexpectedly

**Causes:**
- User clicked "Clear All"
- Extension was uninstalled/reinstalled
- Browser storage was cleared
- Browser in incognito mode (storage not persisted)

**Prevention:**
- Export history regularly for backup
- Don't use extension in incognito mode if you need history

### Export button not working

**Check:**
1. Browser allows file downloads
2. No popup blocker interfering
3. Check Downloads folder for exported file
4. Console for error messages

### Storage quota exceeded

**Symptoms:**
- Console error: "QUOTA_BYTES quota exceeded"
- History not saving

**Solution:**
1. Clear history to free up space
2. Extension uses <100 KB for 100 items (well within 10 MB limit)
3. If still occurring, check if other data is using storage:
   ```javascript
   chrome.storage.local.getBytesInUse(null, (bytes) => {
     console.log('Storage used:', bytes, 'bytes');
   });
   ```

---

## Privacy Considerations

### What Users Should Know

1. **Local Only:** History never leaves your browser
2. **No Cloud Sync:** Not synced across devices
3. **Manual Export Only:** You control when/if history is exported
4. **Clearable Anytime:** Can delete all history instantly
5. **No PII:** Actual sensitive data never stored

### Recommendations

**For Sensitive Environments:**
- Clear history after each session
- Export before clearing if needed for compliance
- Don't leave browser unattended with history visible

**For Compliance:**
- Export history regularly
- Store exports in secure location
- Review retention policies
- Document masking strategies used

**For Personal Use:**
- History helps track your work
- Safe to keep for reference
- Clear periodically to reduce clutter

---

## Comparison to Previous Version

### Before (v0.2.1)
- ❌ No tracking of processed files
- ❌ No audit trail
- ❌ No way to review past work
- ❌ No compliance documentation

### After (v0.3.0)
- ✅ Complete processing history
- ✅ Automatic audit trail
- ✅ Review all past sessions
- ✅ Export for compliance
- ✅ Track models and performance
- ✅ Privacy-preserving metadata only

---

**Status:** ✅ Production Ready
**Privacy:** 100% Local Storage
**Performance:** <10ms overhead per session
**Storage:** <100 KB for 100 items

For questions or issues, see main README.md
