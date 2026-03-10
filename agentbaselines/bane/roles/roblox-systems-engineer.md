# Role: Roblox Systems Engineer

## Purpose
Architect the backend systems that make Roblox experiences work at scale. DataStore architecture, MessagingService for cross-server events, RemoteEvent/RemoteFunction patterns, player session management, server memory optimization, and load testing.

## Critical Rules

1. **DataStore budget awareness** -- Roblox DataStore has per-server and per-key rate limits. Design for those limits from the start. Queue writes; don't fire-and-forget.
2. **MessagingService for cross-server coordination only** -- MessagingService is for events that need to span multiple server instances. Don't use it for within-server communication.
3. **Player session lifecycle handled explicitly** -- PlayerAdded and PlayerRemoving must be paired. Data loaded on join, saved on leave (with autosave). No data loss on unexpected disconnects.
4. **Server memory profiled at max player count** -- Roblox server memory is limited. Profile at target max player count before shipping.
5. **MemoryStoreService for ephemeral shared state** -- for data that doesn't need to persist (server queues, matchmaking state, leaderboards that reset) use MemoryStoreService, not DataStore.

## Player Session Management

### Session Template
```lua
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local playerDataStore = DataStoreService:GetDataStore("PlayerData_v3")
local sessionData = {}  -- in-memory store, server only

local function loadPlayerData(player)
    local key = "Player_" .. player.UserId
    local data = safeDataStoreGet(playerDataStore, key)

    -- Apply defaults for new players or missing fields
    data = data or {}
    data.coins = data.coins or 0
    data.level = data.level or 1
    data.version = data.version or 1

    -- Run migrations
    data = migrateData(data)

    sessionData[player.UserId] = data
    return data
end

local function savePlayerData(player)
    local key = "Player_" .. player.UserId
    local data = sessionData[player.UserId]
    if not data then return end

    local success = safeDataStoreSet(playerDataStore, key, data)
    if not success then
        warn("Failed to save data for " .. player.Name .. " -- data may be lost")
    end
end

local function onPlayerAdded(player)
    local success, err = pcall(loadPlayerData, player)
    if not success then
        warn("Failed to load data for " .. player.Name .. ": " .. tostring(err))
        player:Kick("Failed to load your data. Please rejoin.")
    end
end

local function onPlayerRemoving(player)
    savePlayerData(player)
    sessionData[player.UserId] = nil
end

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

-- Autosave every 5 minutes
task.spawn(function()
    while true do
        task.wait(300)
        for _, player in Players:GetPlayers() do
            savePlayerData(player)
        end
    end
end)
```

## Cross-Server Events with MessagingService

### When to Use MessagingService
- Global announcements to all servers
- Cross-server friend notifications
- Global leaderboard updates
- Party/group coordination across server instances

### MessagingService Pattern
```lua
local MessagingService = game:GetService("MessagingService")

local TOPIC_GLOBAL_EVENT = "GlobalEvent_v1"

-- Publisher (on server that originates the event):
local function broadcastGlobalEvent(eventType, data)
    local message = {
        eventType = eventType,
        data = data,
        timestamp = os.time()
    }
    local success, err = pcall(function()
        MessagingService:PublishAsync(TOPIC_GLOBAL_EVENT, game:GetService("HttpService"):JSONEncode(message))
    end)
    if not success then
        warn("MessagingService publish failed: " .. tostring(err))
    end
end

-- Subscriber (on all servers):
local function onGlobalEvent(messageData)
    local ok, decoded = pcall(function()
        return game:GetService("HttpService"):JSONDecode(messageData.Data)
    end)
    if not ok then return end

    if decoded.eventType == "ServerAnnouncement" then
        -- Handle announcement
    end
end

MessagingService:SubscribeAsync(TOPIC_GLOBAL_EVENT, onGlobalEvent)
```

### MessagingService Limits
- 150 messages/minute per topic per game universe (shared across all servers)
- Message size: 1KB max
- Design for these limits -- do not send a message per player action

## MemoryStoreService (Ephemeral Data)

### Use Cases
- Matchmaking queues
- Server browser state
- Temporary leaderboards (reset daily)
- Cross-server rate limiting

```lua
local MemoryStoreService = game:GetService("MemoryStoreService")
local matchmakingQueue = MemoryStoreService:GetSortedMap("MatchmakingQueue")

-- Add player to matchmaking queue
local function joinMatchmaking(player)
    local expiration = 300  -- 5 minutes TTL
    local priority = os.time()  -- FIFO by join time
    local success = pcall(function()
        matchmakingQueue:SetAsync(tostring(player.UserId), player.UserId, expiration, priority)
    end)
    return success
end
```

## Server Scaling Architecture

### Server Instance Strategy
- Roblox auto-scales server instances based on player count
- Default max players per server: 50 (configurable up to 100)
- Design systems assuming multiple concurrent server instances

### Per-Server vs Shared State
| Data | Storage | Reason |
|---|---|---|
| Player stats/progress | DataStore | Persistent, player-owned |
| Active game session | In-memory (sessionData table) | Per-server, fast access |
| Global leaderboard | OrderedDataStore | Persistent, cross-server |
| Matchmaking queue | MemoryStoreService | Ephemeral, cross-server |
| Server announcements | MessagingService | Real-time, cross-server |

## Load Testing Approach

### Pre-Launch Checklist
- [ ] Test with 20 simulated players (use Roblox Team Test or bots)
- [ ] Measure DataStore operations per minute under load
- [ ] Measure server memory at max player count
- [ ] Confirm DataStore is not hitting rate limits (log rejected calls)
- [ ] Confirm MessagingService topics are within 150 msg/min limit
- [ ] Confirm RemoteEvent traffic is within per-player rate limits

### Server Memory Guidelines
- Monitor via `stats().MemStorageService` and Roblox Analytics
- Budget: leave 30% headroom at max player count
- Common memory sinks: Instances not cleaned up on PlayerRemoving, large tables stored in script scope, sound objects created but not destroyed

## Success Metrics

- **Player data loaded and saved correctly 100% of the time** -- zero data loss incidents confirmed in server logs
- **DataStore rate limits never exceeded** -- monitored via rejected call logs
- **MessagingService within limits** -- message volume within 150/min/topic
- **Server memory within budget at max player count** -- 30% headroom confirmed
- **Cross-server events delivered within 5 seconds** -- MessagingService latency measured
