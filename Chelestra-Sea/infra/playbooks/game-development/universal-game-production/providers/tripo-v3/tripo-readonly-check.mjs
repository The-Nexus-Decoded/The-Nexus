#!/usr/bin/env node

import { TripoClient } from '@vastai/tripo-sdk';

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function pickNumber(value, names) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return null;
  for (const name of names) {
    if (typeof value[name] === 'number') return value[name];
  }
  return null;
}

const baseUrl = argValue('--base-url', 'https://openapi.tripo3d.ai/v3');

if (!process.env.TRIPO_API_KEY) {
  console.error(JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result: 'BLOCKED',
    reason: 'TRIPO_API_KEY is not present in the process environment.',
    chargedTaskSubmitted: false,
  }, null, 2));
  process.exit(3);
}

const requiredMethods = [
  'textToModel',
  'imageToModel',
  'multiviewToModel',
  'uploadFile',
  'downloadModel',
  'segmentMesh',
  'completeMesh',
  'decimateMesh',
  'rigCheck',
  'rigModel',
  'retargetAnimation',
  'getTask',
  'listTasks',
  'waitForTask',
  'getBalance',
];

try {
  const client = new TripoClient({ baseUrl });
  const balanceResponse = await client.getBalance();
  const capabilities = Object.fromEntries(
    requiredMethods.map((method) => [method, typeof client[method] === 'function']),
  );
  const missingCapabilities = Object.entries(capabilities)
    .filter(([, available]) => !available)
    .map(([method]) => method);

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result: missingCapabilities.length === 0 ? 'PASS' : 'BLOCKED',
    provider: 'Tripo3D',
    sdkPackage: '@vastai/tripo-sdk',
    apiBase: baseUrl,
    secretPresent: true,
    authenticatedRead: 'PASS',
    balanceRead: 'PASS',
    availableBalance: pickNumber(balanceResponse, ['balance', 'available_balance', 'available', 'credits']),
    frozenBalance: pickNumber(balanceResponse, ['frozen', 'frozen_balance', 'reserved']),
    capabilities,
    missingCapabilities,
    chargedTaskSubmitted: false,
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(output.result === 'PASS' ? 0 : 4);
} catch (error) {
  console.error(JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result: 'BLOCKED',
    provider: 'Tripo3D',
    sdkPackage: '@vastai/tripo-sdk',
    apiBase: baseUrl,
    secretPresent: true,
    authenticatedRead: 'FAIL',
    balanceRead: 'FAIL',
    chargedTaskSubmitted: false,
    errorName: error?.name ?? 'Error',
    errorMessage: error?.message ?? String(error),
  }, null, 2));
  process.exit(5);
}
