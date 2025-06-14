import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider, theme } from 'antd';
import 'antd/dist/reset.css'; 
import { BrowserRouter } from 'react-router';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';

// 暗色主题配置
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#B71C1C', // 深红色，强调恐怖和神秘感
    colorInfo: '#B71C1C',
    colorSuccess: '#4CAF50',
    colorWarning: '#FFC107',
    colorError: '#D32F2F',

    // 背景色系 - 调整为更深邃的暗色调
    colorBgBase: '#0A0A0A',
    colorBgLayout: '#141414',
    colorBgContainer: '#1F1F1F',
    colorBgElevated: '#2A2A2A',

    // 文本色系
    colorTextBase: 'rgba(255, 255, 255, 0.90)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',

    // 边框和分割线
    colorBorder: '#333333', 
    colorBorderSecondary: '#2B2B2B',
    colorSplit: '#2B2B2B',

    borderRadius: 8,
    borderRadiusLG: 12,

    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.5)`,
    boxShadowSecondary: `0 6px 20px rgba(0, 0, 0, 0.6)`,
    boxShadowTertiary: `0 1px 4px rgba(0, 0, 0, 0.4)`,

    wireframe: false,
  },
  components: {
    Typography: {
      colorTextHeading: 'rgba(255, 255, 255, 0.92)',
      titleMarginBottom: '0.5em',
      titleMarginTop: '1em',
    },
    Layout: {
      headerBg: '#2A2A2A',
      footerBg: '#2A2A2A',
      bodyBg: '#141414',
      siderBg: '#1F1F1F',
    },
    Card: {
      headerBg: 'transparent',
      paddingLG: 24,
      borderRadiusLG: 12,
      colorTextHeading: 'rgba(255, 255, 255, 0.92)',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.15)',
    },
  },
};

// 亮色主题配置
const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#B71C1C', // 保持相同的主色调
    colorInfo: '#B71C1C',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',

    // 背景色系 - 亮色调
    colorBgBase: '#FFFFFF',
    colorBgLayout: '#F5F5F5',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',

    // 文本色系
    colorTextBase: 'rgba(0, 0, 0, 0.88)',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',

    // 边框和分割线
    colorBorder: '#D9D9D9',
    colorBorderSecondary: '#F0F0F0',
    colorSplit: '#F0F0F0',

    borderRadius: 8,
    borderRadiusLG: 12,

    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
    boxShadowSecondary: `0 6px 16px rgba(0, 0, 0, 0.08)`,
    boxShadowTertiary: `0 1px 2px rgba(0, 0, 0, 0.12)`,

    wireframe: false,
  },
  components: {
    Typography: {
      colorTextHeading: 'rgba(0, 0, 0, 0.88)',
      titleMarginBottom: '0.5em',
      titleMarginTop: '1em',
    },
    Layout: {
      headerBg: '#FFFFFF',
      footerBg: '#FFFFFF',
      bodyBg: '#F5F5F5',
      siderBg: '#FFFFFF',
    },
    Card: {
      headerBg: 'transparent',
      paddingLG: 24,
      borderRadiusLG: 12,
      colorTextHeading: 'rgba(0, 0, 0, 0.88)',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
    },
  },
};

const AppWithTheme = () => {
  const { isDarkMode } = useThemeContext();
  
  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <App />
    </ConfigProvider>
  );
};

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <ThemeProvider>
        <AppWithTheme />
      </ThemeProvider>
    </BrowserRouter>
);
