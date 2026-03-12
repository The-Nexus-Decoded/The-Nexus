-- DataStoreManager.server.lua
-- Persistent data storage with pcall and retry logic
-- Following SOUL.md: all DataStore operations wrapped in pcall with retry

local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")

local DataStoreManager = {}
DataStoreManager.__index = DataStoreManager

-- Configuration
local MAX_RETRIES = 3
local RETRY_DELAY = 1 -- seconds
local DATASTORE_NAME = "SoulDrifterPlayerData"

-- DataStore keys
local KEYS = {
	Profile = "profile_",
	Souls = "souls",
	Zone = "zone",
	Fragments = "fragments",
	Lore = "lore",
	Stats = "stats",
}

export type PlayerProfile = {
	TotalSouls: number,
	CurrentZone: number,
	CollectedFragments: { [string]: boolean },
	CollectedLore: { [string]: boolean },
	PlayTime: number,
	LastPlayed: number,
}

local DEFAULT_PROFILE: PlayerProfile = {
	TotalSouls = 0,
	CurrentZone = 1,
	CollectedFragments = {},
	CollectedLore = {},
	PlayTime = 0,
	LastPlayed = 0,
}

function DataStoreManager.new()
	local self = setmetatable({}, DataStoreManager)
	
	-- Initialize DataStores
	success, self.ProfileStore = pcall(function()
		return DataStoreService:GetDataStore(DATASTORE_NAME)
	end)
	
	if not success then
		warn("[DataStoreManager] Failed to create profile DataStore")
		self.ProfileStore = nil
	else
		print("[DataStoreManager] DataStore initialized")
	end
	
	return self
end

-- Retry wrapper
local function withRetry<T>(operation: () -> T, maxRetries: number): (boolean, T?)
	local attempts = 0
	local lastError
	
	while attempts < maxRetries do
		attempts += 1
		local success, result = pcall(operation)
		
		if success then
			return true, result
		end
		
		lastError = result
		warn(`[DataStoreManager] Attempt {attempts} failed: {lastError}`)
		
		if attempts < maxRetries then
			task.wait(RETRY_DELAY * attempts) -- Exponential backoff
		end
	end
	
	return false, lastError
end

function DataStoreManager:LoadProfile(playerId: number): PlayerProfile?
	if not self.ProfileStore then
		warn("[DataStoreManager] DataStore not available")
		return table.clone(DEFAULT_PROFILE)
	end
	
	local key = KEYS.Profile .. tostring(playerId)
	
	local success, profile = withRetry(function()
		return self.ProfileStore:GetAsync(key)
	end, MAX_RETRIES)
	
	if success and profile then
		-- Merge with defaults to handle new fields
		local merged = table.clone(DEFAULT_PROFILE)
		for k, v in pairs(profile) do
			merged[k] = v
		end
		print(`[DataStoreManager] Loaded profile for player {playerId}`)
		return merged
	else
		-- New player
		print(`[DataStoreManager] New player profile: {playerId}`)
		return table.clone(DEFAULT_PROFILE)
	end
end

function DataStoreManager:SaveProfile(playerId: number, profile: PlayerProfile): boolean
	if not self.ProfileStore then
		warn("[DataStoreManager] DataStore not available")
		return false
	end
	
	profile.LastPlayed = os.time()
	
	local key = KEYS.Profile .. tostring(playerId)
	
	local success, err = withRetry(function()
		self.ProfileStore:SetAsync(key, profile)
	end, MAX_RETRIES)
	
	if success then
		print(`[DataStoreManager] Saved profile for player {playerId}`)
		return true
	else
		warn(`[DataStoreManager] Failed to save profile: {err}`)
		return false
	end
end

function DataStoreManager:UpdateSouls(playerId: number, amount: number): boolean
	local profile = self:LoadProfile(playerId)
	if not profile then return false end
	
	profile.TotalSouls += amount
	
	return self:SaveProfile(playerId, profile)
end

function DataStoreManager:CollectFragment(playerId: number, fragmentName: string): boolean
	local profile = self:LoadProfile(playerId)
	if not profile then return false end
	
	if profile.CollectedFragments[fragmentName] then
		return false -- Already collected
	end
	
	profile.CollectedFragments[fragmentName] = true
	
	return self:SaveProfile(playerId, profile)
end

function DataStoreManager:UnlockLore(playerId: number, loreKey: string): boolean
	local profile = self:LoadProfile(playerId)
	if not profile then return false end
	
	if profile.CollectedLore[loreKey] then
		return false -- Already unlocked
	end
	
	profile.CollectedLore[loreKey] = true
	
	return self:SaveProfile(playerId, profile)
end

function DataStoreManager:SetZone(playerId: number, zoneId: number): boolean
	local profile = self:LoadProfile(playerId)
	if not profile then return false end
	
	profile.CurrentZone = zoneId
	
	return self:SaveProfile(playerId, profile)
end

function DataStoreManager:IncrementPlayTime(playerId: number, seconds: number): boolean
	local profile = self:LoadProfile(playerId)
	if not profile then return false end
	
	profile.PlayTime += seconds
	
	return self:SaveProfile(playerId, profile)
end

-- Auto-save on player leave
function DataStoreManager:OnPlayerLeaving(player: Player)
	local profile = self:LoadProfile(player.UserId)
	if profile then
		self:SaveProfile(player.UserId, profile)
	end
end

return DataStoreManager
