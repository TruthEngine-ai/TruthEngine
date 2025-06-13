import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Row, Col, Space, Input, theme, Tooltip, Avatar } from 'antd';
import { LoginOutlined, UserAddOutlined, PlayCircleOutlined, RedoOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

const { Title, Text } = Typography;

const guestAdjectives = [
    "迷雾中的", "神秘的", "沉默的", "暗夜的", "智慧的", "正义的",
    "冷静的", "敏锐的", "隐秘的", "理性的", "勇敢的", "机智的",
    "黑暗中的", "真相的", "逻辑的", "细致的", "犀利的", "深沉的",
    "专注的", "严谨的", "洞察的", "睿智的", "果断的", "精明的",
    "缜密的", "坚定的", "冷酷的", "敏感的", "直觉的", "谨慎的"
];

const guestNouns = [
    "侦探", "追寻者", "观察者", "编织者", "破解者", "证人",
    "化身", "使者", "行者", "信徒", "捕手", "终结者",
    "推理师", "分析员", "解谜者", "思考者", "审判者", "守护者",
    "探索者", "研究者", "调查员", "审视者", "质疑者", "揭露者",
    "监察者", "判官", "猎手", "学者", "智者", "先知"
];

const getRandomNickname = () => {
    const adjective = guestAdjectives[Math.floor(Math.random() * guestAdjectives.length)];
    const noun = guestNouns[Math.floor(Math.random() * guestNouns.length)];
    return adjective + noun;
};

const HomePage: React.FC = () => {
    const { token } = theme.useToken();
    const { isDarkMode } = useThemeContext();
    const { user, isLoggedIn, logout } = useAuth();
    const navigate = useNavigate();
    const [guestName, setGuestName] = useState<string>('');
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

    useEffect(() => {
        setGuestName(getRandomNickname());
    }, []);

    const handleGuestNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestName(e.target.value);
    };

    const handleRandomizeNickname = () => {
        setGuestName(getRandomNickname());
    };

    const handleGuestLogin = () => {
        if (guestName.trim()) {
            navigate('/app/create-room');
        }
    };

    const handleLogin = () => {
        setAuthModalTab('login');
        setAuthModalOpen(true);
    };

    const handleRegister = () => {
        setAuthModalTab('register');
        setAuthModalOpen(true);
    };

    const handleLogout = () => {
        logout();
    };

    const handleEnterGame = () => {
        navigate('/app/create-room');
    };

    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: isDarkMode
            ? `radial-gradient(circle, ${token.colorBgElevated} 0%, ${token.colorBgLayout} 100%)`
            : `radial-gradient(circle, #ffffff 0%, ${token.colorBgLayout} 100%)`,
    };

    const cardStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '480px',
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
        padding: '20px',
    };

    const titleStyle: React.CSSProperties = {
        textAlign: 'center',
        color: token.colorTextHeading,
        marginBottom: '12px',
        fontWeight: 'bold',
    };

    const textStyle: React.CSSProperties = {
        display: 'block',
        textAlign: 'center',
        color: token.colorTextSecondary,
        marginBottom: '32px',
    };

    return (
        <div style={pageStyle}>
            <Card style={cardStyle} bordered={false}>
                <Title level={1} style={titleStyle}>
                    Truth Engine
                </Title>
                <Text style={textStyle}>
                    欢迎来到真相推理的游戏平台。
                </Text>

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {isLoggedIn ? (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <Avatar icon={<UserOutlined />} />
                                    <Text strong>{user?.nickname || user?.username}</Text>
                                </div>
                                <Button
                                    type="text"
                                    icon={<LogoutOutlined />}
                                    onClick={handleLogout}
                                    size="small"
                                >
                                    退出
                                </Button>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                size="large"
                                block
                                onClick={handleEnterGame}
                            >
                                进入游戏
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="primary"
                                icon={<LoginOutlined />}
                                size="large"
                                block
                                onClick={handleLogin}
                            >
                                登录账号
                            </Button>
                            <Button
                                icon={<UserAddOutlined />}
                                size="large"
                                block
                                onClick={handleRegister}
                            >
                                注册新用户
                            </Button>

                            <Row gutter={8} align="middle" style={{ marginTop: '20px' }}>
                                <Col flex="auto">
                                    <Input
                                        size="large"
                                        placeholder="输入游客昵称"
                                        value={guestName}
                                        onChange={handleGuestNameChange}
                                        addonBefore={<UserOutlined />}
                                    />
                                </Col>
                                <Col>
                                    <Tooltip title="随机换个昵称">
                                        <Button
                                            icon={<RedoOutlined />}
                                            size="large"
                                            onClick={handleRandomizeNickname}
                                            aria-label="随机昵称"
                                        />
                                    </Tooltip>
                                </Col>
                            </Row>

                            <Button
                                type="dashed"
                                icon={<PlayCircleOutlined />}
                                size="large"
                                block
                                onClick={handleGuestLogin}
                                disabled={!guestName.trim()}
                                style={{ borderColor: token.colorPrimary, color: token.colorPrimary }}
                            >
                                游客登录并创建房间
                            </Button>
                        </>
                    )}
                </Space>
            </Card>

            <AuthModal
                open={authModalOpen}
                onCancel={() => setAuthModalOpen(false)}
                defaultTab={authModalTab}
            />
        </div>
    );
};

export default HomePage;
