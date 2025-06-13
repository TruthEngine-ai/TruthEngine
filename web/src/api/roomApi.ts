import { post, get, del } from './request';

export interface CreateRoomRequest {
    room_password?: string;
    ai_dm_personality?: string;
    player_count_max?: number;
}

export interface JoinRoomRequest {
    room_code: string;
    room_password?: string;
}

export interface RoomInfo {
    room_code: string;
    script_title: string;
    host_nickname: string;
    player_count: number;
    max_players: number;
    status: string;
    has_password: boolean;
    created_at: string;
}

export interface PlayerInfo {
    user_id: number;
    nickname: string;
    avatar_url: string;
    character_name: string | null;
    is_ready: boolean;
    is_host: boolean;
}

export interface RoomDetail {
    room_code: string;
    status: string;
    current_round: string | null;
    ai_dm_personality: string;
    has_password: boolean;
    script: any;
    host: {
        id: number;
        nickname: string;
        avatar_url: string;
    };
    players: PlayerInfo[];
    created_at: string;
    started_at: string | null;
}

export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
}

// 创建房间
export const createRoom = async (data: CreateRoomRequest): Promise<ApiResponse<{ room_code: string; host_id: number }>> => {
    return post('/api/room/create', data);
};

// 加入房间
export const joinRoom = async (data: JoinRoomRequest): Promise<ApiResponse<{ room_code: string; user_id: number }>> => {
    return post('/api/room/join', data);
};

// 退出房间
export const leaveRoom = async (room_code: string): Promise<ApiResponse<{ room_dissolved: boolean }>> => {
    return post('/api/room/leave', {}, { params: { room_code } });
};

// 获取房间列表
export const getRoomList = async (
    page = 1,
    page_size = 20,
    status?: string
): Promise<ApiResponse<{ rooms: RoomInfo[]; total: number; page: number; page_size: number }>> => {
    const params: any = { page, page_size };
    if (status) params.status = status;
    return get('/api/room/list', { params });
};

// 获取房间详情
export const getRoomInfo = async (room_code: string): Promise<ApiResponse<RoomDetail>> => {
    return get(`/api/room/info/${room_code}`);
};

// 删除房间
export const deleteRoom = async (room_code: string): Promise<ApiResponse<{ room_code: string }>> => {
    return del(`/api/room/delete/${room_code}`);
};

// 清理过期房间
export const cleanupRooms = async (): Promise<ApiResponse<{ deleted_count: number }>> => {
    return post('/api/room/cleanup');
};
