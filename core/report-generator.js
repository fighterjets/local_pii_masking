/**
 * Detection Report Generator
 *
 * Generates comprehensive reports of PII detections and masking operations.
 * Reports include detection metadata, statistics, and audit information.
 */

import { generateUUID, hashContent } from '../utils/security.js';
import logger from './audit-logger.js';

/**
 * Generate a comprehensive detection and masking report
 */
export async function generateReport(detections, document, maskedDocument, processingMetadata) {
  const reportId = generateUUID();
  const timestamp = new Date().toISOString();

  // Calculate document hashes
  const originalHash = await hashContent(document.content);
  const maskedHash = maskedDocument ? await hashContent(maskedDocument.content) : null;

  const report = {
    reportId,
    timestamp,
    version: '1.0',

    // Document information
    document: {
      name: document.name,
      size: document.size,
      type: document.type,
      hash: originalHash,
      ...(document.metadata || {})
    },

    // Processing metadata
    processing: {
      startTime: processingMetadata.startTime,
      endTime: processingMetadata.endTime || new Date().toISOString(),
      durationMs: processingMetadata.durationMs,
      detectionMethods: processingMetadata.methods || [],
      modelInfo: processingMetadata.modelInfo || {}
    },

    // Detection results
    detections: detections.map(d => ({
      id: generateUUID(),
      type: d.type,
      method: d.method,
      confidence: d.confidence,
      position: {
        start: d.start,
        end: d.end
      },
      // Hash of original value (never store raw PII)
      originalHash: d.hash,
      // Additional metadata
      metadata: {
        pattern: d.pattern,
        description: d.description,
        model: d.model
      }
    })),

    // Masking results (if masking was performed)
    masking: maskedDocument ? {
      applied: true,
      strategy: maskedDocument.strategy,
      documentHash: maskedHash,
      operations: maskedDocument.operations || []
    } : {
      applied: false
    },

    // Statistical summary
    summary: generateSummary(detections, maskedDocument),

    // Compliance information
    compliance: {
      dataRetention: 'No PII values stored in report',
      privacy: 'All sensitive values are hashed using SHA-256',
      standards: ['GDPR', 'PDPA']
    }
  };

  logger.info('REPORT', 'Detection report generated', {
    reportId,
    detectionCount: detections.length,
    masked: maskedDocument ? true : false
  });

  return report;
}

/**
 * Generate statistical summary of detections
 */
function generateSummary(detections, maskedDocument) {
  const summary = {
    totalDetections: detections.length,
    byType: {},
    byMethod: {},
    byConfidence: {
      high: 0,    // > 0.95
      medium: 0,  // 0.85 - 0.95
      low: 0      // < 0.85
    }
  };

  detections.forEach(detection => {
    // Count by type
    summary.byType[detection.type] = (summary.byType[detection.type] || 0) + 1;

    // Count by method
    summary.byMethod[detection.method] = (summary.byMethod[detection.method] || 0) + 1;

    // Count by confidence level
    if (detection.confidence > 0.95) {
      summary.byConfidence.high++;
    } else if (detection.confidence >= 0.85) {
      summary.byConfidence.medium++;
    } else {
      summary.byConfidence.low++;
    }
  });

  // Masking summary
  if (maskedDocument) {
    summary.masked = {
      totalMasked: maskedDocument.operations?.length || 0,
      strategy: maskedDocument.strategy
    };
  }

  return summary;
}

/**
 * Generate human-readable report in markdown format
 */
export function generateMarkdownReport(report) {
  let md = `# PII Detection Report\n\n`;
  md += `**Report ID:** ${report.reportId}\n`;
  md += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

  // Document information
  md += `## Document Information\n\n`;
  md += `- **Name:** ${report.document.name}\n`;
  md += `- **Size:** ${formatBytes(report.document.size)}\n`;
  md += `- **Type:** ${report.document.type}\n`;
  md += `- **Hash:** \`${report.document.hash.substring(0, 16)}...\`\n\n`;

  // Processing information
  md += `## Processing\n\n`;
  md += `- **Duration:** ${report.processing.durationMs}ms\n`;
  md += `- **Methods:** ${report.processing.detectionMethods.join(', ')}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `**Total Detections:** ${report.summary.totalDetections}\n\n`;

  if (report.summary.totalDetections > 0) {
    md += `### Detections by Type\n\n`;
    md += `| Type | Count |\n`;
    md += `|------|-------|\n`;
    Object.entries(report.summary.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        md += `| ${type} | ${count} |\n`;
      });
    md += `\n`;

    md += `### Detections by Method\n\n`;
    md += `| Method | Count |\n`;
    md += `|--------|-------|\n`;
    Object.entries(report.summary.byMethod).forEach(([method, count]) => {
      md += `| ${method} | ${count} |\n`;
    });
    md += `\n`;

    md += `### Confidence Distribution\n\n`;
    md += `| Level | Count |\n`;
    md += `|-------|-------|\n`;
    md += `| High (>0.95) | ${report.summary.byConfidence.high} |\n`;
    md += `| Medium (0.85-0.95) | ${report.summary.byConfidence.medium} |\n`;
    md += `| Low (<0.85) | ${report.summary.byConfidence.low} |\n\n`;
  }

  // Masking information
  if (report.masking.applied) {
    md += `## Masking\n\n`;
    md += `- **Strategy:** ${report.masking.strategy}\n`;
    md += `- **Operations:** ${report.summary.masked.totalMasked}\n`;
    md += `- **Masked Document Hash:** \`${report.masking.documentHash.substring(0, 16)}...\`\n\n`;
  }

  // Compliance
  md += `## Compliance\n\n`;
  md += `- ${report.compliance.dataRetention}\n`;
  md += `- ${report.compliance.privacy}\n`;
  md += `- Standards: ${report.compliance.standards.join(', ')}\n\n`;

  // Detailed detections
  if (report.detections.length > 0) {
    md += `## Detailed Detections\n\n`;
    md += `| Type | Method | Confidence | Position |\n`;
    md += `|------|--------|------------|----------|\n`;

    report.detections
      .sort((a, b) => a.position.start - b.position.start)
      .forEach(detection => {
        md += `| ${detection.type} | ${detection.method} | `;
        md += `${(detection.confidence * 100).toFixed(1)}% | `;
        md += `${detection.position.start}-${detection.position.end} |\n`;
      });
  }

  md += `\n---\n`;
  md += `*Generated by Local PII Masking - Enterprise PII Detection*\n`;

  return md;
}

/**
 * Generate CSV report for spreadsheet analysis
 */
export function generateCSVReport(report) {
  const rows = [
    ['Report ID', report.reportId],
    ['Timestamp', report.timestamp],
    ['Document', report.document.name],
    ['Total Detections', report.summary.totalDetections],
    [],
    ['Type', 'Method', 'Confidence', 'Start', 'End', 'Hash']
  ];

  report.detections.forEach(detection => {
    rows.push([
      detection.type,
      detection.method,
      detection.confidence.toFixed(3),
      detection.position.start,
      detection.position.end,
      detection.originalHash.substring(0, 16)
    ]);
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Download report as file
 */
export function downloadReport(report, format = 'json') {
  let content, filename, mimeType;

  switch (format) {
    case 'json':
      content = JSON.stringify(report, null, 2);
      filename = `pii-report-${report.reportId}.json`;
      mimeType = 'application/json';
      break;

    case 'markdown':
      content = generateMarkdownReport(report);
      filename = `pii-report-${report.reportId}.md`;
      mimeType = 'text/markdown';
      break;

    case 'csv':
      content = generateCSVReport(report);
      filename = `pii-report-${report.reportId}.csv`;
      mimeType = 'text/csv';
      break;

    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);

  logger.info('EXPORT', `Report downloaded: ${format}`, { filename });
}

/**
 * Format bytes for display
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default {
  generateReport,
  generateMarkdownReport,
  generateCSVReport,
  downloadReport
};
