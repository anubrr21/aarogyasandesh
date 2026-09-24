import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';
import { LanguageProvider } from './context/LanguageContext';
import IntroAnimation from './components/animations/IntroAnimation';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import FamilyPortal from './pages/FamilyPortal';
import StaffPortal from './pages/StaffPortal';
import PatientDetail from './pages/PatientDetail';
import ProtectedRoute from './components/common/ProtectedRoute';
import StaffSettings from './pages/StaffSettings'
import DoctorManagement from './pages/DoctorManagement'
import PatientVisitingTime from './pages/PatientVisitingTime'
import ReportsDashboard from './pages/ReportsDashboard'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import BillGeneratorPage from './pages/BillGeneratorPage'
import PassScanner from './components/staff/PassScanner'
import DoctorPortal from './pages/DoctorPortal';
import DoctorPatientDetail from './pages/DoctorPatientDetail';
import HospitalCommandCenter from './pages/HospitalCommandCenter';
import VerifyDocument from './pages/VerifyDocument';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PatientProvider>
          <BrowserRouter>
            <IntroAnimation />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/family" element={
                <ProtectedRoute requiredRole="family">
                  <FamilyPortal />
                </ProtectedRoute>
              } />
              <Route path="/staff" element={
                <ProtectedRoute requiredRole="staff">
                  <StaffPortal />
                </ProtectedRoute>
              } />
              <Route path="/doctor" element={
  <ProtectedRoute requiredRole="doctor">
    <DoctorPortal />
  </ProtectedRoute>
} />
<Route path="/doctor/patient/:id" element={
  <ProtectedRoute requiredRole="doctor">
    <DoctorPatientDetail />
  </ProtectedRoute>
} />
              <Route path="/staff/patient/:id" element={
                <ProtectedRoute requiredRole="staff">
                  <PatientDetail />
                </ProtectedRoute>
              } />
              <Route path="/staff/settings" element={
                <ProtectedRoute requiredRole="staff">
                  <StaffSettings />
                </ProtectedRoute>
              } />
              <Route path="/staff/doctors" element={
                <ProtectedRoute requiredRole="staff">
                  <DoctorManagement />
                </ProtectedRoute>
              } />
              <Route path="/staff/visiting-time" element={
                <ProtectedRoute requiredRole="staff">
                  <PatientVisitingTime />
                </ProtectedRoute>
              } />
              <Route path="/staff/scan-pass" element={
                <ProtectedRoute requiredRole="staff">
                  <PassScanner />
                </ProtectedRoute>
              } />
              <Route path="/staff/bill-generator/:patientId" element={
                <ProtectedRoute requiredRole="staff">
                  <BillGeneratorPage />
                </ProtectedRoute>
              } />
              <Route path="/staff/reports-dashboard" element={
                <ProtectedRoute requiredRole="staff">
                  <ReportsDashboard />
                </ProtectedRoute>
              } />
              <Route path="/staff/command-center" element={
                <ProtectedRoute requiredRole="staff">
                  <HospitalCommandCenter />
                </ProtectedRoute>
              } />
              <Route path="/verify/:id" element={<VerifyDocument />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
          </BrowserRouter>
        </PatientProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;