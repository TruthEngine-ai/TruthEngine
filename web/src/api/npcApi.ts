import { get } from './request';

// 类型定义
export interface AIConfig {
    id: number;
    name: string;
    personality_type: string;
    strategy_type: string;
    response_random: number;
    response_interval: number;
    created_at: string | null;
    updated_at: string | null;
}

export interface AIConfigDetail extends AIConfig {
    base_prompt: string;
    response_templates: any;
    behavior_rules: any;
}

export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
}

// 获取所有启用的AI配置
export const getEnabledAIConfigs = async (): Promise<AIConfig[]> => {
    return get('/npc/aiconfigs');
};

// 获取指定AI配置详情
export const getAIConfigDetail = async (configId: number): Promise<AIConfigDetail> => {
    return get(`/npc/aiconfigs/${configId}`);
};
