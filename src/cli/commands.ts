import type { ServiceId } from '../core/contracts.js';

export interface CommandDefinition {
  path: string; description: string; capabilityId?: string; service?: ServiceId;
  args?: Array<{syntax: string; key: string; kind: 'text' | 'id' | 'service'}>;
  options?: Array<{flags: string; description: string; kind?: 'provider' | 'id'}>;
  headed?: boolean; refresh?: boolean; limit?: boolean;
}
const term = {flags: '--term <id>', description: 'School-provided term identifier', kind: 'id' as const};
const course = {flags: '--course <id>', description: 'Course identifier (required)', kind: 'id' as const};
const provider = {flags: '--provider <provider>', description: 'Booking provider (required; library only)', kind: 'provider' as const};
const range = [{flags: '--from <date>', description: 'Start date, YYYY-MM-DD'}, {flags: '--to <date>', description: 'Exclusive end date, YYYY-MM-DD'}];
const idArg = {syntax: '<id>', key: 'id', kind: 'id' as const};

export const COMMANDS: CommandDefinition[] = [
  {path: 'doctor', description: 'Inspect the runtime environment (pending)'},
  {path: 'capabilities', description: 'Show verified, pending and unsupported capabilities'},
  {path: 'auth login', description: 'Log in using a dedicated browser (pending)', args: [{syntax: '<service>', key: 'service', kind: 'service'}]},
  {path: 'auth status', description: 'Inspect authentication (pending)', args: [{syntax: '[service]', key: 'service', kind: 'service'}], options: [{flags: '--all', description: 'Check all declared services'}]},
  {path: 'auth logout', description: 'Clear only CLI-owned authentication (pending)'},
  {path: 'browser status', description: 'Show browser availability (pending)'},
  {path: 'browser use', description: 'Select the dedicated browser (pending)', args: [{syntax: '<browser>', key: 'browser', kind: 'text'}]},
  {path: 'browser install', description: 'Explicitly install Chromium (pending)', args: [{syntax: '<browser>', key: 'browser', kind: 'text'}]},
  {path: 'portal apps', description: 'List portal applications', capabilityId: 'portal.apps', service: 'portal', headed: true},
  {path: 'portal notices', description: 'List school notices', capabilityId: 'portal.notices', service: 'portal', headed: true, limit: true, options: [{flags: '--query <text>', description: 'Search notices'}]},
  {path: 'portal notice', description: 'Read a school notice', capabilityId: 'portal.notice', service: 'portal', headed: true, args: [idArg]},
  {path: 'portal agenda', description: 'Read portal agenda in a date range', capabilityId: 'portal.agenda', service: 'portal', headed: true, options: range},
  {path: 'sis terms', description: 'List available terms', capabilityId: 'sis.terms', service: 'sis', headed: true},
  {path: 'sis timetable', description: 'Read personal timetable', capabilityId: 'sis.timetable', service: 'sis', headed: true, options: [term]},
  {path: 'sis today', description: 'Read planned courses for a school date', capabilityId: 'sis.today', service: 'sis', headed: true, options: [term, {flags: '--date <date>', description: 'School date, YYYY-MM-DD'}]},
  {path: 'sis history', description: 'Read personal course history', capabilityId: 'sis.history', service: 'sis', headed: true, options: [term]},
  {path: 'sis grades', description: 'Read official grades when available', capabilityId: 'sis.grades', service: 'sis', headed: true, options: [term]},
  {path: 'catalog search', description: 'Search courses and quotas', capabilityId: 'catalog.search', service: 'catalog', headed: true, refresh: true, limit: true, args: [{syntax: '<text>', key: 'text', kind: 'text'}], options: [term]},
  {path: 'catalog course', description: 'Read a course and its sections', capabilityId: 'catalog.course', service: 'catalog', headed: true, refresh: true, args: [idArg], options: [term]},
  {path: 'canvas courses', description: 'List personal Canvas courses', capabilityId: 'canvas.courses', service: 'canvas', headed: true, limit: true},
  {path: 'canvas announcements', description: 'Read course announcements', capabilityId: 'canvas.announcements', service: 'canvas', headed: true, limit: true, options: [course]},
  {path: 'canvas assignments', description: 'Read course assignments', capabilityId: 'canvas.assignments', service: 'canvas', headed: true, limit: true, options: [course]},
  {path: 'canvas agenda', description: 'Read Canvas agenda in a date range', capabilityId: 'canvas.agenda', service: 'canvas', headed: true, options: range},
  {path: 'booking providers', description: 'List booking providers', capabilityId: 'booking.providers', service: 'booking', headed: true},
  {path: 'booking rooms', description: 'List library rooms', capabilityId: 'booking.library.rooms', service: 'booking-library', headed: true, limit: true, options: [provider, {flags: '--floor <id>', description: 'Floor identifier', kind: 'id'}]},
  {path: 'booking availability', description: 'Read room availability without creating a booking', capabilityId: 'booking.library.availability', service: 'booking-library', headed: true, options: [provider, {flags: '--room <id>', description: 'Room identifier (required)', kind: 'id'}, {flags: '--date <date>', description: 'School date, YYYY-MM-DD (required)'}]},
  {path: 'booking mine', description: 'Read personal library bookings', capabilityId: 'booking.library.mine', service: 'booking-library', headed: true, limit: true, options: [provider, ...range]},
];
