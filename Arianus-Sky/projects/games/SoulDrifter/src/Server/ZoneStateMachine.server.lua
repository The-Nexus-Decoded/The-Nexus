-- ZoneStateMachine.server.lua
-- Arianus-Sky Zone Progression System
-- Handles zone gates, soul thresholds, and victory conditions

local ZoneStateMachine = {}
ZoneStateMachine.__index = ZoneStateMachine

export type ZoneState = {
	CurrentZone: number,
	Zone1GatesPassed: boolean,
	Zone2GatesPassed: boolean,
	HasKeyFragment: boolean,
	IsInCombat: boolean,
	EntropyTimer: number,
}

local ZONE_CONFIG = {
	[1] = {
		Name = "Descent",
		SoulThreshold = 30,
		EntityCount = 4,
		NextZone = 2,
	},
	[2] = {
		Name = "Up Draft",
		SoulThreshold = 50,
		EntityCount = 5,
		NextZone = 3,
	},
	[3] = {
		Name = "The Eye",
		SoulThreshold = 100,
		EntityCount = 8,
		IsBoss = true,
	},
}

local DEFAULT_STATE: ZoneState = {
	CurrentZone = 1,
	Zone1GatesPassed = false,
	Zone2GatesPassed = false,
	HasKeyFragment = false,
	IsInCombat = false,
	EntropyTimer = 0,
}

function ZoneStateMachine.new()
	local self = setmetatable({}, ZoneStateMachine)
	self.PlayerStates = {} :: { [number]: ZoneState }
	return self
end

function ZoneStateMachine:InitializePlayer(playerId: number)
	self.PlayerStates[playerId] = table.clone(DEFAULT_STATE)
	return self.PlayerStates[playerId]
end

function ZoneStateMachine:GetState(playerId: number): ZoneState?
	return self.PlayerStates[playerId]
end

function ZoneStateMachine:CheckZoneGate(playerId: number, currentSouls: number): boolean
	local state = self.PlayerStates[playerId]
	if not state then return false end
	
	local config = ZONE_CONFIG[state.CurrentZone]
	if not config then return false end
	
	-- Check if player meets soul threshold for current zone
	if currentSouls >= config.SoulThreshold then
		if state.CurrentZone == 1 then
			state.Zone1GatesPassed = true
		elseif state.CurrentZone == 2 then
			state.Zone2GatesPassed = true
		end
		
		-- Advance zone if not at max
		if config.NextZone then
			state.CurrentZone = config.NextZone
			return true -- Zone transition occurred
		end
	end
	
	return false
end

function ZoneStateMachine:CollectFragment(playerId: number, fragmentType: string): boolean
	local state = self.PlayerStates[playerId]
	if not state then return false end
	
	if fragmentType == "KeyFragment" then
		state.HasKeyFragment = true
		return true
	end
	
	return false
end

function ZoneStateMachine:CanExit(playerId: number): boolean
	local state = self.PlayerStates[playerId]
	if not state then return false end
	
	-- Exit requires: Zone 3, 100+ souls, Key Fragment
	return state.CurrentZone == 3 
		and state.HasKeyFragment
		or (state.Zone2GatesPassed and state.HasKeyFragment)
end

function ZoneStateMachine:ResetPlayer(playerId: number)
	self.PlayerStates[playerId] = table.clone(DEFAULT_STATE)
end

function ZoneStateMachine:GetZoneConfig(zoneId: number)
	return ZONE_CONFIG[zoneId]
end

return ZoneStateMachine
