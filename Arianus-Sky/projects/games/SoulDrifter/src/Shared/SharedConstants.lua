-- SharedConstants.lua
-- Shared constants for Arianus-Sky
-- Used by both Server and Client

-- Zone Configuration
local ZONES = {
	{
		Id = 1,
		Name = "Descent",
		SoulThreshold = 30,
		EntityCount = 4,
		Altitude = { Min = 0, Max = 60 },
	},
	{
		Id = 2,
		Name = "Up Draft",
		SoulThreshold = 50,
		EntityCount = 5,
		Altitude = { Min = 60, Max = 140 },
	},
	{
		Id = 3,
		Name = "The Eye",
		SoulThreshold = 100,
		EntityCount = 8,
		Altitude = { Min = 140, Max = 180 },
		IsBoss = true,
	},
}

-- Fragment Types
local FRAGMENTS = {
	WindDirection = {
		Id = "WindDirection",
		Zone = 1,
		Type = "Lore",
		Description = "The Sky Masters' lost knowledge of wind currents",
	},
	ThermalSensing = {
		Id = "ThermalSensing",
		Zone = 2,
		Type = "Lore",
		Description = "The ability to feel thermal updrafts",
	},
	KeyFragment = {
		Id = "KeyFragment",
		Zone = 3,
		Type = "Key",
		Description = "A fragment of the Death Gate itself",
	},
}

-- Lore Tiers
local LORE_TIERS = {
	{
		Tier = "I",
		Name = "Core Premise",
		SoulRequirement = 0,
		Description = "Basic understanding of the dying realms",
	},
	{
		Tier = "II",
		Name = "Realm History",
		SoulRequirement = 30,
		Description = "Deep knowledge of each realm's fall",
	},
	{
		Tier = "III",
		Name = "Sundering Truth",
		SoulRequirement = 100,
		Description = "The full truth of the Death Gate",
	},
}

-- Entity Types (for encounters)
local ENTITY_TYPES = {
	WindshearStalker = {
		Id = "WindshearStalker",
		Zone = 1,
		Health = 50,
		Speed = 16,
		Behavior = "Patrol",
		SoulReward = 10,
	},
	ThermalWraith = {
		Id = "ThermalWraith",
		Zone = 2,
		Health = 75,
		Speed = 14,
		Behavior = "Intercept",
		SoulReward = 15,
	},
	TheEye = {
		Id = "TheEye",
		Zone = 3,
		Health = 500,
		Speed = 0,
		Behavior = "Boss",
		Phases = 3,
		SoulReward = 50,
	},
}

-- RemoteEvent Names
local REMOTE_EVENTS = {
	-- Zone
	InitialState = "InitialState",
	StateUpdate = "StateUpdate",
	DiscoverPoint = "DiscoverPoint",
	DiscoveryComplete = "DiscoveryComplete",
	AttemptZoneTransition = "AttemptZoneTransition",
	UpdatePosition = "UpdatePosition",
	
	-- Soul
	CollectSoul = "CollectSoul",
	SoulUpdated = "SoulUpdated",
	CollectFragment = "CollectFragment",
	FragmentCollected = "FragmentCollected",
	
	-- Combat
	EnemyDefeated = "EnemyDefeated",
	BossPhaseComplete = "BossPhaseComplete",
	BossPhaseUpdate = "BossPhaseUpdate",
	
	-- Request
	RequestState = "RequestState",
}

-- Game Settings
local SETTINGS = {
	MaxPlayersPerSession = 8,
	HubPopulation = 20,
	EntropyTimerStart = 300, -- seconds
	DiscoveryTimeBonus = 30,
	MaxSoulsPerCollect = 100,
	ZoneGateCooldown = 2, -- seconds between gate triggers
}

return {
	Zones = ZONES,
	Fragments = FRAGMENTS,
	LoreTiers = LORE_TIERS,
	EntityTypes = ENTITY_TYPES,
	RemoteEvents = REMOTE_EVENTS,
	Settings = SETTINGS,
}
