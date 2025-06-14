import React, { useState } from 'react';
import {
  Typography,
  Button,
  Tabs,
  Card,
  Tag,
  Collapse,
  Input,
  Space,
  Divider,
  Row,
  Col,
  List,
  message, // Renamed from 'messageApi' to 'message' to match usage
  Badge,
  Tooltip
} from 'antd';
import {
  SendOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  UserOutlined,
  RightCircleOutlined,
  FileTextOutlined,
  LogoutOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;

const CorePage: React.FC = () => {
  const [currentMessage, setCurrentMessage] = useState<string>(''); // Renamed from 'message' to 'currentMessage' to avoid conflict with antd message

  // 游戏数据（在实际应用中，这些数据应该从API或状态管理中获取）
  const gameData = {
    title: '红雾家的玉器之谜',
    currentAct: {
      actNumber: 2,
      actTitle: '深入调查',
      objective: '收集所有角色的证词，找出赵学宁死因的关键线索。重点调查破碎玉器的来源和医学报告中的异常之处。',
      timeLimit: '剩余 25 分钟'
    },
    currentPlayer: {
      id: 1,
      name: '李家儒',
      age: '24岁',
      occupation: '助手',
      secrets: [
        '你知道赵学宁生前曾因为一笔巨额债务而焦虑不安',
        '你偷偷看到印医生在案发前一天晚上离开过红雾家'
      ],
      privateClues: [
        { id: 'p1', title: '银行借据', content: '发现了一张赵学宁的巨额借据，金额高达500万' },
        { id: 'p2', title: '神秘电话记录', content: '案发当晚有人给赵学宁打过电话，通话时间很短' }
      ],
      specialAbility: '因为带着护身符，所以能够平安。在危险时刻有额外的保护。'
    },
    briefInfo: `
      百年名玉收藏家赵学宁的离世，众所不知，除事故官方死因外，红雾家早一辈精明的商业，为正中央巨
      头背景，从而持有大量高级资产产权份额，事关世代存亡，前寒针对大面积共有土地上唯一一座的独立礼
      堂被空，赖同有读者一同设与，对正反方均追根轻物定罪的危机，结局，即可面对一切原罪，一切外面的主人
      需盲目不可更动，不能错不可漏不敢旁观的电影，在答题，红雾家族里不稳定不崩，才有答题的任命正三天
      刺杀，死理会，早年生活在现代有的生活环境如冰冷不寻常，主从他个顽强，各位痛失，非财宽不不不，东西
      一时难以格局。可知从家中简单看报。
    `,
    crimeDescription: `
      今晚，因为太晚被锁在车上红雾宅院的围栏外面，整座山岭没有光，上山后，发觉探照灯全灭不亮，城门只
      有一辆车的引擎声分外夺人，死于脖子，脸上划了几笔汽油痕，检查尸体后发现，肋骨开裂大于三段的断裂，被塞
      进的东西。运势明显，火涕自此，随心共同，看起来地上地下。检查火灯，仪器博物馆的...真的不作死，被害的人
      和仪，被吓厉害了，可怜人大闹？检伤害尸主上也一切不适副作用吗，反而已经等他好了！无条件为什么
      被工！可能得找人上无主之散，与家庭的时代无关。
    `,
    characterActions: [
      { id: 1, title: '林昶莹的线索', content: '林昶莹：我今年26岁（2023年），我是医生的女....' },
      { id: 2, title: '李家儒的线索', content: '李家儒：今年24岁（1998出生），受家族影响仍旧....' },
      { id: 3, title: '印医生的线索', content: '印医生：今年42岁(2301)，是家庭医生，具有...' },
    ],
    characters: [
      { 
        id: 1, 
        name: '李家儒', 
        type: '玩家', 
        age: '24岁', 
        occupation: '助手',  
        active: true,
        description: '出生于世家，受家族影响仍旧不能与红雾家的宿命三人组当中任何一人有不必要的联系。因为带着护身符，所以能够平安。' 
      },
      { 
        id: 2, 
        name: '林昶莹', 
        type: '玩家', 
        age: '27岁', 
        occupation: '护士/医生', 
        active: true,
        description: '祖传医术，驰名城区，在学术界，生性好奇，追求真理。特殊技能见微知著，最好在绝望时刻自我拯救。' 
      },
      { 
        id: 3, 
        name: '印医生', 
        type: 'NPC', 
        age: '42岁', 
        occupation: '医生/教授', 
        description: '论文等级高，言谈优雅，在玉器学上所知甚广，特阿姆更"敌意"谁能被救，解锁线索中会暗示往者的线索。' 
      },
      { 
        id: 4, 
        name: '赛娜', 
        type: 'NPC', 
        age: '30岁', 
        occupation: '学者/秘书', 
        description: '知识丰富，态度严格，相对与红雾家疏离，擅长解密，娇小灵活，占据有利位置时轻松脱身。' 
      }
    ],
    clues: [
      { id: 1, title: '破碎的玉器', type: '物证' },
      { id: 2, title: '红雾家族史', type: '文献' },
      { id: 3, title: '医学报告', type: '文件' },
      { id: 4, title: '神秘钥匙', type: '物品' }
    ]
  };
  
  const handleLeaveRoom = () => {
    if (window.confirm('确定要离开房间吗？')) {
      message.success('已离开房间');
      // 这里应该有导航到房间列表或其他逻辑
    }
  };

  const handleNextAct = () => {
    if (window.confirm('确定要进入下一幕吗？')) {
      message.success('正在进入下一幕...');
      // 这里应该有进入下一幕的逻辑
    }
  };
  
  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      // 处理消息发送逻辑
      message.success('消息已发送');
      setCurrentMessage('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 24px', 
          background: '#fff', 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
          zIndex: 1,
          height: '64px'
        }}
      >
        <Title level={3} style={{ margin: 0, color: '#1a1a1a' }}>{gameData.title}</Title>
        <Button 
          type="primary" 
          danger 
          icon={<LogoutOutlined />}
          onClick={handleLeaveRoom}
        >
          离开房间
        </Button>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {/* 当前幕信息 */}
        <Card 
          style={{ 
            marginBottom: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          <Row gutter={24} align="middle">
            <Col xs={24} sm={16}>
              <Space direction="vertical" size={4}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  第 {gameData.currentAct.actNumber} 幕
                </Text>
                <Title level={3} style={{ margin: 0, color: '#fff' }}>
                  {gameData.currentAct.actTitle}
                </Title>
              </Space>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
              <Button 
                type="default"
                size="large"
                icon={<RightCircleOutlined />}
                onClick={handleNextAct}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                下一幕
              </Button>
            </Col>
          </Row>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.3)', margin: '16px 0' }} />
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '6px', 
            padding: '16px',
            backdropFilter: 'blur(10px)'
          }}>
            <Space>
              <FileTextOutlined style={{ color: '#fff', fontSize: '16px' }} />
              <Text strong style={{ color: '#fff' }}>当前目标：</Text>
            </Space>
            <Paragraph style={{ color: '#fff', margin: '8px 0 0 0', lineHeight: '1.6' }}>
              {gameData.currentAct.objective}
            </Paragraph>
          </div>
        </Card>

        <Row gutter={24}>
          <Col xs={24} md={16}>
            {/* 左侧内容区域 */}
            <Tabs defaultActiveKey="1" type="card">
              <TabPane 
                tab={<span><InfoCircleOutlined /> 基本信息详情</span>}
                key="1"
              >
                <Card 
                  bordered={false} 
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  headStyle={{ backgroundColor: '#fafafa' }}
                >
                  <Paragraph>{gameData.briefInfo}</Paragraph>
                  <Divider orientation="left">收集到的线索</Divider>
                  <Space wrap>
                    {gameData.clues.map(clue => (
                      <Tag 
                        key={clue.id} 
                        color="blue" 
                        style={{ margin: '4px', cursor: 'pointer' }}
                      >
                        {clue.title}
                      </Tag>
                    ))}
                  </Space>
                </Card>

                {/* 所有角色信息 */}
                <Card
                  title={<span><TeamOutlined /> 所有角色</span>}
                  bordered={false}
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  headStyle={{ backgroundColor: '#fafafa' }}
                >
                  <Row gutter={16}>
                    {gameData.characters.map(char => (
                      <Col xs={24} sm={12} key={char.id} style={{ marginBottom: '16px' }}>
                        <Card
                          size="small"
                          style={{
                            borderLeft: char.active ? '4px solid #52c41a' : '4px solid #d9d9d9',
                            borderRadius: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                          title={
                            <Space>
                              <Badge status={char.active ? "success" : "default"} />
                              <span style={{ fontSize: '14px' }}>{char.name}</span>
                              <Tag color={char.type === 'NPC' ? 'default' : 'green'}>
                                {char.type}
                              </Tag>
                              {char.active && <Tooltip title="当前角色"><UserOutlined /></Tooltip>}
                            </Space>
                          }
                          bordered={false}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text><Text strong>年龄：</Text>{char.age}</Text>
                            <Text><Text strong>职业：</Text>{char.occupation}</Text>
                            <Paragraph style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                              {char.description}
                            </Paragraph>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </TabPane>
              
              <TabPane
                tab={<span><ExclamationCircleOutlined /> 案件概述</span>}
                key="2"
              >
                <Card 
                  bordered={false}
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  headStyle={{ backgroundColor: '#fafafa' }}
                >
                  <Paragraph>{gameData.crimeDescription}</Paragraph>
                </Card>
              </TabPane>
              
              <TabPane
                tab={<span><RightCircleOutlined /> 角色行动线</span>}
                key="3"
              >
                <Collapse accordion>
                  {gameData.characterActions.map(action => (
                    <Panel header={action.title} key={action.id}>
                      <Paragraph>{action.content}</Paragraph>
                    </Panel>
                  ))}
                </Collapse>
              </TabPane>
              
              <TabPane
                tab={<span><FileTextOutlined /> 公开信息</span>}
                key="4"
              >
                <Card 
                  bordered={false}
                  title="游戏规则"
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  headStyle={{ backgroundColor: '#fafafa' }}
                >
                  <List
                    size="small"
                    dataSource={[
                      '每位玩家轮流行动，探索线索',
                      '收集证据，拼凑真相',
                      '在规定时间内提交推理结果',
                      '系统会根据推理准确度评分'
                    ]}
                    renderItem={item => (
                      <List.Item>
                        <Text>{item}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
                
                <Card 
                  bordered={false}
                  title="游戏背景"
                  style={{ marginTop: 16, borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  headStyle={{ backgroundColor: '#fafafa' }}
                >
                  <Paragraph>
                    红雾家族是一个历史悠久的世家，家族中收藏了许多珍贵的古玉器。
                    近期一件价值连城的玉器失窃，同时家族中发生了一起离奇的命案。
                    玩家需要在有限的时间内，通过搜集线索、分析证据，找出真凶。
                  </Paragraph>
                </Card>
              </TabPane>
            </Tabs>
          </Col>
          
          <Col xs={24} md={8}>
            {/* 个人信息区域 */}
            <Card
              title={<span><UserOutlined /> 我的角色信息</span>}
              bordered={false}
              style={{ 
                borderRadius: '8px', 
                marginBottom: '16px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: '4px solid #1890ff'
              }}
              headStyle={{ backgroundColor: '#f0f8ff' }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    {gameData.currentPlayer.name}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary">{gameData.currentPlayer.age} · {gameData.currentPlayer.occupation}</Text>
                  </div>
                </div>
                
                <div>
                  <Text strong>特殊能力：</Text>
                  <Paragraph style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                    {gameData.currentPlayer.specialAbility}
                  </Paragraph>
                </div>
              </Space>
            </Card>

            {/* 个人秘密 */}
            <Card
              title={<span style={{ color: '#fa541c' }}>🔒 个人秘密</span>}
              bordered={false}
              style={{ 
                borderRadius: '8px', 
                marginBottom: '16px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: '4px solid #fa541c'
              }}
              headStyle={{ backgroundColor: '#fff7e6' }}
            >
              <List
                size="small"
                dataSource={gameData.currentPlayer.secrets}
                renderItem={(secret, index) => (
                  <List.Item>
                    <Text style={{ fontSize: '13px', lineHeight: '1.5' }}>
                      {index + 1}. {secret}
                    </Text>
                  </List.Item>
                )}
              />
            </Card>

            {/* 私有线索 */}
            <Card
              title={<span style={{ color: '#52c41a' }}>🔍 私有线索</span>}
              bordered={false}
              style={{ 
                borderRadius: '8px', 
                marginBottom: '16px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: '4px solid #52c41a'
              }}
              headStyle={{ backgroundColor: '#f6ffed' }}
            >
              <Collapse size="small" ghost>
                {gameData.currentPlayer.privateClues.map(clue => (
                  <Panel 
                    header={
                      <Space>
                        <Badge status="success" />
                        <Text strong style={{ fontSize: '13px' }}>{clue.title}</Text>
                      </Space>
                    } 
                    key={clue.id}
                  >
                    <Text style={{ fontSize: '13px', color: '#666' }}>
                      {clue.content}
                    </Text>
                  </Panel>
                ))}
              </Collapse>
            </Card>
          </Col>
        </Row>
      </div>
      
      {/* Footer */}
      <div style={{ padding: '12px 24px', background: '#fff', boxShadow: '0 -2px 8px rgba(0,0,0,0.09)' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <TextArea 
              value={currentMessage}
              onChange={e => setCurrentMessage(e.target.value)}
              placeholder="输入消息..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSendMessage}
            >
              发送
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default CorePage;
