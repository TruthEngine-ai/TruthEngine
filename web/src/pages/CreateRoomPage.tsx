import { Card, Form, Input, Button, Typography, theme, Row, Col, List, Spin, message, Select, Modal, Pagination } from 'antd';
import { UserOutlined, LockOutlined, PlusCircleOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import React, { useEffect, useState } from 'react';
import { createRoom, getRoomList, joinRoom, type RoomInfo } from '../api/roomApi';

const { Title, Text } = Typography;

const CreateRoomPage = () => {
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const navigate = useNavigate();

    // 房间列表相关状态
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);

    // 加入房间相关状态
    const [joinModalVisible, setJoinModalVisible] = useState<boolean>(false);
    const [selectedRoomCode, setSelectedRoomCode] = useState<string>('');
    const [selectedRoomHasPassword, setSelectedRoomHasPassword] = useState<boolean>(false);
    const [joiningRoom, setJoiningRoom] = useState<boolean>(false);
    const [passwordForm] = Form.useForm();

    // 获取房间列表
    const fetchRooms = async (page: number = currentPage, size: number = pageSize) => {
        setLoading(true);
        try {
            const res = await getRoomList(page, size);
            if (res.code === 200) {
                setRooms(res.data.rooms);
                setTotal(res.data.total || 0);
            }
        } catch (e) {
            message.error('获取房间列表失败');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    // 处理分页变化
    const handlePageChange = (page: number, size?: number) => {
        setCurrentPage(page);
        if (size && size !== pageSize) {
            setPageSize(size);
        }
        fetchRooms(page, size || pageSize);
    };

    // 创建房间
    const onFinish = async (values: any) => {
        try {
            const res = await createRoom({
                room_password: values.roomPassword,
                ai_dm_personality: values.aiDmPersonality,
                player_count_max: values.roomSize,
            });
            if (res.code === 200) {
                message.success('房间创建成功');
                navigate(`/app/game/ready?room_code=${res.data.room_code}`);
            } else {
                message.error(res.msg || '创建房间失败');
            }
        } catch (e) {
            message.error('创建房间失败');
        }
    };

    // 处理加入房间
    const handleJoinRoom = (room: RoomInfo) => {
        setSelectedRoomCode(room.room_code);
        setSelectedRoomHasPassword(room.has_password);
        if (room.has_password) {
            setJoinModalVisible(true);
        } else {
            handleJoinRoomWithPassword('');
        }
    };

    // 加入房间逻辑
    const handleJoinRoomWithPassword = async (password: string) => {
        setJoiningRoom(true);
        try {
            const res = await joinRoom({
                room_code: selectedRoomCode,
                room_password: password,
            });
            if (res.code === 200) {
                message.success('加入房间成功');
                setJoinModalVisible(false);
                passwordForm.resetFields();
                navigate(`/app/game/ready?room_code=${selectedRoomCode}`);
            } else {
                message.error(res.msg || '加入房间失败');
            }
        } catch (e) {
            message.error('加入房间失败');
        }
        setJoiningRoom(false);
    };

    // 确认加入房间（需要密码）
    const handleConfirmJoin = async (values: any) => {
        await handleJoinRoomWithPassword(values.password || '');
    };

    // 取消加入房间
    const handleCancelJoin = () => {
        setJoinModalVisible(false);
        passwordForm.resetFields();
        setSelectedRoomCode('');
        setSelectedRoomHasPassword(false);
    };

    const cardTitleStyle = {
        color: token.colorTextHeading,
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties;

    const iconStyle = {
        marginRight: 10,
        color: token.colorPrimary,
        fontSize: '1.2em',
    };

    return (
        <>
            <Row justify="center" align="top" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <Col xs={24} sm={24} md={12}>
                    <Card
                        variant="borderless"
                        style={{
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                            boxShadow: token.boxShadowSecondary,
                            padding: '24px',
                        }}
                    >
                        <Title level={2} style={{ textAlign: 'center', color: token.colorTextHeading, marginBottom: 12 }}>
                            创建新房间
                        </Title>
                        <Text style={{ display: 'block', textAlign: 'center', color: token.colorTextSecondary, marginBottom: 32 }}>
                            输入房间信息，邀请好友开始推演。
                        </Text>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{ roomSize: 4, aiDmPersonality: '严肃' }}
                        >
                            <Form.Item
                                name="roomSize"
                                label={
                                    <Title level={4} style={cardTitleStyle}>
                                        <UserOutlined style={iconStyle} /> 房间人数
                                    </Title>
                                }
                                rules={[{ required: true, message: '请选择房间可容纳人数!' }]}
                            >
                                <Select
                                    size="large"
                                    placeholder="请选择房间人数"
                                >
                                    {Array.from({ length: 10 }, (_, i) => i + 3).map(num => (
                                        <Select.Option key={num} value={num}>{num}人</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="aiDmPersonality"
                                label={
                                    <Title level={4} style={cardTitleStyle}>
                                        <span style={iconStyle}>🤖</span> AI DM 性格
                                    </Title>
                                }
                                rules={[{ required: true, message: '请选择AI DM性格!' }]}
                            >
                                <Select size="large" placeholder="请选择AI DM性格">
                                    <Select.Option value="严肃">严肃</Select.Option>
                                    <Select.Option value="幽默">幽默</Select.Option>
                                    <Select.Option value="可爱">可爱</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="roomPassword"
                                label={
                                    <Title level={4} style={cardTitleStyle}>
                                        <LockOutlined style={iconStyle} /> 房间密码 (选填)
                                    </Title>
                                }
                            >
                                <Input.Password
                                    size="large"
                                    placeholder="设置一个密码以保护你的房间"
                                />
                            </Form.Item>

                            <Form.Item style={{ marginTop: 32, textAlign: 'center' }}>
                                <Button type="primary" htmlType="submit" size="large" icon={<PlusCircleOutlined />}>
                                    创建房间并进入设置
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
                <Col xs={0} sm={0} md={12} style={{ paddingLeft: 24 }}>
                    <Card
                        title={<span style={{ fontWeight: 600 }}>房间列表</span>}
                        style={{
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                            boxShadow: token.boxShadowSecondary,
                            minHeight: 400,
                            maxHeight: 600,
                            overflowY: 'auto',
                        }}
                        extra={
                            <Button size="small" onClick={() => fetchRooms()} loading={loading}>
                                刷新
                            </Button>
                        }
                    >
                        <Spin spinning={loading}>
                            <List
                                dataSource={rooms}
                                locale={{ emptyText: '暂无房间' }}
                                renderItem={room => (
                                    <List.Item
                                        key={room.room_code}
                                        actions={[
                                            <span key="players">{room.player_count}/{room.max_players}人</span>,
                                            <span key="status">{room.status}</span>,
                                            <Button
                                                key="join"
                                                type="primary"
                                                size="small"
                                                icon={<LoginOutlined />}
                                                onClick={() => handleJoinRoom(room)}
                                                disabled={room.status !== '等待中' || room.player_count >= room.max_players}
                                            >
                                                加入
                                            </Button>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={<span>{room.script_title} <span style={{ color: '#aaa' }}>({room.room_code})</span></span>}
                                            description={
                                                <span>
                                                    房主: {room.host_nickname}
                                                    {room.has_password && <LockOutlined style={{ marginLeft: 8, color: '#faad14' }} />}
                                                </span>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                            {total > 0 && (
                                <div style={{ textAlign: 'center', marginTop: 16 }}>
                                    <Pagination
                                        current={currentPage}
                                        pageSize={pageSize}
                                        total={total}
                                        onChange={handlePageChange}
                                        onShowSizeChange={handlePageChange}
                                        showSizeChanger
                                        showQuickJumper
                                        showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                                        pageSizeOptions={['5', '10', '20', '50']}
                                        size="small"
                                    />
                                </div>
                            )}
                        </Spin>
                    </Card>
                </Col>
            </Row>

            {/* 加入房间密码输入模态框 */}
            <Modal
                title="输入房间密码"
                open={joinModalVisible}
                onCancel={handleCancelJoin}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handleConfirmJoin}
                >
                    <Form.Item
                        name="password"
                        label="房间密码"
                        rules={[{ required: true, message: '请输入房间密码' }]}
                    >
                        <Input.Password
                            placeholder="请输入房间密码"
                            autoFocus
                        />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={handleCancelJoin} style={{ marginRight: 8 }}>
                            取消
                        </Button>
                        <Button type="primary" htmlType="submit" loading={joiningRoom}>
                            加入房间
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default CreateRoomPage;
