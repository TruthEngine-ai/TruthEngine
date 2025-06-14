import React from 'react';
import { Card, Typography, Form, Select, Input, theme } from 'antd';
import {
    EditOutlined,
    PictureOutlined,
    ClockCircleOutlined,
    BarChartOutlined,
    TeamOutlined
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { GameFormValues } from './types';

const { Text } = Typography;
const { Option } = Select;

interface GameSettingsCardProps {
    form: FormInstance;
    isHost: boolean;
    initialValues: GameFormValues;
    onFieldsChange: (changedFields: any) => void;
}

const GameSettingsCard: React.FC<GameSettingsCardProps> = ({
    form,
    isHost,
    initialValues,
    onFieldsChange,
}) => {
    const { token } = theme.useToken();

    return (
        <Card
            title={
                <span style={{ fontSize: '18px', fontWeight: 600 }}>
                    <EditOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                    游戏设置
                </span>
            }
            style={{
                height: 'fit-content',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
                {isHost ? '房主可以在这里设置本局游戏参数' : '只有房主可以设置游戏参数'}
            </Text>

            <Form
                form={form}
                layout="vertical"
                onFieldsChange={onFieldsChange}
                initialValues={initialValues}
                disabled={!isHost}
            >
                <Form.Item
                    label={
                        <span>
                            <PictureOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                            游戏背景
                        </span>
                    }
                    name="background"
                >
                    <Select placeholder="请选择游戏背景" disabled={!isHost} allowClear>
                        <Option value="gudai">古代宫廷</Option>
                        <Option value="xiandai">现代都市</Option>
                        <Option value="kehuan">科幻未来</Option>
                        <Option value="xuanhuan">玄幻仙侠</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label={
                        <span>
                            <ClockCircleOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                            游戏时长
                        </span>
                    }
                    name="duration"
                >
                    <Select placeholder="请选择游戏时长" disabled={!isHost} allowClear>
                        <Option value="short">短篇 (约30分钟)</Option>
                        <Option value="medium">中篇 (约60分钟)</Option>
                        <Option value="long">长篇 (约90分钟以上)</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label={
                        <span>
                            <BarChartOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                            难度等级
                        </span>
                    }
                    name="difficulty"
                >
                    <Select placeholder="请选择难度等级" disabled={!isHost} allowClear>
                        <Option value="novice">新手</Option>
                        <Option value="intermediate">进阶</Option>
                        <Option value="expert">困难</Option>
                        <Option value="master">大师</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label={
                        <span>
                            <TeamOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                            AI DM 性格
                        </span>
                    }
                    name="aiPersonality"
                >
                    <Select placeholder="请选择AI DM性格" disabled={!isHost} allowClear>
                        <Option value="神秘">神秘</Option>
                        <Option value="幽默">幽默</Option>
                        <Option value="严肃">严肃</Option>
                        <Option value="友善">友善</Option>
                        <Option value="冷酷">冷酷</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label="特殊要求 (选填)"
                    name="specialRequests"
                >
                    <Input.TextArea
                        rows={3}
                        placeholder={isHost ? "可以添加特殊要求..." : "只有房主可以设置特殊要求"}
                        disabled={!isHost}
                        style={{ resize: 'none' }}
                    />
                </Form.Item>
            </Form>
        </Card>
    );
};

export default GameSettingsCard;
