from tortoise.models import Model
from tortoise import fields

class Users(Model):
    id = fields.IntField(primary_key=True)
    username = fields.CharField(max_length=50, unique=True)
    password_hash = fields.CharField(max_length=255)
    nickname = fields.CharField(max_length=50)
    avatar_url = fields.CharField(max_length=255, null=True)
    email = fields.CharField(max_length=100, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    last_login_at = fields.DatetimeField(null=True)

    class Meta:
        table = "users"

class Scripts(Model):
    id = fields.IntField(primary_key=True)
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
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "scripts"

class ScriptCharacters(Model):
    id = fields.IntField(primary_key=True)
    script = fields.ForeignKeyField('models.Scripts', related_name='characters')
    name = fields.CharField(max_length=50)
    gender = fields.CharField(
        max_length=10,
        choices=[('男', '男'), ('女', '女'), ('不限', '不限')]
    )
    is_murderer = fields.BooleanField(default=False)
    backstory = fields.TextField()
    public_info = fields.TextField()
    private_goals = fields.TextField()

    class Meta:
        table = "script_characters"

class ScriptClues(Model):
    id = fields.IntField(primary_key=True)
    script = fields.ForeignKeyField('models.Scripts', related_name='clues')
    name = fields.CharField(max_length=100)
    description = fields.TextField()
    image_url = fields.CharField(max_length=255, null=True)
    discovery_round = fields.IntField()
    discovery_location = fields.CharField(max_length=100)
    is_public = fields.BooleanField(default=False)

    class Meta:
        table = "script_clues"

class GameRooms(Model):
    id = fields.IntField(primary_key=True)
    room_code = fields.CharField(max_length=10, unique=True)
    script = fields.ForeignKeyField('models.Scripts', related_name='game_rooms')
    host_user = fields.ForeignKeyField('models.Users', related_name='hosted_rooms')
    status = fields.CharField(
        max_length=10,
        choices=[('等待中', '等待中'), ('进行中', '进行中'), ('投票中', '投票中'), 
                ('已结束', '已结束'), ('已解散', '已解散')],
        default='等待中'
    )
    current_round = fields.IntField(default=0)
    ai_dm_personality = fields.CharField(
        max_length=10,
        choices=[('严肃', '严肃'), ('幽默', '幽默'), ('神秘', '神秘')],
        default='严肃'
    )
    created_at = fields.DatetimeField(auto_now_add=True)
    started_at = fields.DatetimeField(null=True)
    finished_at = fields.DatetimeField(null=True)

    class Meta:
        table = "game_rooms"

class GamePlayers(Model):
    id = fields.IntField(primary_key=True)
    room = fields.ForeignKeyField('models.GameRooms', related_name='players')
    user = fields.ForeignKeyField('models.Users', related_name='game_sessions')
    character = fields.ForeignKeyField('models.ScriptCharacters', related_name='game_players')
    is_ready = fields.BooleanField(default=False)
    is_alive = fields.BooleanField(default=True)
    notes = fields.TextField(default="")

    class Meta:
        table = "game_players"
        unique_together = [('room', 'user'), ('room', 'character')]

class GameLogs(Model):
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

class GameVotes(Model):
    id = fields.IntField(primary_key=True)
    room = fields.ForeignKeyField('models.GameRooms', related_name='votes')
    round = fields.IntField()
    voter_game_player = fields.ForeignKeyField('models.GamePlayers', related_name='votes_cast')
    voted_game_player = fields.ForeignKeyField('models.GamePlayers', related_name='votes_received')
    timestamp = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "game_votes"
