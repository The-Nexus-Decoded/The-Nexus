/**
 * Live smoke test for the multiplayer base layer.
 *
 * Spawns the zone server on a scratch port, then verifies end to end:
 *   1. 30 clients join and get welcomes with snapshots
 *   2. the 31st client is rejected with {t:"full"}
 *   3. one client's state reaches another client (relay)
 *   4. a departure broadcasts {t:"leave"} and frees a slot
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
  zone: "heartvale",
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
    const lastWelcome = welcomes[welcomes.length - 1];
    check("last joiner snapshot lists 29 others", lastWelcome.players.length === 29);
    const first = clients[0];
    await first.waitFor((m) => m.t === "join" && m.player.name === "Drifter 30");
    check("early joiner sees late join announcements", true);

    console.log("2. 31st client must be rejected…");
    const overflow = await connect("Drifter 31");
    const full = await overflow.waitFor((m) => m.t === "full");
    check("31st client got {t:'full', cap:30}", full.cap === 30);

    console.log("3. state relay…");
    const mover = clients[0];
    const watcher = clients[1];
    const moverId = welcomes[0].id;
    mover.ws.send(JSON.stringify({ t: "state", state: { p: [3, 0, 4], h: 1.1, a: "move", seq: 1 } }));
    const relayed = await watcher.waitFor((m) => m.t === "state" && m.id === moverId);
    check("watcher received mover state", relayed.state.p[0] === 3 && relayed.state.a === "move");
    const echo = mover.messages.filter((m) => m.t === "state" && m.id === moverId);
    check("sender does not receive its own state back", echo.length === 0);

    console.log("4. leave broadcast frees the slot…");
    const leaver = clients[29];
    const leaverId = welcomes[29].id;
    leaver.ws.close();
    const leave = await watcher.waitFor((m) => m.t === "leave" && m.id === leaverId);
    check("leave broadcast received", leave.id === leaverId);
    await sleep(300);
    const lateJoiner = await connect("Late Drifter");
    const lateWelcome = await lateJoiner.waitFor((m) => m.t === "welcome");
    check("freed slot admits a new player", typeof lateWelcome.id === "string");

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
  console.log("\nSMOKE TEST PASSED — 30 admitted, 31st rejected, relay + leave verified.");
}

main().catch((error) => {
  console.error("SMOKE TEST ERROR:", error);
  process.exit(1);
});
