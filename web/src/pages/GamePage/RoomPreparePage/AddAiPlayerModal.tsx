import React, { useState, useEffect } from 'react';
import { Modal, List, Avatar, Button, Typography, Tag, Space, Spin, message } from 'antd';
import { RobotOutlined, UserAddOutlined } from '@ant-design/icons';
import { getEnabledAIConfigs, type AIConfig } from '../../../api/npcApi';

const { Text } = Typography;

interface AddAiPlayerModalProps {
    visible: boolean;
    onCancel: () => void;
    onAddNPC: (aiconfigId: number) => void;
}

const AddAiPlayerModal: React.FC<AddAiPlayerModalProps> = ({
    visible,
    onCancel,
    onAddNPC
}) => {
    const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);

    // 获取AI配置数据
    const fetchAIConfigs = async () => {
        setLoading(true);
        try {
            const configs = await getEnabledAIConfigs();
            setAiConfigs(configs);
        } catch (error) {
            message.error('获取AI配置失败');
            console.error('Failed to fetch AI configs:', error);
        } finally {
            setLoading(false);
        }
    };

    // 处理添加AI玩家
    const handleAddAiPlayer = async (config: AIConfig) => {
        setAddingId(config.id);
        try {
            onAddNPC(config.id);
            message.success(`正在添加AI玩家: ${config.name}`);
            onCancel();
        } catch (error) {
            message.error('添加AI玩家失败');
            console.error('Failed to add AI player:', error);
        } finally {
            setAddingId(null);
        }
    };

    // 当Modal打开时获取数据
    useEffect(() => {
        if (visible) {
            fetchAIConfigs();
        }
    }, [visible]);

    return (
        <Modal
            title={
                <Space>
                    <RobotOutlined style={{ color: '#1890ff' }} />
                    选择AI玩家
                </Space>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={600}
            bodyStyle={{ padding: '16px' }}
        >
            <Spin spinning={loading}>
                <List
                    dataSource={aiConfigs}
                    renderItem={(config) => (
                        <List.Item
                            style={{
                                borderRadius: 8,
                                marginBottom: 8,
                                padding: '16px',
                                backgroundColor: '#fafafa',
                                border: '1px solid #f0f0f0'
                            }}
                            actions={[
                                <Button
                                    type="primary"
                                    icon={<UserAddOutlined />}
                                    loading={addingId === config.id}
                                    onClick={() => handleAddAiPlayer(config)}
                                >
                                    添加
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        size={48}
                                        icon={<RobotOutlined />}
                                        style={{ backgroundColor: '#1890ff' }}
                                    />
                                }
                                title={
                                    <Space>
                                        <Text strong style={{ fontSize: '16px' }}>
                                            {config.name}
                                        </Text>
                                        <Tag color="blue">{config.personality_type}</Tag>
                                        <Tag color="green">{config.strategy_type}</Tag>
                                    </Space>
                                }
                                description={
                                    <Text type="secondary" style={{ fontSize: '14px' }}>
                                        随机性: {config.response_random} | 响应间隔: {config.response_interval}秒
                                    </Text>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Spin>
        </Modal>
    );
};

export default AddAiPlayerModal;