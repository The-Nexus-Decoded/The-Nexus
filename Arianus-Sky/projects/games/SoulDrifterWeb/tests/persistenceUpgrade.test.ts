import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DatabaseUpgradeBlockedError,
  SoulDrifterDatabase,
} from "../src/game/persistence";

interface MutableOpenRequest {
  result: IDBDatabase;
  error: DOMException | null;
  onblocked: IDBOpenDBRequest["onblocked"];
  onerror: IDBOpenDBRequest["onerror"];
  onsuccess: IDBOpenDBRequest["onsuccess"];
  onupgradeneeded: IDBOpenDBRequest["onupgradeneeded"];
}

function createOpenRequest(database?: IDBDatabase): MutableOpenRequest & IDBOpenDBRequest {
  return {
    result: database as IDBDatabase,
    error: null,
    onblocked: null,
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
  } as MutableOpenRequest & IDBOpenDBRequest;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("SoulDrifter IndexedDB connection lifecycle", () => {
  it("bounds a blocked version upgrade and permits a clean retry", async () => {
    vi.useFakeTimers();
    const firstRequest = createOpenRequest();
    const secondRequest = createOpenRequest();
    const open = vi.fn()
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest);
    const database = new SoulDrifterDatabase({ open } as unknown as IDBFactory, 25);

    const firstReady = database.ready();
    const blockedResult = expect(firstReady).rejects.toBeInstanceOf(DatabaseUpgradeBlockedError);
    firstRequest.onblocked?.(new Event("blocked") as IDBVersionChangeEvent);
    await vi.advanceTimersByTimeAsync(25);
    await blockedResult;

    const retry = database.ready();
    expect(open).toHaveBeenCalledTimes(2);
    secondRequest.error = new DOMException("retry stopped", "AbortError");
    secondRequest.onerror?.(new Event("error") as Event);
    await expect(retry).rejects.toThrow("retry stopped");
  });

  it("closes a stale connection on versionchange and opens a new one next time", async () => {
    const close = vi.fn();
    const firstDatabase = { close, onversionchange: null } as unknown as IDBDatabase;
    const firstRequest = createOpenRequest(firstDatabase);
    const secondRequest = createOpenRequest();
    const open = vi.fn()
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest);
    const database = new SoulDrifterDatabase({ open } as unknown as IDBFactory, 25);

    const firstReady = database.ready();
    firstRequest.onsuccess?.(new Event("success") as Event);
    await firstReady;
    expect(firstDatabase.onversionchange).toEqual(expect.any(Function));

    firstDatabase.onversionchange?.(new Event("versionchange") as IDBVersionChangeEvent);
    expect(close).toHaveBeenCalledOnce();

    const nextReady = database.ready();
    expect(open).toHaveBeenCalledTimes(2);
    secondRequest.error = new DOMException("second open stopped", "AbortError");
    secondRequest.onerror?.(new Event("error") as Event);
    await expect(nextReady).rejects.toThrow("second open stopped");
  });
});
