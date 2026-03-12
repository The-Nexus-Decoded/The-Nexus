-- EnemyAI.server.lua
-- Windshear Stalker AI for Zone 1 Combat
-- Based on ENCOUNTERS.md specs

local EnemyAI = {}
EnemyAI.__index = EnemyAI

-- Entity Configuration (from SharedConstants)
local ENEMY_CONFIG = {
	WindshearStalker = {
		Health = 50,
		Speed = 16,
		Behavior = "Patrol",
		SoulReward = 10,
		AttackRange = 10,
		AttackDamage = 10,
	},
}

-- AI State
local EnemyState = {
	Alive = "Alive",
	Dead = "Dead",
	Chasing = "Chasing",
	Patrolling = "Patrolling",
	Attacking = "Attacking",
}

function EnemyAI.new(enemyType: string, spawnPosition: Vector3)
	local self = setmetatable({}, EnemyAI)
	
	self.Type = enemyType
	self.Config = ENEMY_CONFIG[enemyType] or ENEMY_CONFIG.WindshearStalker
	self.SpawnPosition = spawnPosition
	self.CurrentState = EnemyState.Alive
	self.Health = self.Config.Health
	self.Target = nil
	self.Waypoints = {}
	self.CurrentWaypoint = 1
	
	-- Create enemy model
	self.Model = self:CreateModel()
	
	return self
end

function EnemyAI:CreateModel()
	-- White-box enemy representation
	local enemy = Instance.new("Model")
	enemy.Name = self.Type
	
	-- Body
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(4, 6, 2)
	body.Position = self.SpawnPosition
	body.Anchored = false
	body.CanCollide = true
	body.BrickColor = BrickColor.new("Bright red")
	body.Parent = enemy
	
	-- Health indicator
	local healthBar = Instance.new("BillboardGui")
	healthBar.Name = "HealthBar"
	healthBar.Size = UDim2.new(0, 50, 0, 10)
	healthBar.StudsOffset = Vector3.new(0, 5, 0)
	healthBar.Adornee = body
	healthBar.Parent = enemy
	
	local healthBg = Instance.new("Frame")
	healthBg.Size = UDim2.new(1, 0, 1, 0)
	healthBg.BackgroundColor3 = Color3.new(0.2, 0, 0)
	healthBg.Parent = healthBar
	
	local healthFg = Instance.new("Frame")
	healthFg.Size = UDim2.new(1, 0, 1, 0)
	healthFg.BackgroundColor3 = Color3.new(1, 0, 0)
	healthFg.Name = "HealthFill"
	healthFg.Parent = healthBg
	
	-- Name label
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(0, 50, 0, 20)
	nameLabel.Position = UDim2.new(0, -25, 0, -25)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = self.Type
	nameLabel.TextColor3 = Color3.new(1, 1, 1)
	nameLabel.TextSize = 12
	nameLabel.Font = Enum.Font.Gotham
	nameLabel.Parent = healthBar
	
	-- Hitbox for damage
	local hitbox = Instance.new("Part")
	hitbox.Name = "Hitbox"
	hitbox.Size = Vector3.new(6, 8, 6)
	hitbox.Position = self.SpawnPosition
	hitbox.Anchored = false
	hitbox.CanCollide = false
	hitbox.Transparency = 0.5
	hitbox.BrickColor = BrickColor.new("Bright red")
	hitbox.Parent = enemy
	
	-- Constraint
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = body
	weld.Part1 = hitbox
	weld.Parent = body
	
	enemy.Parent = workspace
	
	return enemy
end

function EnemyAI:SetWaypoints(points: { Vector3 })
	self.Waypoints = points
end

function EnemyAI:Patrol()
	if #self.Waypoints == 0 then return end
	
	local targetWp = self.Waypoints[self.CurrentWaypoint]
	if not targetWp then return end
	
	local body = self.Model:FindFirstChild("Body")
	if not body then return end
	
	-- Move toward waypoint
	local direction = (targetWp - body.Position).Unit
	local newPos = body.Position + direction * self.Config.Speed * 0.016
	
	body.CFrame = CFrame.new(newPos)
	
	-- Check if reached waypoint
	if (body.Position - targetWp).Magnitude < 2 then
		self.CurrentWaypoint = self.CurrentWaypoint + 1
		if self.CurrentWaypoint > #self.Waypoints then
			self.CurrentWaypoint = 1
		end
	end
end

function EnemyAI:Chase(target: Player)
	if not target then return end
	
	local character = target.Character
	if not character then return end
	
	local rootPart = character:FindFirstChild("HumanoidRootPart")
	if not rootPart then return end
	
	local body = self.Model:FindFirstChild("Body")
	if not body then return end
	
	local direction = (rootPart.Position - body.Position).Unit
	local newPos = body.Position + direction * (self.Config.Speed * 1.5) * 0.016
	
	body.CFrame = CFrame.new(newPos)
	
	-- Face target
	body.CFrame = CFrame.new(body.Position, rootPart.Position)
end

function EnemyAI:Attack(target: Player)
	if not target then return end
	
	local character = target.Character
	if not character then return end
	
	local rootPart = character:FindFirstChild("HumanoidRootPart")
	if not rootPart then return end
	
	local body = self.Model:FindFirstChild("Body")
	if not body then return end
	
	-- Check distance
	local distance = (body.Position - rootPart.Position).Magnitude
	
	if distance <= self.Config.AttackRange then
		-- Attack!
		local humanoid = character:FindFirstChild("Humanoid")
		if humanoid then
			humanoid:TakeDamage(self.Config.AttackDamage)
		end
		
		-- Cooldown
		task.wait(1)
	end
end

function EnemyAI:TakeDamage(amount: number)
	self.Health -= amount
	
	-- Update health bar
	local healthBar = self.Model:FindFirstChild("HealthBar")
	if healthBar then
		local healthFg = healthBar:FindFirstChild("HealthFill")
		if healthFg then
			local healthPercent = math.max(0, self.Health / self.Config.Health)
			healthFg.Size = UDim2.new(healthPercent, 0, 1, 0)
		end
	end
	
	if self.Health <= 0 then
		self:Destroy()
	end
end

function EnemyAI:Destroy()
	self.CurrentState = EnemyState.Dead
	if self.Model and self.Model.Parent then
		self.Model:Destroy()
	end
end

function EnemyAI:GetPosition(): Vector3?
	local body = self.Model and self.Model:FindFirstChild("Body")
	return body and body.Position
end

function EnemyAI:IsAlive(): boolean
	return self.CurrentState ~= EnemyState.Dead
end

function EnemyAI:GetSoulReward(): number
	return self.Config.SoulReward
end

-- Spawn manager for encounters
local EnemyManager = {}
EnemyManager.__index = EnemyManager

function EnemyManager.new()
	local self = setmetatable({}, EnemyManager)
	self.Enemies = {} :: { [number]: EnemyAI }
	self.NextId = 1
	return self
end

function EnemyManager:SpawnEnemy(enemyType: string, position: Vector3, waypoints: { Vector3 }?): number
	local enemy = EnemyAI.new(enemyType, position)
	
	if waypoints then
		enemy:SetWaypoints(waypoints)
	end
	
	local id = self.NextId
	self.NextId += 1
	self.Enemies[id] = enemy
	
	print(`[EnemyManager] Spawned {enemyType} with ID {id}`)
	
	return id
end

function EnemyManager:GetEnemy(id: number): EnemyAI?
	return self.Enemies[id]
end

function EnemyManager:RemoveEnemy(id: number)
	if self.Enemies[id] then
		self.Enemies[id]:Destroy()
		self.Enemies[id] = nil
	end
end

function EnemyManager:GetAllEnemies(): { EnemyAI }
	local list = {}
	for _, enemy in pairs(self.Enemies) do
		if enemy:IsAlive() then
			table.insert(list, enemy)
		end
	end
	return list
end

function EnemyManager:ClearAll()
	for id, enemy in pairs(self.Enemies) do
		enemy:Destroy()
	end
	self.Enemies = {}
end

return {
	EnemyAI = EnemyAI,
	EnemyManager = EnemyManager,
}
