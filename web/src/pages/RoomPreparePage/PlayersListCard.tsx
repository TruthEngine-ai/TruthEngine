import React from 'react';
import { Card, Typography, Avatar, Tag, theme } from 'antd';
import { TeamOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
import type { PlayerSlot } from './types';

const { Text } = Typography;

interface PlayersListCardProps {
    allSlots: PlayerSlot[];
    maxPlayers?: number;
}

const PlayersListCard: React.FC<PlayersListCardProps> = ({ allSlots, maxPlayers = 6 }) => {
    const { token } = theme.useToken();

    // 根据最大玩家数量决定列数
    const getGridColumns = (maxPlayers: number) => {
        if (maxPlayers <= 4) return 2;
        if (maxPlayers <= 6) return 2;
        return 3; // 8人或更多时使用3列
    };

    return (
        <Card
            title={
                <span style={{ fontSize: '18px', fontWeight: 600 }}>
                    <TeamOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                    玩家列表 ({allSlots.filter(slot => !slot.is_empty).length}/{maxPlayers})
                </span>
            }
            style={{
                height: 'fit-content',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
        >
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${getGridColumns(maxPlayers)}, 1fr)`,
                gap: '16px'
            }}>
                {allSlots.map((slot) => (
                    <div
                        key={slot.id}
                        style={{
                            textAlign: 'center',
                            background: slot.is_empty
                                ? token.colorBgLayout
                                : token.colorBgContainer,
                            border: slot.is_empty
                                ? `2px dashed ${token.colorBorderSecondary}`
                                : `1px solid ${token.colorBorder}`,
                            borderRadius: 12,
                            padding: '16px',
                            minHeight: '120px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {slot.is_empty ? (
                            <>
                                <Avatar
                                    size={48}
                                    icon={<UserOutlined />}
                                    style={{
                                        marginBottom: '12px',
                                        opacity: 0.4,
                                        backgroundColor: token.colorFillSecondary
                                    }}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    等待加入...
                                </Text>
                            </>
                        ) : (
                            <>
                                <Avatar
                                    size={48}
                                    src={slot.avatar}
                                    icon={<UserOutlined />}
                                    style={{
                                        marginBottom: '12px',
                                        border: `2px solid ${slot.is_online ? token.colorPrimary : token.colorTextQuaternary}`,
                                        opacity: slot.is_online ? 1 : 0.5
                                    }}
                                />
                                <Text
                                    strong
                                    style={{
                                        fontSize: '14px',
                                        color: slot.is_online ? token.colorTextHeading : token.colorTextTertiary
                                    }}
                                >
                                    {slot.nickname}
                                    {slot.is_host && (
                                        <CrownOutlined
                                            style={{
                                                marginLeft: 4,
                                                color: '#faad14',
                                                fontSize: '14px'
                                            }}
                                        />
                                    )}
                                </Text>
                                {slot.character_name && (
                                    <Text
                                        type="secondary"
                                        style={{
                                            fontSize: '10px',
                                            marginTop: '2px',
                                            opacity: slot.is_online ? 1 : 0.6
                                        }}
                                    >
                                        {slot.character_name}
                                    </Text>
                                )}
                                <div style={{ marginTop: '6px' }}>
                                    {!slot.is_online ? (
                                        <Tag color="red">离线</Tag>
                                    ) : (
                                        <Tag color={slot.is_ready ? 'green' : 'orange'}>
                                            {slot.is_ready ? '已准备' : '未准备'}
                                        </Tag>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default PlayersListCard;
