export interface Player {
    user_id: number;
    nickname: string;
    avatar?: string;
    is_host: boolean;
    character_name?: string;
    is_ready: boolean;
    is_online: boolean;
}

export interface PlayerSlot {
    id: string;
    nickname: string;
    avatar: string;
    is_host: boolean;
    is_empty: boolean;
    character_name?: string;
    is_ready: boolean;
    is_online: boolean;
}

export interface GameSettings {
    theme?: string;
    duration_mins?: number;
    difficulty?: string;
    ai_dm_personality?: string;
}

export interface GameFormValues {
    background?: string;
    duration?: string;
    difficulty?: string;
    aiPersonality?: string;
    specialRequests?: string;
}

export interface RoomPreparePageProps {}
