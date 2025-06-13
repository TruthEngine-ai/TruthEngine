import { useEffect, useRef, useState, useCallback } from 'react';
import { GameWebSocket, type RoomStatus, wsManager } from '../api/websocket';

export interface UseWebSocketReturn {
    ws: GameWebSocket | null;
    isConnected: boolean;
    roomStatus: RoomStatus | null;
    messages: Array<any>;
    connect: () => Promise<void>;
    disconnect: () => void;
    sendChat: (message: string) => void;
    selectCharacter: (characterId: number) => void;
    setReady: (ready: boolean) => void;
    startGame: () => void;
    sendPrivateMessage: (recipientId: number, message: string) => void;
    sendPlayerAction: (action: string) => void;
    updateRoomSettings: (settings: {
        theme?: string;
        difficulty?: string;
        ai_dm_personality?: string;
        duration_mins?: number;
    }) => void;
}

export const useWebSocket = (roomCode: string): UseWebSocketReturn => {
    const [isConnected, setIsConnected] = useState(false);
    const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
    const [messages, setMessages] = useState<Array<any>>([]);
    const wsRef = useRef<GameWebSocket | null>(null);
    const isConnectingRef = useRef(false);

    // 使用useCallback确保connect函数引用稳定
    const connect = useCallback(async (): Promise<void> => {
        if (!wsRef.current || isConnectingRef.current) return;
        
        isConnectingRef.current = true;
        try {
            await wsRef.current.connect();
        } catch (error) {
            console.error('连接失败:', error);
        } finally {
            isConnectingRef.current = false;
        }
    }, []);

    const disconnect = useCallback((): void => {
        if (wsRef.current) {
            wsRef.current.disconnect();
        }
        // 注意：不要在这里设置wsRef.current = null，让组件卸载时处理
    }, []);

    useEffect(() => {
        if (!roomCode || roomCode === 'UNKNOWN') return;

        const ws = wsManager.getConnection(roomCode);
        wsRef.current = ws;

        const handleConnected = () => {
            setIsConnected(true);
            console.log('WebSocket已连接，房间代码:', roomCode);
        };

        const handleDisconnected = () => {
            setIsConnected(false);
            console.log('WebSocket已断开连接');
            // 连接断开时自动尝试重连
            if (!isConnectingRef.current) {
                setTimeout(() => {
                    connect();
                }, 2000);
            }
        };

        const handleRoomStatus = (data: RoomStatus) => {
            console.log('收到房间状态更新:', data);
            setRoomStatus(data);
        };

        const handleChat = (data: any) => {
            setMessages(prev => [...prev, { ...data, messageType: 'chat' }]);
        };

        const handlePrivateMessage = (data: any) => {
            setMessages(prev => [...prev, { ...data, messageType: 'private' }]);
        };

        const handlePlayerAction = (data: any) => {
            setMessages(prev => [...prev, { ...data, messageType: 'action' }]);
        };

        // 添加更多会影响房间状态的事件监听
        const handleCharacterSelected = (data: any) => {
            console.log('角色选择事件:', data);
            // 角色选择可能会影响房间状态，触发状态更新
        };

        const handlePlayerReady = (data: any) => {
            console.log('玩家准备状态变化:', data);
            // 玩家准备状态变化可能会影响房间状态
        };

        const handleAllReady = (data: any) => {
            console.log('所有玩家已准备:', data);
            // 所有玩家准备就绪
        };

        const handleGameStarted = (data: any) => {
            console.log('游戏已开始:', data);
            // 游戏开始事件
        };

        const handleUserJoined = (data: any) => {
            console.log('用户加入房间:', data);
            // 用户加入会影响房间状态
        };

        const handleUserLeft = (data: any) => {
            console.log('用户离开房间:', data);
            // 用户离开会影响房间状态
        };

        const handleRoomSettingsUpdated = (data: any) => {
            console.log('房间设置已更新:', data);
            setMessages(prev => [...prev, { 
                ...data, 
                messageType: 'system',
                message: `${data.updated_by_nickname} 更新了房间设置`
            }]);
        };

        const handleError = (error: any) => {
            console.error('WebSocket错误:', error);
        };

        // 添加事件监听器
        ws.on('connected', handleConnected);
        ws.on('disconnected', handleDisconnected);
        ws.on('room_status', handleRoomStatus);
        ws.on('chat', handleChat);
        ws.on('private_message', handlePrivateMessage);
        ws.on('player_action', handlePlayerAction);
        ws.on('character_selected', handleCharacterSelected);
        ws.on('player_ready', handlePlayerReady);
        ws.on('all_ready', handleAllReady);
        ws.on('game_started', handleGameStarted);
        ws.on('user_joined', handleUserJoined);
        ws.on('user_left', handleUserLeft);
        ws.on('room_settings_updated', handleRoomSettingsUpdated);
        ws.on('error', handleError);

        // 立即尝试连接
        connect();

        // 清理函数
        return () => {
            ws.off('connected', handleConnected);
            ws.off('disconnected', handleDisconnected);
            ws.off('room_status', handleRoomStatus);
            ws.off('chat', handleChat);
            ws.off('private_message', handlePrivateMessage);
            ws.off('player_action', handlePlayerAction);
            ws.off('character_selected', handleCharacterSelected);
            ws.off('player_ready', handlePlayerReady);
            ws.off('all_ready', handleAllReady);
            ws.off('game_started', handleGameStarted);
            ws.off('user_joined', handleUserJoined);
            ws.off('user_left', handleUserLeft);
            ws.off('room_settings_updated', handleRoomSettingsUpdated);
            ws.off('error', handleError);
        };
    }, [roomCode, connect]);

    // 组件卸载时才真正断开连接
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.disconnect();
                wsRef.current = null;
            }
            wsManager.disconnect(roomCode);
        };
    }, [roomCode]);

    const sendChat = (message: string): void => {
        wsRef.current?.sendChat(message);
    };

    const selectCharacter = (characterId: number): void => {
        wsRef.current?.selectCharacter(characterId);
    };

    const setReady = (ready: boolean): void => {
        wsRef.current?.setReady(ready);
    };

    const startGame = (): void => {
        wsRef.current?.startGame();
    };

    const sendPrivateMessage = (recipientId: number, message: string): void => {
        wsRef.current?.sendPrivateMessage(recipientId, message);
    };

    const sendPlayerAction = (action: string): void => {
        wsRef.current?.sendPlayerAction(action);
    };

    const updateRoomSettings = (settings: {
        theme?: string;
        difficulty?: string;
        ai_dm_personality?: string;
        duration_mins?: number;
    }): void => {
        wsRef.current?.updateRoomSettings(settings);
    };

    return {
        ws: wsRef.current,
        isConnected,
        roomStatus,
        messages,
        connect,
        disconnect,
        sendChat,
        selectCharacter,
        setReady,
        startGame,
        sendPrivateMessage,
        sendPlayerAction,
        updateRoomSettings,
    };
};
