import React, { useEffect, useRef } from 'react';
import { Button, Drawer, List, Typography, Avatar, Badge, theme } from 'antd';
import { MessageOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Message {
  datetime?: string;
  send_nickname?: string;
  message?: string; 
  type?: 'system' | 'user' | 'notification';
}

interface MessageDrawerProps {
  visible: boolean;
  messages: Message[];
  onClose: () => void;
  onToggle: () => void;
}

const MessageDrawer: React.FC<MessageDrawerProps> = ({ 
  visible, 
  messages, 
  onClose, 
  onToggle 
}) => {
  const { token } = theme.useToken();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到最新消息
  useEffect(() => {
    if (visible && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, visible]);

  // 根据消息类型返回不同的样式
  const getMessageStyle = (message: Message) => {
    const baseStyle: React.CSSProperties = {
      padding: '8px 12px',
      borderRadius: '6px',
      marginBottom: '8px',
    };
    
    // 如果没有发送者名称，视为系统消息
    if (!message.send_nickname || message.type === 'system') {
      return {
        ...baseStyle,
        backgroundColor: token.colorInfoBg,
        border: `1px solid ${token.colorInfoBorder}`,
      };
    } else if (message.type === 'notification') {
      return {
        ...baseStyle,
        backgroundColor: token.colorWarningBg,
        border: `1px solid ${token.colorWarningBorder}`,
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: token.colorBgElevated,
        border: `1px solid ${token.colorBorder}`,
      };
    }
  };

  const formatTime = (datetime?: string) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const floatingButtonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  const unreadCount = messages.length;

  return (
    <>
      <Badge count={visible ? 0 : unreadCount} overflowCount={99}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          style={floatingButtonStyle}
          onClick={onToggle}
          icon={visible ? <CloseOutlined /> : <MessageOutlined />}
        />
      </Badge>
      
      <Drawer
        title={<Text strong style={{ fontSize: 16 }}>系统消息</Text>}
        placement="right"
        closable={true}
        onClose={onClose}
        open={visible}
        width={320}
        mask={false}
        maskClosable={false}
        styles={{
          body: { padding: '12px', paddingBottom: '40px' },
          wrapper: { position: 'fixed' },
          // 确保抽屉不会盖住内容
          content: { boxShadow: '-2px 0 8px rgba(0,0,0,0.15)' }
        }}
      >
        <List
          dataSource={messages}
          renderItem={(item: Message) => (
            <List.Item style={{ padding: '6px 0', border: 'none' }}>
              <div style={getMessageStyle(item)}>
                {item.send_nickname ? (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <Avatar 
                      size="small" 
                      style={{ marginRight: '8px', backgroundColor: token.colorPrimary }}
                    >
                      {item.send_nickname.charAt(0)}
                    </Avatar>
                    <Text strong>{item.send_nickname}</Text>
                    {item.datetime && (
                      <Text type="secondary" style={{ marginLeft: 'auto', fontSize: '12px' }}>
                        {formatTime(item.datetime)}
                      </Text>
                    )}
                  </div>
                ) : (
                  item.datetime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>系统消息</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTime(item.datetime)}
                      </Text>
                    </div>
                  )
                )}
                <div>
                  <Text>{item.message || ''}</Text>
                </div>
              </div>
            </List.Item>
          )}
          style={{ 
            maxHeight: 'calc(100vh - 120px)', 
            overflowY: 'auto',
            padding: '0 4px'
          }}
        />
        <div ref={messagesEndRef} />
      </Drawer>
    </>
  );
};

export default MessageDrawer;
