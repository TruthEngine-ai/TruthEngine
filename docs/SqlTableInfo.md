**users - 用户表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| user_id | INT | PRIMARY KEY | 用户唯一ID，自增 |
| username | VARCHAR(50) | UNIQUE | 登录用户名，唯一 |
| password_hash | VARCHAR(255) |     | 加密后的密码 |
| nickname | VARCHAR(50) |     | 游戏内显示的昵称 |
| avatar_url | VARCHAR(255) |     | 用户头像链接 |
| email | VARCHAR(100) | UNIQUE | 注册邮箱，唯一 |
| created_at | DATETIME |     | 账户创建时间 |
| last_login_at | DATETIME |     | 最后登录时间 |

* * *

#### 2\. 剧本内容模块 (Script Content Module)

存放所有剧本的静态信息，这是AI学习和组织游戏的基础。

**scripts - 剧本信息表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| script_id | INT | PRIMARY KEY | 剧本唯一ID，自增 |
| title | VARCHAR(100) |     | 剧本标题 |
| cover_image_url | VARCHAR(255) |     | 剧本封面图链接 |
| description | TEXT |     | 剧本简介，吸引玩家 |
| player_count_min | INT |     | 最少玩家人数 |
| player_count_max | INT |     | 最多玩家人数 |
| duration_mins | INT |     | 预计游戏时长（分钟） |
| difficulty | ENUM('新手', '进阶', '烧脑') | INDEX | 难度标签 |
| tags | VARCHAR(255) |     | 标签，如"现代,悬疑,情感" |
| author_id | INT | FOREIGN KEY (users) | 剧本创建者ID（可以是管理员） |
| status | ENUM('草稿', '发布', '下架') |     | 剧本状态 |
| created_at | DATETIME |     | 创建时间 |

**script_characters - 剧本角色表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| character_id | INT | PRIMARY KEY | 角色唯一ID，自增 |
| script_id | INT | FOREIGN KEY (scripts) | 关联的剧本ID |
| name | VARCHAR(50) |     | 角色名称 |
| gender | ENUM('男', '女', '不限') |     | 角色性别要求 |
| is_murderer | BOOLEAN |     | **核心字段**: 是否是凶手 |
| backstory | TEXT |     | 角色的背景故事（私密） |
| public_info | TEXT |     | 角色的公开信息 |
| private_goals | TEXT |     | 角色的秘密任务/目标 |

**script_clues - 剧本线索表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| clue_id | INT | PRIMARY KEY | 线索唯一ID，自增 |
| script_id | INT | FOREIGN KEY (scripts) | 关联的剧本ID |
| name | VARCHAR(100) |     | 线索名称，如"带血的日记" |
| description | TEXT |     | 线索的详细描述/内容 |
| image_url | VARCHAR(255) |     | 线索图片链接（可选） |
| discovery_round | INT |     | **AI关键字段**: 在第几轮可被发现 |
| discovery_location | VARCHAR(100) |     | **AI关键字段**: 在哪个地点可被发现 |
| is_public | BOOLEAN |     | 发现后是否公开给所有玩家 |

* * *

#### 3\. 游戏进程模块 (Game Session Module)

记录每一局游戏的动态数据。

**game_rooms - 游戏房间表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| room_id | INT | PRIMARY KEY | 房间唯一ID，自增 |
| room_code | VARCHAR(10) | UNIQUE | 用于加入房间的短代码 |
| script_id | INT | FOREIGN KEY (scripts) | 本局游戏使用的剧本ID |
| host_user_id | INT | FOREIGN KEY (users) | 房主的用户ID |
| status | ENUM('等待中', '进行中', '投票中', '已结束', '已解散') | INDEX | 房间当前状态 |
| current_round | INT |     | 游戏当前进行到第几轮 |
| ai_dm_personality | ENUM('严肃', '幽默', '神秘') |     | **AI特色**: AI主持人的性格 |
| created_at | DATETIME |     | 房间创建时间 |
| started_at | DATETIME |     | 游戏开始时间（可为空） |
| finished_at | DATETIME |     | 游戏结束时间（可为空） |

**game_players - 游戏玩家状态表 (关联表)**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| game_player_id | INT | PRIMARY KEY | 唯一ID，自增 |
| room_id | INT | FOREIGN KEY (game_rooms) | 所在的房间ID |
| user_id | INT | FOREIGN KEY (users) | 对应的用户ID |
| character_id | INT | FOREIGN KEY (script_characters) | 分配到的角色ID |
| is_ready | BOOLEAN |     | 玩家是否已准备开始 |
| is_alive | BOOLEAN |     | 玩家角色是否存活 |
| notes | TEXT |     | 玩家的私人笔记 |
| 组合唯一索引 | (room_id, user_id) | UNIQUE | 一个用户在一个房间只能有一个身份 |
| 组合唯一索引 | (room_id, character_id) | UNIQUE | 一个房间一个角色只能被一人扮演 |

* * *

#### 4\. 交互与日志模块 (Interaction & Log Module)

记录游戏中的所有交互，这是AI分析玩家行为和推动剧情的依据。

**game_logs - 游戏日志/聊天记录表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| log_id | BIGINT | PRIMARY KEY | 日志唯一ID，自增 |
| room_id | INT | FOREIGN KEY (game_rooms) | 发生的房间ID |
| sender_game_player_id | INT | FK(game_players), NULLable | 发送者(玩家)，AI发送时可为空 |
| is_ai_sender | BOOLEAN |     | 标记是否为AI发送的消息 |
| message_type | ENUM('公共聊天', '私聊', 'AI旁白', '行动宣告', '线索发布') | INDEX | 消息类型，用于前端展示 |
| content | TEXT |     | 消息内容 |
| recipient_game_player_id | INT | FK(game_players), NULLable | 接收者ID（用于私聊） |
| related_clue_id | INT | FK(script_clues), NULLable | 如果是线索发布，关联线索ID |
| timestamp | DATETIME | INDEX | 消息发送时间 |

**game_votes - 游戏投票记录表**

| 字段名 | 数据类型 | 主键/索引 | 备注  |
| :--- | :--- | :--- | :--- |
| vote_id | INT | PRIMARY KEY | 投票记录ID，自增 |
| room_id | INT | FOREIGN KEY (game_rooms) | 发生的房间ID |
| round | INT |     | 投票发生的轮次 |
| voter_game_player_id | INT | FOREIGN KEY (game_players) | 投票者 |
| voted_game_player_id | INT | FOREIGN KEY (game_players) | 被投票者 |
| timestamp | DATETIME |     | 投票提交时间 |

### 关系总结

- 一个user可以参与多个game_room。
    
- 一个script包含多个script_character和script_clue。
    
- 一个game_room只对应一个script，但可以被多次游玩。
    
- game_players是连接users、game_rooms和script_characters的核心枢纽。
    
- game_logs和game_votes记录了game_room中发生的所有事件。