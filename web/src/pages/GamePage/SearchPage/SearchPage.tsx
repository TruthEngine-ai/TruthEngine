import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Button, Space, message, Modal, Badge, Tag, Tooltip } from 'antd';
import { 
  UserOutlined, 
  EyeOutlined, 
  RollbackOutlined, 
  ExclamationCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import type { RoomStatus, SearchableCharacter, AvailableClue } from '../../../api/websocket';
import { useAuth } from '../../../contexts/AuthContext';
import './SearchPage.css';

const { Title, Text, Paragraph } = Typography;

interface SearchPageProps {
  roomStatus: RoomStatus;
  onSearchEnd?: () => void;
  onSearchClue?: (clueId: number) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({
  roomStatus,
  onSearchEnd,
  onSearchClue
}) => {
  const { user } = useAuth();
  const [selectedCharacter, setSelectedCharacter] = useState<SearchableCharacter | null>(null);
  const [selectedClues, setSelectedClues] = useState<AvailableClue[]>([]);
  const [fogPosition, setFogPosition] = useState({ x: 0, y: 0 });

  // 检查当前用户是否为房主
  const isHost = user?.id === roomStatus.room.host_user_id;

  // 获取搜证信息
  const searchInfo = roomStatus.search_info;
  const searchableCharacters = searchInfo?.searchable_characters || [];
  const availableClues = searchInfo?.available_clues || [];
  const searchAttemptsLeft = searchInfo?.search_attempts_left || 0;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setFogPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (selectedCharacter) {
      // 过滤出选中角色拥有的线索
      const characterClues = availableClues.filter(
        clue => clue.owner_user_id === selectedCharacter.user_id
      );
      setSelectedClues(characterClues);
    }
  }, [selectedCharacter, availableClues]);

  const handleCharacterSelect = (character: SearchableCharacter) => {
    setSelectedCharacter(character);
  };

  const handleClueSearch = (clue: AvailableClue) => {
    if (searchAttemptsLeft <= 0) {
      message.warning('搜证次数已用完');
      return;
    }

    Modal.confirm({
      title: '确认搜查线索',
      icon: <ExclamationCircleOutlined />,
      content: `确定要搜查"${clue.name}"吗？这将消耗一次搜证机会。`,
      okText: '确认搜查',
      cancelText: '取消',
      onOk() {
        onSearchClue?.(clue.id);
        message.info('正在搜查线索...');
      }
    });
  };

  const handleBackToCharacters = () => {
    setSelectedCharacter(null);
  };

  const handleSearchEnd = () => {
    if (!isHost) {
      message.warning('只有房主可以操作结束搜证');
      return;
    }

    Modal.confirm({
      title: '确认结束搜证',
      icon: <ExclamationCircleOutlined />,
      content: '确定要结束搜证阶段吗？结束后将返回剧情进行。',
      okText: '结束搜证',
      cancelText: '取消',
      onOk() {
        onSearchEnd?.();
        message.info('正在结束搜证...');
      }
    });
  };

  return (
    <div className="search-page">
      <div 
        className="fog-overlay" 
        style={{ 
          background: `radial-gradient(
            circle at ${fogPosition.x}px ${fogPosition.y}px, 
            rgba(0, 0, 0, 0.4) 0%, 
            rgba(0, 0, 0, 0.8) 70%
          )`
        }}
      />
      
      <div className="content-container">
        {/* 搜查到的线索展示区域 */}
        {(searchInfo?.owned_clues && searchInfo.owned_clues.length > 0) && (
          <Card
            title={
              <Space>
                <EyeOutlined style={{ color: '#52c41a' }} />
                <span style={{ color: '#52c41a' }}>已搜查线索</span>
                <Tag color="green">{searchInfo.owned_clues.length} 个</Tag>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(82, 196, 26, 0.3)',
              borderRadius: '12px'
            }}
            headStyle={{ 
              background: 'rgba(82, 196, 26, 0.1)',
              borderBottom: '1px solid rgba(82, 196, 26, 0.3)',
              color: '#fff'
            }}
            bodyStyle={{ background: 'rgba(0, 0, 0, 0.6)' }}
          >
            <Row gutter={[16, 16]}>
              {searchInfo.owned_clues.map(clue => (
                <Col xs={24} sm={12} md={8} key={clue.id}>
                  <Card
                    size="small"
                    style={{
                      background: 'rgba(82, 196, 26, 0.1)',
                      border: '1px solid rgba(82, 196, 26, 0.3)',
                      borderRadius: '8px'
                    }}
                    title={
                      <Space>
                        <Text style={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}>
                          {clue.name}
                        </Text>
                      </Space>
                    }
                    extra={<Tag color="green">{clue.discovery_stage}</Tag>}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px' }}>
                        来源角色：{clue.searched_from_character}
                      </Text>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                        发现地点：{clue.discovery_location}
                      </Text>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                        {clue.description}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {!selectedCharacter ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Title level={3} style={{ margin: 0, color: '#fff' }}>
                  搜证阶段
                </Title>
                <Tag color="orange" style={{ fontSize: '14px' }}>
                  剩余搜证次数: {searchAttemptsLeft}
                </Tag>
              </div>
              {isHost && (
                <Tooltip title="结束搜证（仅房主）">
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearchEnd}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    结束搜证
                  </Button>
                </Tooltip>
              )}
            </div>
            
            <Title className="page-title">
              <span className="title-text">搜寻线索</span>
            </Title>
            
            <Paragraph className="instruction-text">
              选择一个角色进行搜查，揭开真相的面纱...
            </Paragraph>
            
            <Row gutter={[24, 24]} className="character-grid">
              {searchableCharacters.map(character => (
                <Col xs={24} sm={12} md={8} lg={6} key={character.character_id}>
                  <Card 
                    className="character-card"
                    onClick={() => handleCharacterSelect(character)}
                    hoverable
                    style={{
                      opacity: character.is_online ? 1 : 0.6,
                      filter: character.is_online ? 'none' : 'grayscale(0.3)'
                    }}
                  >
                    <div className="character-avatar">
                    </div>
                    <Space direction="vertical" size={4} style={{ width: '100%', textAlign: 'center' }}>
                      <Title level={4} className="character-name" style={{ margin: 0 }}>
                        {character.character_name}
                      </Title>
                      <Text className="character-desc" style={{ fontSize: '12px', color: '#666' }}>
                        玩家: {character.nickname}
                      </Text>
                      <Badge 
                        status={character.is_online ? "success" : "error"} 
                        text={character.is_online ? "在线" : "离线"}
                        style={{ fontSize: '12px' }}
                      />
                      {/* 显示该角色拥有的线索数量 */}
                      {availableClues.filter(clue => clue.owner_user_id === character.user_id).length > 0 && (
                        <Tag color="blue" style={{ marginTop: '4px' }}>
                          {availableClues.filter(clue => clue.owner_user_id === character.user_id).length} 个线索
                        </Tag>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <>
            <div className="search-header">
              <Button 
                type="text" 
                icon={<RollbackOutlined />} 
                onClick={handleBackToCharacters}
                className="back-button"
                style={{ color: '#fff' }}
              >
                返回角色选择
              </Button>
              <Title level={3} className="character-title" style={{ color: '#fff' }}>
                搜查 {selectedCharacter.character_name} 的线索
              </Title>
              {isHost && (
                <Tooltip title="结束搜证（仅房主）">
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearchEnd}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    结束搜证
                  </Button>
                </Tooltip>
              )}
            </div>
            
            {selectedClues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Text style={{ color: '#fff', fontSize: '16px' }}>
                  该角色暂无可搜查的线索
                </Text>
              </div>
            ) : (
              <Row gutter={[24, 24]} className="clues-container">
                {selectedClues.map(clue => (
                  <Col xs={24} sm={12} md={8} key={clue.id}>
                    <Card 
                      className="clue-card-container"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        cursor: searchAttemptsLeft > 0 ? 'pointer' : 'not-allowed',
                        opacity: searchAttemptsLeft > 0 ? 1 : 0.5
                      }}
                      hoverable={searchAttemptsLeft > 0}
                      onClick={() => searchAttemptsLeft > 0 && handleClueSearch(clue)}
                    >
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{ textAlign: 'center' }}>
                          <EyeOutlined style={{ fontSize: '24px', color: '#fff' }} />
                        </div>
                        <Title level={5} style={{ margin: 0, color: '#fff', textAlign: 'center' }}>
                          {clue.name}
                        </Title>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>
                          发现地点: {clue.discovery_location}
                        </Text>
                        <Tag color="blue" style={{ alignSelf: 'flex-start' }}>
                          {clue.discovery_stage}
                        </Tag>
                        {searchAttemptsLeft > 0 && (
                          <Button 
                            type="primary" 
                            size="small" 
                            style={{ width: '100%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClueSearch(clue);
                            }}
                          >
                            搜查线索
                          </Button>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
