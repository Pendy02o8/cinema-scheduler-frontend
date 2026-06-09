import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AvailabilityPage from '../pages/AvailabilityPage';
import EmployeePage from '../pages/EmployeePage';
import LaborStatsPage from '../pages/LaborStatsPage';
import OverstaffingCheckPage from '../pages/OverstaffingCheckPage';
import PositionPage from '../pages/PositionPage';
import SchedulePage from '../pages/SchedulePage';
import UnderstaffingCheckPage from '../pages/UnderstaffingCheckPage';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeePage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/positions" element={<PositionPage />} />
          <Route path="/weekly-schedules" element={<SchedulePage />} />
          <Route path="/work-hour-statistics" element={<LaborStatsPage />} />
          <Route path="/understaffing-check" element={<UnderstaffingCheckPage />} />
          <Route path="/overstaffing-check" element={<OverstaffingCheckPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
