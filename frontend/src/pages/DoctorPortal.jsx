import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { 
  LogOut, 
  Stethoscope, 
  Users, 
  Clock, 
  Calendar,
  User,
  FileText,
  MessageSquare,
  Pill,
  Activity,
  Heart,
  ChevronDown,
  Search,
  Bell,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import NotificationBell from '../components/common/NotificationBell';
import Wordmark from '../components/common/Wordmark';

const DoctorPortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [doctorData, setDoctorData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [visitingTimes, setVisitingTimes] = useState([]);
const [patientVisitingTimes, setPatientVisitingTimes] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchDoctorData = async () => {
      try {
        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('email', '==', user.email));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setDoctorData({ id: doc.id, ...doc.data() });
          } else {
            setDoctorData(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error fetching doctor data:', error);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [user]);

  useEffect(() => {
    if (!doctorData?.id) return;

    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('assignedDoctorId', '==', doctorData.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList = [];
      snapshot.forEach((doc) => {
        patientList.push({ id: doc.id, ...doc.data() });
      });
      setPatients(patientList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching patients:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doctorData]);
  useEffect(() => {
  if (!doctorData?.id) return;

  const unsubscribeVisiting = onSnapshot(collection(db, 'visitingTimes'), (snapshot) => {
    const times = [];
    snapshot.forEach((doc) => {
      times.push({ id: doc.id, ...doc.data() });
    });
    setVisitingTimes(times);
  });

  return () => unsubscribeVisiting();
}, [doctorData]);

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.patientId?.toLowerCase().includes(searchLower) ||
      patient.ward?.toLowerCase().includes(searchLower)
    );
  });

  const activePatients = filteredPatients.filter(p => !p.discharged);
  const dischargedPatients = filteredPatients.filter(p => p.discharged);
  const displayPatients = activeTab === 'active' ? activePatients : filteredPatients;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-forest-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading doctor portal...</p>
        </div>
      </div>
    );
  }

  if (!doctorData) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center p-4">
        <div className="bg-white/85 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-8 max-w-md w-full text-center">
          <Stethoscope className="w-16 h-16 text-forest-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">Doctor Profile Not Found</h2>
          <p className="text-gray-500 mb-6">
            Your doctor profile could not be found. Please contact hospital staff.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gradient-to-r from-forest-700 to-forest-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/doctor')} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-forest-500/20">
                  <img
                    src="/src/assets/Logo.png"
                    alt="AarogyaSandesh Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <Wordmark size="xs" stacked={false} className="text-gray-900" hiClassName="text-forest-700" />
                  <p className="text-xs text-forest-700">Doctor Portal</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'active' ? 'bg-forest-50 text-forest-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Active Patients
                </button>
                <button
                  onClick={() => setActiveTab('discharged')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'discharged' ? 'bg-forest-50 text-forest-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Discharged
                </button>
              </div>

              <NotificationBell userId={doctorData?.id || user?.uid} userType="doctor" />

              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                    {doctorData.name}
                  </p>
                  <p className="text-xs text-gray-500">{doctorData.specialization}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200/50 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-purple-600">Total Patients</p>
        <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
      </div>
      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center border border-purple-200">
        <Users className="w-6 h-6 text-purple-600" />
      </div>
    </div>
  </div>

  <div className="bg-gradient-to-br from-forest-50 to-green-50 border border-forest-200/50 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-forest-700">Active Patients</p>
        <p className="text-2xl font-bold text-forest-700">{activePatients.length}</p>
      </div>
      <div className="w-12 h-12 bg-forest-100 rounded-xl flex items-center justify-center border border-forest-200">
        <Activity className="w-6 h-6 text-forest-700" />
      </div>
    </div>
  </div>

  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-blue-600">Discharged</p>
        <p className="text-2xl font-bold text-blue-600">{dischargedPatients.length}</p>
      </div>
      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
        <CheckCircle className="w-6 h-6 text-blue-600" />
      </div>
    </div>
  </div>

  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-amber-600">Your Profile</p>
        <p className="text-lg font-bold text-gray-900 truncate">{doctorData.name}</p>
      </div>
      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200">
        <Stethoscope className="w-6 h-6 text-amber-600" />
      </div>
    </div>
  </div>
</div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search patients by name, ID, or ward..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <Clock className="w-4 h-4 text-amber-500" />
      Today's Visiting Hours
    </h3>
    {visitingTimes.length === 0 ? (
      <p className="text-sm text-gray-500">No visiting hours configured</p>
    ) : (
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {visitingTimes.slice(0, 6).map((time) => (
          <div key={time.id} className="p-3 bg-amber-50/30 rounded-lg border border-amber-200/30">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{time.wardName}</span>
              <span className="text-xs text-gray-500">{time.visitingHours}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span>📅 {time.visitingDays || 'All Days'}</span>
              {time.maxVisitors && <span>👥 Max {time.maxVisitors} visitors</span>}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <Stethoscope className="w-4 h-4 text-purple-500" />
      Your Profile
    </h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Name</span>
        <span className="font-medium text-gray-900">{doctorData.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Specialization</span>
        <span className="font-medium text-gray-900">{doctorData.specialization}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Department</span>
        <span className="font-medium text-gray-900">{doctorData.department || 'N/A'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Total Patients</span>
        <span className="font-medium text-gray-900">{patients.length}</span>
      </div>
      {doctorData.visitingHours && (
        <div className="flex justify-between">
          <span className="text-gray-500">Visiting Hours</span>
          <span className="font-medium text-gray-900">{doctorData.visitingHours}</span>
        </div>
      )}
    </div>
  </div>
</div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-900">
                {activeTab === 'active' ? 'Active Patients' : 'Discharged Patients'}
              </h2>
              <p className="text-sm text-gray-500">
                {displayPatients.length} patients assigned to you
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {displayPatients.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-12 h-12 text-gray-300" />
                  <p className="text-gray-500">No patients assigned to you yet</p>
                  <p className="text-sm text-gray-400">Patients will appear here once assigned by staff</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward/Bed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {displayPatients.map((patient, index) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-forest-50/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/doctor/patient/${patient.id}`)}
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/doctor/patient/${patient.id}`);
                          }}
                          className="px-3 py-1.5 bg-forest-50 text-forest-700 rounded-lg text-xs font-medium hover:bg-forest-100 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-xs text-gray-400">
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

export default DoctorPortal;