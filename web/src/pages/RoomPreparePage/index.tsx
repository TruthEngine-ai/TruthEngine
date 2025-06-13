import { Card, Typography, theme, message, Form, Row, Col } from 'antd';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useWebSocket } from '../../hooks/useWebSocket';
import { leaveRoom, joinRoom } from '../../api/roomApi';
import ScriptGeneratingMask from '../ScriptGeneratingMask';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../api/authApi';
import RoomInfoCard from './RoomInfoCard';
import GameSettingsCard from './GameSettingsCard';
import PlayersListCard from './PlayersListCard';
import {
    getInitialFormValues,
    buildSettingsUpdate,
    isGameSettingsComplete,
    generateEmptySlots,
    convertPlayersToSlots} from './utils';
import type { RoomPreparePageProps } from './types';

const { Text } = Typography;

const RoomPreparePage: React.FC<RoomPreparePageProps> = () => {
    const { token } = theme.useToken();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomCode = searchParams.get('room_code') || 'UNKNOWN';
    const [form] = Form.useForm();
    const [generating, setGenerating] = useState(false);
    const [hasCheckedRoom, setHasCheckedRoom] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [checkingRoom, setCheckingRoom] = useState(false);
    const { user, refreshUserInfo } = useAuth();

    const {
        isConnected,
        roomStatus,
        connect,
        startGame,
        setReady,
        updateRoomSettings
    } = useWebSocket(roomCode);

    // 检查当前用户是否为房主
    const hostPlayer = roomStatus?.players.find(p => p.is_host);
    const currentUserId = user?.id;
    const isHost = hostPlayer && currentUserId && hostPlayer.user_id === currentUserId;

    // 获取当前用户的玩家信息
    const currentPlayer = roomStatus?.players.find(p => p.user_id === currentUserId);
    const isCurrentUserReady = currentPlayer?.is_ready || false;

    // 检查并加入房间的函数
    const checkAndJoinRoom = async () => {
        if (roomCode === 'UNKNOWN' || hasCheckedRoom || checkingRoom) {
            return;
        }

        setCheckingRoom(true);
        setHasCheckedRoom(true);

        try {
            let currentUser = user;
            if (!currentUser) {
                await refreshUserInfo();
                const response = await getCurrentUser();
                if (response.code === 200) {
                    currentUser = response.data;
                } else {
                    message.error('获取用户信息失败');
                    navigate('/rooms');
                    return;
                }
            }

            if (!currentUser?.current_room) {
                try {
                    const response = await joinRoom({ room_code: roomCode });
                    if (response.code === 200) {
                        message.success('成功加入房间');
                    } else {
                        message.error(response.msg || '加入房间失败');
                        navigate('/rooms');
                        return;
                    }
                } catch (error) {
                    console.error('加入房间失败:', error);
                    message.error('加入房间失败，请重试');
                    navigate('/rooms');
                    return;
                }
            } else if (currentUser.current_room.room_code !== roomCode) {
                message.warning('您已在其他房间中，请先退出当前房间');
                navigate(`/room-prepare?room_code=${currentUser.current_room.room_code}`);
                return;
            }

            connect().catch(error => {
                message.error('连接房间失败，请检查网络连接');
                console.error('WebSocket连接失败:', error);
            });
        } catch (error) {
            console.error('检查房间状态失败:', error);
            message.error('检查房间状态失败，请重试');
            setTimeout(() => {
                if (retryCount < 3) {
                    setRetryCount(prev => prev + 1);
                    setHasCheckedRoom(false);
                    setCheckingRoom(false);
                } else {
                    message.error('多次尝试失败，请重新进入房间');
                    navigate('/rooms');
                }
            }, 5000);
            return;
        } finally {
            setCheckingRoom(false);
        }
    };

    // 处理房间设置更新
    const handleSettingsChange = (changedFields: any) => {
        if (!isHost || !isConnected) return;

        const settingsUpdate = buildSettingsUpdate(changedFields);

        if (Object.keys(settingsUpdate).length > 0) {
            console.log('发送房间设置更新:', settingsUpdate);
            updateRoomSettings(settingsUpdate);
        }
    };

    // 处理准备状态切换
    const handleToggleReady = () => {
        setReady(!isCurrentUserReady);
    };

    // 处理开始游戏
    const handleStartGame = () => {
        const players = roomStatus?.players || [];
        if (players.length < 2) {
            message.warning('至少需要2名玩家才能开始游戏');
            return;
        }
        if (!players.every(player => player.is_ready)) {
            message.warning('请等待所有玩家准备就绪');
            return;
        }
        
        const gameSettings = roomStatus?.room?.game_settings;
        if (!isGameSettingsComplete(gameSettings)) {
            message.warning('请先完成游戏设置（背景、时长、难度、AI DM性格）');
            return;
        }
        
        console.log('开始游戏，当前房间状态:', roomStatus?.room.status);
        startGame();
    };

    // 处理离开房间
    const handleLeaveRoom = async () => {
        try {
            const response = await leaveRoom(roomCode);
            if (response.code === 200) {
                message.success('已退出房间');
                navigate('/rooms');
            } else {
                message.error(response.msg || '退出房间失败');
            }
        } catch (error) {
            console.error('退出房间失败:', error);
            message.error('退出房间失败，请重试');
        }
    };

   

    // Effects
    useEffect(() => {
        if (roomCode !== 'UNKNOWN' && !hasCheckedRoom) {
            checkAndJoinRoom();
        }
    }, [roomCode, hasCheckedRoom]);

    useEffect(() => {
        if (roomStatus) {
            console.log('房间状态已更新，重新渲染UI:', {
                roomCode: roomStatus.room.code,
                status: roomStatus.room.status,
                playersCount: roomStatus.players.length,
                script: roomStatus.script?.title
            });
        }
    }, [roomStatus]);

    useEffect(() => {
        if (roomStatus) {
            form.setFieldsValue(getInitialFormValues(
                roomStatus.room.game_settings,
                roomStatus.room.ai_dm_personality
            ));
        }
    }, [roomStatus, form]);

    if (!roomStatus) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 50%, ${token.colorPrimaryBg} 100%)`,
            }}>
                <Card style={{ textAlign: 'center', padding: '40px' }}>
                    <Text style={{ fontSize: '18px' }}>
                        {checkingRoom ? '正在检查房间状态...' :
                            isConnected ? '正在加载房间信息...' : '正在连接房间...'}
                    </Text>
                    {retryCount > 0 && (
                        <div style={{ marginTop: '10px' }}>
                            <Text type="secondary">重试次数: {retryCount}/3</Text>
                        </div>
                    )}
                </Card>
            </div>
        );
    }

    const { room, players } = roomStatus;
    const allSlots = [
        ...convertPlayersToSlots(players),
        ...generateEmptySlots(players, room.max_players)
    ];

    // 检查游戏是否可以开始
    const allPlayersReady = players.length > 0 && players.every(player => player.is_ready);
    const gameSettingsComplete = isGameSettingsComplete(roomStatus?.room?.game_settings);
    const canStartGame = isConnected && room.status === 'waiting' && players.length >= 2 && allPlayersReady && gameSettingsComplete;

    return (
        <>
            <ScriptGeneratingMask visible={generating} />
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start'
                }}
            >
                <div style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    {!isConnected && (
                        <Card style={{ background: token.colorWarningBg, border: `1px solid ${token.colorWarning}` }}>
                            <Text type="warning">连接已断开，正在尝试重新连接...</Text>
                        </Card>
                    )}
                    <Row gutter={[20, 20]} style={{ flex: 1 }}>
                        <Col xs={24} lg={8}>
                            <RoomInfoCard
                                room={room}
                                players={players}
                                isHost={!!isHost}
                                isCurrentUserReady={isCurrentUserReady}
                                canStartGame={canStartGame}
                                isConnected={isConnected}
                                isGameSettingsComplete={gameSettingsComplete}
                                onToggleReady={handleToggleReady}
                                onStartGame={handleStartGame}
                                onLeaveRoom={handleLeaveRoom}
                            />
                        </Col>
                        <Col xs={24} lg={8}>
                            <GameSettingsCard
                                form={form}
                                isHost={!!isHost}
                                generating={generating}
                                initialValues={getInitialFormValues(
                                    roomStatus.room.game_settings,
                                    roomStatus.room.ai_dm_personality
                                )}
                                onFieldsChange={handleSettingsChange}
                            />
                        </Col>
                        <Col xs={24} lg={8}>
                            <PlayersListCard 
                                allSlots={allSlots} 
                                maxPlayers={room.max_players}
                            />
                        </Col>
                    </Row>
                </div>
            </div>
        </>
    );
};

export default RoomPreparePage;
