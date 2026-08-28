import type { CharacterProfile } from "./character";
import type { InventoryState } from "./equipment";

const DATABASE_NAME = "souldrifter-story";
const DATABASE_VERSION = 4;
export const DATABASE_UPGRADE_BLOCKED_TIMEOUT_MS = 4_000;

export class DatabaseUpgradeBlockedError extends Error {
  public readonly code = "DATABASE_UPGRADE_BLOCKED";

  public constructor() {
    super("SoulDrifter storage is waiting for an older tab to close. Close other SoulDrifter tabs, then retry.");
    this.name = "DatabaseUpgradeBlockedError";
  }
}

interface NpcStateRecord {
  id: string;
  npcId: string;
  conversationCount: number;
  lastSceneId: string;
  lastChoiceId: string;
  updatedAt: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export class SoulDrifterDatabase {
  private connection: Promise<IDBDatabase> | null = null;

  public constructor(
    private readonly databaseFactory: IDBFactory = globalThis.indexedDB,
    private readonly blockedTimeoutMs = DATABASE_UPGRADE_BLOCKED_TIMEOUT_MS,
  ) {}

  public async ready(): Promise<void> {
    await this.open();
  }

  public async loadCharacter(): Promise<CharacterProfile | null> {
    const record = await this.get<{ id: string; profile: CharacterProfile }>("characters", "active");
    return record?.profile ?? null;
  }

  public async saveCharacter(profile: CharacterProfile): Promise<void> {
    await this.put("characters", { id: "active", profile, updatedAt: new Date().toISOString() });
  }

  public async loadAvatarPreview(): Promise<string | null> {
    const record = await this.get<{ id: string; dataUrl: string }>("avatarPreviews", "active");
    return record?.dataUrl ?? null;
  }

  public async saveAvatarPreview(dataUrl: string): Promise<void> {
    await this.put("avatarPreviews", { id: "active", dataUrl, updatedAt: new Date().toISOString() });
  }

  public async clearAvatarPreview(): Promise<void> {
    await this.delete("avatarPreviews", "active");
  }

  public async loadInventory(): Promise<InventoryState | null> {
    const record = await this.get<{ id: string; inventory: InventoryState }>("inventories", "active");
    return record?.inventory ?? null;
  }

  public async saveInventory(inventory: InventoryState): Promise<void> {
    await this.put("inventories", { id: "active", inventory, updatedAt: new Date().toISOString() });
  }

  public async clearInventory(): Promise<void> {
    await this.delete("inventories", "active");
  }

  public async recordDialogue(
    npcId: string,
    sceneId: string,
    choiceId: string,
  ): Promise<void> {
    const id = `active:${npcId}`;
    const previous = await this.get<NpcStateRecord>("npcStates", id);
    const now = new Date().toISOString();
    await this.put("npcStates", {
      id,
      npcId,
      conversationCount: (previous?.conversationCount ?? 0) + 1,
      lastSceneId: sceneId,
      lastChoiceId: choiceId,
      updatedAt: now,
    } satisfies NpcStateRecord);
    await this.add("dialogueEvents", { characterId: "active", npcId, sceneId, choiceId, occurredAt: now });
  }

  public async reachCheckpoint(checkpointId: string, source: string): Promise<void> {
    await this.put("checkpoints", {
      id: `active:${checkpointId}`,
      characterId: "active",
      checkpointId,
      source,
      reachedAt: new Date().toISOString(),
    });
  }

  public async saveNpcStoryOverride(npcId: string, data: unknown): Promise<void> {
    await this.put("storyOverrides", { id: npcId, data, updatedAt: new Date().toISOString() });
  }

  public async getNpcStoryOverride<T>(npcId: string): Promise<T | null> {
    const record = await this.get<{ id: string; data: T }>("storyOverrides", npcId);
    return record?.data ?? null;
  }

  public async loadDungeonRun<T>(runId: string): Promise<T | null> {
    const record = await this.get<{ id: string; state: T }>("dungeonRuns", runId);
    return record?.state ?? null;
  }

  public async saveDungeonRun(runId: string, state: unknown): Promise<void> {
    await this.put("dungeonRuns", { id: runId, state, updatedAt: new Date().toISOString() });
  }

  public async clearDungeonRun(runId: string): Promise<void> {
    await this.delete("dungeonRuns", runId);
  }

  private async open(): Promise<IDBDatabase> {
    if (this.connection) return this.connection;
    let attempt: Promise<IDBDatabase>;
    attempt = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.databaseFactory.open(DATABASE_NAME, DATABASE_VERSION);
      let settled = false;
      let blockedTimer: ReturnType<typeof setTimeout> | null = null;
      const clearBlockedTimer = (): void => {
        if (blockedTimer === null) return;
        clearTimeout(blockedTimer);
        blockedTimer = null;
      };
      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        clearBlockedTimer();
        if (this.connection === attempt) this.connection = null;
        reject(error);
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("characters")) db.createObjectStore("characters", { keyPath: "id" });
        if (!db.objectStoreNames.contains("npcStates")) db.createObjectStore("npcStates", { keyPath: "id" });
        if (!db.objectStoreNames.contains("dialogueEvents")) db.createObjectStore("dialogueEvents", { autoIncrement: true });
        if (!db.objectStoreNames.contains("checkpoints")) db.createObjectStore("checkpoints", { keyPath: "id" });
        if (!db.objectStoreNames.contains("storyOverrides")) db.createObjectStore("storyOverrides", { keyPath: "id" });
        if (!db.objectStoreNames.contains("inventories")) db.createObjectStore("inventories", { keyPath: "id" });
        if (!db.objectStoreNames.contains("avatarPreviews")) db.createObjectStore("avatarPreviews", { keyPath: "id" });
        if (!db.objectStoreNames.contains("dungeonRuns")) db.createObjectStore("dungeonRuns", { keyPath: "id" });
      };
      request.onblocked = () => {
        if (blockedTimer !== null || settled) return;
        blockedTimer = setTimeout(() => fail(new DatabaseUpgradeBlockedError()), this.blockedTimeoutMs);
      };
      request.onsuccess = () => {
        clearBlockedTimer();
        const database = request.result;
        if (settled) {
          database.close();
          return;
        }
        settled = true;
        database.onversionchange = () => {
          database.close();
          if (this.connection === attempt) this.connection = null;
        };
        resolve(database);
      };
      request.onerror = () => fail(request.error ?? new Error("Unable to open the SoulDrifter story database."));
    });
    this.connection = attempt;
    return attempt;
  }

  private async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const database = await this.open();
    const transaction = database.transaction(storeName, "readonly");
    const result = await requestResult(transaction.objectStore(storeName).get(key));
    return result as T | undefined;
  }

  private async put(storeName: string, value: unknown): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(storeName, "readwrite");
    await requestResult(transaction.objectStore(storeName).put(value));
  }

  private async add(storeName: string, value: unknown): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(storeName, "readwrite");
    await requestResult(transaction.objectStore(storeName).add(value));
  }

  private async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(storeName, "readwrite");
    await requestResult(transaction.objectStore(storeName).delete(key));
  }
}

export const storyDatabase = new SoulDrifterDatabase();
