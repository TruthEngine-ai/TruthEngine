import { Layout, Typography, Space, Avatar, theme, Button } from 'antd';
import { RocketOutlined, GithubOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { Outlet, Link as RouterLink } from 'react-router';
import { useThemeContext } from '../contexts/ThemeContext';
import './mainlayout.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Link: AntLink } = Typography;

const MainLayout = () => {
  const {
    token: { colorPrimary, colorTextBase, colorTextSecondary, colorBgLayout, colorBgElevated },
  } = theme.useToken();
  
  const { isDarkMode, toggleTheme } = useThemeContext();

  return (
    <Layout style={{ height: '100vh', background: colorBgLayout }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colorBgElevated,
          padding: '0 24px',
        }}
      >
        <RouterLink to="/" style={{ textDecoration: 'none' }}>
          <Space align="center">
            <Avatar size="large" icon={<RocketOutlined />} style={{ backgroundColor: colorPrimary }} />
            <Title level={3} style={{ color: colorTextBase, margin: 0, marginLeft: 12 }}>
              剧本杀推演引擎
            </Title>
          </Space>
        </RouterLink>
        <Space>
          <Button
            type="text"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ 
              color: colorTextSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          />
          <AntLink href="https://github.com/TruthEngine-ai/TruthEngine" target="_blank">
            <Avatar icon={<GithubOutlined />} style={{ backgroundColor: 'transparent', color: colorTextSecondary }} />
          </AntLink>
        </Space>
      </Header>
      <Content className="app-content" style={{ background: colorBgLayout, padding: '24px' }}>
        <Outlet />
      </Content>
      <Footer
        style={{
          textAlign: 'center',
          background: colorBgElevated,
          color: colorTextSecondary,
          padding: '16px 24px',
        }}
      >
        <Space direction="vertical" size="small">
          <Text style={{ color: colorTextSecondary }}>
            TruthEngine ©{new Date().getFullYear()} - AI驱动的沉浸式剧本推演
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};

export default MainLayout;
