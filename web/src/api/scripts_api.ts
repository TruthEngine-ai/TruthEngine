import { post, get } from './request';

// 创建剧本请求体
export interface CreateScriptRequest {
    theme: string;
    player_count: number;
    difficulty: string; 
    ai_dm_personality: string;
    duration_mins: number;
    author_id: number;
    room_code: string; 
}

// 生成剧本响应
export interface GenerateScriptResponse {
    code: number;
    msg: string;
    data: {
        script_id: number;
        script_info: string;
    };
}

export interface ScriptDetail {
    id: number;
    title: string;
    description: string;
    player_count_min: number;
    player_count_max: number;
    duration_mins: number;
    difficulty: string;
    tags: string;
    author: {
        id: number;
        nickname: string;
        avatar_url: string;
    };
    status: string;
    created_at: string;
}

// 剧本列表项
export interface ScriptListItem {
    id: number;
    title: string;
    description: string;
    player_count_min: number;
    player_count_max: number;
    difficulty: string;
    tags: string;
    status: string;
    created_at: string;
    // 可根据后端返回补充更多字段
}

// 通用API响应
export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
}

// 生成剧本
export const generateScript = async (data: CreateScriptRequest): Promise<GenerateScriptResponse> => {
    return post('/api/scripts/generate', data);
};

// 获取剧本详情
export const getScriptDetail = async (script_id: number): Promise<ApiResponse<ScriptDetail>> => {
    return get(`/api/scripts/detail/${script_id}`);
};

// 获取剧本列表
export const getScriptList = async (
    page = 1,
    page_size = 20
): Promise<ApiResponse<{ scripts: ScriptListItem[]; total: number; page: number; page_size: number }>> => {
    return get('/api/scripts/list', { params: { page, page_size } });
};
