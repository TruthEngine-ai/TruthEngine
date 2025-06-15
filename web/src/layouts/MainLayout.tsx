import { Layout, Typography, Space, Avatar, theme, Button } from 'antd';
import { RocketOutlined, GithubOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { Outlet, Link as RouterLink } from 'react-router';
import { useThemeContext } from '../contexts/ThemeContext';
import useIsMobile from '../hooks/useIsMobile';
import './mainlayout.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Link: AntLink } = Typography;

const MainLayout = () => {
  const {
    token: { colorPrimary, colorTextBase, colorTextSecondary, colorBgLayout, colorBgElevated },
  } = theme.useToken();
  
  const { isDarkMode, toggleTheme } = useThemeContext();
  const isMobile = useIsMobile();

  return (
    <Layout style={{ height: '100vh', background: colorBgLayout }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colorBgElevated,
          padding: isMobile ? '0 12px' : '0 24px',
          height: isMobile ? '56px' : '64px'
        }}
      >
        <RouterLink to="/" style={{ textDecoration: 'none' }}>
          <Space align="center" size={isMobile ? 8 : 12}>
            <Avatar 
              size={isMobile ? 32 : "large"} 
              icon={<RocketOutlined />} 
              style={{ backgroundColor: colorPrimary }} 
            />
            <Title 
              level={isMobile ? 4 : 3} 
              style={{ 
                color: colorTextBase, 
                margin: 0, 
                marginLeft: isMobile ? 4 : 12,
                fontSize: isMobile ? '16px' : undefined
              }}
            >
              {isMobile ? 'Truth Engine' : 'Truth Engine'}
            </Title>
          </Space>
        </RouterLink>
        <Space size={isMobile ? 4 : 8}>
          <Button
            type="text"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ 
              color: colorTextSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? 32 : 40,
              height: isMobile ? 32 : 40
            }}
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          />
          <AntLink href="https://github.com/TruthEngine-ai/TruthEngine" target="_blank">
            <Avatar 
              size={isMobile ? 28 : 32}
              icon={<GithubOutlined />} 
              style={{ backgroundColor: 'transparent', color: colorTextSecondary }} 
            />
          </AntLink>
        </Space>
      </Header>
      <Content 
        className="app-content" 
        style={{ 
          background: colorBgLayout, 
          padding: isMobile ? '12px' : '24px',
          height: isMobile ? 'calc(100vh - 56px - 48px)' : 'calc(100vh - 64px - 54px)'
        }}
      >
        <Outlet />
      </Content>
      <Footer
        style={{
          textAlign: 'center',
          background: colorBgElevated,
          color: colorTextSecondary,
          padding: isMobile ? '8px 12px' : '16px 24px',
          height: isMobile ? '48px' : 'auto'
        }}
      >
        <Space direction={isMobile ? 'horizontal' : 'vertical'} size="small">
          <Text style={{ 
            color: colorTextSecondary,
            fontSize: isMobile ? '12px' : '14px'
          }}>
            TruthEngine ©{new Date().getFullYear()}{isMobile ? '' : ' - AI驱动的沉浸式剧本推演'}
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};

export default MainLayout;
