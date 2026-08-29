import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCandidateReceiptFile } from "./validate-human-animation-candidate.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtimeAssetRoot = resolve(projectRoot, "public/assets/3d/animations");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

function resolveFromReceipt(value, receiptPath) {
  if (isAbsolute(value)) return resolve(value);
  return resolve(dirname(receiptPath), value);
}

function requireRuntimeDestination(destination) {
  const relativePath = relative(runtimeAssetRoot, destination);
  if (relativePath.startsWith("..") || isAbsolute(relativePath) || relativePath.length === 0) {
    throw new Error(`Destination must be a file beneath ${runtimeAssetRoot}`);
  }
}

function parseArgs(argv) {
  const args = { receipt: null, destination: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--receipt") args.receipt = argv[++index];
    else if (argv[index] === "--destination") args.destination = argv[++index];
    else throw new Error(`Unexpected argument: ${argv[index]}`);
  }
  if (!args.receipt || !args.destination) {
    throw new Error("Usage: node promote-human-animation-candidate.mjs --receipt <receipt.json> --destination <public/assets/3d/animations/...>");
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const receiptPath = resolve(args.receipt);
  const result = validateCandidateReceiptFile(receiptPath, { gate: "runtime-install" });
  if (result.errors.length) {
    throw new Error(`Runtime-install gate rejected candidate:\n${result.errors.join("\n")}`);
  }

  const source = resolveFromReceipt(result.receipt.candidateArtifact.path, receiptPath);
  const destination = isAbsolute(args.destination)
    ? resolve(args.destination)
    : resolve(projectRoot, args.destination);
  requireRuntimeDestination(destination);

  const expectedHash = result.receipt.candidateArtifact.sha256.toUpperCase();
  if (existsSync(destination)) {
    const existingHash = sha256(readFileSync(destination));
    if (existingHash !== expectedHash) {
      throw new Error(`Refusing to overwrite different runtime bytes at ${destination}`);
    }
  } else {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }

  const installedBytes = readFileSync(destination);
  const installedHash = sha256(installedBytes);
  if (installedHash !== expectedHash) {
    throw new Error(`Installed SHA-256 ${installedHash} does not match owner-approved ${expectedHash}`);
  }

  result.receipt.promotion = {
    status: "RUNTIME_INSTALLED",
    runtimeInstalled: true,
    installedAt: new Date().toISOString(),
    installedAsset: {
      path: destination,
      bytes: installedBytes.length,
      sha256: installedHash,
    },
  };
  result.receipt.runtimeVerification = {
    typecheck: "PENDING",
    tests: "PENDING",
    build: "PENDING",
    breachV2BrowserSmoke: "PENDING",
  };
  writeFileSync(receiptPath, `${JSON.stringify(result.receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    status: "RUNTIME_INSTALLED_VERIFICATION_REQUIRED",
    candidateId: result.receipt.candidate.id,
    destination,
    sha256: installedHash,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
