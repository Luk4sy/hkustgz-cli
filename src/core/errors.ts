import {SkillChangeReportSchema,DoctorReportSchema} from './contracts.js';
import type { CliError } from './contracts.js';
export class CliFailure extends Error {
  constructor(public readonly code: string, public readonly remediation?: string, public readonly details?:unknown) { super(code); }
}
const errors: Record<string, {exitCode: number; message: string; remediation: string; retryable?: boolean}> = {
  ENVIRONMENT_NOT_READY: {exitCode:8,message:'The runtime environment is not ready.',remediation:'Run doctor and resolve the failing requirements before querying.'},
  SKILL_CONFLICT: {exitCode:8,message:'The Skill has user changes or is not owned by this CLI.',remediation:'Back up and move conflicting files manually; no user changes were overwritten.'},
  UNSAFE_SKILL_TARGET: {exitCode:2,message:'The Skill destination is unsafe.',remediation:'Use an absolute skills root without symbolic links or traversal.'},
  SKILL_OPERATION_FAILED: {exitCode:1,message:'The Skill operation could not be completed safely.',remediation:'Inspect the owned Skill transaction and restore its verified backup if necessary; do not delete unknown locks.'},
  INVALID_DATA_HOME: {exitCode: 2, message: 'The data directory is not a safe CLI-owned directory.', remediation: 'Set HKUSTGZ_CLI_HOME to a new empty absolute directory; do not use a personal browser profile.'},
  BROWSER_UNAVAILABLE: {exitCode: 8, message: 'The selected browser could not be started or installed.', remediation: 'Run browser status; select an installed Chrome/Edge or explicitly run browser install chromium.'},
  CLEANUP_FAILED: {exitCode: 1, message: 'Owned session resources could not be cleaned up safely.', remediation: 'Inspect the dedicated browser and lock; no unknown process was terminated.'},
  INTERRUPTED: {exitCode: 130, message: 'The command was interrupted.', remediation: 'Retry when ready.'},
  TERMINATED: {exitCode: 143, message: 'The command was terminated.', remediation: 'Retry when ready.'},
  INVALID_ARGUMENT: {exitCode: 2, message: 'Invalid command or arguments.', remediation: 'Run hkustgz-cli <command> --help.'},
  LOGIN_REQUIRED: {exitCode: 3, message: 'School login is required.', remediation: 'Run hkustgz-cli auth login <service> and complete normal school authentication.'},
  PERMISSION_DENIED: {exitCode: 4, message: 'The current account cannot access this resource.', remediation: 'Check the account permissions on the official website.'},
  NETWORK_REQUIRED: {exitCode: 5, message: 'The service could not be reached.', remediation: 'Check campus network access and retry.', retryable: true},
  QUERY_TIMEOUT: {exitCode: 5, message: 'The query exceeded its time budget.', remediation: 'Narrow the query or retry later.', retryable: true},
  RATE_LIMITED: {exitCode: 5, message: 'The service limited the request rate.', remediation: 'Wait before retrying.', retryable: true},
  ADAPTER_CHANGED: {exitCode: 6, message: 'The adapter or returned data does not match the supported contract.', remediation: 'Check capabilities and update the CLI.'},
  PARTIAL_RESULT: {exitCode: 7, message: 'The result is incomplete.', remediation: 'Inspect coverage and narrow the query.'},
  CAPABILITY_PENDING: {exitCode: 8, message: 'This capability has not been implemented and verified yet.', remediation: 'Run hkustgz-cli capabilities to see current support.'},
  UNSUPPORTED_CAPABILITY: {exitCode: 8, message: 'This capability is not supported.', remediation: 'Run hkustgz-cli capabilities to see supported commands.'},
  PROFILE_BUSY: {exitCode: 9, message: 'The dedicated browser profile is busy.', remediation: 'Wait for the other CLI process or close its browser window.'},
  INTERNAL_ERROR: {exitCode: 1, message: 'An unexpected error prevented the command from completing.', remediation: 'Report the command and error code without private data.'},
};
export function classifyError(error: unknown): {error: CliError; exitCode: number} {
  const code = error instanceof CliFailure && Object.hasOwn(errors, error.code) ? error.code : 'INTERNAL_ERROR';
  const descriptor = errors[code]!;
  const details=code==='SKILL_CONFLICT'&&error instanceof CliFailure?SkillChangeReportSchema.safeParse(error.details):(code==='ENVIRONMENT_NOT_READY'||code==='INVALID_DATA_HOME')&&error instanceof CliFailure?DoctorReportSchema.safeParse(error.details):null;
  return {exitCode: descriptor.exitCode, error: {code, message: descriptor.message,
    remediation: error instanceof CliFailure ? error.remediation ?? descriptor.remediation : descriptor.remediation,
    retryable: descriptor.retryable ?? false,...details?.success?{details:details.data}:{}}};
}
