# scripts/enemy.gd —— 敌人
# 三种行为：chase(近战追踪) / ranged(远程射击) / charger(蓄力冲锋)
# 碰到玩家按间隔造成接触伤害；死亡时掉落材料
extends Node2D

signal died(enemy)

var manager
var data := {}          # 敌人数据表（见 data/game_data.gd）
var hp := 1.0
var max_hp := 1.0
var alive := true
var contact_timer := 0.0   # 接触伤害计时
var attack_timer := 0.0    # 远程/冲锋的攻击冷却计时
var charge_state := "chase"  # charger 内部状态：chase/charge/rest
var charge_dir := Vector2.ZERO
var charge_left := 0.0

const GameData = preload("res://data/game_data.gd")
const Bullet = preload("res://scripts/bullet.gd")

func setup(manager_ref, type_id: String, wave: int) -> void:
	manager = manager_ref
	data = GameData.ENEMIES[type_id]
	# 血量随波次成长：每波 +25%
	var scale: float = 1.0 + GameData.ENEMY_HP_SCALE * float(wave - 1)
	max_hp = data["hp"] * scale
	hp = max_hp
	attack_timer = randf_range(0.5, 1.5)   # 错开首次攻击时间，避免齐射

func take_damage(amount: float) -> void:
	if not alive:
		return
	hp -= amount
	if hp <= 0.0:
		_die()

func _die() -> void:
	alive = false
	# 掉落材料：数量随机，幸运越高越容易多掉
	var amounts: Array = data["materials"]
	var n: int = randi_range(amounts[0], amounts[1])
	if manager.player.stats["luck"] > 0 and randf() < minf(0.5, manager.player.stats["luck"] * 0.02):
		n += 1
	for i in n:
		manager.spawn_pickup(position + Vector2(randf_range(-8, 8), randf_range(-8, 8)), 1)
	died.emit(self)
	queue_free()

func _process(delta: float) -> void:
	if manager.state != manager.State.WAVE or not alive:
		return
	delta *= manager.delta_scale

	var p = manager.player
	var to_player: Vector2 = p.position - position
	var dist: float = to_player.length()

	# ---- 按行为类型移动 ----
	match data["behavior"]:
		"chase":
			if dist > 1.0:
				position += to_player.normalized() * data["speed"] * delta
		"ranged":
			# 保持在中距离，太近后退、太远靠近
			var keep: float = data["range"] * 0.8
			if dist > keep + 10.0 and dist > 1.0:
				position += to_player.normalized() * data["speed"] * delta
			elif dist < keep - 10.0 and dist > 1.0:
				position -= to_player.normalized() * data["speed"] * delta
			# 冷却好了就朝玩家射一发
			attack_timer -= delta
			if attack_timer <= 0.0:
				attack_timer = data["attack_cd"]
				manager.spawn_bullet(
					position, to_player.normalized(),
					data["bullet_speed"], data["contact_damage"], false, Color("#ff8f6b"))
		"charger":
			attack_timer -= delta
			match charge_state:
				"chase":
					if dist > 1.0:
						position += to_player.normalized() * data["speed"] * delta
					if attack_timer <= 0.0:
						# 蓄力：锁定向玩家冲锋
						charge_state = "charge"
						charge_dir = to_player.normalized()
						charge_left = data["charge_duration"]
				"charge":
					position += charge_dir * data["charge_speed"] * delta
					charge_left -= delta
					if charge_left <= 0.0:
						charge_state = "rest"
						attack_timer = data["charge_cd"]
				"rest":
					pass   # 短暂休息，等 attack_timer 归零后回到 chase

	# ---- 限制在场地内 ----
	var wall: float = GameData.WALL_MARGIN
	position = position.clamp(
		Vector2(wall, wall),
		Vector2(GameData.ARENA_WIDTH - wall, GameData.ARENA_HEIGHT - wall))

	# ---- 接触伤害（贴到玩家身上就按间隔扣血）----
	if dist < data["radius"] + 14.0:
		contact_timer -= delta
		if contact_timer <= 0.0:
			contact_timer = GameData.CONTACT_TICK
			p.take_damage(float(data["contact_damage"]))

	queue_redraw()

func _draw() -> void:
	var r: float = data["radius"]
	draw_circle(Vector2.ZERO, r, Color(data["color"]).darkened(0.35))
	draw_circle(Vector2.ZERO, r * 0.8, Color(data["color"]))
	# 掉血后显示一条小血条
	if hp < max_hp:
		var w := r * 2.0
		draw_rect(Rect2(-r, -r - 7.0, w, 3.0), Color(0.1, 0.1, 0.1, 0.8))
		draw_rect(Rect2(-r, -r - 7.0, w * (hp / max_hp), 3.0), Color("#e05555"))
