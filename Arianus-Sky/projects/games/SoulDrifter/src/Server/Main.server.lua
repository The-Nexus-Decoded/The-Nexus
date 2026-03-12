-- Main.server.lua
-- Arianus-Sky Server Entry Point
-- Initializes all systems and handles player connections

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Import our systems
local ZoneGeometry = require(script.Parent.ZoneGeometry)
local ZoneStateMachine = require(script.Parent.ZoneStateMachine)
local SoulTracker = require(script.Parent.SoulTracker)
local RemoteEventMap = require(script.Parent.RemoteEventMap)
local DataStoreManager = require(script.Parent.DataStoreManager)

-- Configuration
local SERVER_CONFIG = {
	AutoSaveInterval = 60, -- seconds
	EntropyTimerStart = 300, -- 5 minutes in seconds
	DiscoveryTimeBonus = 30, -- seconds added per discovery
}

-- Initialize systems
local zoneMachine = ZoneStateMachine.new()
local soulTracker = SoulTracker.new()
local remoteMap = RemoteEventMap.new()
local dataStore = DataStoreManager.new()
local zoneGeometry = ZoneGeometry.new()

-- Build Zone 1 geometry on server start
zoneGeometry:BuildZone1()

-- RemoteEvents setup
local remoteEvents = ReplicatedStorage:WaitForChild("RemoteEvents")

-- Create RemoteEvents if they don't exist
if not remoteEvents:FindFirstChild("Zone") then
	local zone = Instance.new("RemoteEvent")
	zone.Name = "Zone"
	zone.Parent = remoteEvents
end
if not remoteEvents:FindFirstChild("Soul") then
	local soul = Instance.new("RemoteEvent")
	soul.Name = "Soul"
	soul.Parent = remoteEvents
end
if not remoteEvents:FindFirstChild("Combat") then
	local combat = Instance.new("RemoteEvent")
	combat.Name = "Combat"
	combat.Parent = remoteEvents
end

local zoneEvents = remoteEvents:WaitForChild("Zone")
local soulEvents = remoteEvents:WaitForChild("Soul")
local combatEvents = remoteEvents:WaitForChild("Combat")

-- Player management
local activePlayers = {} :: { [number]: Player }

local function onPlayerAdded(player: Player)
	print(`[Server] Player joined: {player.Name}`)
	
	-- Initialize player state
	zoneMachine:InitializePlayer(player.UserId)
	soulTracker:InitializePlayer(player.UserId)
	
	-- Load persistent data
	local profile = dataStore:LoadProfile(player.UserId)
	if profile then
		-- Restore soul data
		for fragment, _ in pairs(profile.CollectedFragments) do
			soulTracker:CollectFragment(player.UserId, fragment)
		end
	end
	
	activePlayers[player.UserId] = player
	
	-- Send initial state to client
	zoneEvents.InitialState:FireClient(player, {
		CurrentZone = 1,
		TotalSouls = 0,
		HasKeyFragment = false,
	})
end

local function onPlayerRemoving(player: Player)
	print(`[Server] Player leaving: {player.Name}`)
	
	-- Save player data
	dataStore:OnPlayerLeaving(player)
	
	-- Clean up state
	zoneMachine:ResetPlayer(player.UserId)
	soulTracker:ResetPlayer(player.UserId)
	
	activePlayers[player.UserId] = nil
end

-- RemoteEvent handlers

-- Collect Soul
soulEvents.CollectSoul.OnServerEvent:Connect(function(player, soulAmount)
	local valid, err = remoteMap:Validate(player, "CollectSoul", { soulAmount })
	if not valid then
		warn(`[Server] CollectSoul validation failed for {player.Name}: {err}`)
		return
	end
	
	local state = zoneMachine:GetState(player.UserId)
	if not state then return end
	
	local updated = soulTracker:AddSouls(player.UserId, soulAmount, state.CurrentZone)
	if updated then
		-- Check zone gate
		local zoneTransition = zoneMachine:CheckZoneGate(player.UserId, updated.TotalSouls)
		
		-- Notify client
		soulEvents.SoulUpdated:FireClient(player, {
			TotalSouls = updated.TotalSouls,
			Zone = state.CurrentZone,
			ZoneTransition = zoneTransition,
		})
		
		-- Persist
		dataStore:UpdateSouls(player.UserId, soulAmount)
	end
end)

-- Collect Fragment
soulEvents.CollectFragment.OnServerEvent:Connect(function(player, fragmentName)
	local valid, err = remoteMap:Validate(player, "CollectFragment", { fragmentName })
	if not valid then
		warn(`[Server] CollectFragment validation failed for {player.Name}: {err}`)
		return
	end
	
	local collected = soulTracker:CollectFragment(player.UserId, fragmentName)
	if collected then
		-- Check if it's a key fragment
		if fragmentName == "KeyFragment" then
			zoneMachine:CollectFragment(player.UserId, "KeyFragment")
		end
		
		-- Notify client
		soulEvents.FragmentCollected:FireClient(player, fragmentName)
		
		-- Persist
		dataStore:CollectFragment(player.UserId, fragmentName)
	end
end)

-- Discover Point
zoneEvents.DiscoverPoint.OnServerEvent:Connect(function(player, pointId)
	local valid, err = remoteMap:Validate(player, "DiscoverPoint", { pointId })
	if not valid then
		warn(`[Server] DiscoverPoint validation failed for {player.Name}: {err}`)
		return
	end
	
	local state = zoneMachine:GetState(player.UserId)
	if not state then return end
	
	-- Discovery grants time bonus (entropy extension)
	-- TODO: Implement entropy timer extension
	
	zoneEvents.DiscoveryComplete:FireClient(player, {
		PointId = pointId,
		Zone = state.CurrentZone,
	})
end)

-- Enemy Defeated (for soul rewards)
combatEvents.EnemyDefeated.OnServerEvent:Connect(function(player, enemyId, zoneId)
	local valid, err = remoteMap:Validate(player, "EnemyDefeated", { enemyId, zoneId })
	if not valid then
		warn(`[Server] EnemyDefeated validation failed for {player.Name}: {err}`)
		return
	end
	
	-- Award souls based on zone
	local soulRewards = {
		[1] = 10, -- Zone 1: 10 souls per enemy
		[2] = 15, -- Zone 2: 15 souls per enemy
		[3] = 20, -- Zone 3: 20 souls per enemy
	}
	
	local reward = soulRewards[zoneId] or 10
	local updated = soulTracker:AddSouls(player.UserId, reward, zoneId)
	
	if updated then
		soulEvents.SoulUpdated:FireClient(player, {
			TotalSouls = updated.TotalSouls,
			Zone = zoneId,
		})
		
		dataStore:UpdateSouls(player.UserId, reward)
	end
end)

-- Boss Phase Complete
combatEvents.BossPhaseComplete.OnServerEvent:Connect(function(player, phase)
	local valid, err = remoteMap:Validate(player, "BossPhaseComplete", { phase })
	if not valid then
		warn(`[Server] BossPhaseComplete validation failed for {player.Name}: {err}`)
		return
	end
	
	-- Boss phases handled server-side
	-- Notify all players in zone
	combatEvents.BossPhaseUpdate:FireAllClients({
		Phase = phase,
		Player = player.Name,
	})
end)

-- Request Zone State
zoneEvents.RequestState.OnServerEvent:Connect(function(player)
	local state = zoneMachine:GetState(player.UserId)
	local souls = soulTracker:GetData(player.UserId)
	
	if state and souls then
		zoneEvents.StateUpdate:FireClient(player, {
			CurrentZone = state.CurrentZone,
			Zone1GatesPassed = state.Zone1GatesPassed,
			Zone2GatesPassed = state.Zone2GatesPassed,
			HasKeyFragment = state.HasKeyFragment,
			TotalSouls = souls.TotalSouls,
			LoreTier = soulTracker:GetLoreTier(player.UserId),
		})
	end
end)

-- Position Validation (anti-cheat)
zoneEvents.UpdatePosition.OnServerEvent:Connect(function(player, position)
	local valid, err = remoteMap:Validate(player, "UpdatePosition", { position })
	if not valid then
		warn(`[Server] Position validation failed for {player.Name}: {err}`)
		-- Don't kick immediately, just log
		return
	end
	
	-- Store last valid position for anti-cheat
	-- TODO: Implement speed checks, teleport detection
end)

-- Connect events
Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

print("[Server] Arianus-Sky initialized")
