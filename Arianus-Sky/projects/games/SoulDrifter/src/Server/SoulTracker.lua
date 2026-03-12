-- SoulTracker.server.lua
-- Manages soul collection, thresholds, and rewards

local SoulTracker = {}
SoulTracker.__index = SoulTracker

export type SoulData = {
	TotalSouls: number,
	CurrentZoneSouls: number,
	SoulsPerZone: { [number]: number },
	CollectedFragments: { [string]: boolean },
	CollectedLore: { [string]: boolean },
}

local ZONE_SOUL_REQUIREMENTS = {
	{ Zone = 1, Required = 30, GateName = "Zone1Gate" },
	{ Zone = 2, Required = 50, GateName = "Zone2Gate" },
	{ Zone = 3, Required = 100, GateName = "ExitGate" },
}

local LORE_UNLOCK_TIERS = {
	{ Souls = 0, Tier = "I", Lore = "CorePremise" },
	{ Souls = 30, Tier = "II", Lore = "RealmHistory" },
	{ Souls = 100, Tier = "III", Lore = "SunderingTruth" },
}

local FRAGMENTS = {
	"WindDirection", -- Zone 1 reward
	"ThermalSensing", -- Zone 2 reward
	"KeyFragment", -- Zone 3 boss reward
}

local DEFAULT_SOUL_DATA: SoulData = {
	TotalSouls = 0,
	CurrentZoneSouls = 0,
	SoulsPerZone = {},
	CollectedFragments = {},
	CollectedLore = {},
}

function SoulTracker.new()
	local self = setmetatable({}, SoulTracker)
	self.PlayerData = {} :: { [number]: SoulData }
	return self
end

function SoulTracker:InitializePlayer(playerId: number)
	self.PlayerData[playerId] = table.clone(DEFAULT_SOUL_DATA)
	return self.PlayerData[playerId]
end

function SoulTracker:GetData(playerId: number): SoulData?
	return self.PlayerData[playerId]
end

function SoulTracker:AddSouls(playerId: number, amount: number, zoneId: number): SoulData?
	local data = self.PlayerData[playerId]
	if not data then return nil end
	
	data.TotalSouls += amount
	data.CurrentZoneSouls += amount
	
	-- Track per-zone souls
	if not data.SoulsPerZone[zoneId] then
		data.SoulsPerZone[zoneId] = 0
	end
	data.SoulsPerZone[zoneId] += amount
	
	-- Check for lore unlocks
	self:CheckLoreUnlocks(playerId)
	
	return data
end

function SoulTracker:CheckLoreUnlocks(playerId: number)
	local data = self.PlayerData[playerId]
	if not data then return end
	
	for _, unlock in ipairs(LORE_UNLOCK_TIERS) do
		if data.TotalSouls >= unlock.Souls and not data.CollectedLore[unlock.Lore] then
			data.CollectedLore[unlock.Lore] = true
			-- TODO: Fire lore unlock event to client
			print(`[SoulTracker] Player {playerId} unlocked lore: {unlock.Lore} (Tier {unlock.Tier})`)
		end
	end
end

function SoulTracker:CollectFragment(playerId: number, fragmentName: string): boolean
	local data = self.PlayerData[playerId]
	if not data then return false end
	
	-- Validate fragment exists
	local validFragment = false
	for _, frag in ipairs(FRAGMENTS) do
		if frag == fragmentName then
			validFragment = true
			break
		end
	end
	
	if not validFragment then
		warn(`[SoulTracker] Invalid fragment: {fragmentName}`)
		return false
	end
	
	if data.CollectedFragments[fragmentName] then
		return false -- Already collected
	end
	
	data.CollectedFragments[fragmentName] = true
	print(`[SoulTracker] Player {playerId} collected fragment: {fragmentName}`)
	
	return true
end

function SoulTracker:CheckZoneGate(playerId: number, zoneId: number): boolean
	local data = self.PlayerData[playerId]
	if not data then return false end
	
	for _, gate in ipairs(ZONE_SOUL_REQUIREMENTS) do
		if gate.Zone == zoneId then
			return data.CurrentZoneSouls >= gate.Required
		end
	end
	
	return false
end

function SoulTracker:GetLoreTier(playerId: number): string
	local data = self.PlayerData[playerId]
	if not data then return "I" end
	
	if data.TotalSouls >= 100 then
		return "III"
	elseif data.TotalSouls >= 30 then
		return "II"
	end
	
	return "I"
end

function SoulTracker:ResetPlayer(playerId: number)
	self.PlayerData[playerId] = table.clone(DEFAULT_SOUL_DATA)
end

function SoulTracker:Serialize(playerId: number): string?
	local data = self.PlayerData[playerId]
	if not data then return nil end
	
	return game:GetService("HttpService"):JSONEncode(data)
end

function SoulTracker:Deserialize(playerId: number, jsonString: string): boolean
	local success, data = pcall(function()
		return game:GetService("HttpService"):JSONDecode(jsonString)
	end)
	
	if not success or type(data) ~= "table" then
		return false
	end
	
	self.PlayerData[playerId] = data
	return true
end

return SoulTracker
