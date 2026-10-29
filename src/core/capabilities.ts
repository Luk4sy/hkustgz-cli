import type { Capability } from './contracts.js';
import { CapabilitySchema } from './contracts.js';
import { CliFailure } from './errors.js';
import {CATALOG_CAPABILITIES} from '../adapters/catalog/manifest.js';
import {PORTAL_CAPABILITIES} from '../adapters/portal/manifest.js';
import {CANVAS_CAPABILITIES} from '../adapters/canvas/manifest.js';
import {SIS_CAPABILITIES} from '../adapters/sis/manifest.js';
export const DEFAULT_CAPABILITIES: Capability[] = [
  ...['apps', 'notices', 'notice', 'agenda'].map((action) => ({id: `portal.${action}`, service: 'portal' as const})),
  ...['terms', 'timetable', 'today', 'history', 'grades'].map((action) => ({id: `sis.${action}`, service: 'sis' as const})),
  ...['search', 'course'].map((action) => ({id: `catalog.${action}`, service: 'catalog' as const})),
  ...['courses', 'announcements', 'assignments', 'agenda'].map((action) => ({id: `canvas.${action}`, service: 'canvas' as const})),
  {id: 'booking.providers', service: 'booking' as const},
  ...['rooms', 'availability', 'mine'].map((action) => ({id: `booking.library.${action}`, service: 'booking-library' as const})),
].map((item) => [...CATALOG_CAPABILITIES,...SIS_CAPABILITIES,...PORTAL_CAPABILITIES,...CANVAS_CAPABILITIES].find(cap=>cap.id===item.id)??({...item, state: 'pending', reason: 'Adapter implementation and real-system verification are pending.', evidenceId: null}));
export function requireCapability(items: Capability[], id: string): Capability {
  const matches = items.filter((item) => item.id === id);
  if (!matches.length) throw new CliFailure('UNSUPPORTED_CAPABILITY');
  if (matches.length !== 1) throw new CliFailure('ADAPTER_CHANGED');
  const result = CapabilitySchema.safeParse(matches[0]);
  if (!result.success) throw new CliFailure('ADAPTER_CHANGED');
  switch (result.data.state) {
    case 'pending': throw new CliFailure('CAPABILITY_PENDING');
    case 'unsupported': throw new CliFailure('UNSUPPORTED_CAPABILITY');
    case 'disabled': throw new CliFailure('ADAPTER_CHANGED');
    case 'verified': return result.data;
  }
}
