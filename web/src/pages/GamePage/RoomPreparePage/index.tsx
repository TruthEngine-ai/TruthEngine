import { Card, Typography, theme, message, Form, Row, Col } from 'antd';
import React, { useEffect, useState } from 'react';
import { leaveRoom } from '../../../api/roomApi';
import ScriptGeneratingMask from '../../ScriptGeneratingMask';
import { useAuth } from '../../../contexts/AuthContext';
import RoomInfoCard from './RoomInfoCard';
import GameSettingsCard from './GameSettingsCard';
import PlayersListCard from './PlayersListCard';
import {
    getInitialFormValues,
    buildSettingsUpdate,
    isGameSettingsComplete,
    generateEmptySlots,
    convertPlayersToSlots
} from './utils';
import type { RoomPreparePageProps } from './types';

const { Text } = Typography;

const RoomPreparePage: React.FC<RoomPreparePageProps> = ({
    roomCode,
    isConnected = false,
    roomStatus = null,
    setReady = () => { },
    updateRoomSettings = () => { },
    generateScript = () => { }
}) => {
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const [generating, setGenerating] = useState(false);
    const { user, refreshUserInfo } = useAuth();

    const handleLeaveRoom = async () => {
        try {
            const response = await leaveRoom(roomCode);
            if (response.code === 200) {
                message.success('已退出房间');
                window.location.href = '/create-room';
                await refreshUserInfo();
            } else {
                message.error(response.msg || '退出房间失败');
            }
        } catch (error) {
            console.error('退出房间失败:', error);
            message.error('退出房间失败，请重试');
        }
    };

    const hostPlayer = roomStatus?.players.find(p => p.is_host);
    const currentUserId = user?.id;
    const isHost = hostPlayer && currentUserId && hostPlayer.user_id === currentUserId;

    const currentPlayer = roomStatus?.players.find(p => p.user_id === currentUserId);
    const isCurrentUserReady = currentPlayer?.is_ready || false;

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
        console.log('切换准备状态:', !isCurrentUserReady);
        setReady(!isCurrentUserReady);
    };

    // 处理生成剧本
    const handleGenerateScript = () => {
        const players = roomStatus?.players || [];
        if (players.length < 2) {
            message.warning('至少需要2名玩家才能生成剧本');
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
        console.log('开始生成剧本，当前房间状态:', roomStatus?.room.status);
        generateScript({
            theme: gameSettings?.theme || '',
            difficulty: gameSettings?.difficulty || '',
            ai_dm_personality: gameSettings?.ai_dm_personality || roomStatus?.room?.ai_dm_personality || '',
            duration_mins: gameSettings?.duration_mins || 60
        });
    };

    useEffect(() => {
        if (roomStatus) {
            console.log('房间状态已更新，重新渲染UI:', {
                roomCode: roomStatus.room.code,
                status: roomStatus.room.status,
                playersCount: roomStatus.players.length,
                script: roomStatus.script?.title
            });

            // 当收到剧本生成完成或失败的消息时，关闭遮罩
            if (roomStatus.script || roomStatus.room.status === 'script_generated') {
                setGenerating(false);
            }
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
                        {isConnected ? '正在加载房间信息...' : '正在连接房间...'}
                    </Text>
                </Card>
            </div>
        );
    }

    const { room, players } = roomStatus;
    const allSlots = [
        ...convertPlayersToSlots(players),
        ...generateEmptySlots(players, room.max_players)
    ];

    // 检查是否可以生成剧本
    const allPlayersReady = players.length > 0 && players.every(player => player.is_ready);
    const gameSettingsComplete = isGameSettingsComplete(roomStatus?.room?.game_settings);
    const canGenerateScript = isConnected && room.status === '等待中' && players.length >= 2 && allPlayersReady;

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
                    <Row gutter={[20, 20]} style={{ flex: 1 }}>
                        <Col xs={24} lg={8}>
                            <RoomInfoCard
                                room={room}
                                players={players}
                                isHost={!!isHost}
                                isCurrentUserReady={isCurrentUserReady}
                                canGenerateScript={canGenerateScript}
                                isConnected={isConnected}
                                isGameSettingsComplete={gameSettingsComplete}
                                onToggleReady={handleToggleReady}
                                onGenerateScript={handleGenerateScript}
                                onLeaveRoom={handleLeaveRoom}
                            />
                        </Col>
                        <Col xs={24} lg={8}>
                            <GameSettingsCard
                                form={form}
                                isHost={!!isHost}
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
