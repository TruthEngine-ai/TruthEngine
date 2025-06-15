import React, { useEffect, useRef, useState } from 'react';
import { Button, List, Typography, Avatar, theme, Input } from 'antd';
import { MessageOutlined, MinusOutlined, SendOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import './MessageDrawer.css';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  datetime?: string;
  send_nickname?: string;
  send_id?: number | null;
  message?: string; 
  type?: 'system' | 'user' | 'notification';
}

interface MessageDrawerProps {
  visible: boolean;
  messages: Message[];
  onClose: () => void;
  onToggle: () => void;
  onSendMessage?: (message: string) => void;
}

const MessageDrawer: React.FC<MessageDrawerProps> = ({ 
  visible, 
  messages, 
  onClose, 
  onToggle,
  onSendMessage 
}) => {
  const { token } = theme.useToken();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 80 });
  const [currentMessage, setCurrentMessage] = useState<string>('');
  
  // 自动滚动到最新消息
  useEffect(() => {
    if (visible && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, visible]);

  // 获取用户头像颜色
  const getAvatarColor = (nickname: string) => {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a', '#fa541c', '#eb2f96'];
    const index = nickname.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // 根据消息类型返回不同的样式
  const getMessageStyle = (message: Message) => {
    // 检查是否为系统消息
    if ((message.send_id === null || message.send_id === undefined) && 
        (message.send_nickname === '系统' || message.type === 'system')) {
      return {
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        color: '#666',
        fontSize: '12px',
        textAlign: 'center' as const,
        border: 'none',
        borderRadius: '16px',
        padding: '8px 16px',
        margin: '12px auto',
        maxWidth: '85%',
        wordBreak: 'break-word' as const,
        lineHeight: '1.4',
      };
    }
    return {};
  };

  // 判断是否为系统消息
  const isSystemMessage = (message: Message) => {
    return (message.send_id === null || message.send_id === undefined) && 
           (message.send_nickname === '系统' || message.type === 'system');
  };

  // 判断是否为自己发送的消息
  const isOwnMessage = (message: Message) => {
    return user && message.send_id === user.id;
  };

  const formatTime = (datetime?: string) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (date.toDateString() === now.toDateString()) { // 今天
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = chatBoxRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 处理鼠标移动事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 500, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const floatingButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
  };

  const chatBoxStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
  };

  const chatHeaderStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
  };

  const inputAreaStyle: React.CSSProperties = {
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  };

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      onSendMessage?.(currentMessage.trim());
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!visible) {
    return (
      <Button
        type="primary"
        shape="circle"
        size="large"
        className="message-drawer-floating-button"
        style={floatingButtonStyle}
        onClick={onToggle}
        icon={<MessageOutlined />}
      />
    );
  }

  return (
    <div
      ref={chatBoxRef}
      className={`message-drawer-chat-box ${isDragging ? 'dragging' : ''}`}
      style={chatBoxStyle}
    >
      {/* 头部 */}
      <div 
        className={`message-drawer-chat-header ${isDragging ? 'dragging' : ''}`} 
        style={chatHeaderStyle}
        onMouseDown={handleMouseDown}
      >
        <div className="message-drawer-header-left">
          <MessageOutlined className="message-drawer-header-icon" />
          <Text strong className="message-drawer-header-title">聊天室</Text>
        </div>
        <div>
          <Button
            type="text"
            size="small"
            icon={<MinusOutlined />}
            onClick={onClose}
            className="message-drawer-header-button"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      
      {/* 消息区域 */}
      <div className="message-drawer-chat-body">
        {messages.length === 0 ? (
          <div className="message-drawer-empty-state" style={{ color: token.colorTextSecondary }}>
            <MessageOutlined className="message-drawer-empty-icon" />
            <div>暂无消息</div>
          </div>
        ) : (
          <List
            dataSource={messages}
            split={false}
            className="message-drawer-messages-list"
            renderItem={(item: Message) => (
              <List.Item className="message-drawer-message-item">
                {isSystemMessage(item) ? (
                  <div className="message-drawer-system-message-container">
                    <div className="message-drawer-system-message">
                      <Text style={{ color: '#666', fontSize: '12px' }}>
                        {item.message || ''}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div className={`message-drawer-user-message ${isOwnMessage(item) ? 'own-message' : 'other-message'}`}>
                    <div className="message-drawer-message-header">
                      <Avatar 
                        size={32}
                        className="message-drawer-avatar"
                        style={{ 
                          backgroundColor: getAvatarColor(item.send_nickname || '系统')
                        }}
                      >
                        {(item.send_nickname || '系统').charAt(0)}
                      </Avatar>
                      <div className="message-drawer-header-content">
                        <div className="message-drawer-header-info">
                          <Text strong className="message-drawer-nickname" style={{ color: token.colorText }}>
                            {item.send_nickname}
                          </Text>
                          {item.datetime && (
                            <Text 
                              type="secondary" 
                              className="message-drawer-time"
                            >
                              {formatTime(item.datetime)}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className="message-drawer-message-content"
                      style={isOwnMessage(item) ? {} : { 
                        border: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <Text className="message-drawer-message-text">
                        {item.message || ''}
                      </Text>
                    </div>
                  </div>
                )}
              </List.Item>
            )}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="message-drawer-input-area" style={inputAreaStyle}>
        <div className="message-drawer-input-container">
          <TextArea
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="输入消息..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            onKeyPress={handleKeyPress}
            className="message-drawer-textarea"
            style={{ 
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!currentMessage.trim()}
            className="message-drawer-send-button"
          />
        </div>
      </div>
    </div>
  );
};

export default MessageDrawer;
