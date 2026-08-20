# scripts/pickup.gd —— 材料拾取物（绿色菱形，波次结束时自动收集）
extends Node2D

var manager
var value := 1
var life := 15.0          # 存活时间，超时淡出消失
var magnet_speed := 420.0 # 被磁吸时的移动速度

func setup(manager_ref, v: int) -> void:
	manager = manager_ref
	value = v

func _process(delta: float) -> void:
	if manager.state != manager.State.WAVE:
		return
	delta *= manager.delta_scale

	life -= delta
	if life <= 0.0:
		queue_free()
		return

	var p = manager.player
	var to_player: Vector2 = p.position - position
	var dist: float = to_player.length()
	# 磁吸：进入范围后飞向玩家；贴脸就收集
	if dist < manager.GameData.MAGNET_RADIUS:
		position += to_player.normalized() * magnet_speed * delta
	if dist < 18.0:
		manager.materials += value
		queue_free()
		return

	# 快消失时闪烁淡出
	if life < 2.0:
		modulate.a = 0.4 + 0.6 * fmod(life * 6.0, 1.0)

func _draw() -> void:
	# 绿色菱形（材料宝石）
	var pts := PackedVector2Array([
		Vector2(0, -6), Vector2(5, 0), Vector2(0, 6), Vector2(-5, 0),
	])
	draw_colored_polygon(pts, Color("#3ddc84"))
	draw_polyline(pts + PackedVector2Array([Vector2(0, -6)]), Color("#1e7a48"), 1.0)
