import React, { useState, useMemo } from 'react';
import { Card, Typography, Button, Radio, message, theme, Avatar } from 'antd'; // Removed List, added Avatar
import { UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { type GameScript, testScript, type Character } from '../types/script';

const { Title, Text, Paragraph } = Typography;

const CharacterSelectionPage: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  const gameScriptData: GameScript = useMemo(() => JSON.parse(testScript), []);
  const playableCharacters = useMemo(
    () => gameScriptData.characters.filter(char => char.name !== '死者（尚未登场）'),
    [gameScriptData.characters]
  );

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [hoveredCharacter, setHoveredCharacter] = useState<string | null>(null);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
  };

  const handleConfirmSelection = () => {
    if (selectedCharacter) {
      message.success(`你选择了角色: ${selectedCharacter.name}`);
      navigate('/app/game/play');
    } else {
      message.error('请先选择一个角色');
    }
  };

  const cardStyle = (characterName: string) => ({
    marginBottom: '20px',
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    boxShadow: selectedCharacter?.name === characterName ? `0 0 0 2px ${token.colorPrimary}` : token.boxShadow,
    border: `1px solid ${selectedCharacter?.name === characterName ? token.colorPrimary : token.colorBorderSecondary}`,
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    transform: hoveredCharacter === characterName || selectedCharacter?.name === characterName ? 'scale(1.02)' : 'scale(1)',
    width: '280px', // 固定卡片宽度
    flexShrink: 0, // 防止卡片在 flex 容器中收缩
    marginRight: '16px', // 替代 Gutter
  });

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
          {gameScriptData.script.title}
        </Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary, marginBottom: '24px' }}>
          {gameScriptData.script.description}
        </Paragraph>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <Text strong>玩家人数: </Text>
            <Text>{gameScriptData.script.player_count.join(', ')}</Text>
          </div>
          <div>
            <Text strong>难度: </Text>
            <Text>{gameScriptData.script.difficulty}</Text>
          </div>
          <div>
            <Text strong>预计时长: </Text>
            <Text>{gameScriptData.script.duration_mins} 分钟</Text>
          </div>
        </div>
      </Card>

      <Title level={3} style={{ textAlign: 'center', marginBottom: '24px', color: token.colorTextHeading }}>
        选择你的角色
      </Title>

      <Radio.Group
        value={selectedCharacter?.name}
        onChange={(e) => {
          const char = playableCharacters.find(c => c.name === e.target.value);
          if (char) handleSelectCharacter(char);
        }}
        style={{width: '100%'}}
      >
        <div
          style={{
            display: 'flex',
            overflowX: 'auto',
            padding: '16px', // 为滚动条留出空间
            WebkitOverflowScrolling: 'touch', // 优化移动端滚动体验
          }}
        >
          {playableCharacters.map((character) => (
            <Card
              key={character.name}
              hoverable
              style={cardStyle(character.name)}
              onClick={() => handleSelectCharacter(character)}
              onMouseEnter={() => setHoveredCharacter(character.name)}
              onMouseLeave={() => setHoveredCharacter(null)}
              actions={[
                <Radio value={character.name} key={`radio-${character.name}`}>
                   {selectedCharacter?.name === character.name ? "已选择" : "选择此角色"}
                </Radio>
              ]}
            >
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
          ))}
        </div>
      </Radio.Group>

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleConfirmSelection}
          disabled={!selectedCharacter}
          style={{minWidth: '200px'}}
        >
          确认选择并开始游戏
        </Button>
      </div>
      {selectedCharacter && (
        <Card style={{ marginTop: '24px', borderColor: token.colorPrimary }}>
          <Title level={4}>已选角色: {selectedCharacter.name}</Title>
          <Paragraph>{selectedCharacter.backstory}</Paragraph>
        </Card>
      )}
    </div>
  );
};

export default CharacterSelectionPage;
