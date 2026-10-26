import type { CliError } from './contracts.js';
export class CliFailure extends Error {
  constructor(public readonly code: string) { super(code); }
}
const errors: Record<string, {exitCode: number; message: string; remediation: string; retryable?: boolean}> = {
  INVALID_ARGUMENT: {exitCode: 2, message: 'Invalid command or arguments.', remediation: 'Run hkustgz-cli <command> --help.'},
  LOGIN_REQUIRED: {exitCode: 3, message: 'School login is required.', remediation: 'Run hkustgz-cli auth login <service> when the auth module is available.'},
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
  return {exitCode: descriptor.exitCode, error: {code, message: descriptor.message, remediation: descriptor.remediation, retryable: descriptor.retryable ?? false}};
}
