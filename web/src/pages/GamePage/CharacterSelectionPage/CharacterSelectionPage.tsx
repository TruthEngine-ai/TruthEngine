import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Radio, message, theme, Avatar, Tag, Space, Tooltip } from 'antd';
import { UserOutlined, CheckCircleOutlined, LockOutlined, PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { type RoomStatus } from '../../../hooks/useWebSocket';
import { useAuth } from '../../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

interface CharacterSelectionPageProps {
  roomStatus: RoomStatus;
  selectCharacter: (characterId: number) => void;
  startGame: () => void;
}

const CharacterSelectionPage: React.FC<CharacterSelectionPageProps> = ({ roomStatus, selectCharacter, startGame }) => {
  const { token } = theme.useToken();
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [hoveredCharacter, setHoveredCharacter] = useState<number | null>(null);
  const { user } = useAuth();

  // 获取房间状态中的剧本和角色信息
  const { script, characters, players } = roomStatus;

  // 当前用户ID
  const currentUserId = user?.id;
  
  // 检查当前用户是否已经选择了角色
  const currentUserPlayer = players.find(p => p.user_id === currentUserId);
  const hasSelectedCharacter = !!currentUserPlayer?.character_id;
  
  // 判断当前用户是否是房主
  const isHost = currentUserPlayer?.is_host || false;
  
  // 检查是否所有玩家都已选择角色
  const allPlayersSelectedCharacter = players.every(player => player.character_id !== null && player.character_id !== undefined);

  // 当组件加载或房间状态更新时，如果用户已经选择了角色，更新选择状态
  useEffect(() => {
    if (currentUserPlayer?.character_id) {
      setSelectedCharacterId(currentUserPlayer.character_id);
    }
  }, [roomStatus, currentUserPlayer?.character_id]);

  const handleSelectCharacter = (characterId: number) => {
    // 如果用户已经确认选择角色，则不允许更改
    if (hasSelectedCharacter) return;
    
    // 如果角色已被选择，不允许选择
    const character = characters.find(c => c.id === characterId);
    if (character?.selected_by && character.selected_by !== currentUserId) return;
    
    setSelectedCharacterId(characterId);
  };

  const handleConfirmSelection = () => {
    if (!selectedCharacterId) {
      message.error('请先选择一个角色');
      return;
    }
    
    // 如果用户已经选择了角色，不允许再次确认
    if (hasSelectedCharacter) {
      message.info('你已经选择了角色，不能更换');
      return;
    }
    
    const character = characters.find(c => c.id === selectedCharacterId);
    if (character) {
      // 检查角色是否已被其他人选择
      if (character.selected_by && character.selected_by !== currentUserId) {
        message.error('该角色已被其他玩家选择');
        setSelectedCharacterId(null);
        return;
      }
      
      message.success(`你选择了角色: ${character.name}`);
      selectCharacter(selectedCharacterId);
    }
  };
  
  // 处理开始游戏
  const handleStartGame = () => {
    if (!allPlayersSelectedCharacter) {
      message.warning('还有玩家未选择角色');
      return;
    }
    
    startGame();
    message.success('游戏开始请求已发送');
  };

  // 获取选择角色的玩家昵称
  const getCharacterSelector = (characterId: number) => {
    const character = characters.find(c => c.id === characterId);
    if (!character || !character.selected_by) return null;
    
    const player = players.find(p => p.user_id === character.selected_by);
    return player?.nickname || '未知玩家';
  };

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const cardStyle = (characterId: number) => {
    const character = characters.find(c => c.id === characterId);
    const isSelected = !!character?.selected_by;
    const isSelectedByMe = character?.selected_by === currentUserId;
    
    return {
      marginBottom: '20px',
      backgroundColor: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      boxShadow: selectedCharacterId === characterId ? `0 0 0 2px ${token.colorPrimary}` : token.boxShadow,
      border: `1px solid ${selectedCharacterId === characterId ? token.colorPrimary : token.colorBorderSecondary}`,
      transition: 'all 0.3s ease',
      cursor: (isSelected && !isSelectedByMe) || hasSelectedCharacter ? 'not-allowed' : 'pointer',
      transform: (hoveredCharacter === characterId || selectedCharacterId === characterId) && !hasSelectedCharacter ? 'scale(1.02)' : 'scale(1)',
      width: '280px',
      flexShrink: 0,
      marginRight: '16px',
      opacity: (isSelected && !isSelectedByMe) ? 0.7 : 1,
      position: 'relative' as const
    };
  };

  // 玩家选择状态统计
  const playerSelectionStatus = () => {
    const selectedCount = players.filter(p => p.character_id !== null && p.character_id !== undefined).length;
    return `${selectedCount}/${players.length} 玩家已选择角色`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <Card
        style={{
          marginBottom: '24px',
          backgroundColor: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadow,
        }}
      >
        <Title level={2} style={{ textAlign: 'center', color: token.colorTextHeading }}>
          {script?.title}
        </Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary, marginBottom: '24px' }}>
          {script?.description}
        </Paragraph>
      </Card>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <Title level={3} style={{ color: token.colorTextHeading, margin: 0 }}>
          选择你的角色
        </Title>
        
        <Space>
          <Tag color="processing">{playerSelectionStatus()}</Tag>
          
          {isHost && (
            <Tooltip title={!allPlayersSelectedCharacter ? "等待所有玩家选择角色后才能开始游戏" : ""}>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={handleStartGame}
                disabled={!allPlayersSelectedCharacter}
              >
                开始游戏
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
      
      {hasSelectedCharacter && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Tag color="success" icon={<CheckCircleOutlined />}>
            你已经选择了角色，等待其他玩家选择
          </Tag>
        </div>
      )}
      
      {isHost && !allPlayersSelectedCharacter && (
        <div style={{ marginBottom: '16px' }}>
          <Card type="inner" style={{ backgroundColor: token.colorInfoBg }}>
            <Space>
              <InfoCircleOutlined style={{ color: token.colorInfo }} />
              <Text>作为房主，您可以在所有玩家选择角色后开始游戏。</Text>
            </Space>
          </Card>
        </div>
      )}

      <Radio.Group
        value={selectedCharacterId}
        onChange={(e) => handleSelectCharacter(e.target.value)}
        style={{width: '100%'}}
        disabled={hasSelectedCharacter}
      >
        <div
          style={{
            display: 'flex',
            overflowX: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {characters.map((character) => {
            const isSelected = character.selected_by !== null;
            const isSelectedByMe = character.selected_by === currentUserId;
            const selectorName = getCharacterSelector(character.id);
            
            return (
              <Card
                key={character.id}
                hoverable={!isSelected || isSelectedByMe}
                style={cardStyle(character.id)}
                onClick={() => !hasSelectedCharacter && (!isSelected || isSelectedByMe) && handleSelectCharacter(character.id)}
                onMouseEnter={() => !hasSelectedCharacter && setHoveredCharacter(character.id)}
                onMouseLeave={() => !hasSelectedCharacter && setHoveredCharacter(null)}
                actions={[
                  <Radio 
                    value={character.id} 
                    key={`radio-${character.id}`}
                    disabled={(isSelected && !isSelectedByMe) || hasSelectedCharacter}
                  >
                    {isSelected 
                      ? (isSelectedByMe 
                        ? "已选择" 
                        : `已被 ${selectorName} 选择`) 
                      : "选择此角色"}
                  </Radio>
                ]}
              >
                {isSelected && !isSelectedByMe && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 1,
                  }}>
                    <Tag color="error" icon={<LockOutlined />}>已选</Tag>
                  </div>
                )}
                <Card.Meta
                  avatar={
                    <Avatar
                      style={{ backgroundColor: token.colorPrimary, color: token.colorWhite }}
                      icon={<UserOutlined />}
                      size="large"
                    >
                      {character.name[0]}
                    </Avatar>
                  }
                  title={<Text strong style={{color: token.colorText}}>{character.name} ({character.gender})</Text>}
                  description={
                    <Paragraph type="secondary" ellipsis={{ rows: 3, expandable: true, symbol: '更多' }}>
                      {character.public_info}
                    </Paragraph>
                  }
                />
              </Card>
            );
          })}
        </div>
      </Radio.Group>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: '16px',
        marginTop: '32px' 
      }}>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleConfirmSelection}
          disabled={!selectedCharacterId || hasSelectedCharacter}
          style={{minWidth: '200px'}}
        >
          确认选择此角色
        </Button>
        
        {isHost && allPlayersSelectedCharacter && (
          <Button 
            type="default" 
            size="large"
            icon={<PlayCircleOutlined />} 
            onClick={handleStartGame}
            style={{minWidth: '200px'}}
          >
            所有人已选择角色，开始游戏
          </Button>
        )}
      </div>
      
      {selectedCharacter && (
        <Card style={{ marginTop: '24px', borderColor: token.colorPrimary }}>
          <Title level={4}>已选角色: {selectedCharacter.name}</Title>
          <Paragraph>{selectedCharacter.public_info}</Paragraph>
          {hasSelectedCharacter && (
            <div style={{ marginTop: '16px' }}>
              <Tag color="processing">你已确认选择此角色，游戏开始后将扮演此角色</Tag>
            </div>
          )}
        </Card>
      )}
      
      {/* 玩家选择状态 */}
      <Card style={{ marginTop: '24px' }} title="玩家选择状态">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {players.map(player => {
            const selectedCharacter = player.character_id 
              ? characters.find(c => c.id === player.character_id) 
              : null;
              
            return (
              <Card 
                key={player.user_id}
                size="small" 
                style={{ 
                  width: '220px',
                  borderColor: player.is_host ? token.colorPrimary : undefined 
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>{player.nickname}</Text>
                    {player.is_host && <Tag color="blue" style={{ marginLeft: '8px' }}>房主</Tag>}
                  </div>
                  
                  {selectedCharacter ? (
                    <div>
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        已选择: {selectedCharacter.name}
                      </Tag>
                    </div>
                  ) : (
                    <Tag icon={<InfoCircleOutlined />}>尚未选择角色</Tag>
                  )}
                </Space>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default CharacterSelectionPage;
