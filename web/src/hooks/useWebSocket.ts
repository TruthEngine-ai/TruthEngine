import { useEffect, useRef, useState, useCallback } from 'react';
import { GameWebSocket, type RoomStatus, wsManager } from '../api/websocket';

export interface UseWebSocketReturn {
    ws: GameWebSocket | null;
    isConnected: boolean;
    roomStatus: RoomStatus | null;
    messages: Array<DisplayedMessage>; // Updated type
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
    generateScript: (settings: {
        theme?: string;
        difficulty?: string;
        ai_dm_personality?: string;
        duration_mins?: number;
    }) => void;
    nextStage: () => void;
    sendVote: (votedUserId: number) => void;
    startVote: () => void;
    endVote: () => void;
    searchBegin: () => void;
    searchEnd: () => void;
    searchScriptClueData: (settings: {
        clue_id?: number;
    }) => void;
}

export interface MessageContent {
    message?: string; // Message can be optional if 'action' field is primary
    datetime: string;
    send_id?: number | null;
    send_nickname?: string;
    recipient_id?: number | null;
    recipient_nickname?: string;
    action?: string; // For player_action type messages
    [key: string]: any; // Allow other properties that might come with the message data
}

export interface DisplayedMessage extends MessageContent {
    messageType: string;
}

export const useWebSocket = (roomCode: string): UseWebSocketReturn => {
    const [isConnected, setIsConnected] = useState(false);
    const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
    const [messages, setMessages] = useState<Array<DisplayedMessage>>([]);
    const wsRef = useRef<GameWebSocket | null>(null);
    const isConnectingRef = useRef(false);
    const autoConnectEnabled = useRef(false);

    const connect = useCallback(async (): Promise<void> => {
        if (!wsRef.current || isConnectingRef.current) return;

        isConnectingRef.current = true;
        autoConnectEnabled.current = true;
        try {
            await wsRef.current.connect();
        } catch (error) {
            console.error('连接失败:', error);
        } finally {
            isConnectingRef.current = false;
        }
    }, []);

    const disconnect = useCallback((): void => {
        autoConnectEnabled.current = false; // 手动断开时禁用自动连接
        if (wsRef.current) {
            wsRef.current.disconnect();
        }
    }, []);

    const processMessageEvent = useCallback((eventName: string, data: any) => {
        console.log(`处理事件: ${eventName}`, data);
        let displayedMessage: DisplayedMessage;
        if (eventName === 'error') {
            displayedMessage = {
                message: `错误: ${data.message || String(data)}`,
                datetime: new Date().toISOString(),
                send_nickname: '系统',
                messageType: eventName
            };
        } else if (eventName === 'player_action') {
            const actionData = data as MessageContent; // Assuming data has action and other MessageContent fields
            displayedMessage = {
                ...actionData,
                message: actionData.action, // Use 'action' field as 'message'
                messageType: eventName
            };
        } else {
            // For other message types, assume data is MessageContent-like
            const messageData = data as MessageContent;
            displayedMessage = {
                ...messageData,
                messageType: eventName
            };
        }

        if (!displayedMessage.datetime) {
            displayedMessage.datetime = new Date().toISOString();
        }
        setMessages(prev => [...prev, displayedMessage]);
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
            if (autoConnectEnabled.current && !isConnectingRef.current) {
                setTimeout(() => {
                    if (autoConnectEnabled.current) {
                        connect();
                    }
                }, 2000);
            }
        };

        const handleRoomStatus = (data: RoomStatus) => {
            console.log('收到房间状态更新:', data);
            setRoomStatus(data);
        };

        // 事件监听器
        ws.on('connected', handleConnected);
        ws.on('disconnected', handleDisconnected);
        ws.on('room_status', handleRoomStatus);

        const messageEventNames = [
            // 连接相关
            'disconnected', 'error',
            // 房间状态相关
            'room_settings_updated', 'player_joined',
            'player_left', 'room_dissolved',
            // 聊天相关
            'chat', 'private_message',
            // 角色选择相关
            'character_selected', 'character_deselected',
            // 准备状态相关
            'player_ready', 'all_ready',
            // 游戏流程相关
            'game_ended', 'stage_changed',
            // 玩家行动相关
            'player_action', 'action_result',
            // 投票相关
            'game_vote', 'start_vote', 'end_vote', 'vote_started', 'vote_updated', 'vote_ended',
            // 线索相关
            'clue_discovered', 'clue_shared',
            // AI DM相关
            'ai_message', 'ai_prompt',
            // 游戏状态相关
            'game_status',
            // 剧本生成相关
            'script_generation_started', 'script_generation_completed', 'script_generation_failed',
            // 下一幕相关
            'next_stage', 'stage_updated'
        ];
        const eventHandlers: { [key: string]: (data: any) => void } = {};
        messageEventNames.forEach(eventName => {
            const handler = (data: any) => processMessageEvent(eventName, data);
            eventHandlers[eventName] = handler;
            ws.on(eventName, handler);
        });

        // 清理函数
        return () => {
            ws.off('connected', handleConnected);
            ws.off('disconnected', handleDisconnected);
            ws.off('room_status', handleRoomStatus);
            messageEventNames.forEach(eventName => {
                if (eventHandlers[eventName]) {
                    ws.off(eventName, eventHandlers[eventName]);
                }
            });
        };
    }, [roomCode, processMessageEvent, connect]);

    // 组件卸载时才真正断开连接
    useEffect(() => {
        return () => {
            autoConnectEnabled.current = false;
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

    const generateScript = (): void => {
        wsRef.current?.generateScript();
    };

    const nextStage = (): void => {
        wsRef.current?.nextStage();
    };

    const sendVote = (votedUserId: number): void => {
        wsRef.current?.sendVote(votedUserId);
    };

    const startVote = (): void => {
        wsRef.current?.startVote();
    };

    const endVote = (): void => {
        wsRef.current?.endVote();
    };

    const searchBegin = (): void => {
        wsRef.current?.searchBegin();
    };

    const searchEnd = (): void => {
        wsRef.current?.searchEnd();
    };

    const searchScriptClueData = (settings: {
        clue_id?: number;
    }): void => {
        wsRef.current?.searchScriptClueData(settings);
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
        generateScript,
        nextStage,
        sendVote,
        startVote,
        endVote,
        searchBegin,
        searchEnd,
        searchScriptClueData,
    };
};

export type { RoomStatus };
