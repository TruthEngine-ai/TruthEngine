import type { Player, PlayerSlot, GameSettings, GameFormValues } from './types';

// 映射表
export const backgroundMap: Record<string, string> = {
    gudai: '古代宫廷',
    xiandai: '现代都市',
    kehuan: '科幻未来',
    xuanhuan: '玄幻仙侠',
};

export const durationMap: Record<string, number> = {
    short: 30,
    medium: 60,
    long: 90,
};

export const difficultyMap: Record<string, string> = {
    novice: '新手',
    intermediate: '进阶',
    expert: '烧脑',
    master: '大师',
};

// 反向映射
export const backgroundReverseMap: Record<string, string> = {
    '古代宫廷': 'gudai',
    '现代都市': 'xiandai',
    '科幻未来': 'kehuan',
    '玄幻仙侠': 'xuanhuan',
};

export const durationReverseMap: Record<number, string> = {
    30: 'short',
    60: 'medium',
    90: 'long',
};

export const difficultyReverseMap: Record<string, string> = {
    '新手': 'novice',
    '进阶': 'intermediate',
    '烧脑': 'expert',
    '大师': 'master',
};

// 生成空玩家槽位
export const generateEmptySlots = (players: Player[], maxPlayers: number = 6): PlayerSlot[] => {
    const emptyCount = Math.max(0, maxPlayers - players.length);
    return Array.from({ length: emptyCount }, (_, index) => ({
        id: `empty-${index}`,
        nickname: '等待玩家加入...',
        avatar: '',
        is_host: false,
        is_empty: true,
        character_name: undefined,
        is_ready: false,
        is_online: false
    }));
};

// 转换玩家数据为槽位数据
export const convertPlayersToSlots = (players: Player[]): PlayerSlot[] => {
    return players.map(player => ({
        id: player.user_id.toString(),
        nickname: player.nickname,
        avatar: '',
        is_host: player.is_host,
        is_empty: false,
        character_name: player.character_name,
        is_ready: player.is_ready,
        is_online: player.is_online,
        is_ai: player.user_id < 0 // 假设AI玩家的user_id为负数
    }));
};

// 获取初始表单值
export const getInitialFormValues = (gameSettings?: GameSettings, aiDmPersonality?: string): GameFormValues => {
    if (!gameSettings) return {};
    
    return {
        background: (gameSettings.theme && backgroundReverseMap[gameSettings.theme]) || undefined,
        duration: (gameSettings.duration_mins && durationReverseMap[gameSettings.duration_mins]) || undefined,
        difficulty: (gameSettings.difficulty && difficultyReverseMap[gameSettings.difficulty]) || undefined,
        aiPersonality: gameSettings.ai_dm_personality || aiDmPersonality || undefined,
    };
};

// 构建设置更新数据
export const buildSettingsUpdate = (changedFields: any[]): any => {
    const settingsUpdate: any = {};

    changedFields.forEach((field: any) => {
        const fieldName = field.name[0];
        const fieldValue = field.value;

        switch (fieldName) {
            case 'background':
                settingsUpdate.theme = backgroundMap[fieldValue] || fieldValue;
                break;
            case 'duration':
                settingsUpdate.duration_mins = durationMap[fieldValue] || 30;
                break;
            case 'difficulty':
                settingsUpdate.difficulty = difficultyMap[fieldValue] || fieldValue;
                break;
            case 'aiPersonality':
                settingsUpdate.ai_dm_personality = fieldValue;
                break;
        }
    });

    return settingsUpdate;
};

// 检查游戏设置是否完整
export const isGameSettingsComplete = (gameSettings?: GameSettings): boolean => {
    return !!(gameSettings?.theme && gameSettings?.duration_mins && gameSettings?.difficulty && gameSettings?.ai_dm_personality);
};
