import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo.png';
import { usePatients } from '../context/PatientContext';
import NotificationBell from '../components/common/NotificationBell'
import Wordmark from '../components/common/Wordmark'
import PassScanner from '../components/staff/PassScanner'
import { db } from '../firebase/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { 
  Search, 
  Plus, 
  Settings,
  FileText as FileTextIcon,
  UserPlus, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Calendar,
  User,
  Activity,
  Clock,
  Key,
  LogOut,
  Home,
  Users,
  Clipboard,
  Heart,
  Shield,
  ChevronDown,
  Bell,
  FileText,
  CreditCard,
  Stethoscope,
  Pill,
  Menu,
  X as XIcon
} from 'lucide-react';
import { getVitalStatus, getVitalIcon, VITALS_NORMAL_RANGES } from '../utils/vitalsUtils';

const StaffPortal = () => {
  const { user, logout } = useAuth();
  const { patients, loading, addPatient, updatePatient, deletePatient } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showScanner, setShowScanner] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    problem: '',
    familyMemberName: '',
    admitDate: new Date().toISOString().split('T')[0],
    ward: '',
    bed: '',
    room: '',
    abhaId: '',
    phone: '',
    gender: 'Male',
    onVentilator: false,
    onOxygenSupport: false
  });
  const [formError, setFormError] = useState('');

  // Ensures every logged-in staff member has a `staff/{uid}` Firestore doc as soon as they
  // reach the portal — this doc is how doctor/family notes find staff to notify. Previously it
  // was only created when a staff member visited Settings, so anyone who hadn't yet would never
  // receive any notification. Safe no-op if the doc already exists.
  useEffect(() => {
    const ensureStaffDoc = async () => {
      if (!user?.uid) return
      try {
        const staffRef = doc(db, 'staff', user.uid)
        const staffSnap = await getDoc(staffRef)
        if (!staffSnap.exists()) {
          await setDoc(staffRef, {
            displayName: user.displayName || '',
            phone: '',
            department: '',
            designation: '',
            employeeId: `EMP${new Date().getFullYear()}${String(Math.floor(1000 + Math.random() * 9000))}`,
            email: user.email || '',
            joinDate: new Date().toISOString().split('T')[0],
            profileImage: '',
            createdAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error ensuring staff record exists:', error)
      }
    }
    ensureStaffDoc()
  }, [user?.uid])
  const [formSuccess, setFormSuccess] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [patientId, setPatientId] = useState('');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('userRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('patientId');
    localStorage.removeItem('patientData');
    localStorage.removeItem('staffGroup');
    navigate('/login');
  };

  const generatePatientId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `PID-${year}-${random}`;
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setGeneratedCode('');
    setPatientId('');

    if (!formData.name || !formData.age || !formData.problem || !formData.familyMemberName) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      const newPatientId = generatePatientId();
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const newPatient = await addPatient({
        ...formData,
        age: parseInt(formData.age),
        patientId: newPatientId,
        accessCode: accessCode,
        admittedAt: new Date().toISOString(),
        gender: formData.gender,
        phone: formData.phone || '',
        ward: formData.ward || 'Not Assigned',
        bed: formData.bed || 'Not Assigned',
        room: formData.room || 'Not Assigned',
        abhaId: formData.abhaId || 'Not Assigned'
      });
      
      setPatientId(newPatientId);
      setGeneratedCode(accessCode);
      setFormSuccess(`Patient admitted successfully! Patient ID: ${newPatientId}`);
      setFormData({
        name: '',
        age: '',
        problem: '',
        familyMemberName: '',
        admitDate: new Date().toISOString().split('T')[0],
        ward: '',
        bed: '',
        room: '',
        abhaId: '',
        phone: '',
        gender: 'Male',
        onVentilator: false,
        onOxygenSupport: false
      });
      
      setTimeout(() => {
        setFormSuccess('');
        setGeneratedCode('');
        setPatientId('');
        setShowAdmissionForm(false);
      }, 8000);
    } catch (error) {
      setFormError('Failed to admit patient. Please try again.');
    }
  };

  const handleDischargePatient = async (patientId, patientName) => {
    if (window.confirm(`Are you sure you want to discharge ${patientName}?`)) {
      try {
        await updatePatient(patientId, { 
          discharged: true, 
          dischargeDate: new Date().toISOString() 
        });
        setTimeout(async () => {
          await deletePatient(patientId);
        }, 2000);
      } catch (error) {
        console.error('Failed to discharge patient:', error);
      }
    }
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.age?.toString().includes(searchLower) ||
      patient.admitDate?.includes(searchLower) ||
      patient.familyMemberName?.toLowerCase().includes(searchLower) ||
      patient.accessCode?.includes(searchLower) ||
      patient.patientId?.toLowerCase().includes(searchLower) ||
      patient.ward?.toLowerCase().includes(searchLower) ||
      patient.bed?.toLowerCase().includes(searchLower)
    );
  });

  const activePatients = filteredPatients.filter(p => !p.discharged);
  const dischargedPatients = filteredPatients.filter(p => p.discharged);
  
  const displayPatients = showAllPatients ? filteredPatients : activePatients;

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/staff')} className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-forest-500/20">
                  <img 
                    src={Logo}
                    alt="AarogyaSandesh Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <Wordmark size="xs" stacked={false} className="text-gray-900" hiClassName="text-forest-700" />
                  <p className="text-[10px] text-forest-700">Staff Portal</p>
                </div>
              </button>
            </div>

            {/* Navigation - Clean & Compact */}
            <div className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => { setShowAllPatients(false); setActiveTab('active'); navigate('/staff'); }} 
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'active' ? 'bg-forest-50 text-forest-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => { setShowAllPatients(true); setActiveTab('all'); }} 
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'all' ? 'bg-forest-50 text-forest-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                All Patients
              </button>
              <Link 
                to="/staff/doctors" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                Doctors
              </Link>
              <Link 
                to="/staff/reports-dashboard" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                Reports
              </Link>
              <Link 
                to="/staff/visiting-time" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                Visiting Hours
              </Link>
              <Link
                to="/staff/command-center"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                Command Center
              </Link>
              <Link
                to="/staff/settings"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                Settings
              </Link>
            </div>

            {/* Right side - Compact */}
            <div className="flex items-center gap-2">
              {/* Scan Pass Button - SMALL */}
              <button
                onClick={() => setShowScanner(true)}
                className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition-colors flex items-center gap-1.5 shadow-sm hover:shadow-md"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 9h6M9 12h6M9 15h4" />
                </svg>
                <span className="hidden sm:inline">Scan Pass</span>
              </button>

              <NotificationBell userId={user?.uid} userType="staff" />
              
              <div className="flex items-center gap-2">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{user?.email}</p>
                  <p className="text-[10px] text-gray-500">Staff</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
              </div>
              <div className="w-12 h-12 bg-forest-50 rounded-xl flex items-center justify-center border border-forest-100">
                <Users className="w-6 h-6 text-forest-700" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Patients</p>
                <p className="text-2xl font-bold text-forest-700">{activePatients.length}</p>
              </div>
              <div className="w-12 h-12 bg-forest-50 rounded-xl flex items-center justify-center border border-forest-100">
                <Activity className="w-6 h-6 text-forest-700" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Discharged</p>
                <p className="text-2xl font-bold text-blue-600">{dischargedPatients.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Admissions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {patients.filter(p => p.admitDate === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, age, ID, ward, bed, or access code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAllPatients(!showAllPatients)}
              className={`px-4 py-3 rounded-xl transition-all duration-300 ${
                showAllPatients 
                  ? 'bg-forest-50 text-forest-700 border border-forest-200' 
                  : 'bg-white/80 text-gray-600 border border-gray-200 hover:border-forest-300'
              }`}
            >
              {showAllPatients ? 'Showing All' : 'Show All Patients'}
            </button>
            <button
              onClick={() => setShowAdmissionForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-forest-700 to-forest-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-forest-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus size={20} />
              Admit Patient
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-900">
                {showAllPatients ? 'All Patients' : 'Active Patients'}
              </h2>
              <p className="text-sm text-gray-500">
                {displayPatients.length} patients {showAllPatients ? '(including discharged)' : ''}
              </p>
            </div>
            {showAllPatients && (
              <button
                onClick={() => setShowAllPatients(false)}
                className="text-sm text-forest-700 hover:text-forest-800 transition-colors"
              >
                Show Active Only
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward/Bed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </td>
                  </tr>
                ) : displayPatients.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p>No patients found</p>
                        <p className="text-sm text-gray-400">Click "Admit Patient" to add your first patient</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayPatients.map((patient, index) => (
                    <motion.tr
                      key={patient.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-forest-50/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/staff/patient/${patient.id}`)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono text-forest-700 bg-forest-50 px-2 py-1 rounded">
                          {patient.patientId || 'N/A'}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-forest-500 to-forest-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {patient.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{patient.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.age}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span>{patient.ward || 'N/A'}</span>
                          <span className="text-xs text-gray-400">Bed: {patient.bed || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.familyMemberName}</td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-100 rounded-lg text-sm font-mono text-forest-700 border border-gray-200">
                          {patient.accessCode}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        {patient.discharged ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium border border-blue-200">
                            <CheckCircle size={12} />
                            Discharged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-forest-50 text-forest-700 rounded-full text-xs font-medium border border-forest-200">
                            <span className="w-1.5 h-1.5 bg-forest-600 rounded-full animate-pulse"></span>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {!patient.discharged && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDischargePatient(patient.id, patient.name);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                            title="Discharge Patient"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {patient.discharged && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/staff/bill-generator/${patient.id}`)
                              }}
                              className="p-2 text-gray-400 hover:text-forest-500 hover:bg-forest-50 rounded-xl transition-all duration-200"
                              title="Generate Bill"
                            >
                              <FileText size={18} />
                            </button>
                            <span className="text-xs text-gray-400">Completed</span>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAdmissionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAdmissionForm(false);
                setFormError('');
                setFormSuccess('');
                setGeneratedCode('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">Admit New Patient</h2>
              <p className="text-gray-500 text-sm mb-6">Enter patient details to generate access code</p>

              <form onSubmit={handleAddPatient}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Age"
                      min="0"
                      max="150"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Contact number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Problem / Diagnosis *</label>
                    <textarea
                      value={formData.problem}
                      onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Describe the patient's condition"
                      rows="2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Family Member *</label>
                    <input
                      type="text"
                      value={formData.familyMemberName}
                      onChange={(e) => setFormData({ ...formData, familyMemberName: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Family member name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                    <input
                      type="text"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="e.g., ICU, General"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                    <input
                      type="text"
                      value={formData.bed}
                      onChange={(e) => setFormData({ ...formData, bed: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Bed number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="Room number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ABHA ID (Optional)</label>
                    <input
                      type="text"
                      value={formData.abhaId}
                      onChange={(e) => setFormData({ ...formData, abhaId: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                      placeholder="ABHA ID if available"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admit Date</label>
                    <input
                      type="date"
                      value={formData.admitDate}
                      onChange={(e) => setFormData({ ...formData, admitDate: e.target.value })}
                      className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.onVentilator}
                        onChange={(e) => setFormData({ ...formData, onVentilator: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-forest-700 focus:ring-forest-500"
                      />
                      On Ventilator
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.onOxygenSupport}
                        onChange={(e) => setFormData({ ...formData, onOxygenSupport: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-forest-700 focus:ring-forest-500"
                      />
                      On Oxygen Support
                    </label>
                  </div>
                </div>

                {formError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                    <XCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="mt-4 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-forest-600 mt-0.5" />
                      <div>
                        <p className="text-forest-800 text-sm font-medium">{formSuccess}</p>
                        <p className="text-forest-700 text-sm mt-1">
                          Patient ID: <code className="px-2 py-1 bg-forest-100 rounded-lg font-mono text-forest-800 border border-forest-200">{patientId}</code>
                        </p>
                        <p className="text-forest-700 text-sm mt-1">
                          Access Code: <code className="px-2 py-1 bg-forest-100 rounded-lg font-mono text-forest-800 border border-forest-200">{generatedCode}</code>
                        </p>
                        <p className="text-xs text-forest-600 mt-1">Share these with the family for access</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdmissionForm(false);
                      setFormError('');
                      setFormSuccess('');
                      setGeneratedCode('');
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-forest-700 to-forest-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-forest-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <UserPlus size={20} />
                    Admit Patient
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <PassScanner onClose={() => setShowScanner(false)} />
        </div>
      )}

      <footer className="mt-16 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <img 
                    src={Logo}
                    alt="AarogyaSandesh Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <Wordmark size="sm" stacked={false} className="text-gray-900" hiClassName="text-forest-700" />
              </div>
              <p className="text-sm text-gray-500">A Health Update, Delivered</p>
              <p className="text-xs text-gray-400 mt-2">Real-time hospital-to-family transparency platform</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => { setShowAllPatients(false); setActiveTab('active'); }} className="text-gray-500 hover:text-forest-700 transition-colors">Dashboard</button></li>
                <li><button onClick={() => { setShowAllPatients(true); setActiveTab('all'); }} className="text-gray-500 hover:text-forest-700 transition-colors">All Patients</button></li>
                <li><button onClick={() => navigate('/staff')} className="text-gray-500 hover:text-forest-700 transition-colors">Active Patients</button></li>
                <li><button onClick={() => navigate('/staff')} className="text-gray-500 hover:text-forest-700 transition-colors">Reports</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => window.open('mailto:aarogyasandesh.support@gmail.com')} className="text-gray-500 hover:text-forest-700 transition-colors">Help Center</button></li>
                <li><button onClick={() => window.open('mailto:aarogyasandesh.support@gmail.com')} className="text-gray-500 hover:text-forest-700 transition-colors">Contact Us</button></li>
                <li><Link to="/privacy-policy" className="text-gray-500 hover:text-forest-700 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="text-gray-500 hover:text-forest-700 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">📧 aarogyasandesh.support@gmail.com</li>
                <li className="flex items-center gap-2">📞 +91 8977039397</li>
                <li className="flex items-center gap-2">🏥 Made in India</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200/50 text-center text-xs text-gray-400">
            <p>&copy; {new Date().getFullYear()} AarogyaSandesh. All rights reserved.</p>
            <p className="mt-1 flex items-center justify-center gap-1">
              <Heart size={12} className="text-red-400" />
              Built with ❤️ in India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StaffPortal;