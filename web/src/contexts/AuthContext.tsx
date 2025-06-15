import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import {
    login as apiLogin,
    logout as apiLogout,
    getCurrentUser,
    checkTokenValid,
    isAuthenticated,
    type LoginRequest,
    type UserInfo,
    type LoginResponse
} from '../api/authApi';

interface AuthContextType {
    user: UserInfo | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (credentials: LoginRequest) => Promise<LoginResponse>;
    logout: () => void;
    refreshUserInfo: () => Promise<void>;
    checkAuth: () => Promise<boolean>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
interface AuthProviderProps {
    children: ReactNode;
}
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // 新增：防止重复刷新

    const fetchUserInfo = async (): Promise<void> => {
        try {
            const response = await getCurrentUser();
            if (response.code === 200) {
                setUser(response.data);
                setIsLoggedIn(true);
            } else {
                setUser(null);
                setIsLoggedIn(false);
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            setUser(null);
            setIsLoggedIn(false);
        }
    };

    // 检查认证状态
    const checkAuth = async (): Promise<boolean> => {
        if (!isAuthenticated()) {
            setUser(null);
            setIsLoggedIn(false);
            return false;
        }

        try {
            const isValid = await checkTokenValid();
            if (isValid) {
                await fetchUserInfo();
                return true;
            } else {
                setUser(null);
                setIsLoggedIn(false);
                return false;
            }
        } catch (error) {
            console.error('Token验证失败:', error);
            setUser(null);
            setIsLoggedIn(false);
            return false;
        }
    };

    // 登录
    const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
        try {
            setIsLoading(true);
            const response = await apiLogin(credentials);

            // 登录成功后获取用户信息
            await fetchUserInfo();

            return response;
        } catch (error) {
            setUser(null);
            setIsLoggedIn(false);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // 退出登录
    const logout = (): void => {
        apiLogout();
        setUser(null);
        setIsLoggedIn(false);
    };

    // 刷新用户信息
    const refreshUserInfo = useCallback(async (): Promise<void> => {
        if (!isAuthenticated() || isRefreshing) {
            return;
        }

        try {
            setIsRefreshing(true);
            setIsLoading(true);
            await fetchUserInfo();
        } catch (error) {
            console.error('刷新用户信息失败:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [isRefreshing]);

    useEffect(() => {
        console.log("AuthContext init");
        const initAuth = async () => {
            setIsLoading(true);
            await checkAuth();
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isLoggedIn,
        login,
        logout,
        refreshUserInfo,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
