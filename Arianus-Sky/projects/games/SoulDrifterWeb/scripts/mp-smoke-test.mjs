/**
 * Live smoke test for the multiplayer base layer (shard overflow instancing).
 *
 * Spawns the zone server on a scratch port, then verifies end to end:
 *   1. 30 clients join shard #1 and get welcomes with snapshots + shard info
 *   2. the 31st client overflows into a fresh shard #2 (not rejected)
 *   3. state relay works inside a shard and stays isolated across shards
 *   4. a departure broadcasts {t:"leave"} and empties/closes shard #2
 *
 * Run: node scripts/mp-smoke-test.mjs   (exit 0 = pass)
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const PORT = 8791;
const SERVER_URL = `ws://127.0.0.1:${PORT}`;
const SERVER = fileURLToPath(new URL("../server/zone-server.mjs", import.meta.url));

const failures = [];
const check = (label, condition) => {
  if (condition) console.log(`  ok   ${label}`);
  else {
    failures.push(label);
    console.error(`  FAIL ${label}`);
  }
};

const hello = (name) => ({
  t: "hello",
  v: 1,
  zone: "hv-1",
  name,
  appearance: { raceId: "human", callingId: "wayfarer" },
});

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    const messages = [];
    const waiters = [];
    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].predicate(message)) {
          waiters[i].resolve(message);
          waiters.splice(i, 1);
        }
      }
    });
    ws.on("open", () => ws.send(JSON.stringify(hello(name))));
    ws.on("error", reject);
    const waitFor = (predicate, ms = 4000) =>
      new Promise((res, rej) => {
        const existing = messages.find(predicate);
        if (existing) return res(existing);
        const timer = setTimeout(() => rej(new Error(`timeout waiting for message (${name})`)), ms);
        waiters.push({
          predicate,
          resolve: (m) => {
            clearTimeout(timer);
            res(m);
          },
        });
      });
    resolve({ ws, messages, waitFor, name });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const server = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  server.stdout.on("data", (chunk) => process.stdout.write(`  [server] ${chunk}`));
  await sleep(900);

  try {
    console.log("1. joining 30 clients…");
    const clients = [];
    for (let i = 1; i <= 30; i++) clients.push(await connect(`Drifter ${i}`));
    const welcomes = await Promise.all(clients.map((c) => c.waitFor((m) => m.t === "welcome")));
    check("all 30 received welcome", welcomes.length === 30);
    check("welcome cap is 30", welcomes.every((w) => w.cap === 30));
    check("all 30 landed in shard hv-1#1", welcomes.every((w) => w.shard === "hv-1#1"));
    check("welcome reports 1 live shard", welcomes.every((w) => w.shards === 1));
    const lastWelcome = welcomes[welcomes.length - 1];
    check("last joiner snapshot lists 29 others", lastWelcome.players.length === 29);
    const first = clients[0];
    await first.waitFor((m) => m.t === "join" && m.player.name === "Drifter 30");
    check("early joiner sees late join announcements", true);

    console.log("2. 31st client overflows into shard #2…");
    const overflow = await connect("Drifter 31");
    const overflowWelcome = await overflow.waitFor((m) => m.t === "welcome" || m.t === "full");
    check("31st client was NOT rejected with full", overflowWelcome.t === "welcome");
    check("31st client landed in shard hv-1#2", overflowWelcome.shard === "hv-1#2");
    check("welcome reports 2 live shards", overflowWelcome.shards === 2);
    check("fresh shard snapshot is empty", overflowWelcome.players.length === 0);

    console.log("3. state relay (in-shard yes, cross-shard no)…");
    const mover = clients[0];
    const watcher = clients[1];
    const moverId = welcomes[0].id;
    mover.ws.send(JSON.stringify({ t: "state", state: { p: [3, 0, 4], h: 1.1, a: "move", seq: 1 } }));
    const relayed = await watcher.waitFor((m) => m.t === "state" && m.id === moverId);
    check("same-shard watcher received mover state", relayed.state.p[0] === 3 && relayed.state.a === "move");
    const echo = mover.messages.filter((m) => m.t === "state" && m.id === moverId);
    check("sender does not receive its own state back", echo.length === 0);
    await sleep(400);
    const crossShard = overflow.messages.filter((m) => m.t === "state" && m.id === moverId);
    check("shard #2 does not receive shard #1 state", crossShard.length === 0);

    console.log("4. shard #2 empties and closes; freed slot backfills shard #1…");
    overflow.ws.close();
    await sleep(300);
    const leaver = clients[29];
    const leaverId = welcomes[29].id;
    leaver.ws.close();
    const leave = await watcher.waitFor((m) => m.t === "leave" && m.id === leaverId);
    check("leave broadcast received", leave.id === leaverId);
    await sleep(300);
    const lateJoiner = await connect("Late Drifter");
    const lateWelcome = await lateJoiner.waitFor((m) => m.t === "welcome");
    check("freed slot admits a new player", typeof lateWelcome.id === "string");
    check("new player backfills shard hv-1#1", lateWelcome.shard === "hv-1#1");
    check("shard count settled back to 1", lateWelcome.shards === 1);

    for (const client of [...clients, overflow, lateJoiner]) {
      try {
        client.ws.close();
      } catch {
        /* already closed */
      }
    }
  } finally {
    server.kill();
  }

  if (failures.length > 0) {
    console.error(`\nSMOKE TEST FAILED: ${failures.length} check(s): ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log("\nSMOKE TEST PASSED — 30 in shard #1, 31st overflowed to #2, relay isolated, shard lifecycle verified.");
}

main().catch((error) => {
  console.error("SMOKE TEST ERROR:", error);
  process.exit(1);
});
