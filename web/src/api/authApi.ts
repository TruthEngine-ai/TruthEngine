import { post, get } from './request';

// 类型定义
export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    nickname: string;
}

export interface CurrentRoom {
    room_code: string;
    status: string;
    is_host: boolean;
}

export interface UserInfo {
    id: number;
    username: string;
    email: string;
    nickname: string;
    disabled: boolean;
    current_room: CurrentRoom | null;
}

export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

// Token管理函数
export const setToken = (token: string): void => {
    localStorage.setItem('token', token);
};

export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

export const removeToken = (): void => {
    localStorage.removeItem('token');
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const result = await post('/auth/token', formData);
    
    if (result.access_token) {
        setToken(result.access_token);
        return result;
    } else {
        throw new Error(result.msg || '登录失败');
    }
};

// 注册API
export const register = async (userData: RegisterRequest): Promise<ApiResponse<UserInfo>> => {
    return post('/auth/register', userData);
};

// 获取当前用户信息API
export const getCurrentUser = async (): Promise<ApiResponse<UserInfo>> => {
    return get('/auth/me');
};

// 退出登录
export const logout = (): void => {
    removeToken();
};

export const checkTokenValid = async (): Promise<boolean> => {
    try {
        await getCurrentUser();
        return true;
    } catch {
        removeToken();
        return false;
    }
};
