import type { ControlResult, Failure, QueryResult } from '../core/contracts.js';
export type Output = ControlResult<unknown> | QueryResult<unknown> | Failure;
const temporaryParameters = new Set(['code', 'ticket', 'tt', 'access_token', 'refresh_token', 'id_token', 'state', 'nonce', 'gid_', 't_s', 'amp_sec_version_']);
function sanitizeOutput(value: Output) {
  if (!('sourceUrl' in value.meta)) return value;
  const url = new URL(value.meta.sourceUrl);
  url.username = ''; url.password = '';
  for (const key of [...url.searchParams.keys()]) if (temporaryParameters.has(key.toLowerCase())) url.searchParams.delete(key);
  return {...value, meta: {...value.meta, sourceUrl: url.href}};
}
function cell(value: unknown): string {
  return (typeof value === 'string' ? value : JSON.stringify(value) ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ');
}
export function renderOutput(value: Output, format: 'json' | 'table'): string {
  const safe = sanitizeOutput(value);
  if (format === 'json') return `${JSON.stringify(safe)}\n`;
  const lines: string[] = [];
  if (!safe.ok) lines.push(`${safe.error.code}: ${safe.error.message}`, safe.error.remediation);
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
