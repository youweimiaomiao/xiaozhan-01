# scripts/player.gd —— 玩家（土豆）
# 职责：移动（WASD/方向键）、自动瞄准最近的敌人开枪、承受伤害、属性成长
extends Node2D

signal died

var manager            # main.gd 的引用，用于查询敌人、生成子弹等
var stats := {}        # 当前属性字典（键名见 data/game_data.gd）
var weapons := []      # 武器槽：武器名数组（最多 WEAPON_SLOTS 个）
var cooldowns := []    # 每个武器槽的剩余冷却秒数
var hp := 10.0
var xp := 0            # 累计经验
var level := 1
var regen_timer := 0.0 # 生命再生计时器

const GameData = preload("res://data/game_data.gd")
const Bullet = preload("res://scripts/bullet.gd")

func setup(manager_ref, character_id: String) -> void:
	manager = manager_ref
	var char_data: Dictionary = GameData.CHARACTERS[character_id]
	# 只把"属性"键拷进 stats，跳过描述和初始武器这类非属性键
	for key in char_data:
		if key != "desc" and key != "start_weapons":
			stats[key] = char_data[key]
	hp = stats["max_hp"]
	for wname in char_data["start_weapons"]:
		weapons.append(wname)
		cooldowns.append(0.0)

# ---- 派生属性（基础值 × 加成）----
func get_move_speed() -> float:
	return stats["speed"] * (1.0 + stats["speed_pct"])

func get_attack_range() -> float:
	return stats["range"]

func get_damage_mult() -> float:
	return 1.0 + stats["damage_pct"]

func get_attack_speed_mult() -> float:
	return 1.0 + stats["attack_speed_pct"]

func _process(delta: float) -> void:
	if manager.state != manager.State.WAVE:
		return
	delta *= manager.delta_scale

	# 1) 移动：WASD / 方向键
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): dir.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): dir.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): dir.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): dir.y += 1.0
	dir = dir.normalized()
	position += dir * get_move_speed() * delta
	# 限制在场地内（四周有一圈墙）
	var wall := GameData.WALL_MARGIN
	position = position.clamp(
		Vector2(wall, wall),
		Vector2(GameData.ARENA_WIDTH - wall, GameData.ARENA_HEIGHT - wall))

	# 2) 生命再生：每 HP_REGEN_INTERVAL 秒回一次
	regen_timer += delta
	if stats["hp_regen"] > 0 and regen_timer >= GameData.HP_REGEN_INTERVAL:
		regen_timer = 0.0
		heal(float(stats["hp_regen"]))

	# 3) 自动攻击：瞄准最近的敌人，逐个武器槽开火
	var target: Node2D = manager.nearest_enemy(position)
	if target != null:
		for i in weapons.size():
			cooldowns[i] -= delta
			if cooldowns[i] <= 0.0:
				var wdata: Dictionary = GameData.WEAPONS[weapons[i]]
				var dist: float = position.distance_to(target.position)
				if dist <= wdata["range"]:
					_fire(i, wdata, target.position)
					cooldowns[i] = wdata["cooldown"] / get_attack_speed_mult()

	queue_redraw()

# 用第 i 个武器槽朝 aim_pos 开火
func _fire(slot: int, wdata: Dictionary, aim_pos: Vector2) -> void:
	var base_dir: Vector2 = (aim_pos - position).normalized()
	for p in wdata["pellets"]:
		var angle: float = 0.0
		if wdata["spread"] > 0.0:
			angle = randf_range(-wdata["spread"], wdata["spread"])
		var dir: Vector2 = base_dir.rotated(angle)
		var dmg: float = wdata["damage"] * get_damage_mult()
		var is_crit: bool = randf() < stats["crit_chance"]
		if is_crit:
			dmg *= GameData.CRIT_MULT
		manager.spawn_bullet(position + dir * 18.0, dir, wdata["bullet_speed"], dmg, true)

func take_damage(amount: float) -> void:
	# 闪避：完全躲开
	if randf() < stats["dodge"]:
		return
	# 护甲减伤
	var reduced: float = amount * (1.0 - GameData.armor_reduction(int(stats["armor"])))
	hp -= reduced
	if hp <= 0.0:
		hp = 0.0
		died.emit()

func heal(amount: float) -> void:
	hp = minf(hp + amount, stats["max_hp"])

func add_xp(amount: int) -> void:
	xp += amount

# 把一组属性加成应用到玩家身上（升级/道具共用）
func apply_upgrade(adds: Dictionary) -> void:
	for key in adds:
		stats[key] += adds[key]
	# 原版规则：提升最大生命时同时回复等量生命
	if adds.has("max_hp"):
		heal(float(adds["max_hp"]))

func _draw() -> void:
	# 土豆本体：外圈深色 + 身体
	draw_circle(Vector2.ZERO, 14.0, Color("#7c5237"))
	draw_circle(Vector2.ZERO, 12.0, Color("#c98d5f"))
	draw_circle(Vector2(-4, -4), 2.2, Color("#2b1d12"))
	draw_circle(Vector2(4, -4), 2.2, Color("#2b1d12"))
	# 武器槽指示点：一圈小圆点，亮黄色=有武器，暗灰=空槽
	for i in GameData.WEAPON_SLOTS:
		var ang: float = TAU * float(i) / GameData.WEAPON_SLOTS - PI / 2.0
		var dot_pos: Vector2 = Vector2(cos(ang), sin(ang)) * 20.0
		if i < weapons.size():
			draw_circle(dot_pos, 2.6, Color("#f2e14c"))
		else:
			draw_circle(dot_pos, 2.2, Color(0.4, 0.4, 0.4, 0.6))
