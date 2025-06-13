export interface ScriptInfo {
    title: string;
    description: string;
    player_count: number[];
    difficulty: string;
    tags: string;
    ai_dm_personality: string;
    duration_mins: string;
}

export interface Character {
    name: string;
    gender: string;
    is_murderer: boolean;
    backstory: string;
    public_info: string;
}

export interface Stage {
    stage_number: number;
    name: string;
    opening_narrative: string;
    stage_goal: string;
}

export interface Clue {
    name: string;
    description: string;
    discovery_stage_id: number;
    discovery_location: string;
    is_public: boolean;
    clue_goal_connection: string;
}

export interface CharacterStageGoal {
    character_name: string;
    stage_number: number;
    goal_description: string;
}

export interface GameScript {
    script: ScriptInfo;
    characters: Character[];
    stages: Stage[];
    clues: Clue[];
    character_stage_goals: CharacterStageGoal[];
}

export interface ScriptCardData {
    script: ScriptInfo;
    characters: Character[];
    stages: Stage[];
    clues: Clue[];
    character_stage_goals: CharacterStageGoal[];
}


export const testScript = `{
  "script": {
    "title": "宫廷血影",
    "description": "在古代宫廷的权谋斗争中，一桩神秘的谋杀案件打破了宫中宁静的氛围。随着一个个权力阶层的秘密被揭开，几位宫廷成员的命运也开始交织，谁会成为最后的赢家？谁又是幕后黑手？",
    "player_count": [6],
    "difficulty": "困难",
    "tags": "古代,悬疑,宫廷,谋杀,权谋",
    "ai_dm_personality": "活泼",
    "duration_mins": "90"
  },
  "characters": [
    {
      "name": "太子",
      "gender": "男",
      "is_murderer": false,
      "backstory": "作为皇帝的长子，太子一直在宫中拥有举足轻重的地位。但他深知自己面临的威胁，不仅来自外部势力，还有宫内的权谋角逐。太子有着强烈的野心，想要稳固自己的地位。",
      "public_info": "太子是皇帝的长子，拥有继位的资格。与死者有着复杂的关系，死者曾是其政治上的盟友。"
    },
    {
      "name": "宫女小翠",
      "gender": "女",
      "is_murderer": false,
      "backstory": "小翠出身贫寒，年轻时被选入宫中为宫女。她聪明机智，总是能抓住宫中的权力游戏，她有着自己的秘密与野心。",
      "public_info": "小翠是皇后的亲信宫女，外界对她知之甚少。她曾与死者有过几次私下接触，外人并不知情。"
    },
    {
      "name": "皇后",
      "gender": "女",
      "is_murderer": false,
      "backstory": "皇后本是出身名门的贵女，婚后不久便深得皇帝宠爱。然而，宫中的阴谋让她身心俱疲。为了自己的儿子能够继位，她愿意做出任何选择。",
      "public_info": "皇后是太子的母亲，与死者曾有一段深刻的恩怨。死者是其昔日的朋友，现在却成了威胁她权位的敌人。"
    },
    {
      "name": "王爷",
      "gender": "男",
      "is_murderer": false,
      "backstory": "王爷是皇帝的弟弟，手握重兵，名声显赫。表面上，他温文尔雅，但在深宫内他早有自己的算盘。多年来，王爷与死者一直有着不明的纠葛。",
      "public_info": "王爷是皇帝的弟弟，拥有强大的军事力量。死者曾是他的亲信，但两人的关系逐渐疏远。"
    },
    {
      "name": "御医",
      "gender": "男",
      "is_murderer": false,
      "backstory": "御医曾是外地名医，因医术高明被召入宫中。他精通医理，但也了解宫中的许多秘密。他一直在悄悄观察宫中各方势力，了解每一个人的弱点。",
      "public_info": "御医是宫中的医术权威，常常为皇帝和皇室成员诊治。与死者有着深厚的医学上的联系。"
    },
    {
      "name": "死者（尚未登场）",
      "gender": "男",
      "is_murderer": true,
      "backstory": "死者是宫中的一个高级侍卫，他曾在太子和王爷之间充当桥梁，是两人之间的亲信。然而，他的野心也逐渐暴露，他想要自己掌控宫廷的权力。",
      "public_info": "死者是宫中的一名高级侍卫，曾是太子和王爷的亲信。被发现死于宫中，案件扑朔迷离。"
    }
  ],
  "stages": [
    {
      "stage_number": 1,
      "name": "第一幕：血影初现",
      "opening_narrative": "在宁静的宫殿中，突然传来了一声惊叫。死者倒在了后宫的花园中，血泊中泛着刺眼的红色。宫中响起了紧急的钟声，皇帝亲自命令展开调查。所有的宫廷成员都在场，空气中弥漫着浓重的紧张与不安。",
      "stage_goal": "玩家们需开始自我介绍，逐步探查宫中各方势力，寻找死者死亡的真相。通过互动和推理，玩家们需要分辨出哪些线索能帮助他们完成自己的目标，逐渐缩小嫌疑人范围。"
    },
    {
      "stage_number": 2,
      "name": "第二幕：宫廷之谜",
      "opening_narrative": "随着调查的深入，宫中似乎隐藏着不为人知的秘密。每个人都在各自的立场上推进调查，然而，谁也不能完全相信别人。死者与几位宫廷成员的关系越来越复杂，谁才是真正的幕后黑手？",
      "stage_goal": "玩家们需要收集更多的线索，逐步揭示各自的关系网，并结合自己的任务推进调查。线索的解读将帮助玩家逐渐接近真相。"
    },
    {
      "stage_number": 3,
      "name": "第三幕：权力角逐",
      "opening_narrative": "越来越多的证据指向一个核心问题：死者的死亡似乎与宫中的权力斗争密切相关。每个人都在为自己的利益而争斗，背后的阴谋也逐渐浮出水面。宫中的局势如同翻滚的波涛，谁能在这场权力的角逐中脱颖而出，掌握生死大权？",
      "stage_goal": "玩家们需要集中精力，通过最后的线索揭示凶手，并找到死者死亡的直接原因。最终，玩家将会指认出凶手并揭示真相。"
    }
  ],
  "clues": [
    {
      "name": "一封密信",
      "description": "在死者的房间里找到一封未曾拆封的密信，信上写着：'明日午后，宫中大事将有变，切记防备那人。' 密信上并未署名。",
      "discovery_stage_id": 1,
      "discovery_location": "死者的房间",
      "is_public": true,
      "clue_goal_connection": "此线索帮助【太子】完成他的任务，明确死者或许是为了揭露宫中潜在的威胁而被杀。"
    },
    {
      "name": "一块破碎的玉佩",
      "description": "在死者的身边，发现了一块碎裂的玉佩。玉佩上刻有某个熟悉的标志，这是宫内某位贵族家族的象征。",
      "discovery_stage_id": 2,
      "discovery_location": "死者倒地的花园",
      "is_public": true,
      "clue_goal_connection": "此线索帮助【宫女小翠】揭示死者可能与宫中某位权贵有过不正当接触，从而推进她的任务。"
    },
    {
      "name": "一根沾有毒药的银针",
      "description": "在死者的桌案旁找到一根银针，针尖上似乎沾有一点毒药残留物。这可能是导致死者死亡的直接原因。",
      "discovery_stage_id": 3,
      "discovery_location": "死者的书房",
      "is_public": false,
      "clue_goal_connection": "此线索帮助【御医】进一步查明死者的死亡原因，推测出毒药的来源，揭开案件的最后谜团。"
    }
  ],
  "character_stage_goals": [
    {
      "character_name": "太子",
      "stage_number": 1,
      "goal_description": "你的任务是尽量引导大家怀疑其他人，并保持你自己的清白，尤其是与死者的关系。你希望通过收集线索，让自己看起来无辜。"
    },
    {
      "character_name": "宫女小翠",
      "stage_number": 2,
      "goal_description": "你的任务是找到与死者有过不正当关系的证据，并通过这些证据抹黑其他宫廷成员。"
    },
    {
      "character_name": "皇后",
      "stage_number": 1,
      "goal_description": "你的任务是保护太子，确保他不会受到怀疑，并试图揭露宫中潜藏的威胁。"
    },
    {
      "character_name": "王爷",
      "stage_number": 2,
      "goal_description": "你的任务是调查死者与太子和皇后之间的关系，逐步揭开他们之间的秘密，并控制宫廷局势。"
    },
    {
      "character_name": "御医",
      "stage_number": 3,
      "goal_description": "你的任务是揭示死者的死亡真相，推理出致命的毒药来源，并最终指认凶手。"
    },
    {
      "character_name": "死者",
      "stage_number": 1,
      "goal_description": "你的任务是通过对死亡的描述，暴露出你生前的秘密，并引导其他角色发现自己的动机。"
    }
  ]
}
`