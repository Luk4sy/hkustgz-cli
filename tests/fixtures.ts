export function queryMeta() {
  return {
    schemaVersion: '1' as const, command: 'catalog search', service: 'catalog' as const,
    sourceUrl: 'https://sisn.hkust-gz.edu.cn/cq', fetchedAt: '2026-10-26T20:00:00+08:00',
    timezone: 'Asia/Shanghai' as const, readMethod: 'dom' as const, coverage: 'complete' as const,
    pagesRead: 1, recordsRead: 1, returnedCount: 1, truncationReason: null,
    cache: { hit: false, storedAt: null }, warnings: [],
  };
}
