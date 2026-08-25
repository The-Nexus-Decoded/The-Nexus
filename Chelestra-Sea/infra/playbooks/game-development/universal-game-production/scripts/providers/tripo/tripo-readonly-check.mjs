#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TripoClient } from '@vastai/tripo-sdk';

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const baseUrl = argValue('--base-url', 'https://openapi.tripo3d.ai/v3');
const apiKey = process.env.TRIPO_API_KEY;

if (!apiKey) {
  console.error(JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result: 'BLOCKED',
    provider: 'Tripo3D',
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
  const balance = await client.getBalance();

  const capabilities = Object.fromEntries(
    requiredMethods.map((method) => [method, typeof client[method] === 'function']),
  );
  const missingCapabilities = Object.entries(capabilities)
    .filter(([, available]) => !available)
    .map(([method]) => method);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  let sdkVersion = 'unknown';
  try {
    const packageJsonPath = path.join(
      scriptDir,
      'node_modules',
      '@vastai',
      'tripo-sdk',
      'package.json',
    );
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    sdkVersion = packageJson.version ?? 'unknown';
  } catch {
    // A bootstrap wrapper may populate the installed package version.
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result: missingCapabilities.length === 0 ? 'PASS' : 'BLOCKED',
    provider: 'Tripo3D',
    role: '3D_PRODUCTION_ONLY',
    sdkPackage: '@vastai/tripo-sdk',
    sdkVersion,
    apiBase: baseUrl,
    secretPresent: true,
    authenticatedRead: 'PASS',
    balanceRead: 'PASS',
    availableBalance: typeof balance?.balance === 'number' ? balance.balance : null,
    frozenBalance: typeof balance?.frozen === 'number' ? balance.frozen : null,
    capabilities,
    missingCapabilities,
    hostLlmImageGenerationPreferred: true,
    tripo2DImageGenerationDefault: 'DISABLED',
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
