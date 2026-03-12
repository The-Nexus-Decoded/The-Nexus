-- Zone1UIAnchors.client.lua
-- Zone 1 UI Anchor Specifications
-- Soul Drifters - Roblox

local Zone1UI = {}
Zone1UI.__index = Zone1UI

-- UI Theme Colors (Zone 1 Palette)
local THEME = {
	Primary = Color3.new(1, 0.2, 0.2),      -- #FF3333 Fire
	Background = Color3.new(0.1, 0.1, 0.18), -- #1a1a2e
	Accent = Color3.new(1, 0.84, 0),         -- #FFD700 Gold
	TextPrimary = Color3.new(1, 1, 1),
	TextMuted = Color3.new(1, 1, 1, 0.6),
}

-- UI Anchor Positions (ScreenGui - Scale-based)
local ANCHORS = {
	["SoulCounter"] = {
		Position = UDim2.new(1, -20, 0, 20),
		AnchorPoint = Vector2.new(1, 0),
		Size = UDim2.new(0, 120, 0, 40),
		Label = "Souls: 0",
		Icon = "🔥",
	},
	["ZoneIndicator"] = {
		Position = UDim2.new(0, 20, 0, 20),
		AnchorPoint = Vector2.new(0, 0),
		Size = UDim2.new(0, 160, 0, 32),
		Label = "Zone 1: Descent",
		Icon = "🌌",
	},
	["EntropyTimer"] = {
		Position = UDim2.new(0.5, 0, 0, 20),
		AnchorPoint = Vector2.new(0.5, 0),
		Size = UDim2.new(0, 200, 0, 32),
		Label = "Collapse: 60s",
		Icon = "⏱️",
	},
	["DiscoveryPrompt"] = {
		Position = UDim2.new(0.5, 0, 0.4, 0),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Size = UDim2.new(0, 300, 0, 50),
		Label = "Thermal Core Discovered",
		Icon = "♨️",
		Duration = 3, -- seconds
	},
	["FragmentCollection"] = {
		Position = UDim2.new(0.5, 0, 0.7, 0),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Size = UDim2.new(0, 280, 0, 40),
		Label = "Wind Direction Acquired",
		Icon = "🧭",
		Duration = 3,
	},
	["ZoneGateLocked"] = {
		Position = UDim2.new(0.5, 0, 0.5, 0),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Size = UDim2.new(0, 250, 0, 60),
		Label = "Zone Gate Locked",
		SubLabel = "30 Souls Required",
		Icon = "🔒",
	},
	["ZoneGateUnlocked"] = {
		Position = UDim2.new(0.5, 0, 0.5, 0),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Size = UDim2.new(0, 280, 0, 60),
		Label = "Zone Gate Open!",
		SubLabel = "Press E to Enter",
		Icon = "⛩️",
	},
}

-- Create all UI anchors
function Zone1UI:CreateAnchors(parent)
	local uiInstances = {}
	
	for name, config in pairs(ANCHORS) do
		local frame = Instance.new("Frame")
		frame.Name = name
		frame.Position = config.Position
		frame.AnchorPoint = config.AnchorPoint
		frame.Size = config.Size
		frame.BackgroundColor3 = THEME.Background
		frame.BackgroundTransparency = 0.2
		frame.BorderSizePixel = 0
		frame.Parent = parent
		
		-- Corner radius
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 8)
		corner.Parent = frame
		
		-- Icon
		local icon = Instance.new("TextLabel")
		icon.Name = "Icon"
		icon.Size = UDim2.new(0, 32, 1, 0)
		icon.Position = UDim2.new(0, 8, 0, 0)
		icon.BackgroundTransparency = 1
		icon.Text = config.Icon
		icon.TextSize = 20
		icon.Font = Enum.Font.GothamBold
		icon.Parent = frame
		
		-- Main label
		local label = Instance.new("TextLabel")
		label.Name = "Label"
		label.Size = UDim2.new(1, -48, 0.6, 0)
		label.Position = UDim2.new(0, 40, 0, 0)
		label.BackgroundTransparency = 1
		label.Text = config.Label
		label.TextColor3 = THEME.TextPrimary
		label.TextXAlignment = Enum.TextXAlignment.Left
		label.Font = Enum.Font.GothamBold
		label.TextSize = 16
		label.Parent = frame
		
		-- Sub-label (if exists)
		if config.SubLabel then
			local sub = Instance.new("TextLabel")
			sub.Name = "SubLabel"
			sub.Size = UDim2.new(1, -48, 0.4, 0)
			sub.Position = UDim2.new(0, 40, 0.6, 0)
			sub.BackgroundTransparency = 1
			sub.Text = config.SubLabel
			sub.TextColor3 = THEME.TextMuted
			sub.TextXAlignment = Enum.TextXAlignment.Left
			sub.Font = Enum.Font.Gotham
			sub.TextSize = 12
			sub.Parent = frame
		end
		
		uiInstances[name] = frame
	end
	
	return uiInstances
end

-- Show temporary notification (discovery, fragment collection)
function Zone1UI:ShowNotification(name, duration)
	local frame = self.UI[name]
	if not frame then return end
	
	frame.Visible = true
	task.wait(duration or 3)
	frame.Visible = false
end

-- Update soul counter
function Zone1UI:UpdateSoulCount(count)
	local frame = self.UI.SoulCounter
	if frame and frame:FindFirstChild("Label") then
		frame.Label.Text = `🔥 Souls: {count}`
	end
end

-- Update entropy timer
function Zone1UI:UpdateEntropyTimer(seconds)
	local frame = self.UI.EntropyTimer
	if frame and frame:FindFirstChild("Label") then
		frame.Label.Text = `⏱️ Collapse: {seconds}s`
	end
end

-- Set zone gate state
function Zone1UI:SetGateState(unlocked)
	if unlocked then
		self.UI.ZoneGateLocked.Visible = false
		self.UI.ZoneGateUnlocked.Visible = true
	else
		self.UI.ZoneGateLocked.Visible = true
		self.UI.ZoneGateUnlocked.Visible = false
	end
end

-- Initialize
function Zone1UI.new()
	local self = setmetatable({}, Zone1UI)
	
	-- Create ScreenGui
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "Zone1HUD"
	screenGui.ResetOnSpawn = false
	screenGui.Parent = game.Players.LocalPlayer:WaitForPlayerGui()
	
	self.Gui = screenGui
	self.UI = self:CreateAnchors(screenGui)
	
	-- Hide conditional elements initially
	self.UI.DiscoveryPrompt.Visible = false
	self.UI.FragmentCollection.Visible = false
	self.UI.ZoneGateUnlocked.Visible = false
	
	return self
end

return Zone1UI
