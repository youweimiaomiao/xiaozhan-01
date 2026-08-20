# scripts/bullet.gd —— 子弹（玩家和敌人的子弹共用这个脚本）
# friendly=true 时命中敌人；friendly=false 时命中玩家
extends Node2D

var manager
var dir := Vector2.RIGHT
var speed := 600.0
var damage := 1.0
var radius := 4.0
var friendly := true
var life := 2.0          # 存活秒数，超时自动消失
var color := Color.WHITE

func setup(manager_ref, move_dir: Vector2, bullet_speed: float, dmg: float, is_friendly: bool, col: Color) -> void:
	manager = manager_ref
	dir = move_dir.normalized()
	speed = bullet_speed
	damage = dmg
	friendly = is_friendly
	color = col
	position += dir * 6.0   # 稍微错开出生点，避免立刻命中发射者

func _process(delta: float) -> void:
	if manager.state != manager.State.WAVE:
		return
	delta *= manager.delta_scale

	position += dir * speed * delta
	life -= delta
	if life <= 0.0:
		queue_free()
		return

	# 飞出场地（含墙）就消失
	var wall: float = manager.GameData.WALL_MARGIN
	if position.x < wall or position.x > manager.GameData.ARENA_WIDTH - wall \
			or position.y < wall or position.y > manager.GameData.ARENA_HEIGHT - wall:
		queue_free()
		return

	# 命中检测（手动圆碰撞，没有用物理引擎，逻辑更直观）
	if friendly:
		for e in manager.enemies:
			if is_instance_valid(e) and e.alive \
					and position.distance_to(e.position) < e.data["radius"] + radius:
				e.take_damage(damage)
				queue_free()
				return
	else:
		var p = manager.player
		if position.distance_to(p.position) < 14.0 + radius:
			p.take_damage(damage)
			queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, radius, color)
