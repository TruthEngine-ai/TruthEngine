import { Card, Col, Form, Input, Row, Select, Typography, theme, Button, message } from 'antd';
import {
  PictureOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  EditOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';
import { generateScript } from '../api/scripts_api';
import { useLocation } from 'react-router'; // 新增
import ScriptGeneratingMask from './ScriptGeneratingMask';

const { Title, Text } = Typography;
const { Option } = Select;

const GameSettingsPage = () => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const location = useLocation(); // 新增

  const onFinish = async (values: any) => {
    const backgroundMap: Record<string, string> = {
      gudai: '古代宫廷',
      xiandai: '现代都市',
      kehuan: '科幻未来',
      xuanhuan: '玄幻仙侠',
    };
    const durationMap: Record<string, number> = {
      short: 30,
      medium: 60,
      long: 90,
    };
    const difficultyMap: Record<string, string> = {
      novice: '新手',
      intermediate: '进阶',
      expert: '烧脑',
      master: '大师',
    };

    const searchParams = new URLSearchParams(location.search);
    const room_code = searchParams.get('room_code') || '';

    setLoading(true);
    try {
      const req = {
        theme: backgroundMap[values.background] || values.background,
        player_count: 6, // 可根据实际需求获取玩家数
        difficulty: difficultyMap[values.difficulty] || values.difficulty,
        ai_dm_personality: '神秘', // 可根据表单添加更多选项
        duration_mins: durationMap[values.duration] || 30,
        author_id: Number(localStorage.getItem('user_id')) || 1,
        room_code, // 使用url参数
      };
      const res = await generateScript(req);
      message.success('剧本生成成功！');
      // navigate('/game/play');
      console.log('生成剧本结果:', res);
    } catch (e: any) {
      message.error('剧本生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const settingItemStyle = {
    marginBottom: 24,
  };

  const cardTitleStyle = {
    color: token.colorTextHeading,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: 600,
  } as React.CSSProperties;

  const iconStyle = {
    marginRight: 8,
    color: token.colorPrimary,
    fontSize: '16px',
  };

  return (
    <>
      <ScriptGeneratingMask visible={loading} />
      <Card
        variant="borderless"
        style={{
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
          padding: '32px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <Title level={2} style={{ textAlign: 'center', color: token.colorTextHeading, marginBottom: 8 }}>
          游戏设置
        </Title>
        <Text style={{ display: 'block', textAlign: 'center', color: token.colorTextSecondary, marginBottom: 40 }}>
          你是房主，请设置本局游戏。
        </Text>

        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{
          background: 'gudai',
          duration: 'short',
          difficulty: 'novice',
          roleSetup: 'cooperative',
        }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <div style={settingItemStyle}>
                <Title level={5} style={cardTitleStyle}>
                  <PictureOutlined style={iconStyle} /> 选择背景
                </Title>
                <Form.Item name="background" noStyle>
                  <Select size="large" placeholder="请选择游戏背景" style={{ width: '100%' }}>
                    <Option value="gudai">古代宫廷</Option>
                    <Option value="xiandai">现代都市</Option>
                    <Option value="kehuan">科幻未来</Option>
                    <Option value="xuanhuan">玄幻仙侠</Option>
                  </Select>
                </Form.Item>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <div style={settingItemStyle}>
                <Title level={5} style={cardTitleStyle}>
                  <ClockCircleOutlined style={iconStyle} /> 游戏时长
                </Title>
                <Form.Item name="duration" noStyle>
                  <Select size="large" placeholder="请选择游戏时长" style={{ width: '100%' }}>
                    <Option value="short">短篇 (约30分钟)</Option>
                    <Option value="medium">中篇 (约60分钟)</Option>
                    <Option value="long">长篇 (约90分钟以上)</Option>
                  </Select>
                </Form.Item>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <div style={settingItemStyle}>
                <Title level={5} style={cardTitleStyle}>
                  <BarChartOutlined style={iconStyle} /> 难度等级
                </Title>
                <Form.Item name="difficulty" noStyle>
                  <Select size="large" placeholder="请选择难度等级" style={{ width: '100%' }}>
                    <Option value="novice">新手</Option>
                    <Option value="intermediate">进阶</Option>
                    <Option value="expert">困难</Option>
                    <Option value="master">大师</Option>
                  </Select>
                </Form.Item>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <div style={settingItemStyle}>
                <Title level={5} style={cardTitleStyle}>
                  <TeamOutlined style={iconStyle} /> 角色设定
                </Title>
                <Form.Item name="roleSetup" noStyle>
                  <Select size="large" placeholder="请选择角色设定模式" style={{ width: '100%' }}>
                    <Option value="cooperative">合作模式</Option>
                    <Option value="competitive">竞争模式</Option>
                    <Option value="hidden">隐藏阵营</Option>
                  </Select>
                </Form.Item>
              </div>
            </Col>

            <Col xs={24}>
              <div style={settingItemStyle}>
                <Title level={5} style={cardTitleStyle}>
                  <EditOutlined style={iconStyle} /> 特殊要求 (选填)
                </Title>
                <Form.Item name="specialRequests" noStyle>
                  <Input.TextArea
                    size="large"
                    rows={4}
                    placeholder="可以添加特殊要求，例如：希望有反转剧情，角色之间关系复杂等..."
                    style={{ resize: 'none' }}
                  />
                </Form.Item>
              </div>
            </Col>
          </Row>
          
          <Form.Item style={{ marginTop: 40, textAlign: 'center', marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" icon={<PlayCircleOutlined />}>
              开始演绎
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default GameSettingsPage;
