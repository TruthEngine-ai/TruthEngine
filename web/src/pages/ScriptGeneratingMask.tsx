import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';

const maskStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 2000,
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b2e 50%, #1a1a1a 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  overflow: 'hidden',
};

const backgroundTextStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '200%',
  height: '100%',
  fontSize: '120px',
  fontWeight: 100,
  color: 'rgba(180, 140, 140, 0.03)',
  whiteSpace: 'nowrap',
  animation: 'scrollText 30s linear infinite',
  display: 'flex',
  alignItems: 'center',
  letterSpacing: '20px',
};

const glowTextStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 300,
  letterSpacing: 3,
  marginBottom: 24,
  textShadow: '0 0 20px #d4af37, 0 0 40px #d4af37aa',
  animation: 'mysterGlow 3s ease-in-out infinite alternate',
  fontFamily: 'serif',
};

const subTextStyle: React.CSSProperties = {
  fontSize: 16,
  opacity: 0.9,
  marginBottom: 48,
  letterSpacing: 2,
  color: '#ccc',
  fontStyle: 'italic',
};

const spinnerStyle: React.CSSProperties = {
  fontSize: 48,
  color: '#d4af37',
  marginBottom: 32,
  animation: 'rotate 2s linear infinite',
};

const dotStyle: React.CSSProperties = {
  display: 'inline-block',
  animation: 'dots 1.5s infinite',
};

const keyframes = `
@keyframes rotate {
  100% { transform: rotate(360deg); }
}
@keyframes mysterGlow {
  0% { 
    text-shadow: 0 0 20px #d4af37, 0 0 40px #d4af37aa;
    transform: scale(1);
  }
  100% { 
    text-shadow: 0 0 30px #d4af37, 0 0 60px #d4af37cc, 0 0 80px #d4af37;
    transform: scale(1.02);
  }
}
@keyframes scrollText {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes dots {
  0%, 20% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}
`;

const backgroundWords = "真相·悬疑·推理·线索·证据·凶手·动机·不在场证明·密室·谋杀·秘密·背叛·复仇·阴谋·";

const ScriptGeneratingMask: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <>
      <style>{keyframes}</style>
      <div style={maskStyle}>
        <div style={backgroundTextStyle}>
          {backgroundWords.repeat(8)}
        </div>
        <div style={glowTextStyle}>真相正在编织中</div>
        <div style={subTextStyle}>
          谜团即将揭开，每个细节都暗藏玄机<span style={{...dotStyle, animationDelay: '0s'}}>.</span><span style={{...dotStyle, animationDelay: '0.5s'}}>.</span><span style={{...dotStyle, animationDelay: '1s'}}>.</span>
        </div>
        <LoadingOutlined style={spinnerStyle} />
      </div>
    </>
  );
};

export default ScriptGeneratingMask;
