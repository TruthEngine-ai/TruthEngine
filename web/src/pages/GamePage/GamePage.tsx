import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import RoomPreparePage from './RoomPreparePage';
import { Button, Card, Form, Modal, Input, message, theme, Typography } from 'antd';
import { useWebSocket } from '../../hooks/useWebSocket';
import { joinRoom, getRoomInfo, type RoomDetail } from '../../api/roomApi';
import { useAuth } from '../../contexts/AuthContext';
import ScriptGeneratingMask from '../ScriptGeneratingMask';
import MessageDrawer from '../../components/MessageDrawer';
import CharacterSelectionPage from './CharacterSelectionPage/CharacterSelectionPage';
import CorePage from './CorePage/CorePage';

const { Text } = Typography;

const GamePage: React.FC = () => {
    const { token } = theme.useToken();
    const [searchParams] = useSearchParams();
    const roomCode = searchParams.get('room_code');
    const [isMessageWindowVisible, setMessageWindowVisible] = useState(false);
    const { messages: wsMessages, isConnected, roomStatus, connect, setReady, updateRoomSettings, generateScript, selectCharacter, startGame } = useWebSocket(roomCode || 'UNKNOWN_ROOM_FOR_GAMEPAGE');

    // 房间状态检查相关状态
    const [checkingUserStatus, setCheckingUserStatus] = useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [roomInfo, setRoomInfo] = useState<RoomDetail | null>(null);
    const [joining, setJoining] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const { user, refreshUserInfo } = useAuth();
    const [joinForm] = Form.useForm();

    const toggleMessageWindow = () => {
        setMessageWindowVisible(!isMessageWindowVisible);
    };

    const handleDrawerClose = () => {
        setMessageWindowVisible(false);
    };

    // 检查用户房间状态
    const checkUserRoomStatus = async () => {
        if (hasInitialized || !roomCode) {
            return;
        }
        if (showJoinModal) {
            return;
        }

        setCheckingUserStatus(true);
        console.log('开始检查用户房间状态，当前用户:', user);

        try {
            // 如果用户信息还没有加载，先刷新用户信息
            let currentUser = user;
            if (!currentUser) {
                console.log('用户信息为空，刷新用户信息...');
                await refreshUserInfo();
                setCheckingUserStatus(false);
                return;
            }

            console.log('用户信息已加载，继续检查房间状态:', currentUser);
            setHasInitialized(true);

            if (currentUser.current_room && currentUser.current_room.room_code !== roomCode) {
                message.warning('您已在其他房间中，无法加入新房间');
                window.location.href = '/';
                return;
            }

            if (currentUser.current_room && currentUser.current_room.room_code === roomCode) {
                console.log('用户已在当前房间，直接连接WebSocket');
                connect().catch(error => {
                    message.error('连接房间服务失败，请检查网络连接');
                    console.error('WebSocket连接失败:', error);
                });
                return;
            }

            console.log('用户不在任何房间，获取房间信息...');
            const roomInfoResponse = await getRoomInfo(roomCode);
            if (roomInfoResponse.code === 200) {
                setRoomInfo(roomInfoResponse.data);
                setShowJoinModal(true);
            } else {
                message.error(roomInfoResponse.msg || '房间不存在或已关闭');
                window.location.href = '/create-room';
            }
        } catch (error) {
            console.error('检查用户房间状态失败:', error);
            message.error('检查房间状态失败，请重试');
            window.location.href = '/create-room';
        } finally {
            setCheckingUserStatus(false);
        }
    };

    // 处理加入房间
    const handleJoinRoom = async (values: { password?: string }) => {
        if (!roomCode) return;

        setJoining(true);
        try {
            const joinResponse = await joinRoom({
                room_code: roomCode,
                ...(values.password && { room_password: values.password })
            });

            if (joinResponse.code === 200) {
                message.success('成功加入房间');
                setShowJoinModal(false);
                await refreshUserInfo();
                // 加入房间成功后，立即建立WebSocket连接
                connect().catch(error => {
                    message.error('连接房间服务失败，请检查网络连接');
                    console.error('WebSocket连接失败:', error);
                });
            } else {
                message.error(joinResponse.msg || '加入房间失败');
            }
        } catch (error) {
            console.error('加入房间失败:', error);
            message.error('加入房间失败，请重试');
        } finally {
            setJoining(false);
        }
    };

    // 处理取消加入
    const handleCancelJoin = () => {
        setShowJoinModal(false);
        window.location.href = '/create-room';
    };

    useEffect(() => {
        console.log('useEffect 触发，roomCode:', roomCode, 'user:', user, 'hasInitialized:', hasInitialized, 'showJoinModal:', showJoinModal);
        if (roomCode && !showJoinModal) {
            checkUserRoomStatus();
        }
    }, [roomCode, user?.id, hasInitialized, showJoinModal]);

    // 如果没有房间代码，重定向到创建房间页面
    if (!roomCode) {
        return <Navigate to="/app/create-room" replace />;
    }

    // 检查用户状态或显示加入模态框
    if (checkingUserStatus || showJoinModal) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}>
                {checkingUserStatus ? (
                    <Card style={{ textAlign: 'center', padding: '40px' }}>
                        <Text style={{ fontSize: '18px' }}>正在检查房间状态...</Text>
                    </Card>
                ) : (
                    <Modal
                        title="加入房间"
                        open={showJoinModal}
                        onCancel={handleCancelJoin}
                        footer={null}
                        destroyOnClose
                    >
                        <div style={{ marginBottom: '20px' }}>
                            <Text>房间代码: <Text strong>{roomCode}</Text></Text>
                            {roomInfo && (
                                <>
                                    <br />
                                    <Text>房主: {roomInfo.host.nickname}</Text>
                                    <br />
                                    <Text>当前人数: {roomInfo.players.length}</Text>
                                    <br />
                                    <Text>状态: {roomInfo.status}</Text>
                                </>
                            )}
                        </div>

                        <Form
                            form={joinForm}
                            onFinish={handleJoinRoom}
                            layout="vertical"
                        >
                            {roomInfo?.has_password && (
                                <Form.Item
                                    name="password"
                                    label="房间密码"
                                    rules={[{ required: true, message: '请输入房间密码' }]}
                                >
                                    <Input.Password placeholder="请输入房间密码" />
                                </Form.Item>
                            )}

                            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                                <Button onClick={handleCancelJoin} style={{ marginRight: '8px' }}>
                                    取消
                                </Button>
                                <Button type="primary" htmlType="submit" loading={joining}>
                                    加入房间
                                </Button>
                            </Form.Item>
                        </Form>
                    </Modal>
                )}
            </div>
        );
    }

    // 等待WebSocket连接，显示加载中
    if (!isConnected || !roomStatus) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}>
                <Card style={{ textAlign: 'center', padding: '40px' }}>
                    <Text style={{ fontSize: '18px' }}>
                        {isConnected ? '正在加载房间信息...' : '正在连接房间...'}
                    </Text>
                </Card>
            </div>
        );
    }

    const renderRoomComponent = () => {
        switch (roomStatus.room.status) {
            case '等待中':
                return <RoomPreparePage
                    roomCode={roomCode}
                    isConnected={isConnected}
                    roomStatus={roomStatus}
                    generateScript={generateScript}
                    setReady={setReady}
                    updateRoomSettings={updateRoomSettings}
                />;
            case '生成剧本中':
                return <ScriptGeneratingMask visible={true}></ScriptGeneratingMask>
            case '选择角色':
                return <CharacterSelectionPage
                    roomStatus={roomStatus}
                    selectCharacter={selectCharacter}
                    startGame={startGame}
                />;
            case '进行中':
                return <CorePage></CorePage>
            default:
                return <RoomPreparePage
                    roomCode={roomCode}
                    isConnected={isConnected}
                    roomStatus={roomStatus}
                    generateScript={generateScript}
                    setReady={setReady}
                    updateRoomSettings={updateRoomSettings}
                />;
        }
    };

    return (
        <>
            {!isConnected && roomStatus && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1001,
                    padding: '10px 20px'
                }}>
                    <Card style={{ background: token.colorWarningBg, border: `1px solid ${token.colorWarning}` }}>
                        <Text type="warning">连接已断开，正在尝试重新连接...</Text>
                    </Card>
                </div>
            )}

            {renderRoomComponent()}

            <MessageDrawer
                visible={isMessageWindowVisible}
                messages={wsMessages}
                onClose={handleDrawerClose}
                onToggle={toggleMessageWindow}
            />
        </>
    );
};

export default GamePage;
