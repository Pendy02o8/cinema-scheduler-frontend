import { CssBaseline } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AvailabilityPage from './pages/AvailabilityPage';
import EmployeePage from './pages/EmployeePage';
import LaborStatsPage from './pages/LaborStatsPage';
import PositionPage from './pages/PositionPage';
import SchedulePage from './pages/SchedulePage';
import StaffingCheckPage from './pages/StaffingCheckPage';

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeePage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/positions" element={<PositionPage />} />
          <Route path="/schedules" element={<SchedulePage />} />
          <Route path="/labor-stats" element={<LaborStatsPage />} />
          <Route path="/staffing-check" element={<StaffingCheckPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
