import { Card, Form, Input, Button, Typography, theme, Row, Col, InputNumber } from 'antd';
import { UserOutlined, LockOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';

const { Title, Text } = Typography;

const HomePage = () => {
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const onFinish = (values: any) => {
        console.log('Create Room Details:', values);
        navigate('/game/settings');
    };

    const cardTitleStyle = {
        color: token.colorTextHeading, // 使用主题的标题颜色
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties;

    const iconStyle = {
        marginRight: 10, // 稍微增加间距
        color: token.colorPrimary,
        fontSize: '1.2em', // 稍微增大图标
    };

    return (
        <Row justify="center" align="middle" style={{ minHeight: 'calc(100vh - 200px)' /* 调整以适应Header/Footer */ }}>
            <Col xs={22} sm={18} md={14} lg={10} xl={8}>
                <Card
                    variant="borderless"
                    style={{
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        boxShadow: token.boxShadowSecondary, // 使用更显著的阴影
                        padding: '24px', // 统一内边距
                    }}
                >
                    <Title level={2} style={{ textAlign: 'center', color: token.colorTextHeading, marginBottom: 12 }}> {/* 增大标题 */}
                        创建新房间
                    </Title>
                    <Text style={{ display: 'block', textAlign: 'center', color: token.colorTextSecondary, marginBottom: 32 }}> {/* 增加底部间距 */}
                        输入房间信息，邀请好友开始推演。
                    </Text>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        initialValues={{ roomSize: 4 }}
                    >
                        <Form.Item
                            name="roomSize"
                            label={
                                <Title level={4} style={cardTitleStyle}> {/* 调整标题级别 */}
                                    <UserOutlined style={iconStyle} /> 房间人数
                                </Title>
                            }
                            rules={[{ required: true, message: '请输入房间可容纳人数!' }]}
                        >
                            <InputNumber
                                min={2}
                                max={10}
                                style={{ width: '100%' }}
                                size="large"
                                placeholder="例如：4"
                            />
                        </Form.Item>

                        <Form.Item
                            name="roomPassword"
                            label={
                                <Title level={4} style={cardTitleStyle}> {/* 调整标题级别 */}
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
        </Row>
    );
};

export default HomePage;
