-- ZoneGeometry.server.lua
-- Zone 1 Geometry Builder for Arianus-Sky Training Grounds
-- Based on level-layout.md specs from Edmund
-- Phase 1: Zones A (Spawn) → B (Corridor) → C (Training Arena)

local ZoneGeometry = {}
ZoneGeometry.__index = ZoneGeometry

-- Zone 1 Training Grounds Dimensions (from Edmund's level-layout.md)
local ZONES = {
	A = {
		Name = "Spawn Chamber",
		Dimensions = Vector3.new(8, 6, 8), -- 8m x 8m x 6m
		Shape = "Octagonal",
		ThermalTrigger = true,
		ThermalPosition = Vector3.new(0, 3, 0), -- Center platform
		ThermalProximity = 2, -- meters
	},
	B = {
		Name = "Entry Corridor",
		Dimensions = Vector3.new(10, 4, 4), -- 10m x 4m x 4m
		Shape = "Rectangular",
		Transition = "Auto-trigger",
	},
	C = {
		Name = "Training Arena",
		Dimensions = Vector3.new(12, 15, 12), -- 12m x 12m x 15m
		Shape = "Circular",
		SoulThreshold = 30,
		Dummies = {
			{Position = Vector3.new(0, 1.5, 3), Name = "Dummy1_North"},
			{Position = Vector3.new(2.6, 1.5, -1.5), Name = "Dummy2_SE"},
			{Position = Vector3.new(-2.6, 1.5, -1.5), Name = "Dummy3_SW"},
		},
	},
}

-- Zone positions (relative offsets)
local ZONE_POSITIONS = {
	A = Vector3.new(0, 0, 0),
	B = Vector3.new(0, 0, -12), -- 8m (A) + 4m gap
	C = Vector3.new(0, 0, -26), -- 12m (B) + 14m gap
}

-- Zone Gate (30 souls for Zone 1→2)
local ZONE_GATE_THRESHOLD = 30

function ZoneGeometry.new()
	local self = setmetatable({}, ZoneGeometry)
	self.Zones = ZONES
	self.ZonePositions = ZONE_POSITIONS
	self.ZoneGateThreshold = ZONE_GATE_THRESHOLD
	self.CreatedParts = {}
	return self
end

function ZoneGeometry:GetZonePositions()
	return self.ZonePositions
end

function ZoneGeometry:GetZoneGateThreshold()
	return self.ZoneGateThreshold
end

-- Zone A: Spawn Chamber
function ZoneGeometry:CreateZoneA()
	local zone = self.Zones.A
	local pos = self.ZonePositions.A
	
	-- Create folder for zone
	local zoneFolder = Instance.new("Folder")
	zoneFolder.Name = "ZoneA_SpawnChamber"
	zoneFolder.Parent = workspace
	
	-- Floor: 8x8 stone platform
	local floor = Instance.new("Part")
	floor.Name = "Floor"
	floor.Size = Vector3.new(8, 0.5, 8)
	floor.Position = pos + Vector3.new(0, -0.25, 0)
	floor.Anchored = true
	floor.BrickColor = BrickColor.new("Dark stone grey")
	floor.Material = Enum.Material.Slate
	floor.Parent = zoneFolder
	table.insert(self.CreatedParts, floor)
	
	-- 8 corner pillars (octagonal approximation)
	for i = 1, 8 do
		local angle = (i / 8) * math.pi * 2
		local radius = 3.5
		local pillar = Instance.new("Part")
		pillar.Name = "Pillar_" .. i
		pillar.Size = Vector3.new(1, 6, 1)
		pillar.Position = pos + Vector3.new(math.cos(angle) * radius, 3, math.sin(angle) * radius)
		pillar.Anchored = true
		pillar.BrickColor = BrickColor.new("Stone grey")
		pillar.Material = Enum.Material.Slate
		pillar.Parent = zoneFolder
		table.insert(self.CreatedParts, pillar)
	end
	
	-- Ceiling
	local ceiling = Instance.new("Part")
	ceiling.Name = "Ceiling"
	ceiling.Size = Vector3.new(8, 0.5, 8)
	ceiling.Position = pos + Vector3.new(0, 6, 0)
	ceiling.Anchored = true
	ceiling.BrickColor = BrickColor.new("Dark stone grey")
	ceiling.Material = Enum.Material.Slate
	ceiling.Parent = zoneFolder
	table.insert(self.CreatedParts, ceiling)
	
	-- Central spawn platform (thermal trigger area)
	local centerPlatform = Instance.new("Part")
	centerPlatform.Name = "SpawnCenter"
	centerPlatform.Size = Vector3.new(2, 0.3, 2)
	centerPlatform.Position = pos + Vector3.new(0, 0.15, 0)
	centerPlatform.Anchored = true
	centerPlatform.BrickColor = BrickColor.new("Neon green")
	centerPlatform.Material = Enum.Material.Neon
	centerPlatform.Transparency = 0.2
	centerPlatform.Parent = zoneFolder
	table.insert(self.CreatedParts, centerPlatform)
	
	-- Zone label
	local zoneLabel = Instance.new("Part")
	zoneLabel.Name = "ZoneLabel"
	zoneLabel.Size = Vector3.new(3, 0.5, 0.2)
	zoneLabel.Position = pos + Vector3.new(0, 4, -3.8)
	zoneLabel.Anchored = true
	zoneLabel.BrickColor = BrickColor.new("White")
	zoneLabel.Material = Enum.Material.Neon
	zoneLabel.Parent = zoneFolder
	table.insert(self.CreatedParts, zoneLabel)
	
	-- Thermal discovery trigger (2m proximity)
	local thermalTrigger = Instance.new("Part")
	thermalTrigger.Name = "ThermalTrigger"
	thermalTrigger.Size = Vector3.new(4, 4, 4)
	thermalTrigger.Position = pos + Vector3.new(0, 3, 0)
	thermalTrigger.Anchored = true
	thermalTrigger.Transparency = 1
	thermalTrigger.CanCollide = false
	thermalTrigger.Parent = zoneFolder
	table.insert(self.CreatedParts, thermalTrigger)
	
	return zoneFolder
end
	thermalTrigger.Anchored = true
	thermalTrigger.Transparency = 1
	thermalTrigger.CanCollide = false
	
	thermalTrigger.Parent = workspace
	
	-- Glowing runes on walls (decorative)
	for i = 1, 8 do
		local angle = (i / 8) * math.pi * 2
		local runePos = pos + Vector3.new(
			math.cos(angle) * 3.5,
			2,
			math.sin(angle) * 3.5
		)
		local rune = Instance.new("Part")
		rune.Name = `Rune{i}`
		rune.Size = Vector3.new(0.5, 1, 0.1)
		rune.Position = runePos
		rune.Anchored = true
		rune.BrickColor = BrickColor.new("Cyan")
		rune.Material = Enum.Material.Neon
		rune.Transparency = 0.5
		rune.Parent = workspace
		table.insert(self.CreatedParts, rune)
	end
	
	table.insert(self.CreatedParts, platform)
	table.insert(self.CreatedParts, centerPlatform)
	table.insert(self.CreatedParts, thermalTrigger)
	
	return platform, thermalTrigger
end

-- Zone B: Entry Corridor
function ZoneGeometry:CreateZoneB()
	local zone = self.Zones.B
	local pos = self.ZonePositions.B
	
	-- Create folder for zone
	local zoneFolder = Instance.new("Folder")
	zoneFolder.Name = "ZoneB_EntryCorridor"
	zoneFolder.Parent = workspace
	
	-- Floor
	local floor = Instance.new("Part")
	floor.Name = "Floor"
	floor.Size = Vector3.new(10, 0.5, 4)
	floor.Position = pos + Vector3.new(0, -0.25, 0)
	floor.Anchored = true
	floor.BrickColor = BrickColor.new("Dark stone grey")
	floor.Material = Enum.Material.Slate
	floor.Parent = zoneFolder
	table.insert(self.CreatedParts, floor)
	
	-- Ceiling
	local ceiling = Instance.new("Part")
	ceiling.Name = "Ceiling"
	ceiling.Size = Vector3.new(10, 0.5, 4)
	ceiling.Position = pos + Vector3.new(0, 4, 0)
	ceiling.Anchored = true
	ceiling.BrickColor = BrickColor.new("Dark stone grey")
	ceiling.Material = Enum.Material.Slate
	ceiling.Parent = zoneFolder
	table.insert(self.CreatedParts, ceiling)
	
	-- Walls (left and right)
	for side = -1, 1, 2 do
		local wall = Instance.new("Part")
		wall.Name = "Wall_" .. (side == -1 and "Left" or "Right")
		wall.Size = Vector3.new(10, 4, 0.5)
		wall.Position = pos + Vector3.new(0, 2, side * 1.75)
		wall.Anchored = true
		wall.BrickColor = BrickColor.new("Stone grey")
		wall.Material = Enum.Material.Slate
		wall.Parent = zoneFolder
		table.insert(self.CreatedParts, wall)
	end
	
	-- Ambient glow strips on walls
	for side = -1, 1, 2 do
		local strip = Instance.new("Part")
		strip.Name = "GlowStrip"
		strip.Size = Vector3.new(8, 0.2, 0.1)
		strip.Position = pos + Vector3.new(0, 3.5, side * 1.5)
		strip.Anchored = true
		strip.BrickColor = BrickColor.new("Neon blue")
		strip.Material = Enum.Material.Neon
		strip.Transparency = 0.3
		strip.Parent = zoneFolder
		table.insert(self.CreatedParts, strip)
	end
	
	-- Zone label
	local zoneLabel = Instance.new("Part")
	zoneLabel.Name = "ZoneLabel"
	zoneLabel.Size = Vector3.new(4, 0.5, 0.2)
	zoneLabel.Position = pos + Vector3.new(0, 3.5, 0)
	zoneLabel.Anchored = true
	zoneLabel.BrickColor = BrickColor.new("White")
	zoneLabel.Material = Enum.Material.Neon
	zoneLabel.Parent = zoneFolder
	table.insert(self.CreatedParts, zoneLabel)
	
	-- Auto-trigger transition (A → B)
	local trigger = Instance.new("Part")
	trigger.Name = "ZoneTransition_A_to_B"
	trigger.Size = Vector3.new(3, 4, 1)
	trigger.Position = pos + Vector3.new(0, 2, -2)
	trigger.Anchored = true
	trigger.Transparency = 1
	trigger.CanCollide = false
	trigger.Parent = zoneFolder
	table.insert(self.CreatedParts, trigger)
	
	return zoneFolder
end

-- Zone C: Training Arena
function ZoneGeometry:CreateZoneC()
	local zone = self.Zones.C
	local pos = self.ZonePositions.C
	
	-- Create folder for zone
	local zoneFolder = Instance.new("Folder")
	zoneFolder.Name = "ZoneC_TrainingArena"
	zoneFolder.Parent = workspace
	
	-- Circular arena floor (cylinder)
	local arena = Instance.new("Part")
	arena.Name = "Floor"
	arena.Size = Vector3.new(12, 1, 12)
	arena.Position = pos + Vector3.new(0, -0.5, 0)
	arena.Anchored = true
	arena.BrickColor = BrickColor.new("Stone")
	arena.Material = Enum.Material.Slate
	arena.Shape = Enum.PartType.Cylinder
	arena.Parent = zoneFolder
	table.insert(self.CreatedParts, arena)
	
	-- Arena walls (8 pillars around perimeter)
	for i = 1, 8 do
		local angle = (i / 8) * math.pi * 2
		local radius = 5.5
		local pillar = Instance.new("Part")
		pillar.Name = "ArenaPillar_" .. i
		pillar.Size = Vector3.new(1, 15, 1)
		pillar.Position = pos + Vector3.new(math.cos(angle) * radius, 7.5, math.sin(angle) * radius)
		pillar.Anchored = true
		pillar.BrickColor = BrickColor.new("Stone grey")
		pillar.Material = Enum.Material.Slate
		pillar.Parent = zoneFolder
		table.insert(self.CreatedParts, pillar)
	end
	
	-- Ceiling
	local ceiling = Instance.new("Part")
	ceiling.Name = "Ceiling"
	ceiling.Size = Vector3.new(12, 0.5, 12)
	ceiling.Position = pos + Vector3.new(0, 15, 0)
	ceiling.Anchored = true
	ceiling.BrickColor = BrickColor.new("Dark stone grey")
	ceiling.Material = Enum.Material.Slate
	ceiling.Shape = Enum.PartType.Cylinder
	ceiling.Parent = zoneFolder
	table.insert(self.CreatedParts, ceiling)
	
	-- Zone label
	local zoneLabel = Instance.new("Part")
	zoneLabel.Name = "ZoneLabel"
	zoneLabel.Size = Vector3.new(4, 0.5, 0.2)
	zoneLabel.Position = pos + Vector3.new(0, 12, -5)
	zoneLabel.Anchored = true
	zoneLabel.BrickColor = BrickColor.new("White")
	zoneLabel.Material = Enum.Material.Neon
	zoneLabel.Parent = zoneFolder
	table.insert(self.CreatedParts, zoneLabel)
	
	-- Dummy platforms (3 dummies at 3m radius, 120° spacing)
	for _, dummy in ipairs(zone.Dummies) do
		local plat = Instance.new("Part")
		plat.Name = dummy.Name .. "_Platform"
		plat.Size = Vector3.new(2, 0.3, 2)
		plat.Position = pos + dummy.Position + Vector3.new(0, -0.15, 0)
		plat.Anchored = true
		plat.BrickColor = BrickColor.new("Brown")
		plat.Material = Enum.Material.Wood
		plat.Parent = zoneFolder
		table.insert(self.CreatedParts, plat)
		
		-- Training dummy
		local dummyPart = Instance.new("Part")
		dummyPart.Name = dummy.Name
		dummyPart.Size = Vector3.new(1, 2, 1)
		dummyPart.Position = pos + dummy.Position + Vector3.new(0, 1, 0)
		dummyPart.Anchored = true
		dummyPart.BrickColor = BrickColor.new("Bright red")
		dummyPart.Material = Enum.Material.Fabric
		dummyPart.Parent = zoneFolder
		
		-- Dummy health (for soul collection)
		local attributes = Instance.new("Folder")
		attributes.Name = "EnemyAttributes"
		attributes.Parent = dummyPart
		
		local health = Instance.new("IntValue")
		health.Name = "Health"
		health.Value = 10
		health.Parent = attributes
		
		local soulValue = Instance.new("IntValue")
		soulValue.Name = "SoulDrop"
		soulValue.Value = 10 -- 10 souls per dummy, 30 total
		soulValue.Parent = attributes
		
		table.insert(self.CreatedParts, dummyPart)
	end
	
	-- Zone gate trigger (C → D, requires 30 souls)
	local gateTrigger = Instance.new("Part")
	gateTrigger.Name = "ZoneGate_C_to_D"
	gateTrigger.Size = Vector3.new(8, 10, 2)
	gateTrigger.Position = pos + Vector3.new(0, 5, 6)
	gateTrigger.Anchored = true
	gateTrigger.Transparency = 0.7
	gateTrigger.BrickColor = BrickColor.new("Gold")
	gateTrigger.Material = Enum.Material.Metal
	gateTrigger.Parent = workspace
	
	-- Gate light
	local light = Instance.new("PointLight")
	light.Color = Color3.new(1, 0.8, 0)
	light.Range = 10
	light.Parent = gateTrigger
	
	table.insert(self.CreatedParts, arena)
	table.insert(self.CreatedParts, gateTrigger)
	
	return arena, dummyPlatforms, gateTrigger
end

function ZoneGeometry:BuildZone1()
	-- Build Zone 1 (Training Grounds Phase 1: A → B → C)
	print("[ZoneGeometry] Building Zone 1 Training Grounds...")
	
	local zoneAParts = {self:CreateZoneA()}
	local zoneBParts = {self:CreateZoneB()}
	local zoneCParts = {self:CreateZoneC()}
	
	print(`[ZoneGeometry] Zone 1 built: A (Spawn Chamber) + B (Entry Corridor) + C (Training Arena)`)
	print(`[ZoneGeometry] Total parts created: { #self.CreatedParts }`)
	
	return self.CreatedParts
end

function ZoneGeometry:Clear()
	for _, part in ipairs(self.CreatedParts) do
		if part and part.Parent then
			part:Destroy()
		end
	end
	self.CreatedParts = {}
end

-- Export zone configuration
function ZoneGeometry:GetZones()
	return self.Zones
end

function ZoneGeometry:GetZonePositions()
	return self.ZonePositions
end

function ZoneGeometry:GetZoneGateThreshold()
	return self.ZoneGateThreshold
end

return ZoneGeometry
