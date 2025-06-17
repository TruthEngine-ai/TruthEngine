import type { RoomStatus } from '../../../hooks/useWebSocket';

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
    is_ai?: boolean; // 新增：标识是否为AI玩家
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

export interface RoomPreparePageProps {
    roomCode: string;
    isConnected?: boolean;
    roomStatus: RoomStatus | null;
    setReady: (ready: boolean) => void;
    updateRoomSettings: (settings: {
        theme?: string;
        difficulty?: string;
        ai_dm_personality?: string;
        duration_mins?: number;
    }) => void;
    generateScript: (settings: {
        theme?: string;
        difficulty?: string;
        ai_dm_personality?: string;
        duration_mins?: number;
    }) => void;
    addNPC: (aiconfigId: number) => void;
    removeNPC: (playerId: number) => void;
}
