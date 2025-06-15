// 消息类型定义
export interface WebSocketMessage {
    type: string;
    data?: any;
    message?: string;
    timestamp?: string;
}

// 故事时间线事件
export interface StoryTimelineEvent {
    id: number;
    event_description: string;
    sys_description: string;
    character_name: string;
    is_public: boolean;
    created_at: string;
}

// 故事时间线
export interface StoryTimeline {
    public: StoryTimelineEvent[];
    private: StoryTimelineEvent[];
}

// 角色目标
export interface CharacterGoal {
    goal_description: string;
    is_mandatory: boolean;
    search_attempts: number;
}

// 游戏阶段
export interface GameStage {
    stage_number: number;
    name: string;
    opening_narrative: string;
    stage_goal: string;
    is_evidence: boolean;
    is_current?: boolean;
    character_goal?: CharacterGoal;
}

// 当前阶段
export interface CurrentStage {
    current_stage: GameStage;
    all_stages: GameStage[];
}

// 线索
export interface Clue {
    id: number;
    name: string;
    description: string;
    image_url: string | null;
    discovery_location: string;
    discovery_stage: string;
    stage_number: number;
    source: string;
    searched_from?: string; // 搜查来源玩家昵称
    is_public_search?: boolean; // 是否为公开搜查
}

// 线索集合
export interface Clues {
    public: Clue[];
    private: Clue[];
    searched: Clue[];
    public_by_stage: Record<string, Clue[]>;
    private_by_stage: Record<string, Clue[]>;
    searched_by_stage: Record<string, Clue[]>;
}

// 投票数据
export interface VoteData {
    vote_id: number;
    vote_type: string;
    title: string;
    description: string;
    options: Array<{
        character_id: number;
        character_name: string;
        vote_count: number;
        voters: string[];
    }>;
    voted_character_id?: number;
    is_active: boolean;
}

// 投票统计信息
export interface VotingInfo {
    vote_counts: Array<{
        user_id: number;
        nickname: string;
        vote_count: number;
    }>;
    vote_details: Array<{
        voter_user_id: number;
        voted_user_id: number;
        voter_nickname: string;
        voted_nickname: string;
        timestamp: string;
    }>;
    total_votes: number;
}

// 可搜查角色
export interface SearchableCharacter {
    user_id: number;
    nickname: string;
    character_name: string;
    character_id: number;
    is_online: boolean;
}

// 可搜查线索
export interface AvailableClue {
    description: string;
    searched_from_character: string;
    id: number;
    name: string;
    discovery_location: string;
    discovery_stage: string;
    stage_number: number;
    owner_character: string;
    owner_user_id: number;
    owner_nickname: string;
}

// 搜查信息
export interface SearchInfo {
    searchable_characters: SearchableCharacter[];
    available_clues: AvailableClue[];
    owned_clues: AvailableClue[];
    available_clues_by_stage: Record<string, AvailableClue[]>;
    owned_clues_by_stage: Record<string, AvailableClue[]>;
    search_attempts_left: number;
}

// 房间状态数据类型
export interface RoomStatus {
    room: {
        code: string;
        status: string;
        max_players: number;
        host_user_id: number;
        ai_dm_personality: string;
        game_settings?: {
            theme?: string;
            difficulty?: string;
            duration_mins?: number;
            ai_dm_personality?: string;
        };
        started_at?: string;
        finished_at?: string | null;
    };
    script?: {
        id: number;
        title: string;
        description: string;
        player_count_min: number;
        player_count_max: number;
        duration_mins: number;
        difficulty: string;
        tags: string[];
        overview: string;
        total_stages: number;
    };
    players: Array<{
        user_id: number;
        nickname: string;
        avatar_url?: string | null;
        character_name?: string;
        character_id?: number;
        is_ready: boolean;
        is_host: boolean;
        is_online: boolean;
        is_alive?: boolean;
    }>;
    characters?: Array<{
        player_nickname: string;
        character_name: string;
        character_id: number;
        gender: string;
        public_info: string;
        is_alive: boolean;
        is_self: boolean;
        backstory?: string;
        is_murderer?: boolean;
    }>;
    story_timeline?: StoryTimeline;
    current_stage?: CurrentStage;
    clues?: Clues;
    vote_data?: VoteData;
    voting_info?: VotingInfo;
    search_info?: SearchInfo;
    solution?:{
        answer:string;
        reasoning:string;
    }
}

export type EventListener = (data: any) => void;

export class GameWebSocket {
    private ws: WebSocket | null = null;
    private roomCode: string;
    private token: string;
    private listeners: Map<string, EventListener[]> = new Map();
    private reconnectTimer: number | null = null;
    private heartbeatTimer: number | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10; // 增加重连次数
    private reconnectDelay = 1000; // 减少重连延迟
    private isManualClose = false;
    private connectionPromise: Promise<void> | null = null;

    constructor(roomCode: string) {
        this.roomCode = roomCode;
        this.token = localStorage.getItem('token') || '';
    }

    // 连接WebSocket
    async connect(): Promise<void> {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        // 避免重复连接
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        const wsUrl = `ws://139.224.192.180:8000/ws/${this.roomCode}?token=${this.token}`;

        this.connectionPromise = new Promise((resolve, reject) => {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket连接成功');
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.emit('connected', null);
                this.connectionPromise = null;
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    // 处理心跳响应
                    if (message.type === 'pong') {
                        return;
                    }
                    this.handleMessage(message);
                } catch (error) {
                    console.error('解析WebSocket消息失败:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket连接关闭:', event.code, event.reason);
                this.stopHeartbeat();
                this.connectionPromise = null;
                this.emit('disconnected', { code: event.code, reason: event.reason });

                // 只要不是手动关闭，就尝试重连
                if (!this.isManualClose) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
                this.connectionPromise = null;
                this.emit('error', error);
                reject(error);
            };
        });

        return this.connectionPromise;
    }

    // 断开连接
    disconnect(): void {
        this.isManualClose = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connectionPromise = null;
    }

    // 发送消息
    send(type: string, data?: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = { type, data };
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket未连接，无法发送消息');
        }
    }

    // 发送聊天消息
    sendChat(message: string): void {
        this.send('chat', { message });
    }

    // 选择角色
    selectCharacter(characterId: number): void {
        this.send('select_character', { character_id: characterId });
    }

    // 设置准备状态
    setReady(ready: boolean): void {
        this.send('ready', { ready });
    }

    // 开始游戏
    startGame(): void {
        this.send('start_game');
    }

    // 发送私聊消息
    sendPrivateMessage(recipientId: number, message: string): void {
        this.send('private_message', { recipient_id: recipientId, message });
    }

    // 发送玩家行动
    sendPlayerAction(action: string): void {
        this.send('player_action', { action });
    }

    // 发送投票
    sendVote(votedUserId: number): void {
        this.send('game_vote', { voted_user_id: votedUserId });
    }

    // 开始投票
    startVote(): void {
        this.send('start_vote');
    }

    // 结束投票
    endVote(): void {
        this.send('end_vote');
    }

    // 更新房间设置
    updateRoomSettings(settings: {
        theme?: string;
        difficulty?: string;
        ai_dm_personality?: string;
        duration_mins?: number;
    }): void {
        this.send('update_room_settings', settings);
    }

    // 生成剧本
    generateScript(): void {
        this.send('generate_script', null);
    }

    // 进入下一幕
    nextStage(): void {
        this.send('next_stage', null);
    }
    searchBegin(): void {
        this.send('search_begin', null);
    }
    searchEnd(): void {
        this.send('search_end', null);
    }
    searchScriptClueData(settings: {
        clue_id?: number;
    }): void {
        this.send('search_script_clue', settings);
    }
    // 添加事件监听器
    on(event: string, listener: EventListener): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(listener);
    }

    // 移除事件监听器
    off(event: string, listener: EventListener): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(listener);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    // 移除所有事件监听器
    removeAllListeners(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    // 触发事件
    private emit(event: string, data: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(listener => listener(data));
        }
    }

    // 处理接收到的消息
    private handleMessage(message: WebSocketMessage): void {
        const { type, data } = message;
        this.emit(type, data);

    }

    // 安排重连
    private scheduleReconnect(): void {
        if (this.reconnectTimer || this.isManualClose) {
            return;
        }

        this.reconnectAttempts++;
        console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000); // 最大30秒

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.isManualClose && this.reconnectAttempts <= this.maxReconnectAttempts) {
                this.connect().catch(() => {
                    // 重连失败，继续下次重连
                    this.scheduleReconnect();
                });
            }
        }, delay);
    }

    // 开始心跳检测
    private startHeartbeat(): void {
        this.stopHeartbeat(); // 先停止之前的心跳
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 10000); // 改为10秒发送一次心跳，更频繁
    }

    // 停止心跳检测
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // 获取连接状态
    get readyState(): number {
        return this.ws ? this.ws.readyState : WebSocket.CLOSED;
    }

    // 是否已连接
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// WebSocket管理器
class WebSocketManager {
    private connections: Map<string, GameWebSocket> = new Map();

    // 获取或创建WebSocket连接
    getConnection(roomCode: string): GameWebSocket {
        if (!this.connections.has(roomCode)) {
            this.connections.set(roomCode, new GameWebSocket(roomCode));
        }
        return this.connections.get(roomCode)!;
    }

    // 断开指定房间的连接
    disconnect(roomCode: string): void {
        const connection = this.connections.get(roomCode);
        if (connection) {
            connection.disconnect();
            this.connections.delete(roomCode);
        }
    }

    // 断开所有连接
    disconnectAll(): void {
        this.connections.forEach(connection => connection.disconnect());
        this.connections.clear();
    }
}

// 导出单例实例
export const wsManager = new WebSocketManager();
