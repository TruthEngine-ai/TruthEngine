import React, { useState } from 'react';
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Avatar,
  Space,
  Progress,
  Tag,
  message,
  Modal,
  List,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  CrownOutlined
} from '@ant-design/icons';
import type { RoomStatus } from '../../../api/websocket';
import { useAuth } from '../../../contexts/AuthContext';

const { Title, Paragraph, Text } = Typography;

interface VotePageProps {
  roomStatus: RoomStatus;
  onVote?: (votedUserId: number) => void;
  onLeaveRoom?: () => void;
  voteData?: {
    vote_id: number;
    vote_type: string;
    title: string;
    description: string;
    options: Array<{
      character_id: number;
      character_name: string;
      vote_count: number;
      voters: string[];
    }>;
    voted_character_id?: number;
    is_active: boolean;
    vote_counts?: Array<{
      user_id: number;
      nickname: string;
      vote_count: number;
    }>;
    vote_details?: Array<{
      voter_nickname: string;
      voted_nickname: string;
      timestamp: string;
    }>;
    total_votes?: number;
  };
}

const VotePage: React.FC<VotePageProps> = ({
  roomStatus,
  onVote,
  onLeaveRoom,
  voteData
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { user } = useAuth();

  const currentPlayer = roomStatus.characters?.find(char => char.is_self);
  
  // 根据房间状态中的voting_info.vote_details判断当前用户是否已经投过票
  const myVoteDetail = roomStatus.voting_info?.vote_details?.find(detail => 
    detail.voter_user_id === user?.id
  );
  const hasVoted = !!myVoteDetail;

  // 根据被投票人ID获取被投票人昵称
  const getVotedNickname = (votedId: number) => {
    const votedPlayer = roomStatus.players?.find(p => p.user_id === votedId);
    return votedPlayer?.nickname || '';
  };

  const handleSelectCharacter = (characterId: number) => {
    if (hasVoted) {
      message.warning('您已经投过票了');
      return;
    }
    // 通过角色ID找到对应的用户ID
    const character = roomStatus.characters?.find(char => char.character_id === characterId);
    const player = roomStatus.players?.find(p => p.character_name === character?.character_name);
    if (player) {
      setSelectedUserId(player.user_id);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmVote = () => {
    if (selectedUserId !== null) {
      onVote?.(selectedUserId);
      setShowConfirmModal(false);
      setSelectedUserId(null);
      message.success('投票成功');
    }
  };

  const getTotalVotes = () => {
    return voteData?.options.reduce((total, option) => total + option.vote_count, 0) || 0;
  };

  const getVotePercentage = (voteCount: number) => {
    const total = getTotalVotes();
    return total > 0 ? (voteCount / total) * 100 : 0;
  };

  // 根据用户ID获取角色信息
  const getCharacterByUserId = (userId: number) => {
    const player = roomStatus.players?.find(p => p.user_id === userId);
    return roomStatus.characters?.find(char => char.character_name === player?.character_name);
  };

  const selectedCharacter = selectedUserId ? getCharacterByUserId(selectedUserId) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px' }}>
      {/* 头部信息 */}
      <Card 
        style={{ 
          marginBottom: '24px', 
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
          border: 'none',
          color: '#fff'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={4}>
              <Title level={2} style={{ margin: 0, color: '#fff' }}>
                {voteData?.title || '投票环节'}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                {voteData?.description || '请选择您最怀疑的角色'}
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 投票选项 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>选择怀疑对象</span>
                <Tag color="blue">{roomStatus.characters?.filter(char => char.is_alive).length || 0} 人存活</Tag>
              </Space>
            }
            style={{ borderRadius: '8px' }}
          >
            <Row gutter={[16, 16]}>
              {roomStatus.characters
                ?.filter(char => char.is_alive && !char.is_self) // 排除自己
                .map(character => {
                  const voteOption = voteData?.options.find(option => option.character_id === character.character_id);
                  const voteCount = voteOption?.vote_count || 0;
                  const percentage = getVotePercentage(voteCount);
                  const isSelected = selectedUserId === character.character_id;
                  // 检查是否投票给了这个角色（通过角色对应的玩家ID）
                  const characterPlayer = roomStatus.players?.find(p => p.character_name === character.character_name);
                  const hasVotedForThis = myVoteDetail?.voted_user_id === characterPlayer?.user_id;

                  return (
                    <Col xs={24} sm={12} md={8} key={character.character_id}>
                      <Card
                        hoverable={!hasVoted}
                        onClick={() => handleSelectCharacter(character.character_id)}
                        style={{
                          cursor: !hasVoted ? 'pointer' : 'default',
                          borderColor: hasVotedForThis ? '#52c41a' : isSelected ? '#1890ff' : undefined,
                          borderWidth: (hasVotedForThis || isSelected) ? '2px' : '1px',
                          position: 'relative',
                          opacity: hasVoted && !hasVotedForThis ? 0.7 : 1
                        }}
                        bodyStyle={{ padding: '16px' }}
                      >
                        {hasVotedForThis && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            zIndex: 1
                          }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                          </div>
                        )}
                        
                        <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                          <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                          
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>{character.character_name}</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Space size={4}>
                                <Tag color="default">{character.gender}</Tag>
                                {roomStatus.players?.find(p => p.nickname === character.player_nickname)?.is_host && (
                                  <Tooltip title="房主">
                                    <CrownOutlined style={{ color: '#faad14' }} />
                                  </Tooltip>
                                )}
                              </Space>
                            </div>
                          </div>

                          <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                            玩家：{character.player_nickname}
                          </Text>

                          {/* 投票进度 */}
                          {voteData && (
                            <div style={{ width: '100%' }}>
                              <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: '12px' }}>得票</Text>
                                <Text style={{ fontSize: '12px' }}>{voteCount} 票</Text>
                              </div>
                              <Progress
                                percent={percentage}
                                size="small"
                                showInfo={false}
                                strokeColor={hasVotedForThis ? '#52c41a' : '#1890ff'}
                              />
                            </div>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
            </Row>
          </Card>
        </Col>

        {/* 右侧信息面板 */}
        <Col xs={24} lg={8}>
          {/* 投票统计 */}
          {voteData && (
            <Card
              title="投票统计"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>总投票数：</Text>
                  <Text>{voteData.total_votes || getTotalVotes()} / {(roomStatus.characters?.filter(char => char.is_alive).length || 1) - 1}</Text>
                </div>
                
                <List
                  size="small"
                  dataSource={voteData.options
                    .filter(option => option.vote_count > 0)
                    .sort((a, b) => b.vote_count - a.vote_count)}
                  renderItem={(option) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <Text strong>{option.character_name}</Text>
                          <Text>{option.vote_count} 票</Text>
                        </div>
                        <Progress
                          percent={getVotePercentage(option.vote_count)}
                          size="small"
                          showInfo={false}
                        />
                        {option.voters.length > 0 && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            投票者：{option.voters.join(', ')}
                          </Text>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </Space>
            </Card>
          )}

          {/* 我的角色信息 */}
          {currentPlayer && (
            <Card
              title={
                <Space>
                  <UserOutlined />
                  <span>我的角色</span>
                  {hasVoted && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                </Space>
              }
              style={{ borderRadius: '8px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ fontSize: '16px' }}>{currentPlayer.character_name}</Text>
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary">{currentPlayer.gender} · {currentPlayer.player_nickname}</Text>
                  </div>
                </div>
                
                {hasVoted && myVoteDetail && (
                  <div style={{ 
                    padding: '12px', 
                    background: '#f6ffed', 
                    borderRadius: '6px',
                    border: '1px solid #b7eb8f'
                  }}>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <div>
                        <Text strong style={{ color: '#52c41a' }}>已投票</Text>
                        <div>
                          <Text style={{ fontSize: '12px' }}>
                            您投给了：{getVotedNickname(myVoteDetail.voted_user_id)}
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </div>
                )}

                {!hasVoted && (
                  <div style={{ 
                    padding: '12px', 
                    background: '#e6f7ff', 
                    borderRadius: '6px',
                    border: '1px solid #91d5ff'
                  }}>
                    <Space>
                      <ExclamationCircleOutlined style={{ color: '#1890ff' }} />
                      <div>
                        <Text strong style={{ color: '#1890ff' }}>等待投票</Text>
                        <div>
                          <Text style={{ fontSize: '12px' }}>
                            请选择您最怀疑的角色
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </div>
                )}
              </Space>
            </Card>
          )}

          {/* 离开房间按钮 */}
          <Card style={{ marginTop: '16px', borderRadius: '8px' }}>
            <Button 
              type="primary" 
              danger 
              block
              onClick={onLeaveRoom}
            >
              离开房间
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 确认投票模态框 */}
      <Modal
        title="确认投票"
        open={showConfirmModal}
        onOk={handleConfirmVote}
        onCancel={() => setShowConfirmModal(false)}
        okText="确认投票"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Title level={4}>确定要投票给以下角色吗？</Title>
            
            {selectedCharacter && (
              <Card size="small" style={{ marginTop: '16px' }}>
                <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                  <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>{selectedCharacter.character_name}</Text>
                    <div>
                      <Text type="secondary">玩家：{selectedCharacter.player_nickname}</Text>
                    </div>
                  </div>
                </Space>
              </Card>
            )}
            
            <Paragraph style={{ marginTop: '16px', color: '#666' }}>
              投票后无法修改，请谨慎选择。
            </Paragraph>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default VotePage;
