import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import GameSettingsPage from './pages/GameSettingsPage';
import GamePage from './pages/GamePage';
import CreateRoomPage from './pages/CreateRoomPage';
import HomePage from './pages/HomePage';
import CharacterSelectionPage from './pages/CharacterSelectionPage';
import RoomPreparePage from './pages/RoomPreparePage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/app" element={<MainLayout />}>
          <Route index element={<Navigate to="create-room" replace />} />
          <Route path='create-room' element={<CreateRoomPage />} />
          <Route path="character-selection" element={<CharacterSelectionPage />} />
          <Route path='game/ready' element={<RoomPreparePage />} />
          <Route path="game/settings" element={<GameSettingsPage />} />
          <Route path="game/play" element={<GamePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
