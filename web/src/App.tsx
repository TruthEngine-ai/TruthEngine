import { Routes, Route, Navigate } from 'react-router';
import MainLayout from './layouts/MainLayout';
import GameSettingsPage from './pages/GameSettingsPage';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage'; // 导入 GamePage

function App() {
  return (
   <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} /> 
          <Route path="game/settings" element={<GameSettingsPage />} />
          <Route path="game/play" element={<GamePage />} /> {/* 添加游戏页面路由 */}
        </Route>
      </Routes>
  );
}

export default App;
