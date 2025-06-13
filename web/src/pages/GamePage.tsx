import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Input,
  Button,
  Space,
  Avatar,
  List,
  Tabs,
  Divider,
  Tag,
  Collapse,
  theme,
} from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  PaperClipOutlined,
  LockOutlined,
  UnlockOutlined,
  SoundOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  BookOutlined,
  SendOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';

const { Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const bulletMoveKeyframes = `
  @keyframes bulletMove {
    0% {
      transform: translateX(0%); /* 相对于 left: 100% 的初始位置 */
    }
    100% {
      /* 移动距离：视口宽度 + 自身宽度 + 一些缓冲 */
      transform: translateX(calc(-100vw - 100% - 20px)); 
    }
  }
`;

const brightColors = [
  '#FF69B4', '#FF4500', '#FFD700', '#32CD32', '#00FFFF', '#1E90FF', '#FF00FF',
  '#FF7F50', '#DA70D6', '#00FA9A', '#8A2BE2', '#FFC0CB', '#F0E68C', '#98FB98'
];

const GamePage: React.FC = () => {
  const { token } = theme.useToken();

  const [messages, setMessages] = useState<Array<{ id: string; text: string; top: string; color: string }>>([]);
  const [inputValue, setInputValue] = useState<string>('');

  const mockPlayers = [
    { id: 'player1', name: '沈清遥 (玩家1)', status: '在线', isCurrentUser: true, avatarSeed: 'ShenQingyao' },
    { id: 'player2', name: '陆锦然 (玩家2)', status: '在线', avatarSeed: 'LuJinran' },
    { id: 'npc1', name: '翠竹 (NPC)', status: 'NPC', avatarSeed: 'CuiZhu' },
  ];

  const publicClues = [
    { id: 'clue1', title: '破碎的玉佩', description: '李德全手中紧握半块墨玉龙纹佩，边缘参差不齐，像是被硬物碾碎。玉佩上刻有龙纹，材质珍贵，另一半下落不明。' },
    { id: 'clue2', title: '匕首', description: '插在李德全胸口的匕首为宫廷侍卫常用款式，刀柄光滑，无指纹，刀刃上只有李德全的血迹。' },
    { id: 'clue3', title: '茶盏', description: '尸体旁有一只翻倒的瓷茶盏，盏内残留少量茶水，散发微苦气味。茶盏外侧有一道细微裂痕。' },
  ];

  const personalClues = [
    { id: 'pclue1', title: '你的目标', description: '查明李德全的死因，找到玉佩下落，保护贵妃的秘密不被暴露。', revealed: true },
    { id: 'pclue2', title: '你的秘密', description: '我曾在三年前受贵妃之托，暗中调查过玉佩的来历，得知它藏有皇室丑闻的秘密，但我从未向任何人透露。', revealed: false },
  ];

  const sharedStyles = {
    card: {
      marginBottom: '20px', // 增加卡片间距
      backgroundColor: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      boxShadow: token.boxShadow, // 使用基础阴影，如果需要更强用 boxShadowSecondary
      border: `1px solid ${token.colorBorderSecondary}`, // 添加细微边框增加质感
    },
    title: {
      marginBottom: '16px', // 增加标题下间距
      color: token.colorTextHeading,
    },
    icon: {
      marginRight: 8,
      color: token.colorPrimary, // 图标使用主题色
    }
  };

  // 从数组中随机获取一个元素
  const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // 处理输入框变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 处理发送消息
  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      top: `${Math.floor(Math.random() * 85) + 5}%`,
      color: getRandomElement(brightColors),
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputValue('');

    // 10秒后移除弹幕消息 (应与CSS动画时长一致)
    setTimeout(() => {
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== newMessage.id));
    }, 10000);
  };

  return (
    <Layout style={{
      minHeight: 'calc(100vh - 64px)', /* 减去 MainLayout Header 的大致高度, Footer 高度不再计入，因为它已固定 */
      background: token.colorBgLayout,
    }}>
      {/* 注入弹幕动画 Keyframes */}
      <style>{bulletMoveKeyframes}</style>

      {/* 弹幕显示区域 */}
      <div
        style={{
          position: 'fixed', // 修改为 fixed，使其相对于视口定位
          top: '0', // 从视口顶部开始
          left: '0', // 从视口左边开始
          right: '0', // 延伸到视口右边 (等同于 width: '100vw')
          height: '100vh', // 高度占据整个视口
          overflow: 'hidden',
          pointerEvents: 'none', // 允许鼠标事件穿透弹幕层
          zIndex: 1000, // 确保弹幕在最上层，高于页面其他内容
        }}
      >
        {messages.map(msg => (
          <span
            key={msg.id}
            style={{
              position: 'absolute', // 子弹幕仍然是绝对定位于其 fixed 父容器
              left: '100%',
              top: msg.top, // top 百分比现在是相对于 100vh 的父容器
              color: msg.color,
              fontSize: `clamp(16px, 1.2vw, 22px)`,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              padding: '5px 10px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.5)',
              animation: `bulletMove 10s linear forwards`,
              willChange: 'transform',
            }}
          >
            {msg.text}
          </span>
        ))}
      </div>

      <Content style={{
        padding: '20px', /* 上、左、右内边距 */
        paddingBottom: '84px', /* 底部内边距 = 原有20px + Footer高度64px */
        position: 'relative',
        zIndex: 1
      }}>
        <Row gutter={[20, 20]}> {/* 增加行列间距 */}
          {/* Left Column */}
          <Col xs={24} md={16}>
            <Card title={<><BookOutlined style={sharedStyles.icon} />剧情信息</>} style={sharedStyles.card} headStyle={{ color: token.colorTextHeading }}>
              <Tabs defaultActiveKey="1"
                items={[
                  {
                    key: '1',
                    label: '剧情背景',
                    children: (
                      <>
                        <Title level={5} style={sharedStyles.title}>红墙深宫的玉佩谜案</Title>
                        <Paragraph style={{ color: token.colorText }}>
                          故事发生在北宋开封皇宫，公元1080年的深秋。寒风吹过宫墙，落叶铺满御花园的小径，空气中弥漫着桂花的清香与隐隐的肃杀之气...（此处省略详细背景）
                        </Paragraph>
                      </>
                    )
                  },
                  {
                    key: '2',
                    label: '案件概述',
                    children: (
                      <Paragraph style={{ color: token.colorText }}>
                        昨晚深夜，御花园假山旁发现太监总管李德全的尸体，死者为45岁男性...（此处省略案件详情）
                      </Paragraph>
                    )
                  },
                  {
                    key: '3',
                    label: <><HistoryOutlined style={{ marginRight: 4 }} />时间线/行动</>,
                    children: (
                      <>
                        <Title level={5} style={sharedStyles.title}>沈清遥的陈述</Title>
                        <Paragraph style={{ color: token.colorText }}>
                          昨晚戌时 (19:00-21:00)，我与陆锦然在御书房向皇帝亲报查案事宜，之后回到客房休息。子时左右，我因睡不着独自在客房附近散步，未进入御花园。丑时 (01:00-03:00) 听到宫女尖叫，赶往现场发现李德全已死。
                        </Paragraph>
                        <Divider style={{ borderColor: token.colorSplit }} />
                        <Title level={5} style={sharedStyles.title}>翠竹的陈述</Title>
                        <Paragraph style={{ color: token.colorText }}>
                          昨晚亥时，我随李公公前往御花园，他说要与人商议要事，让我在凉亭等他。我因害怕黑夜，亥时半 (22:30) 就独自返回寝宫。丑时听到尖叫后随众人赶到假山旁，发现公公已经死了。
                        </Paragraph>
                      </>
                    )
                  }
                ]}
              />
            </Card>

            <Card title={<><PaperClipOutlined style={sharedStyles.icon} />公开线索</>} style={sharedStyles.card} headStyle={{ color: token.colorTextHeading }}>
              <List
                itemLayout="horizontal"
                dataSource={publicClues}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar style={{ backgroundColor: token.colorPrimary }} icon={<PaperClipOutlined />} />}
                      title={<Text strong style={{ color: token.colorText }}>{item.title}</Text>}
                      description={<Text style={{ color: token.colorTextSecondary }}>{item.description}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} md={8}>
            <Card title={<><InfoCircleOutlined style={sharedStyles.icon} />你的角色信息</>} style={sharedStyles.card} headStyle={{ color: token.colorTextHeading }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={5} style={{ color: token.colorTextHeading }}>沈清遥 (玩家1)</Title>
                <Text style={{ color: token.colorTextSecondary }}>27岁, 大理寺少卿, 眉清目秀, 气质儒雅, 擅长推理与审讯, 以冷静著称。表面上是奉旨调查李德全之死的官员, 实则与宫中一位贵妃有旧识, 关系微妙。他与太监总管李德全素无交集, 但对宫廷权谋颇有洞察。</Text>
              </Space>
              <Divider style={{ borderColor: token.colorSplit, margin: '16px 0' }} />
              <Title level={5} style={{ ...sharedStyles.title, marginTop: 0 }}>个人线索</Title>
              <Collapse accordion bordered={false} style={{ background: token.colorBgContainer }}>
                {personalClues.map((clue, index) => (
                  <Panel
                    header={
                      <Space>
                        <Text style={{ color: token.colorText }}>{clue.title}</Text>
                        {clue.revealed ?
                          <Tag color="success" icon={<UnlockOutlined />}>已公开</Tag> :
                          <Tag color="warning" icon={<LockOutlined />}>未公开</Tag>}
                      </Space>
                    }
                    key={index.toString()}
                    style={{ background: token.colorBgElevated, marginBottom: 8, borderRadius: token.borderRadius }}
                  >
                    <Paragraph style={{ color: token.colorTextSecondary }}>{clue.description}</Paragraph>
                    {!clue.revealed && <Button size="small" icon={<EyeOutlined />} type="primary" ghost>公开此线索</Button>}
                  </Panel>
                ))}
              </Collapse>
            </Card>

            <Card title={<><TeamOutlined style={sharedStyles.icon} />所有角色</>} style={sharedStyles.card} headStyle={{ color: token.colorTextHeading }}>
              <List
                itemLayout="horizontal"
                dataSource={mockPlayers}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar style={{ backgroundColor: token.colorPrimary, verticalAlign: 'middle' }} icon={<UserOutlined />} >{item.name[0]}</Avatar>}
                      title={<Text style={{ color: token.colorText }}>{item.name}</Text>}
                      description={<Tag color={item.status === '在线' ? 'green' : (item.status === 'NPC' ? 'geekblue' : 'default')}>{item.status}</Tag>}
                    />
                    {item.isCurrentUser && <Tag color="blue">你</Tag>}
                  </List.Item>
                )}
              />
            </Card>

            {true && (
              <Card title={<><SettingOutlined style={sharedStyles.icon} />房主控制面板</>} style={sharedStyles.card} headStyle={{ color: token.colorTextHeading }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button block icon={<SoundOutlined />} style={{ justifyContent: 'flex-start' }}>开启/关闭语音聊天</Button>
                  <Button block icon={<EyeInvisibleOutlined />} style={{ justifyContent: 'flex-start' }}>公开隐藏线索 (示例)</Button>
                  <Button block danger icon={<PlayCircleOutlined />} style={{ justifyContent: 'flex-start' }}>结束游戏并发起投票</Button>
                </Space>
              </Card>
            )}
          </Col>
        </Row>
      </Content>
      <Footer style={{
        padding: '12px 20px',
        background: token.colorBgElevated,
        borderTop: `1px solid ${token.colorBorder}`,
        position: 'fixed',
        bottom: '0',       // 固定在底部
        left: '0',         // 宽度充满
        right: '0',        // 宽度充满
        zIndex: 100        // 确保在内容之上 (原为5，增加以更明确)
      }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="输入弹幕... (回车发送)" // 更新 placeholder
            prefix={<MessageOutlined style={{ color: token.colorTextSecondary }} />}
            style={{ background: token.colorBgContainer, borderColor: token.colorBorder }}
            value={inputValue} // 绑定 value
            onChange={handleInputChange} // 绑定 onChange
            onPressEnter={handleSendMessage} // 绑定回车发送
          />
          <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleSendMessage}>发送</Button> {/* 绑定 onClick */}
        </Space.Compact>
      </Footer>
    </Layout>
  );
};

export default GamePage;
