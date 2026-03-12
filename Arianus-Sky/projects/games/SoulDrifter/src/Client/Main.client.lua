-- Main.client.lua
-- Arianus-Sky Client Entry Point
-- Handles UI, input, and server communication

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Wait for RemoteEvents
local remoteEvents = ReplicatedStorage:WaitForChild("RemoteEvents")
local zoneEvents = remoteEvents:WaitForChild("Zone")
local soulEvents = remoteEvents:WaitForChild("Soul")
local combatEvents = remoteEvents:WaitForChild("Combat")

-- Client State
local ClientState = {
	CurrentZone = 1,
	TotalSouls = 0,
	HasKeyFragment = false,
	CanTransition = false,
	IsInCombat = false,
	CurrentHealth = 100,
	MaxHealth = 100,
	HealthFill = nil, -- Set by createHUD
}

-- UI References
local soulDisplay = nil
local zoneDisplay = nil

-----------------------------------------
-- UI Setup (Phase 1 HUD Spec from Orla)
-----------------------------------------

local function createHUD()
	-- Ensure HUD container exists
	if not playerGui:FindFirstChild("HUD") then
		local hud = Instance.new("ScreenGui")
		hud.Name = "HUD"
		hud.ResetOnSpawn = false
		hud.Parent = playerGui
	end
	
	local hudContainer = playerGui:WaitForChild("HUD")
	
	-- Soul Counter (Top-Right) — Orla Spec
	-- Position: 24px from top, 24px from right
	-- Icon: Soul orb/gem icon (16x16px) — using "♾" symbol
	-- Format: "♾ 0"
	local soulFrame = Instance.new("Frame")
	soulFrame.Name = "SoulCounter"
	soulFrame.Size = UDim2.new(0, 120, 0, 40)
	soulFrame.Position = UDim2.new(1, -144, 0, 24) -- 24px from top-right
	soulFrame.BackgroundColor3 = Color3.new(0, 0, 0)
	soulFrame.BackgroundTransparency = 0.4 -- rgba(0,0,0,0.6)
	soulFrame.BorderSizePixel = 0
	soulFrame.Parent = hudContainer
	
	local soulIcon = Instance.new("TextLabel")
	soulIcon.Name = "Icon"
	soulIcon.Size = UDim2.new(0, 40, 1, 0)
	soulIcon.Position = UDim2.new(0, 8, 0, 0)
	soulIcon.BackgroundTransparency = 1
	soulIcon.Text = "♾" -- Soul symbol
	soulIcon.TextColor3 = Color3.new(1, 1, 1)
	soulIcon.TextSize = 18
	soulIcon.Font = Enum.Font.GothamBold
	soulIcon.TextXAlignment = Enum.TextXAlignment.Left
	soulIcon.Parent = soulFrame
	
	local soulCount = Instance.new("TextLabel")
	soulCount.Name = "Count"
	soulCount.Size = UDim2.new(0, 60, 1, 0)
	soulCount.Position = UDim2.new(0, 40, 0, 0)
	soulCount.BackgroundTransparency = 1
	soulCount.Text = "0"
	soulCount.TextColor3 = Color3.new(1, 1, 1) -- White
	soulCount.TextSize = 18
	soulCount.Font = Enum.Font.GothamBold
	soulCount.TextXAlignment = Enum.TextXAlignment.Left
	soulCount.Parent = soulFrame
	
	soulDisplay = soulCount
	
	-- Zone Indicator (Top-Left) — Orla Spec
	-- Position: 24px from top, 24px from left
	local zoneFrame = Instance.new("Frame")
	zoneFrame.Name = "ZoneIndicator"
	zoneFrame.Size = UDim2.new(0, 180, 0, 32)
	zoneFrame.Position = UDim2.new(0, 24, 0, 24)
	zoneFrame.BackgroundColor3 = Color3.new(0, 0, 0)
	zoneFrame.BackgroundTransparency = 0.4
	zoneFrame.BorderSizePixel = 0
	zoneFrame.Parent = hudContainer
	
	local zoneLabel = Instance.new("TextLabel")
	zoneLabel.Size = UDim2.new(1, 0, 1, 0)
	zoneLabel.BackgroundTransparency = 1
	zoneLabel.Text = "ZONE A: SPAWN"
	zoneLabel.TextColor3 = Color3.new(0.4, 0.8, 1) -- Cyan
	zoneLabel.TextSize = 14
	zoneLabel.Font = Enum.Font.GothamBold
	zoneLabel.Parent = zoneFrame
	
	zoneDisplay = zoneLabel
	
	-- Health Bar (Bottom-Center) — Orla Spec
	-- Position: 48px from bottom, centered
	-- Size: 200px wide × 12px tall, 6px border-radius
	local healthFrame = Instance.new("Frame")
	healthFrame.Name = "HealthBar"
	healthFrame.Size = UDim2.new(0, 200, 0, 12)
	healthFrame.Position = UDim2.new(0.5, -100, 1, -60) -- 48px from bottom, centered
	healthFrame.BackgroundColor3 = Color3.new(0.1, 0.1, 0.1) -- #1A1A1A
	healthFrame.BorderSizePixel = 0
	healthFrame.Parent = hudContainer
	
	-- Health fill (green)
	local healthFill = Instance.new("Frame")
	healthFill.Name = "Fill"
	healthFill.Size = UDim2.new(1, 0, 1, 0) -- Full health initially
	healthFill.BackgroundColor3 = Color3.new(0.2, 0.8, 0.2) -- Green
	healthFill.BorderSizePixel = 0
	healthFill.Parent = healthFrame
	
	-- Health border (simulate 6px border-radius via inset)
	local healthBorder = Instance.new("Frame")
	healthBorder.Size = UDim2.new(1, 0, 1, 0)
	healthBorder.BackgroundTransparency = 1
	healthBorder.BorderMode = Enum.BorderMode.Outline
	healthBorder.BorderColor3 = Color3.new(0.4, 0.4, 0.4)
	healthBorder.Parent = healthFrame
	
	-- Store health fill reference
	ClientState.HealthFill = healthFill
end

local function createInteractionPrompt(text: string)
	-- Interaction Prompts — Orla Spec
	-- "GRAB" floating above object, white text, appears on proximity
	-- "ATTACK" prompt near dummies
	local prompt = Instance.new("Frame")
	prompt.Name = "InteractionPrompt"
	prompt.Size = UDim2.new(0, 120, 0, 32)
	prompt.Position = UDim2.new(0.5, -60, 0.7, 0) -- Floating above object area
	prompt.BackgroundColor3 = Color3.new(0, 0, 0)
	prompt.BackgroundTransparency = 0.5
	prompt.BorderSizePixel = 0
	prompt.Visible = false
	prompt.Parent = playerGui:WaitForChild("HUD")
	
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.Text = text -- "GRAB" or "ATTACK"
	label.TextColor3 = Color3.new(1, 1, 1) -- White
	label.TextSize = 14
	label.Font = Enum.Font.GothamBold
	label.Parent = prompt
	
	return prompt
end

-----------------------------------------
-- Server Communication
-----------------------------------------

local function requestInitialState()
	zoneEvents.RequestState:FireServer()
end

local function discoverPoint(pointId: string)
	zoneEvents.DiscoverPoint:FireServer(pointId)
end

local function collectSoul(amount: number)
	soulEvents.CollectSoul:FireServer(amount)
end

local function collectFragment(fragmentName: string)
	soulEvents.CollectFragment:FireServer(fragmentName)
end

local function enemyDefeated(enemyId: string, zoneId: number)
	combatEvents.EnemyDefeated:FireServer(enemyId, zoneId)
end

-----------------------------------------
-- Event Handlers
-----------------------------------------

-- Initial State
zoneEvents.InitialState.OnClientEvent:Connect(function(state)
	ClientState.CurrentZone = state.CurrentZone
	ClientState.TotalSouls = state.TotalSouls
	ClientState.HasKeyFragment = state.HasKeyFragment
	
	updateHUD()
end)

-- Soul Updated
soulEvents.SoulUpdated.OnClientEvent:Connect(function(data)
	ClientState.TotalSouls = data.TotalSouls
	ClientState.CurrentZone = data.Zone
	
	if data.ZoneTransition then
		showZoneTransition(data.Zone)
	end
	
	updateHUD()
end)

-- Fragment Collected
soulEvents.FragmentCollected.OnClientEvent:Connect(function(fragmentName)
	showFragmentCollected(fragmentName)
end)

-- Discovery Complete
zoneEvents.DiscoveryComplete.OnClientEvent:Connect(function(data)
	showDiscovery(data.PointId)
end)

-- State Update
zoneEvents.StateUpdate.OnClientEvent:Connect(function(state)
	ClientState.CurrentZone = state.CurrentZone
	ClientState.Zone1GatesPassed = state.Zone1GatesPassed
	ClientState.Zone2GatesPassed = state.Zone2GatesPassed
	ClientState.HasKeyFragment = state.HasKeyFragment
	ClientState.TotalSouls = state.TotalSouls
	
	updateHUD()
end)

-- Health Updated
combatEvents.HealthUpdated.OnClientEvent:Connect(function(data)
	ClientState.CurrentHealth = data.CurrentHealth
	ClientState.MaxHealth = data.MaxHealth
	updateHUD()
end)

-- Player Died
combatEvents.PlayerDied.OnClientEvent:Connect(function()
	-- Show death UI or respawn prompt
	print("[Client] Player died")
end)

-----------------------------------------
-- UI Updates
-----------------------------------------

local function updateHUD()
	if soulDisplay then
		-- Format: "♾ X" — Orla spec
		soulDisplay.Text = `♾ {ClientState.TotalSouls}`
	end
	
	if zoneDisplay then
		-- Zone A/B/C for Training Grounds
		local zoneNames = {
			[1] = "ZONE A: SPAWN",
			[2] = "ZONE B: CORRIDOR",
			[3] = "ZONE C: ARENA",
		}
		zoneDisplay.Text = zoneNames[ClientState.CurrentZone] or "UNKNOWN"
	end
	
	-- Update health bar if exists
	if ClientState.HealthFill then
		local healthPercent = ClientState.CurrentHealth / ClientState.MaxHealth
		ClientState.HealthFill.Size = UDim2.new(healthPercent, 0, 1, 0)
	end
end

local function showZoneTransition(newZone: number)
	local tween = TweenService:Create(
		zoneDisplay,
		TweenInfo.new(0.5),
		{ TextColor3 = Color3.new(0, 1, 0) }
	)
	tween:Play()
	tween.Completed:Wait()
	tween:Destroy()
	
	task.wait(1)
	
	local reset = TweenService:Create(
		zoneDisplay,
		TweenInfo.new(0.5),
		{ TextColor3 = Color3.new(0.4, 0.8, 1) }
	)
	reset:Play()
end

local function showFragmentCollected(fragmentName: string)
	-- Show notification
	local notification = Instance.new("Frame")
	notification.Size = UDim2.new(0, 300, 0, 60)
	notification.Position = UDim2.new(0.5, -150, 0.2, 0)
	notification.BackgroundColor3 = Color3.new(0.2, 0.1, 0)
	notification.BorderSizePixel = 0
	notification.Parent = playerGui:WaitForChild("HUD")
	
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.Text = `FRAGMENT: {fragmentName}`
	label.TextColor3 = Color3.new(1, 0.8, 0)
	label.TextSize = 18
	label.Font = Enum.Font.GothamBold
	label.Parent = notification
	
	local fade = TweenService:Create(
		notification,
		TweenInfo.new(2),
		{ BackgroundTransparency = 1 }
	)
	fade:Play()
	fade.Completed:Wait()
	notification:Destroy()
end

local function showDiscovery(pointId: string)
	-- Brief indicator
	task.spawn(function()
		-- Flash effect or sound could go here
		print(`[Client] Discovered: {pointId}`)
	end)
end

-----------------------------------------
-- Initialization
-----------------------------------------

local function init()
	-- Create HUD container first
	if not playerGui:FindFirstChild("HUD") then
		local hud = Instance.new("ScreenGui")
		hud.Name = "HUD"
		hud.ResetOnSpawn = false
		hud.Parent = playerGui
	end
	
	createHUD()
	
	-- Request initial state
	task.wait(1)
	requestInitialState()
	
	print("[Client] Arianus-Sky initialized — HUD wired to Orla spec")
end

init()

return ClientState
