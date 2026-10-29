import type { ControlResult, Failure, QueryResult } from '../core/contracts.js';
import {sanitizeValue} from '../core/sanitize.js';
export type Output = ControlResult<unknown> | QueryResult<unknown> | Failure;
function cell(value: unknown): string {
  return (typeof value === 'string' ? value : JSON.stringify(value) ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ');
}
export function renderOutput(value: Output, format: 'json' | 'table'): string {
  const safe = sanitizeValue(value) as Output;
  if (format === 'json') return `${JSON.stringify(safe)}\n`;
  const lines: string[] = [];
  if (!safe.ok) lines.push(`${safe.error.code}: ${safe.error.message}`, safe.error.remediation);
  if(!safe.ok&&safe.error.details)lines.push(JSON.stringify(safe.error.details,null,2));
  if ('data' in safe) {
    const data = safe.data;
    const items = data && typeof data === 'object' && 'items' in data ? data.items : null;
    if (Array.isArray(items)) {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (key !== 'items') lines.push(`${cell(key)}: ${cell(value)}`);
      }
    }
    if (Array.isArray(items) && items.length) {
      const rows: Record<string, unknown>[] = items.map((item: unknown) => item !== null && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {value: item});
      const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      lines.push(keys.join('\t'), ...rows.map((row) => keys.map((key) => cell(row[key])).join('\t')));
    } else if (Array.isArray(items)) lines.push('(no items)');
    else lines.push(JSON.stringify(data, null, 2));
  }
  if ('coverage' in safe.meta) {
    lines.push(`Coverage: ${safe.meta.coverage}; source: ${safe.meta.sourceUrl}; fetched: ${safe.meta.fetchedAt}`);
    for (const [key, value] of Object.entries(safe.meta)) {
      if (!['coverage', 'sourceUrl', 'fetchedAt', 'warnings'].includes(key)) lines.push(`${key}: ${cell(value)}`);
    }
    lines.push(...safe.meta.warnings.map((warning) => `${warning.code}: ${warning.message}`));
  }
  return `${lines.join('\n')}\n`;
}
