import React from 'react';
import { Card, Typography, Button, Tag, theme, message } from 'antd';
import {
    SettingOutlined,
    CopyOutlined,
    PlayCircleOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import type { Player } from './types';

const { Text } = Typography;

interface RoomInfoCardProps {
    room: {
        code: string;
        status: string;
        ai_dm_personality: string;
        max_players: number;
    };
    players: Player[];
    isHost: boolean;
    isCurrentUserReady: boolean;
    canGenerateScript: boolean;
    isConnected: boolean;
    isGameSettingsComplete: boolean;
    onToggleReady: () => void;
    onGenerateScript: () => void;
    onLeaveRoom: () => void;
}

const RoomInfoCard: React.FC<RoomInfoCardProps> = ({
    room,
    players,
    isHost,
    isCurrentUserReady,
    canGenerateScript,
    isConnected,
    isGameSettingsComplete,
    onToggleReady,
    onGenerateScript,
    onLeaveRoom
}) => {
    const { token } = theme.useToken();

    const handleCopyInviteLink = () => {
        const inviteLink = `${window.location.origin}/game?room_code=${room.code}`;
        navigator.clipboard.writeText(inviteLink).then(() => {
            message.success('邀请链接已复制到剪贴板');
        }).catch(() => {
            message.error('复制失败，请手动复制');
        });
    };

    return (
        <Card
            title={
                <span style={{ fontSize: '18px', fontWeight: 600 }}>
                    <SettingOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                    房间信息
                </span>
            }
            style={{
                height: 'fit-content',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
        >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                    background: token.colorBgLayout,
                    borderRadius: 12,
                    padding: '20px',
                    marginBottom: 20,
                    border: `1px solid ${token.colorBorder}`
                }}>
                    <Text style={{ fontSize: '14px', color: token.colorTextSecondary, display: 'block' }}>
                        房间代码
                    </Text>
                    <Text
                        strong
                        style={{
                            color: token.colorPrimary,
                            fontSize: '24px',
                            fontFamily: 'monospace',
                            letterSpacing: '2px',
                            display: 'block',
                            marginTop: '8px'
                        }}
                    >
                        {room?.code}
                    </Text>
                    <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={handleCopyInviteLink}
                        style={{ marginTop: 8, padding: 0 }}
                    >
                        复制邀请链接
                    </Button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    background: token.colorBgLayout,
                    borderRadius: 8,
                    padding: '16px',
                    border: `1px solid ${token.colorBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Text strong>房主</Text>
                    <Text>{players.find(p => p.is_host)?.nickname || '未知'}</Text>
                </div>
                <div style={{
                    background: token.colorBgLayout,
                    borderRadius: 8,
                    padding: '16px',
                    border: `1px solid ${token.colorBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Text strong>AI DM性格</Text>
                    <Tag color="blue">{room?.ai_dm_personality}</Tag>
                </div>
                <div style={{
                    background: token.colorBgLayout,
                    borderRadius: 8,
                    padding: '16px',
                    border: `1px solid ${token.colorBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Text strong>房间状态</Text>
                    <Tag color={room?.status === 'waiting' ? 'green' : 'orange'}>
                        {room?.status === 'waiting' ? '等待中' : room?.status}
                    </Tag>
                </div>
                <div style={{
                    background: token.colorBgLayout,
                    borderRadius: 8,
                    padding: '16px',
                    border: `1px solid ${token.colorBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Text strong>玩家数量</Text>
                    <Text style={{ fontSize: '16px', fontWeight: 600 }}>
                        {players.length}/{room.max_players}
                    </Text>
                </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 准备按钮 - 非房主显示 */}
                {!isHost && (
                    <Button
                        type={isCurrentUserReady ? "default" : "primary"}
                        size="large"
                        onClick={onToggleReady}
                        disabled={!isConnected}
                        style={{
                            borderRadius: 8,
                            fontWeight: 600,
                            backgroundColor: isCurrentUserReady ? token.colorSuccess : undefined,
                            borderColor: isCurrentUserReady ? token.colorSuccess : undefined,
                            color: isCurrentUserReady ? '#fff' : undefined,
                        }}
                    >
                        {isCurrentUserReady ? '已准备' : '准备'}
                    </Button>
                )}

                {/* 生成剧本按钮 - 只有房主可见 */}
                {isHost && (
                    <>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlayCircleOutlined />}
                            disabled={!canGenerateScript}
                            onClick={onGenerateScript}
                            style={{
                                borderRadius: 8,
                                fontWeight: 600,
                                boxShadow: canGenerateScript ? '0 4px 12px rgba(22, 119, 255, 0.3)' : 'none',
                            }}
                        >
                            生成剧本
                        </Button>
                        {!isGameSettingsComplete && (
                            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                                请先完成游戏设置
                            </Text>
                        )}
                    </>
                )}

                {/* 房主的准备状态显示 */}
                {isHost && (
                    <div style={{
                        background: token.colorBgLayout,
                        borderRadius: 8,
                        padding: '12px',
                        border: `1px solid ${token.colorBorder}`,
                        textAlign: 'center'
                    }}>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                            房主状态: {isCurrentUserReady ?
                                <Text style={{ color: token.colorSuccess }}>已准备</Text> :
                                <Text style={{ color: token.colorWarning }}>未准备</Text>
                            }
                        </Text>
                        <br />
                        <Button
                            type="link"
                            size="small"
                            onClick={onToggleReady}
                            style={{ padding: 0, height: 'auto', marginTop: '4px' }}
                        >
                            {isCurrentUserReady ? '取消准备' : '设为准备'}
                        </Button>
                    </div>
                )}

                <Button
                    size="large"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={onLeaveRoom}
                    style={{ borderRadius: 8 }}
                >
                    离开房间
                </Button>
            </div>
        </Card>
    );
};

export default RoomInfoCard;
