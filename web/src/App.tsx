import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import CreateRoomPage from './pages/CreateRoomPage';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/ProtectedRoute';
import GamePage from './pages/GamePage/GamePage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path='create-room' element={<ProtectedRoute><CreateRoomPage /></ProtectedRoute>} />
          <Route path='game' element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
