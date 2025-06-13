from tortoise.models import Model
from tortoise import fields


class BaseModel(Model):
    """基础模型，包含公共字段"""
    id = fields.IntField(primary_key=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        abstract = True



class Users(BaseModel):
    username = fields.CharField(max_length=50, unique=True)
    password_hash = fields.CharField(max_length=255)
    nickname = fields.CharField(max_length=50)
    avatar_url = fields.CharField(max_length=255, null=True)
    email = fields.CharField(max_length=100, unique=True)
    is_active = fields.BooleanField(default=True)
    is_visitor = fields.BooleanField(default=False)
    last_login_at = fields.DatetimeField(null=True)

    class Meta:
        table = "users"

class Scripts(BaseModel):
    title = fields.CharField(max_length=100)
    cover_image_url = fields.CharField(max_length=255, null=True)
    description = fields.TextField()
    player_count_min = fields.IntField()
    player_count_max = fields.IntField()
    duration_mins = fields.IntField()
    difficulty = fields.CharField(
        max_length=10,
        choices=[('新手', '新手'), ('进阶', '进阶'), ('烧脑', '烧脑')]
    )
    tags = fields.CharField(max_length=255, null=True)
    author = fields.ForeignKeyField('models.Users', related_name='scripts')
    status = fields.CharField(
        max_length=10,
        choices=[('草稿', '草稿'), ('发布', '发布'), ('下架', '下架')],
        default='草稿'
    )

    class Meta:
        table = "scripts"

class ScriptStages(BaseModel):
    """剧本故事阶段表"""
    script = fields.ForeignKeyField('models.Scripts', related_name='stages')
    stage_number = fields.IntField()
    name = fields.CharField(max_length=100)
    opening_narrative = fields.TextField()
    stage_goal = fields.TextField()

    class Meta:
        table = "script_stages"
        unique_together = [('script', 'stage_number')]

class ScriptCharacters(BaseModel):
    script = fields.ForeignKeyField('models.Scripts', related_name='characters')
    name = fields.CharField(max_length=50)
    gender = fields.CharField(
        max_length=10,
        choices=[('男', '男'), ('女', '女'), ('不限', '不限')]
    )
    is_murderer = fields.BooleanField(default=False)
    backstory = fields.TextField()
    public_info = fields.TextField()
    # private_goals 字段已移除

    class Meta:
        table = "script_characters"

class CharacterStageGoals(BaseModel):
    """角色阶段任务表"""
    character = fields.ForeignKeyField('models.ScriptCharacters', related_name='stage_goals')
    stage = fields.ForeignKeyField('models.ScriptStages', related_name='character_goals')
    goal_description = fields.TextField()
    is_mandatory = fields.BooleanField(default=False)

    class Meta:
        table = "character_stage_goals"
        unique_together = [('character', 'stage')]

class ScriptClues(BaseModel):
    script = fields.ForeignKeyField('models.Scripts', related_name='clues')
    name = fields.CharField(max_length=100)
    description = fields.TextField()
    image_url = fields.CharField(max_length=255, null=True)
    discovery_stage = fields.ForeignKeyField('models.ScriptStages', related_name='discoverable_clues', null=True)
    discovery_location = fields.CharField(max_length=100)
    is_public = fields.BooleanField(default=False)

    class Meta:
        table = "script_clues"

class GameRooms(BaseModel):
    room_code = fields.CharField(max_length=10, unique=True)
    room_password=fields.CharField(max_length=20)
    script = fields.ForeignKeyField('models.Scripts', related_name='game_rooms',null=True)
    host_user = fields.ForeignKeyField('models.Users', related_name='hosted_rooms')
    max_players = fields.IntField(default=3)
    status = fields.CharField(
        max_length=10,
        choices=[('等待中', '等待中'), ('进行中', '进行中'), ('投票中', '投票中'), 
                ('已结束', '已结束'), ('已解散', '已解散')],
        default='等待中'
    )
    current_stage = fields.ForeignKeyField('models.ScriptStages', related_name='active_rooms', null=True)
    ai_dm_personality = fields.CharField(
        max_length=10,
        choices=[('严肃', '严肃'), ('幽默', '幽默'), ('神秘', '神秘')],
        default='严肃'
    )
    started_at = fields.DatetimeField(null=True)
    finished_at = fields.DatetimeField(null=True)

    class Meta:
        table = "game_rooms"

class GamePlayers(BaseModel):
    room = fields.ForeignKeyField('models.GameRooms', related_name='players')
    user = fields.ForeignKeyField('models.Users', related_name='game_sessions')
    character = fields.ForeignKeyField('models.ScriptCharacters', related_name='game_players', null=True)
    is_ready = fields.BooleanField(default=False)
    is_alive = fields.BooleanField(default=True)
    notes = fields.TextField(default="")

    class Meta:
        table = "game_players"
        unique_together = [('room', 'user'), ('room', 'character')]

class GameLogs(BaseModel):
    id = fields.BigIntField(primary_key=True)
    room = fields.ForeignKeyField('models.GameRooms', related_name='logs')
    sender_game_player = fields.ForeignKeyField('models.GamePlayers', related_name='sent_messages', null=True)
    is_ai_sender = fields.BooleanField(default=False)
    message_type = fields.CharField(
        max_length=20,
        choices=[('公共聊天', '公共聊天'), ('私聊', '私聊'), ('AI旁白', 'AI旁白'), 
                ('行动宣告', '行动宣告'), ('线索发布', '线索发布')]
    )
    content = fields.TextField()
    recipient_game_player = fields.ForeignKeyField('models.GamePlayers', related_name='received_messages', null=True)
    related_clue = fields.ForeignKeyField('models.ScriptClues', related_name='related_logs', null=True)
    timestamp = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "game_logs"

class GameVotes(BaseModel):
    room = fields.ForeignKeyField('models.GameRooms', related_name='votes')
    stage = fields.ForeignKeyField('models.ScriptStages', related_name='votes')
    voter_game_player = fields.ForeignKeyField('models.GamePlayers', related_name='votes_cast')
    voted_game_player = fields.ForeignKeyField('models.GamePlayers', related_name='votes_received')
    timestamp = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "game_votes"
