import type { CharacterProfile } from "./character";
import type { InventoryState } from "./equipment";

const DATABASE_NAME = "souldrifter-story";
const DATABASE_VERSION = 4;

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

class SoulDrifterDatabase {
  private connection: Promise<IDBDatabase> | null = null;

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
    this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open the SoulDrifter story database."));
    });
    return this.connection;
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
