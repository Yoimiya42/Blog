/**
 * Stand-in for `cloudflare:workers`, which exists only in the Workers runtime.
 * Browser-environment tests resolve every import while transforming a module,
 * including lazy ones they never execute. Tests that need a database use
 * `createMigratedDatabase` from `d1.ts` instead of this binding.
 */
export const env = {};
