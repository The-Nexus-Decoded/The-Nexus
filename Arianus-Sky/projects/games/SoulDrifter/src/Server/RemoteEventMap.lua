-- RemoteEventMap.server.lua
-- Central RemoteEvent validation layer
-- All client-server communication goes through validated channels

local RemoteEventMap = {}
RemoteEventMap.__index = RemoteEventMap

export type RemoteEventConfig = {
	EventName: string,
	Validate: (player: Player, args: { any }) -> (boolean, string?),
	RateLimitMs: number?,
	LastCall: { [number]: number },
}

-- Rate limiting settings
local RATE_LIMIT_MS = 500 -- 500ms between calls
local RATE_LIMIT_WINDOW = 5000 -- 5 second window for burst detection
local MAX_CALLS_PER_WINDOW = 10

-- Event configurations
local REMOTE_EVENTS: { [string]: RemoteEventConfig } = {
	-- Soul collection
	["CollectSoul"] = {
		EventName = "CollectSoul",
		Validate = function(player, args)
			local soulAmount = args[1]
			if type(soulAmount) ~= "number" then
				return false, "Invalid soul amount type"
			end
			if soulAmount < 0 or soulAmount > 1000 then
				return false, "Soul amount out of bounds"
			end
			return true
		end,
	},
	
	-- Fragment collection
	["CollectFragment"] = {
		EventName = "CollectFragment",
		Validate = function(player, args)
			local fragmentName = args[1]
			if type(fragmentName) ~= "string" then
				return false, "Invalid fragment name type"
			end
			-- Validate against known fragments
			local validFragments = {
				["WindDirection"] = true,
				["ThermalSensing"] = true,
				["KeyFragment"] = true,
			}
			if not validFragments[fragmentName] then
				return false, "Unknown fragment"
			end
			return true
		end,
	},
	
	-- Zone gate trigger
	["AttemptZoneTransition"] = {
		EventName = "AttemptZoneTransition",
		Validate = function(player, args)
			local targetZone = args[1]
			if type(targetZone) ~= "number" then
				return false, "Invalid zone type"
			end
			if targetZone < 1 or targetZone > 3 then
				return false, "Zone out of range"
			end
			return true
		end,
	},
	
	-- Discovery point interaction
	["DiscoverPoint"] = {
		EventName = "DiscoverPoint",
		Validate = function(player, args)
			local pointId = args[1]
			if type(pointId) ~= "string" then
				return false, "Invalid point ID type"
			end
			if #pointId > 50 then
				return false, "Point ID too long"
			end
			return true
		end,
	},
	
	-- Combat: Enemy defeated
	["EnemyDefeated"] = {
		EventName = "EnemyDefeated",
		Validate = function(player, args)
			local enemyId = args[1]
			local zoneId = args[2]
			
			if type(enemyId) ~= "string" then
				return false, "Invalid enemy ID type"
			end
			if type(zoneId) ~= "number" then
				return false, "Invalid zone type"
			end
			if zoneId < 1 or zoneId > 3 then
				return false, "Zone out of range"
			end
			return true
		end,
	},
	
	-- Boss phase (server-authoritative, but client can report)
	["BossPhaseComplete"] = {
		EventName = "BossPhaseComplete",
		Validate = function(player, args)
			local phase = args[1]
			if type(phase) ~= "number" then
				return false, "Invalid phase type"
			end
			if phase < 1 or phase > 3 then
				return false, "Phase out of range"
			end
			return true
		end,
	},
	
	-- Health: Client requests health update
	["RequestHealthUpdate"] = {
		EventName = "RequestHealthUpdate",
		Validate = function()
			-- No args needed, server validates player state
			return true
		end,
	},
	
	-- Health: Player takes damage (server-authoritative)
	["PlayerTakeDamage"] = {
		EventName = "PlayerTakeDamage",
		Validate = function(player, args)
			local damage = args[1]
			if type(damage) ~= "number" then
				return false, "Invalid damage type"
			end
			if damage < 0 or damage > 200 then
				return false, "Damage out of bounds"
			end
			return true
		end,
	},
	
	-- Request zone state
	["RequestZoneState"] = {
		EventName = "RequestZoneState",
		Validate = function()
			-- No args needed
			return true
		end,
	},
	
	-- UI: Update soul counter
	["UpdateSoulCounter"] = {
		EventName = "UpdateSoulCounter",
		Validate = function(player, args)
			local soulCount = args[1]
			if type(soulCount) ~= "number" then
				return false, "Invalid soul count type"
			end
			if soulCount < 0 or soulCount > 9999 then
				return false, "Soul count out of bounds"
			end
			return true
		end,
	},
	
	-- UI: Update zone indicator
	["UpdateZoneIndicator"] = {
		EventName = "UpdateZoneIndicator",
		Validate = function(player, args)
			local zoneId = args[1]
			local zoneName = args[2]
			if type(zoneId) ~= "number" or type(zoneName) ~= "string" then
				return false, "Invalid zone data"
			end
			if zoneId < 1 or zoneId > 3 then
				return false, "Zone out of range"
			end
			return true
		end,
	},
	
	-- UI: Update entropy timer
	["UpdateEntropyTimer"] = {
		EventName = "UpdateEntropyTimer",
		Validate = function(player, args)
			local timeRemaining = args[1]
			if type(timeRemaining) ~= "number" then
				return false, "Invalid time type"
			end
			if timeRemaining < 0 or timeRemaining > 300 then
				return false, "Time out of bounds"
			end
			return true
		end,
	},
	
	-- UI: Show discovery prompt
	["ShowDiscoveryPrompt"] = {
		EventName = "ShowDiscoveryPrompt",
		Validate = function(player, args)
			local discoveryName = args[1]
			if type(discoveryName) ~= "string" then
				return false, "Invalid discovery name"
			end
			if #discoveryName > 100 then
				return false, "Discovery name too long"
			end
			return true
		end,
	},
	
	-- UI: Show fragment collected
	["ShowFragmentCollected"] = {
		EventName = "ShowFragmentCollected",
		Validate = function(player, args)
			local fragmentName = args[1]
			if type(fragmentName) ~= "string" then
				return false, "Invalid fragment name"
			end
			return true
		end,
	},
	
	-- UI: Update zone gate state
	["UpdateZoneGateState"] = {
		EventName = "UpdateZoneGateState",
		Validate = function(player, args)
			local isUnlocked = args[1]
			local requiredSouls = args[2]
			if type(isUnlocked) ~= "boolean" or type(requiredSouls) ~= "number" then
				return false, "Invalid gate state"
			end
			return true
		end,
	},
	
	-- Player position validation (anti-cheat)
	["UpdatePosition"] = {
		EventName = "UpdatePosition",
		Validate = function(player, args)
			local position = args[1]
			if type(position) ~= "Vector3" then
				return false, "Invalid position type"
			end
			-- Bounds check for Arianus-Sky
			local maxAltitude = 200
			local minAltitude = -50
			local maxHorizontal = 500
			
			if position.Y > maxAltitude or position.Y < minAltitude then
				return false, "Position altitude out of bounds"
			end
			if math.abs(position.X) > maxHorizontal or math.abs(position.Z) > maxHorizontal then
				return false, "Position horizontal out of bounds"
			end
			return true
		end,
	},
}

-- Rate limit tracking
local CallHistory: { [number]: { [string]: number } } = {}

function RemoteEventMap.new()
	local self = setmetatable({}, RemoteEventMap)
	self.Events = REMOTE_EVENTS
	self.CallHistory = CallHistory
	return self
end

function RemoteEventMap:Validate(player: Player, eventName: string, args: { any }): (boolean, string?)
	local config = self.Events[eventName]
	if not config then
		return false, "Unknown remote event"
	end
	
	-- Rate limiting
	local playerId = player.UserId
	if not self.CallHistory[playerId] then
		self.CallHistory[playerId] = {}
	end
	
	local now = os.clock() * 1000
	local lastCall = self.CallHistory[playerId][eventName] or 0
	
	if now - lastCall < RATE_LIMIT_MS then
		return false, "Rate limited"
	end
	
	-- Burst detection
	local windowCalls = 0
	for _, callTime in pairs(self.CallHistory[playerId]) do
		if now - callTime < RATE_LIMIT_WINDOW then
			windowCalls += 1
		end
	end
	
	if windowCalls >= MAX_CALLS_PER_WINDOW then
		return false, "Burst rate exceeded"
	end
	
	self.CallHistory[playerId][eventName] = now
	
	-- Validate arguments
	return config.Validate(player, args)
end

function RemoteEventMap:RegisterEvent(eventName: string, config: RemoteEventConfig)
	self.Events[eventName] = config
end

function RemoteEventMap:GetEventConfig(eventName: string): RemoteEventConfig?
	return self.Events[eventName]
end

return RemoteEventMap
