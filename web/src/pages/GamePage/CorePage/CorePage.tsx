import React from 'react';
import {
  Typography,
  Button,
  Tabs,
  Card,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  List,
  message,
  Badge,
  Tooltip,
  Alert,
  Modal,
  Collapse
} from 'antd';
import {
  InfoCircleOutlined,
  TeamOutlined,
  UserOutlined,
  RightCircleOutlined,
  LogoutOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  CrownOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import type { RoomStatus } from '../../../api/websocket';
import { useAuth } from '../../../contexts/AuthContext';
import useIsMobile from '../../../hooks/useIsMobile';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface CorePageProps {
  roomStatus: RoomStatus;
  onLeaveRoom?: () => void;
  onNextStage?: () => void;
  onSearchBegin?: () => void;
}

const CorePage: React.FC<CorePageProps> = ({
  roomStatus,
  onLeaveRoom,
  onNextStage,
  onSearchBegin
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // 找到当前玩家角色
  const currentPlayer = roomStatus.characters?.find(char => char.is_self);

  // 检查当前用户是否为房主
  const isHost = user?.id === roomStatus.room.host_user_id;

  // 检查是否为最后一幕
  const isLastStage = roomStatus.current_stage?.current_stage.stage_number === roomStatus.script?.total_stages;

  const handleLeaveRoom = () => {
    Modal.confirm({
      title: '确认离开房间',
      icon: <ExclamationCircleOutlined />,
      content: '确定要离开房间吗？离开后需要重新加入。',
      okText: '确定离开',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        message.success('已离开房间');
        onLeaveRoom?.();
      }
    });
  };

  const handleNextStage = () => {
    if (!isHost) {
      message.warning('只有房主可以操作进入下一幕');
      return;
    }

    const title = isLastStage ? '确认进入投票环节' : '确认进入下一幕';
    const content = isLastStage
      ? '确定要进入投票环节吗？进入后将开始最终投票阶段，无法返回当前幕。'
      : '确定要进入下一幕吗？';

    Modal.confirm({
      title,
      icon: <ExclamationCircleOutlined />,
      content,
      okText: isLastStage ? '进入投票' : '进入下一幕',
      cancelText: '取消',
      onOk() {
        onNextStage?.();
        message.info(isLastStage ? '正在进入投票环节...' : '正在进入下一幕...');
      }
    });
  };

  const handleSearchBegin = () => {
    if (!isHost) {
      message.warning('只有房主可以操作开始搜查');
      return;
    }

    Modal.confirm({
      title: '确认开始搜查',
      icon: <ExclamationCircleOutlined />,
      content: '确定要开始搜查吗？开始后玩家可以进行搜证行动。',
      okText: '开始搜查',
      cancelText: '取消',
      onOk() {
        onSearchBegin?.();
        message.info('正在开始搜查...');
      }
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '0 12px' : '0 24px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
        zIndex: 1,
        height: isMobile ? '48px' : '64px',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}
      >
        <Title 
          level={isMobile ? 4 : 3} 
          style={{ 
            margin: 0, 
            color: '#1a1a1a',
            fontSize: isMobile ? '14px' : undefined,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {roomStatus.script?.title || '游戏进行中'}
        </Title>
        <Button
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLeaveRoom}
          size={isMobile ? 'small' : 'middle'}
        >
          {isMobile ? '离开' : '离开房间'}
        </Button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '24px' }}>
        {/* 剧本信息 */}
        <Card
          style={{
            marginBottom: isMobile ? '12px' : '24px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          <Row gutter={isMobile ? 12 : 24} align="middle">
            <Col xs={24} sm={18}>
              <Space direction="vertical" size={4}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Title 
                    level={isMobile ? 4 : 2} 
                    style={{ margin: 0, color: '#fff' }}
                  >
                    {roomStatus.script?.title}
                  </Title>
                  <Space wrap>
                    {roomStatus.script?.tags?.slice(0, isMobile ? 2 : 3).map((tag, index) => (
                      <Tag key={index} color="rgba(255,255,255,0.2)" style={{
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.3)',
                        background: 'rgba(255,255,255,0.1)',
                        fontSize: isMobile ? '11px' : '12px'
                      }}>
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                </div>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: isMobile ? '13px' : '16px', 
                  lineHeight: '1.5',
                  display: isMobile ? '-webkit-box' : 'block',
                  WebkitLineClamp: isMobile ? 2 : 'none',
                  WebkitBoxOrient: 'vertical',
                  overflow: isMobile ? 'hidden' : 'visible'
                }}>
                  {roomStatus.script?.description}
                </Text>
              </Space>
            </Col>
            <Col xs={24} sm={6} style={{ textAlign: isMobile ? 'left' : 'right', marginTop: isMobile ? '12px' : 0 }}>
              <Space direction={isMobile ? 'horizontal' : 'vertical'} size={8} style={{ width: '100%', alignItems: isMobile ? 'center' : 'flex-end' }}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', display: 'block' }}>
                    房间代码
                  </Text>
                  <Text style={{ color: '#fff', fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>
                    {roomStatus.room.code}
                  </Text>
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px' }}>
                  {roomStatus.room.game_settings?.theme} · {roomStatus.room.game_settings?.difficulty}
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={isMobile ? 12 : 24}>
          <Col xs={24} md={isMobile ? 24 : 16}>
            {/* 左侧内容区域 */}
            <Tabs 
              defaultActiveKey="1" 
              type="card"
              size={isMobile ? 'small' : 'middle'}
              tabPosition={isMobile ? 'top' : 'top'}
            >
              <TabPane
                tab={<span><PlayCircleOutlined /> {isMobile ? '当前幕' : '当前幕'}</span>}
                key="1"
              >
                {/* 剧本背景 */}
                <Card
                  bordered={false}
                  style={{ 
                    borderRadius: '8px', 
                    marginBottom: isMobile ? '12px' : '16px', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                  }}
                  title="案件背景"
                  size={isMobile ? 'small' : 'default'}
                >
                  <Paragraph style={{ 
                    fontSize: isMobile ? '13px' : '14px', 
                    lineHeight: '1.6' 
                  }}>
                    {roomStatus.script?.overview}
                  </Paragraph>
                </Card>

                {/* 历史幕信息 */}
                {roomStatus.current_stage?.all_stages && (
                  <Card
                    title={
                      <Space wrap>
                        <HistoryOutlined />
                        <span>剧情进展</span>
                        <Tooltip title={isHost ? '开始搜查' : '只有房主可以操作'}>
                          <Button
                            type="default"
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={handleSearchBegin}
                            disabled={!isHost}
                            style={{
                              opacity: isHost ? 1 : 0.6,
                              fontSize: isMobile ? '11px' : '12px'
                            }}
                          >
                            {isMobile ? '搜查' : (isHost ? '进入搜查' : '进入搜查（仅房主）')}
                          </Button>
                        </Tooltip>
                        <Tooltip title={isHost ? (isLastStage ? '进入投票环节' : '进入下一幕') : '只有房主可以操作'}>
                          <Button
                            type="primary"
                            size="small"
                            icon={isHost ? <RightCircleOutlined /> : <CrownOutlined />}
                            onClick={handleNextStage}
                            disabled={!isHost}
                            style={{
                              opacity: isHost ? 1 : 0.6,
                              fontSize: isMobile ? '11px' : '12px'
                            }}
                          >
                            {isMobile ? (isLastStage ? '投票' : '下一幕') : (isHost ? (isLastStage ? '进入投票' : '下一幕') : '下一幕（仅房主）')}
                          </Button>
                        </Tooltip>
                      </Space>
                    }
                    bordered={false}
                    style={{ 
                      borderRadius: '8px', 
                      marginBottom: isMobile ? '12px' : '16px', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                    }}
                    size={isMobile ? 'small' : 'default'}
                  >
                    <Collapse ghost defaultActiveKey={[roomStatus.current_stage.current_stage.stage_number.toString()]}>
                      {roomStatus.current_stage.all_stages
                        .sort((a, b) => a.stage_number - b.stage_number)
                        .map(stage => (
                          <Panel
                            header={
                              <Space>
                                <Text strong style={{
                                  color: stage.is_current ? '#1890ff' : '#666',
                                  fontSize: stage.is_current ? '15px' : '14px'
                                }}>
                                  第 {stage.stage_number} 幕：{stage.name}
                                </Text>
                                {stage.is_current && <Tag color="blue">当前幕</Tag>}
                                {!stage.is_current && roomStatus.current_stage && stage.stage_number < roomStatus.current_stage.current_stage.stage_number && (
                                  <Tag color="green">已完成</Tag>
                                )}
                              </Space>
                            }
                            key={stage.stage_number}
                            style={{
                              border: stage.is_current ? '1px solid #1890ff' : 'none',
                              borderRadius: '6px',
                              marginBottom: '8px',
                              background: stage.is_current ? '#f0f8ff' : 'transparent'
                            }}
                          >
                            <div style={{ paddingLeft: '16px' }}>
                              <div style={{ marginBottom: '12px' }}>
                                <Text strong style={{ color: '#1890ff' }}>剧情描述</Text>
                                <Paragraph style={{ margin: '6px 0', fontSize: '13px', lineHeight: '1.6' }}>
                                  {stage.opening_narrative}
                                </Paragraph>
                              </div>

                              <div style={{ marginBottom: '12px' }}>
                                <Text strong style={{ color: '#52c41a' }}>幕目标</Text>
                                <Paragraph style={{ margin: '6px 0', fontSize: '13px', lineHeight: '1.6' }}>
                                  {stage.stage_goal}
                                </Paragraph>
                              </div>

                              {stage.character_goal && (
                                <div>
                                  <Text strong style={{ color: '#fa541c' }}>阶段提示</Text>
                                  <div style={{ margin: '6px 0' }}>
                                    <Paragraph style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                                      {stage.character_goal.goal_description}
                                    </Paragraph>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Panel>
                        ))}
                    </Collapse>
                  </Card>
                )}

                {/* 所有角色信息 */}
                <Card
                  title={<span><TeamOutlined /> 所有角色</span>}
                  bordered={false}
                  style={{ 
                    borderRadius: '8px', 
                    marginBottom: isMobile ? '12px' : '16px', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                  }}
                  size={isMobile ? 'small' : 'default'}
                >
                  <Row gutter={isMobile ? 8 : 16}>
                    {roomStatus.characters?.map(char => {
                      // 根据角色的玩家昵称找到对应的玩家信息
                      const player = roomStatus.players?.find(p => p.nickname === char.player_nickname);
                      const isOnline = player?.is_online || false;

                      return (
                        <Col xs={24} sm={isMobile ? 24 : 12} key={char.character_id} style={{ marginBottom: isMobile ? '8px' : '16px' }}>
                          <Card
                            size="small"
                            style={{
                              borderLeft: char.is_self ? '4px solid #52c41a' : char.is_alive ? '4px solid #1890ff' : '4px solid #d9d9d9',
                              borderRadius: '6px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              opacity: isOnline ? 1 : 0.6,
                              filter: isOnline ? 'none' : 'grayscale(0.3)'
                            }}
                            title={
                              <Space>
                                <Badge status={char.is_alive ? "success" : "error"} />
                                <span style={{
                                  fontSize: '14px',
                                  color: isOnline ? 'inherit' : '#999'
                                }}>
                                  {char.character_name}
                                </span>
                                <Tag color={isOnline ? 'green' : 'red'}>
                                  {isOnline ? '在线' : '离线'}
                                </Tag>
                                {char.is_self && <Tooltip title="当前角色"><UserOutlined /></Tooltip>}
                                {/* 显示房主标识 */}
                                {player?.is_host && (
                                  <Tooltip title="房主">
                                    <CrownOutlined style={{ color: '#faad14' }} />
                                  </Tooltip>
                                )}
                              </Space>
                            }
                            bordered={false}
                          >
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Text style={{ color: isOnline ? 'inherit' : '#999' }}>
                                <Text strong>性别：</Text>{char.gender}
                              </Text>
                              <Text style={{ color: isOnline ? 'inherit' : '#999' }}>
                                <Text strong>玩家：</Text>{char.player_nickname}
                              </Text>
                              <Paragraph style={{
                                margin: 0,
                                fontSize: '12px',
                                color: isOnline ? '#666' : '#999'
                              }}>
                                {char.public_info}
                              </Paragraph>
                            </Space>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </Card>
              </TabPane>


              <TabPane
                tab={<span><ClockCircleOutlined /> 故事时间线</span>}
                key="3"
              >
                {/* 公开时间线 */}
                <Card
                  title="公开时间线"
                  bordered={false}
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  <List
                    dataSource={roomStatus.story_timeline?.public || []}
                    renderItem={(event) => (
                      <List.Item>
                        <Card size="small" style={{ width: '100%' }}>
                          <div style={{ marginBottom: '8px' }}>
                            <Tag color="blue">{event.character_name}</Tag>

                          </div>
                          <Paragraph style={{ margin: 0 }}>
                            {event.event_description}
                          </Paragraph>
                        </Card>
                      </List.Item>
                    )}
                  />
                </Card>

                {/* 私有时间线（仅当玩家是凶手时显示） */}
                {currentPlayer?.is_murderer && roomStatus.story_timeline?.private && roomStatus.story_timeline.private.length > 0 && (
                  <Card
                    title={
                      <span style={{ color: '#fa541c' }}>
                        <EyeInvisibleOutlined /> 私有时间线（仅你可见）
                      </span>
                    }
                    bordered={false}
                    style={{
                      borderRadius: '8px',
                      marginBottom: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      borderLeft: '4px solid #fa541c'
                    }}
                  >
                    <List
                      dataSource={roomStatus.story_timeline.private}
                      renderItem={(event) => (
                        <List.Item>
                          <Card size="small" style={{ width: '100%', background: '#fff7e6' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <Tag color="orange">{event.character_name}</Tag>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {new Date(event.created_at).toLocaleString()}
                              </Text>
                            </div>
                            <Paragraph style={{ margin: 0 }}>
                              {event.event_description}
                            </Paragraph>
                          </Card>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </TabPane>

              <TabPane
                tab={<span><SearchOutlined /> 线索收集</span>}
                key="4"
              >
                {/* 公开线索 */}
                <Card
                  title="公开线索"
                  bordered={false}
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  <Row gutter={16}>
                    {roomStatus.clues?.public?.map(clue => (
                      <Col xs={24} sm={12} key={clue.id} style={{ marginBottom: '16px' }}>
                        <Card
                          size="small"
                          title={clue.name}
                          extra={<Tag color="blue">{clue.discovery_stage}</Tag>}
                        >
                          <Paragraph style={{ fontSize: '13px', margin: 0 }}>
                            {clue.description}
                          </Paragraph>
                          <div style={{ marginTop: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              发现地点：{clue.discovery_location}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              来源：{clue.source === 'script' ? '剧本' : '搜查'}
                            </Text>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>

                {/* 私有线索 */}
                {roomStatus.clues?.private && roomStatus.clues.private.length > 0 && (
                  <Card
                    title={<span style={{ color: '#52c41a' }}>🔍 私有线索</span>}
                    bordered={false}
                    style={{
                      borderRadius: '8px',
                      marginBottom: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      borderLeft: '4px solid #52c41a'
                    }}
                  >
                    <Row gutter={16}>
                      {roomStatus.clues.private.map(clue => (
                        <Col xs={24} sm={12} key={clue.id} style={{ marginBottom: '16px' }}>
                          <Card
                            size="small"
                            title={clue.name}
                            extra={<Tag color="green">{clue.discovery_stage}</Tag>}
                            style={{ background: '#f6ffed' }}
                          >
                            <Paragraph style={{ fontSize: '13px', margin: 0 }}>
                              {clue.description}
                            </Paragraph>
                            <div style={{ marginTop: '8px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                发现地点：{clue.discovery_location}
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                来源：{clue.source === 'script' ? '剧本' : '搜查'}
                              </Text>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}

                {/* 搜查获得的线索 */}
                {roomStatus.clues?.searched && roomStatus.clues.searched.length > 0 && (
                  <Card
                    title={<span style={{ color: '#fa8c16' }}>🔎 搜查线索</span>}
                    bordered={false}
                    style={{
                      borderRadius: '8px',
                      marginBottom: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      borderLeft: '4px solid #fa8c16'
                    }}
                  >
                    <Row gutter={16}>
                      {roomStatus.clues.searched.map(clue => (
                        <Col xs={24} sm={12} key={clue.id} style={{ marginBottom: '16px' }}>
                          <Card
                            size="small"
                            title={clue.name}
                            extra={
                              <Space>
                                <Tag color="orange">{clue.discovery_stage}</Tag>
                                {clue.is_public_search && <Tag color="cyan">公开搜查</Tag>}
                              </Space>
                            }
                            style={{ background: '#fff7e6' }}
                          >
                            <Paragraph style={{ fontSize: '13px', margin: 0 }}>
                              {clue.description}
                            </Paragraph>
                            <div style={{ marginTop: '8px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                发现地点：{clue.discovery_location}
                              </Text>
                              <br />
                              {clue.searched_from && (
                                <>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    搜查来源：{clue.searched_from}
                                  </Text>
                                  <br />
                                </>
                              )}
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                搜查类型：{clue.is_public_search ? '公开搜查' : '私密搜查'}
                              </Text>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}
              </TabPane>

              <TabPane
                tab={<span><InfoCircleOutlined /> 剧本详情</span>}
                key="2"
              >
                <Card
                  bordered={false}
                  style={{ borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  title="剧本信息"
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text><Text strong>难度等级：</Text>{roomStatus.script?.difficulty}</Text>
                    </Col>
                    <Col span={12}>
                      <Text><Text strong>游戏时长：</Text>{roomStatus.script?.duration_mins} 分钟</Text>
                    </Col>
                    <Col span={12}>
                      <Text><Text strong>玩家数量：</Text>{roomStatus.script?.player_count_min}-{roomStatus.script?.player_count_max} 人</Text>
                    </Col>
                    <Col span={12}>
                      <Text><Text strong>房间状态：</Text>{roomStatus.room.status}</Text>
                    </Col>
                  </Row>

                  <Divider orientation="left">剧本标签</Divider>
                  <Space wrap>
                    {roomStatus.script?.tags?.map((tag, index) => (
                      <Tag key={index} color="blue">
                        {tag}
                      </Tag>
                    ))}
                  </Space>

                  {roomStatus.room.started_at && (
                    <>
                      <Divider orientation="left">游戏时间</Divider>
                      <Text><Text strong>开始时间：</Text>{new Date(roomStatus.room.started_at).toLocaleString()}</Text>
                    </>
                  )}
                </Card>
              </TabPane>

              {/* 复盘Tab - 只有当solution存在时才显示 */}
              {roomStatus.solution && (
                <TabPane
                  tab={<span><SolutionOutlined /> 游戏复盘</span>}
                  key="5"
                >
                  <Card
                    title={
                      <Space>
                        <SolutionOutlined style={{ color: '#fa541c' }} />
                        <span style={{ color: '#fa541c' }}>案件真相</span>
                      </Space>
                    }
                    bordered={false}
                    style={{
                      borderRadius: '8px',
                      marginBottom: isMobile ? '12px' : '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      borderLeft: '4px solid #fa541c'
                    }}
                    headStyle={{ backgroundColor: '#fff7e6' }}
                    size={isMobile ? 'small' : 'default'}
                  >
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div>
                        <Title level={4} style={{ color: '#fa541c', marginBottom: '12px' }}>
                          案件答案
                        </Title>
                        <Card
                          size="small"
                          style={{
                            background: '#fff2e8',
                            border: '1px solid #ffbb96'
                          }}
                        >
                          <Text style={{
                            fontSize: isMobile ? '14px' : '16px',
                            lineHeight: '1.6',
                            color: '#2f1b14'
                          }}>
                            {roomStatus.solution.answer}
                          </Text>
                        </Card>
                      </div>

                      <div>
                        <Title level={4} style={{ color: '#fa541c', marginBottom: '12px' }}>
                          推理过程
                        </Title>
                        <Card
                          size="small"
                          style={{
                            background: '#fff2e8',
                            border: '1px solid #ffbb96'
                          }}
                        >
                          <Paragraph style={{
                            fontSize: isMobile ? '13px' : '14px',
                            lineHeight: '1.8',
                            margin: 0,
                            color: '#2f1b14',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {roomStatus.solution.reasoning}
                          </Paragraph>
                        </Card>
                      </div>

                      <Alert
                        message="游戏结束"
                        description="以上是本案的完整真相和推理过程，感谢参与游戏！"
                        type="success"
                        showIcon
                        style={{ fontSize: isMobile ? '12px' : '14px' }}
                      />
                    </Space>
                  </Card>
                </TabPane>
              )}

            </Tabs>
          </Col>

          <Col xs={24} md={isMobile ? 24 : 8} style={{ marginTop: isMobile ? '16px' : 0 }}>
            {/* 个人信息区域 */}
            {currentPlayer && (
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    <span style={{ fontSize: isMobile ? '14px' : '16px' }}>我的角色信息</span>
                    {isHost && (
                      <Tooltip title="房主">
                        <CrownOutlined style={{ color: '#faad14' }} />
                      </Tooltip>
                    )}
                  </Space>
                }
                bordered={false}
                style={{
                  borderRadius: '8px',
                  marginBottom: isMobile ? '12px' : '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #1890ff'
                }}
                headStyle={{ backgroundColor: '#f0f8ff' }}
                size={isMobile ? 'small' : 'default'}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      {currentPlayer.character_name}
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary">{currentPlayer.gender} · 玩家：{currentPlayer.player_nickname}</Text>
                    </div>
                  </div>

                  <div>
                    <Text strong>角色描述：</Text>
                    <Paragraph style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                      {currentPlayer.public_info}
                    </Paragraph>
                  </div>

                  {/* 身份警告 */}
                  {currentPlayer.is_murderer && (
                    <Alert
                      message="你是凶手"
                      description="请小心隐藏身份，完成你的任务目标"
                      type="warning"
                      showIcon
                      style={{ fontSize: '12px' }}
                    />
                  )}
                </Space>
              </Card>
            )}

            {/* 角色背景故事 */}
            {currentPlayer?.backstory && (
              <Card
                title={<span style={{ color: '#fa541c' }}>🔒 角色背景</span>}
                bordered={false}
                style={{
                  borderRadius: '8px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #fa541c'
                }}
                headStyle={{ backgroundColor: '#fff7e6' }}
              >
                <Paragraph style={{ fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                  {currentPlayer.backstory}
                </Paragraph>
              </Card>
            )}

            {/* 个人目标 */}
            {roomStatus.current_stage?.current_stage.character_goal && (
              <Card
                title={<span style={{ color: '#52c41a' }}>🎯 剧情提示</span>}
                bordered={false}
                style={{
                  borderRadius: '8px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #52c41a'
                }}
                headStyle={{ backgroundColor: '#f6ffed' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Paragraph style={{ fontSize: '13px', margin: 0 }}>
                    {roomStatus.current_stage.current_stage.character_goal.goal_description}
                  </Paragraph>
                  <div>
                    <Tag color={roomStatus.current_stage.current_stage.character_goal.is_mandatory ? 'red' : 'blue'}>
                      {roomStatus.current_stage.current_stage.character_goal.is_mandatory ? '强制目标' : '可选目标'}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      搜证次数：{roomStatus.current_stage.current_stage.character_goal.search_attempts}
                    </Text>
                  </div>
                </Space>
              </Card>
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default CorePage;
