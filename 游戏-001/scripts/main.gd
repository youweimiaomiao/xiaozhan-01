# scripts/main.gd —— 游戏主管理
# 职责：波次流程（战斗→商店→下一波）、刷怪、经验升级、材料、UI（状态栏/商店/升级/结算）
# 教学提示：这个脚本是"指挥中心"，具体逻辑分散在 player/enemy/bullet/pickup 里
extends Node2D

enum State { TITLE, WAVE, SHOP, LEVELUP, VICTORY, DEFEAT }

const GameData = preload("res://data/game_data.gd")
const Player = preload("res://scripts/player.gd")
const Enemy = preload("res://scripts/enemy.gd")
const Bullet = preload("res://scripts/bullet.gd")
const Pickup = preload("res://scripts/pickup.gd")

# ---- 游戏状态 ----
var state: int = State.WAVE
var wave := 1                 # 当前波次（1~5）
var player                    # 玩家节点
var enemies: Array = []       # 场上敌人列表
var bullets: Array = []       # 场上子弹列表
var pickups: Array = []       # 场上材料列表
var materials := 0            # 玩家持有材料
var wave_timer := 0.0         # 本波剩余秒数
var spawn_queue: Array = []   # 本波待刷敌人类型队列
var spawn_timer := 0.0        # 两次刷怪间隔计时
var pending_levelups := 0     # 待处理的升级次数（一次杀多个怪会攒多个）
var rerolls_used := 0         # 本次商店已刷新次数（刷新费递增）
var delta_scale := 1.0        # 时间倍率（--smoke 自测时加速用）
var smoke := false

# ---- 商店数据 ----
var shop_offers: Array = []   # 元素形如 {"kind":"weapon","id":"手枪","locked":false}，kind="empty" 表示空位

# ---- UI 节点 ----
var ui_root: Control
var title_panel: Control
var hp_bar: ProgressBar
var xp_bar: ProgressBar
var wave_label: Label
var time_label: Label
var mat_label: Label
var level_label: Label
var state_label: Label
var shop_panel: Control
var shop_info: Label
var shop_offers_box: VBoxContainer
var shop_reroll_btn: Button
var levelup_panel: Control
var levelup_box: VBoxContainer
var end_panel: Control

func _ready() -> void:
	randomize()
	smoke = "--smoke" in OS.get_cmdline_user_args()
	if smoke:
		delta_scale = 12.0
		print("[smoke] 自测模式启动（12倍速）")
	_build_hud()
	_build_title_ui()
	_build_shop_ui()
	_build_levelup_ui()
	_build_end_ui()
	_spawn_player()
	if smoke:
		_start_wave()   # 自测模式跳过标题画面
	else:
		state = State.TITLE
		title_panel.visible = true   # 显示标题画面，按任意键开始

func _process(delta: float) -> void:
	# 清理已销毁节点（queue_free 后引用会失效）
	enemies = enemies.filter(func(e): return is_instance_valid(e))
	bullets = bullets.filter(func(b): return is_instance_valid(b))
	pickups = pickups.filter(func(p): return is_instance_valid(p))
	if state == State.WAVE:
		_tick_wave(delta * delta_scale)
	_update_hud()

# ==================== 玩家 ====================

func _spawn_player() -> void:
	player = Player.new()
	add_child(player)
	player.setup(self, "全能者")
	player.position = Vector2(GameData.ARENA_WIDTH / 2.0, GameData.ARENA_HEIGHT / 2.0)
	player.died.connect(_on_player_died)
	if smoke:
		# 自测模式给超高血量（连最大生命一起改，否则回血会按上限封顶），专注验证流程不崩
		player.stats["max_hp"] = 99999.0
		player.hp = 99999.0

func _on_player_died() -> void:
	_show_end(false)

# 标题画面：按任意键开始
func _unhandled_input(event: InputEvent) -> void:
	if state == State.TITLE and event is InputEventKey and event.pressed and not event.echo:
		title_panel.visible = false
		_start_wave()

# ==================== 波次流程 ====================

func _start_wave() -> void:
	state = State.WAVE
	_hide_overlays()
	var wdata: Dictionary = GameData.WAVES[wave - 1]
	wave_timer = wdata["duration"]
	if smoke:
		wave_timer = minf(3.0, wave_timer * 0.08)   # 自测：把波次时间压短
	# 把本波要刷的敌人类型列表展开成队列并打乱
	spawn_queue.clear()
	for type_id in wdata["spawns"]:
		for i in wdata["spawns"][type_id]:
			spawn_queue.append(type_id)
	spawn_queue.shuffle()
	spawn_timer = 0.4
	print("[wave %d] 开始，%d 个敌人，%.0f 秒" % [wave, spawn_queue.size(), wave_timer])

func _tick_wave(delta: float) -> void:
	wave_timer -= delta
	# 刷怪
	spawn_timer -= delta
	if not spawn_queue.is_empty() and spawn_timer <= 0.0:
		spawn_timer = 0.55
		_spawn_enemy(spawn_queue.pop_back())
	# 自测模式：时间到了直接清场，避免伤害不够卡关
	if smoke and wave_timer <= 0.0:
		for e in enemies.duplicate():
			if is_instance_valid(e):
				e.take_damage(999999.0)
	# 时间到 + 怪刷完 + 场上清空 → 本波结束
	if wave_timer <= 0.0 and spawn_queue.is_empty() and enemies.is_empty():
		_end_wave()

func _end_wave() -> void:
	# 战后结算：收获属性给材料、按比例回血、自动收集剩余材料
	materials += int(player.stats["harvesting"])
	player.heal(player.stats["max_hp"] * GameData.HEAL_AFTER_WAVE_PCT)
	for p in pickups:
		if is_instance_valid(p):
			materials += p.value
			p.queue_free()
	pickups.clear()
	print("[wave %d] 结束，材料 %d，HP %.1f" % [wave, materials, player.hp])
	if wave >= 5:
		_show_end(true)
	else:
		_open_shop()

func _spawn_enemy(type_id: String) -> void:
	var e = Enemy.new()
	add_child(e)
	e.setup(self, type_id, wave)
	e.died.connect(_on_enemy_died)
	# 出生点：环绕玩家的一个环上随机取点，保证不刷在玩家脸上
	var ang: float = randf() * TAU
	var dist: float = randf_range(280.0, 400.0)
	var pos: Vector2 = player.position + Vector2(cos(ang), sin(ang)) * dist
	var wall: float = GameData.WALL_MARGIN
	pos = pos.clamp(Vector2(wall, wall),
			Vector2(GameData.ARENA_WIDTH - wall, GameData.ARENA_HEIGHT - wall))
	e.position = pos
	enemies.append(e)

func _on_enemy_died(e) -> void:
	player.add_xp(int(e.data["xp"]))
	# 检查升级：经验够几级就升几级
	while player.level < GameData.XP_PER_LEVEL.size() \
			and player.xp >= GameData.XP_PER_LEVEL[player.level]:
		player.level += 1
		pending_levelups += 1
	if pending_levelups > 0 and state == State.WAVE:
		_show_levelup()

# ==================== 子弹 / 材料生成 ====================

func spawn_bullet(pos: Vector2, dir: Vector2, speed: float, dmg: float,
		is_friendly: bool, col: Color = Color.WHITE) -> void:
	var b = Bullet.new()
	add_child(b)
	b.setup(self, dir, speed, dmg, is_friendly, col)
	b.position = pos
	bullets.append(b)

func spawn_pickup(pos: Vector2, value: int) -> void:
	var p = Pickup.new()
	add_child(p)
	p.setup(self, value)
	p.position = pos
	pickups.append(p)

func nearest_enemy(pos: Vector2):
	var best = null
	var best_d := INF
	for e in enemies:
		if is_instance_valid(e) and e.alive:
			var d: float = pos.distance_squared_to(e.position)
			if d < best_d:
				best_d = d
				best = e
	return best

# ==================== 升级系统 ====================

func _show_levelup() -> void:
	if pending_levelups <= 0:
		return
	state = State.LEVELUP
	state_label.text = "升级！"
	# 随机抽4个不同升级选项
	var pool: Array = GameData.UPGRADES.duplicate()
	pool.shuffle()
	levelup_choices.clear()
	for i in mini(4, pool.size()):
		levelup_choices.append(pool[i])
	if smoke:
		_apply_levelup(levelup_choices[0]["stats"])   # 自测：自动选第一个
		return
	levelup_panel.visible = true
	_build_levelup_choices()

var levelup_choices: Array = []

func _apply_levelup(adds: Dictionary) -> void:
	player.apply_upgrade(adds)
	pending_levelups -= 1
	levelup_panel.visible = false
	if pending_levelups > 0:
		_show_levelup()      # 还有升级没处理，继续选
	else:
		state = State.WAVE   # 回到战斗

# ==================== 商店 ====================

func _open_shop() -> void:
	state = State.SHOP
	rerolls_used = 0
	_build_shop_offers()
	shop_panel.visible = true
	if smoke:
		# 自测：补足材料→购买第一件商品→开下一波，覆盖商店购买路径
		materials += 200
		if shop_offers.size() > 0 and shop_offers[0]["kind"] == "weapon":
			_on_buy(0)
		_on_next_wave()

func _build_shop_offers() -> void:
	shop_offers.clear()
	var weapons: Array = GameData.WEAPONS.keys()
	var items: Array = GameData.ITEMS.keys()
	weapons.shuffle()
	items.shuffle()
	for i in mini(GameData.SHOP_WEAPON_OFFERS, weapons.size()):
		shop_offers.append({"kind": "weapon", "id": weapons[i], "locked": false})
	for i in mini(GameData.SHOP_ITEM_OFFERS, items.size()):
		shop_offers.append({"kind": "item", "id": items[i], "locked": false})
	_refresh_shop_ui()

func _random_offer() -> Dictionary:
	# 随机生成一个商品（刷新/购买后补位用）
	if randf() < 0.5:
		var names: Array = GameData.WEAPONS.keys()
		names.shuffle()
		return {"kind": "weapon", "id": names[0], "locked": false}
	else:
		var names: Array = GameData.ITEMS.keys()
		names.shuffle()
		return {"kind": "item", "id": names[0], "locked": false}

func _refresh_shop_ui() -> void:
	shop_info.text = "你的材料：%d    武器槽：%d / %d" \
			% [materials, player.weapons.size(), GameData.WEAPON_SLOTS]
	var cost: int = GameData.SHOP_REROLL_BASE_COST + rerolls_used
	shop_reroll_btn.text = "刷新（%d 材料）" % cost
	# 重建商品列表
	for c in shop_offers_box.get_children():
		c.queue_free()
	for i in shop_offers.size():
		var o: Dictionary = shop_offers[i]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		shop_offers_box.add_child(row)

		var name_lbl := Label.new()
		var desc_lbl := Label.new()
		var buy_btn := Button.new()
		var lock_btn := CheckButton.new()

		if o["kind"] == "empty":
			name_lbl.text = "（空位）"
			name_lbl.custom_minimum_size = Vector2(90, 0)
			desc_lbl.text = "刷新时会被新商品填上"
			desc_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			buy_btn.text = "—"
			buy_btn.disabled = true
		else:
			buy_btn.pressed.connect(_on_buy.bind(i))
			if o["kind"] == "weapon":
				var w: Dictionary = GameData.WEAPONS[o["id"]]
				name_lbl.text = "%s（%d）" % [o["id"], w["price"]]
				name_lbl.custom_minimum_size = Vector2(90, 0)
				desc_lbl.text = w["desc"]
			else:
				var it: Dictionary = GameData.ITEMS[o["id"]]
				name_lbl.text = "%s（%d）" % [o["id"], it["price"]]
				name_lbl.custom_minimum_size = Vector2(90, 0)
				desc_lbl.text = it["desc"]
			desc_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			buy_btn.text = "购买"

		lock_btn.text = "锁"
		lock_btn.button_pressed = o["locked"]
		lock_btn.toggled.connect(_on_lock.bind(i))

		row.add_child(name_lbl)
		row.add_child(desc_lbl)
		row.add_child(buy_btn)
		row.add_child(lock_btn)

func _on_lock(i: int, locked: bool) -> void:
	shop_offers[i]["locked"] = locked

func _on_buy(i: int) -> void:
	var o: Dictionary = shop_offers[i]
	if o["kind"] == "empty":
		return
	var price: int = GameData.WEAPONS[o["id"]]["price"] if o["kind"] == "weapon" \
			else GameData.ITEMS[o["id"]]["price"]
	if materials < price:
		return
	if o["kind"] == "weapon" and player.weapons.size() >= GameData.WEAPON_SLOTS:
		return   # 武器槽已满
	materials -= price
	if o["kind"] == "weapon":
		player.weapons.append(o["id"])
		player.cooldowns.append(0.0)
	else:
		player.apply_upgrade(GameData.ITEMS[o["id"]]["stats"])
	# 原版：买走之后该格变空，刷新时补货
	shop_offers[i] = {"kind": "empty", "id": "", "locked": false}
	_refresh_shop_ui()

func _on_reroll() -> void:
	var cost: int = GameData.SHOP_REROLL_BASE_COST + rerolls_used
	if materials < cost:
		return
	materials -= cost
	rerolls_used += 1
	# 锁定的格子保留，其余补新货
	for i in shop_offers.size():
		if not shop_offers[i]["locked"]:
			shop_offers[i] = _random_offer()
	_refresh_shop_ui()

func _on_next_wave() -> void:
	wave += 1
	_start_wave()

# ==================== 胜负结算 ====================

func _show_end(win: bool) -> void:
	state = State.VICTORY if win else State.DEFEAT
	_hide_overlays()
	end_panel.visible = true
	_end_title.text = "胜利！" if win else "失败…"
	_end_summary.text = "波次：%d / 5    等级：%d    材料：%d    剩余HP：%.1f" \
			% [wave, player.level, materials, player.hp]
	if smoke:
		print("[smoke] 结果：%s wave=%d level=%d materials=%d" \
				% ["VICTORY" if win else "DEFEAT", wave, player.level, materials])
		get_tree().quit(0)

var _end_title: Label
var _end_summary: Label

# ==================== UI 构建 ====================

# 标题画面：全屏标题图 + 提示文字（美术素材由 AI 生成）
func _build_title_ui() -> void:
	title_panel = Control.new()
	title_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	title_panel.visible = false
	ui_root.add_child(title_panel)

	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.06, 0.09)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	title_panel.add_child(bg)

	var art := TextureRect.new()
	var tex = load("res://美术素材/标题图.png")
	if tex != null:
		art.texture = tex
		art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	art.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	title_panel.add_child(art)

	var hint := Label.new()
	hint.text = "按 空格 / 回车 开始游戏"
	hint.add_theme_font_size_override("font_size", 22)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	hint.position.y = -48
	title_panel.add_child(hint)

func _build_hud() -> void:
	# 中文字体：优先系统中文字体，防止中文显示成方块
	var theme := Theme.new()
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Microsoft YaHei", "微软雅黑", "Noto Sans CJK SC", "SimHei"])
	theme.default_font = font
	theme.default_font_size = 16

	var ui := CanvasLayer.new()
	add_child(ui)
	ui_root = Control.new()
	ui_root.theme = theme
	ui_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(ui_root)

	# 左上角：血条 / 经验条 / 各种信息
	var left := VBoxContainer.new()
	left.position = Vector2(16, 12)
	left.add_theme_constant_override("separation", 4)
	ui_root.add_child(left)

	hp_bar = ProgressBar.new()
	hp_bar.custom_minimum_size = Vector2(230, 16)
	hp_bar.show_percentage = false
	left.add_child(hp_bar)

	xp_bar = ProgressBar.new()
	xp_bar.custom_minimum_size = Vector2(230, 8)
	xp_bar.show_percentage = false
	left.add_child(xp_bar)

	wave_label = Label.new()
	left.add_child(wave_label)
	time_label = Label.new()
	left.add_child(time_label)
	mat_label = Label.new()
	left.add_child(mat_label)
	level_label = Label.new()
	left.add_child(level_label)
	state_label = Label.new()
	state_label.add_theme_font_size_override("font_size", 20)
	left.add_child(state_label)

	# 底部：操作提示
	var tip := Label.new()
	tip.text = "WASD / 方向键 移动 · 自动攻击最近的敌人"
	tip.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	tip.position.y = -24
	ui_root.add_child(tip)

func _build_shop_ui() -> void:
	shop_panel = Control.new()
	shop_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shop_panel.visible = false
	ui_root.add_child(shop_panel)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shop_panel.add_child(dim)

	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.13, 0.15, 0.19, 0.98)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(18)
	panel.add_theme_stylebox_override("panel", sb)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	panel.custom_minimum_size = Vector2(600, 0)
	shop_panel.add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)

	var title := Label.new()
	title.text = "商店（波次结束）"
	title.add_theme_font_size_override("font_size", 26)
	box.add_child(title)

	shop_info = Label.new()
	box.add_child(shop_info)

	shop_offers_box = VBoxContainer.new()
	shop_offers_box.add_theme_constant_override("separation", 6)
	box.add_child(shop_offers_box)

	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 10)
	box.add_child(bottom)

	shop_reroll_btn = Button.new()
	shop_reroll_btn.pressed.connect(_on_reroll)
	bottom.add_child(shop_reroll_btn)

	var next_btn := Button.new()
	next_btn.text = "开始下一波 ▶"
	next_btn.pressed.connect(_on_next_wave)
	bottom.add_child(next_btn)

func _build_levelup_ui() -> void:
	levelup_panel = Control.new()
	levelup_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	levelup_panel.visible = false
	ui_root.add_child(levelup_panel)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	levelup_panel.add_child(dim)

	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.13, 0.15, 0.19, 0.98)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(18)
	panel.add_theme_stylebox_override("panel", sb)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	levelup_panel.add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)

	var title := Label.new()
	title.text = "升级！选择一项属性提升"
	title.add_theme_font_size_override("font_size", 26)
	box.add_child(title)

	levelup_box = VBoxContainer.new()
	levelup_box.add_theme_constant_override("separation", 6)
	box.add_child(levelup_box)

func _build_levelup_choices() -> void:
	for c in levelup_box.get_children():
		c.queue_free()
	for u in levelup_choices:
		var b := Button.new()
		b.text = u["name"]
		b.pressed.connect(_apply_levelup.bind(u["stats"]))
		levelup_box.add_child(b)

func _build_end_ui() -> void:
	end_panel = Control.new()
	end_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	end_panel.visible = false
	ui_root.add_child(end_panel)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.6)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	end_panel.add_child(dim)

	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.13, 0.15, 0.19, 0.98)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(22)
	panel.add_theme_stylebox_override("panel", sb)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	end_panel.add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	panel.add_child(box)

	_end_title = Label.new()
	_end_title.add_theme_font_size_override("font_size", 32)
	_end_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_end_title)

	_end_summary = Label.new()
	_end_summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_end_summary)

	var restart := Button.new()
	restart.text = "重新开始"
	restart.pressed.connect(func(): get_tree().reload_current_scene())
	box.add_child(restart)

# ==================== 小工具 ====================

func _hide_overlays() -> void:
	title_panel.visible = false
	shop_panel.visible = false
	levelup_panel.visible = false
	end_panel.visible = false

func _update_hud() -> void:
	if hp_bar == null or player == null:
		return
	hp_bar.max_value = player.stats["max_hp"]
	hp_bar.value = player.hp
	var xp_max: int = GameData.XP_PER_LEVEL[player.level] \
			if player.level < GameData.XP_PER_LEVEL.size() else GameData.XP_PER_LEVEL[-1]
	xp_bar.max_value = xp_max
	xp_bar.value = player.xp
	wave_label.text = "波次：%d / 5" % wave
	time_label.text = "剩余时间：%d 秒" % maxi(0, ceili(wave_timer))
	mat_label.text = "材料：%d" % materials
	level_label.text = "等级：%d（经验 %d / %d）" % [player.level, player.xp, xp_max]
	state_label.text = ["标题画面", "战斗中", "商店", "升级选择", "胜利！", "失败…"][state]

# 场地绘制：网格线 + 四周边界墙
func _draw() -> void:
	var grid := 64
	for x in range(0, int(GameData.ARENA_WIDTH) + 1, grid):
		draw_line(Vector2(x, 0), Vector2(x, GameData.ARENA_HEIGHT), Color(1, 1, 1, 0.04), 1.0)
	for y in range(0, int(GameData.ARENA_HEIGHT) + 1, grid):
		draw_line(Vector2(0, y), Vector2(GameData.ARENA_WIDTH, y), Color(1, 1, 1, 0.04), 1.0)
	var m: float = GameData.WALL_MARGIN
	var w: float = GameData.ARENA_WIDTH
	var h: float = GameData.ARENA_HEIGHT
	var wall_col := Color(0.28, 0.31, 0.38)
	draw_rect(Rect2(0, 0, w, m), wall_col)
	draw_rect(Rect2(0, h - m, w, m), wall_col)
	draw_rect(Rect2(0, 0, m, h), wall_col)
	draw_rect(Rect2(w - m, 0, m, h), wall_col)
