import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
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
    const navigate = useNavigate();

    // 检查并处理房间跳转
    const checkAndNavigateToRoom = (userData: UserInfo) => {
        if (userData?.current_room?.room_code) {
            navigate(`/app/game/ready?room_code=${userData.current_room.room_code}`);
        }
    };

    const fetchUserInfo = async (): Promise<void> => {
        try {
            const response = await getCurrentUser();
            if (response.code === 200) {
                setUser(response.data);
                setIsLoggedIn(true);
                // 获取用户信息后检查房间状态
                checkAndNavigateToRoom(response.data);
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
    const refreshUserInfo = async (): Promise<void> => {
        if (!isAuthenticated()) {
            return;
        }
        
        try {
            setIsLoading(true);
            await fetchUserInfo();
        } catch (error) {
            console.error('刷新用户信息失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 初始化时检查认证状态
    useEffect(() => {
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

// Hook for using auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// 高阶组件：需要认证的路由保护
export const withAuth = <P extends object>(
    WrappedComponent: React.ComponentType<P>
): React.FC<P> => {
    return (props: P) => {
        const { isLoggedIn, isLoading } = useAuth();

        if (isLoading) {
            return <div>加载中...</div>;
        }

        if (!isLoggedIn) {
            return <div>请先登录</div>;
        }

        return <WrappedComponent {...props} />;
    };
};

// 角色权限检查组件
interface PermissionGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    requireAuth?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    fallback = <div>无权限访问</div>,
    requireAuth = true,
}) => {
    const { isLoggedIn, isLoading, user } = useAuth();

    if (isLoading) {
        return <div>加载中...</div>;
    }

    if (requireAuth && !isLoggedIn) {
        return fallback;
    }

    // 如果用户被禁用，显示fallback
    if (user?.disabled) {
        return fallback;
    }

    return <>{children}</>;
};

export default AuthContext;
