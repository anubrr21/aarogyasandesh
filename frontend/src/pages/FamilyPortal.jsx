import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db, storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase/firebase';
import { doc, onSnapshot, collection, query, where, updateDoc, getDoc, addDoc, getDocs } from 'firebase/firestore';
import BillAnomalyDetector from '../components/family/BillAnomalyDetector'
import NotificationBell from '../components/common/NotificationBell'
import InsuranceDashboard from '../components/insurance/InsuranceDashboard'
import ChatbotButton from '../components/family/ChatbotButton'
import LanguageToggle from '../components/common/LanguageToggle'
import VisitingPass from '../components/family/VisitingPass'
import { computeChainLink,appendToImmutableLog,verifyConsentChain } from '../utils/consentChain'
import { getVitalStatus, getVitalIcon, VITALS_NORMAL_RANGES } from '../utils/vitalsUtils';
import { 
  LogOut, 
  User, 
  Calendar, 
  Activity, 
  Key,
  Clock,
  CheckCircle,
  AlertCircle,
  Heart,
  Bell,
  ChevronRight,
  Pill,
  Stethoscope,
  FileText,
  CreditCard,
  Wallet,
  Brain,
  HeartPulse,
  Shield,
  MessageSquare,
  Eye,
  Download,
  X,
  Check,
  AlertTriangle,
  Upload,
  FileSignature,
  Trash2,
  Timer,
  Plus,
  Clock as ClockIcon
} from 'lucide-react';

const FamilyPortal = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [clinicalData, setClinicalData] = useState({
    diagnosis: [],
    medicines: [],
    vitals: [],
    consentEvents: []
  });
  const [billingData, setBillingData] = useState({
    items: [],
    deposits: [],
    insurance: {
      provider: '',
      policyNumber: '',
      claimStatus: 'pending',
      coverageUsed: 0,
      outOfPocket: 0
    }
  });
  const [dischargeData, setDischargeData] = useState({
    checklist: {
      doctorCertificate: false,
      finalBill: false,
      dischargeMedicines: false,
      patientReady: false,
      bedReleased: false
    },
    estimatedTime: null,
    actualTime: null,
    discharged: false,
    dischargeSummary: null
  });
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [familyNotes, setFamilyNotes] = useState([]);
  const [totalBill, setTotalBill] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [balance, setBalance] = useState(0);
  const [lengthOfStay, setLengthOfStay] = useState(0);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [showConsentOTP, setShowConsentOTP] = useState(false);
  const [consentOTP, setConsentOTP] = useState(['', '', '', '', '', '']);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [countdown, setCountdown] = useState('');
  const [showAddFamilyNote, setShowAddFamilyNote] = useState(false);
  const [familyNoteText, setFamilyNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionName, setPrescriptionName] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('medicine');
  const [showUploadPrescription, setShowUploadPrescription] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [visitingTimes, setVisitingTimes] = useState([]);
  const [assignedDoctor, setAssignedDoctor] = useState(null);
  const [showVisitingPass, setShowVisitingPass] = useState(false)
  const [patientVisitingTimes, setPatientVisitingTimes] = useState([]);
  const [chainVerification, setChainVerification] = useState(null)

  const prescriptionTypes = ['medicine', 'therapy', 'exercise', 'diet', 'other'];
  const navigate = useNavigate();

  const tabs = [
  { id: 'overview', label: t('family.portal.tabs.overview'), icon: User },
  { id: 'timeline', label: t('family.portal.tabs.timeline'), icon: Clock },
  { id: 'clinical', label: t('family.portal.tabs.clinical'), icon: Stethoscope },
  { id: 'billing', label: t('family.portal.tabs.billing'), icon: CreditCard },
  { id: 'anomaly', label: t('family.portal.tabs.bill_check'), icon: Shield },
  { id: 'hospital', label: t('family.portal.tabs.hospital_info'), icon: Stethoscope },
  { id: 'insurance', label: t('family.portal.tabs.insurance'), icon: Shield },
  { id: 'discharge', label: t('family.portal.tabs.discharge'), icon: CheckCircle },
  { id: 'reports', label: t('family.portal.tabs.reports'), icon: FileText },
];

  useEffect(() => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'patients', patientId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setPatientData(data);
        localStorage.setItem('patientData', JSON.stringify(data));

        const admitDate = new Date(data.admitDate);
        const today = new Date();
        const diffTime = Math.abs(today - admitDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setLengthOfStay(diffDays);

        if (data.clinical) {
          setClinicalData(data.clinical);
        }
        if (data.billing) {
          setBillingData(data.billing);
          const items = data.billing.items || [];
          const deposits = data.billing.deposits || [];
          const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
          const depTotal = deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
          setTotalBill(total);
          setTotalDeposits(depTotal);
          setBalance(depTotal - total);
        }
        if (data.discharge) {
          setDischargeData(data.discharge);
        }
        if (data.reports) {
          setReports(data.reports);
        }
        if (data.prescriptions) {
          setPrescriptions(data.prescriptions);
        }
        if (data.familyNotes) {
          setFamilyNotes(data.familyNotes);
        }
        setLoading(false);
      } else {
        localStorage.removeItem('patientId');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('patientData');
        setLoading(false);
      }
    }, (error) => {
      console.error('Error fetching patient:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) return;

    const timelineRef = collection(db, 'patients', patientId, 'timeline');
    const q = query(timelineRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      setTimeline(events.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp) - new Date(a.timestamp);
      }));
    }, (error) => {
      console.error('Timeline listener error:', error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) return;

    const unsubscribeDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const doctorsList = [];
      snapshot.forEach((doc) => {
        doctorsList.push({ id: doc.id, ...doc.data() });
      });
      setDoctors(doctorsList);
    });

    const unsubscribeVisiting = onSnapshot(
      query(collection(db, 'visitingTimes'), where('patientId', '==', patientId)),
      (snapshot) => {
        const times = [];
        snapshot.forEach((doc) => {
          times.push({ id: doc.id, ...doc.data() });
        });
        setPatientVisitingTimes(times);
      },
      (error) => {
        console.error('Visiting times listener error:', error);
      }
    );

    const unsubscribeAllVisiting = onSnapshot(collection(db, 'visitingTimes'), (snapshot) => {
      const times = [];
      snapshot.forEach((doc) => {
        times.push({ id: doc.id, ...doc.data() });
      });
      setVisitingTimes(times);
    });

    if (patientData?.assignedDoctorId) {
      const doctor = doctors.find(d => d.id === patientData.assignedDoctorId);
      if (doctor) {
        setAssignedDoctor(doctor);
      }
    }

    return () => {
      unsubscribeDoctors();
      unsubscribeVisiting();
      unsubscribeAllVisiting();
    };
  }, [patientData]);

  useEffect(() => {
    if (dischargeData.estimatedTime && !dischargeData.discharged) {
      const interval = setInterval(() => {
        const now = new Date();
        const estimated = new Date(dischargeData.estimatedTime);
        const diff = estimated - now;
        
        if (diff <= 0) {
          setCountdown('Ready for discharge');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown(`${hours}h ${minutes}m remaining`);
        }
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [dischargeData.estimatedTime, dischargeData.discharged]);
  useEffect(() => {
  if (!patientData?.id) return;

  const checkAbnormalVitals = () => {
    const vitals = clinicalData.vitals || [];
    if (vitals.length === 0) return;

    const latestVitals = vitals[vitals.length - 1];
    if (!latestVitals) return;

    const abnormalVitals = [];
    const statuses = {
      bp: getVitalStatus('bp', latestVitals.bp),
      pulse: getVitalStatus('pulse', latestVitals.pulse),
      temperature: getVitalStatus('temperature', latestVitals.temperature),
      oxygenSaturation: getVitalStatus('oxygenSaturation', latestVitals.oxygenSaturation),
      respiratoryRate: getVitalStatus('respiratoryRate', latestVitals.respiratoryRate)
    };

    const vitalsNames = {
      bp: 'Blood Pressure',
      pulse: 'Pulse',
      temperature: 'Temperature',
      oxygenSaturation: 'SpO2',
      respiratoryRate: 'Respiratory Rate'
    };

    Object.keys(statuses).forEach(key => {
      if (statuses[key].isAbnormal) {
        abnormalVitals.push(`${vitalsNames[key]}: ${statuses[key].label}`);
      }
    });

    if (abnormalVitals.length > 0) {
      const notificationKey = `vitals_alert_${patientData.id}_${Date.now()}`;
      const lastNotification = localStorage.getItem(`vitals_notified_${patientData.id}`);
      if (!lastNotification || Date.now() - parseInt(lastNotification) > 3600000) {
        addDoc(collection(db, 'notifications'), {
          userId: patientData.id,
          userType: 'family',
          title: '⚠️ Abnormal Vitals Detected',
          message: `The following vitals are abnormal: ${abnormalVitals.join(', ')}. Please consult the medical team.`,
          type: 'vitals',
          read: false,
          data: { patientId: patientData.id },
          createdAt: new Date().toISOString()
        }).then(() => {
          localStorage.setItem(`vitals_notified_${patientData.id}`, Date.now().toString());
        }).catch(console.error);
      }
    }
  };

  checkAbnormalVitals();
  const interval = setInterval(checkAbnormalVitals, 300000);
  return () => clearInterval(interval);
}, [clinicalData.vitals, patientData?.id]);

  const getEventDetails = (type) => {
    const details = {
      'admission': { 
        icon: Activity, 
        color: 'text-blue-500', 
        bg: 'bg-blue-50',
        label: 'Admission'
      },
      'diagnosis': { 
        icon: Brain, 
        color: 'text-purple-500', 
        bg: 'bg-purple-50',
        label: 'Diagnosis'
      },
      'medicine': { 
        icon: Pill, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-50',
        label: 'Medicine'
      },
      'vital': { 
        icon: HeartPulse, 
        color: 'text-amber-500', 
        bg: 'bg-amber-50',
        label: 'Vitals'
      },
      'note': { 
        icon: MessageSquare, 
        color: 'text-cyan-500', 
        bg: 'bg-cyan-50',
        label: 'Note'
      },
      'bill': { 
        icon: CreditCard, 
        color: 'text-rose-500', 
        bg: 'bg-rose-50',
        label: 'Bill'
      },
      'deposit': { 
        icon: Wallet, 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-50',
        label: 'Deposit'
      },
      'discharge': { 
        icon: CheckCircle, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-50',
        label: 'Discharge'
      },
      'report': { 
        icon: FileText, 
        color: 'text-orange-500', 
        bg: 'bg-orange-50',
        label: 'Report'
      },
      'consent': { 
        icon: Shield, 
        color: 'text-violet-500', 
        bg: 'bg-violet-50',
        label: 'Consent'
      },
      'prescription': { 
        icon: FileSignature, 
        color: 'text-pink-500', 
        bg: 'bg-pink-50',
        label: 'Prescription'
      },
      'family-note': { 
        icon: MessageSquare, 
        color: 'text-amber-500', 
        bg: 'bg-amber-50',
        label: 'Family Note'
      }
    };
    return details[type] || { 
      icon: Clock, 
      color: 'text-gray-500', 
      bg: 'bg-gray-50',
      label: 'Activity'
    };
  };

  const formatEventData = (event) => {
    switch(event.type) {
      case 'admission':
        return `Patient admitted`;
      case 'diagnosis':
        return `${event.data?.diagnosis || 'Diagnosis'} ${event.data?.explainer ? '- ' + event.data.explainer : ''}`;
      case 'medicine':
        return `${event.data?.name || 'Medicine'} ${event.data?.dosage || ''} - ${event.data?.frequency || ''} (${event.data?.route || 'Oral'})`;
      case 'vital':
        return `BP: ${event.data?.bp || '--'} | Pulse: ${event.data?.pulse || '--'} | Temp: ${event.data?.temperature || '--'}°C | SpO2: ${event.data?.oxygenSaturation || '--'}% | RR: ${event.data?.respiratoryRate || '--'}/min`;
      case 'note':
        return event.data?.text || 'Progress note added';
      case 'bill':
        return `${event.data?.description || 'Bill item'} - ₹${event.data?.amount || 0}`;
      case 'deposit':
        return `${event.data?.reason || 'Deposit'} - ₹${event.data?.amount || 0}`;
      case 'discharge':
        return `Patient discharged`;
      case 'report':
        return `Report uploaded: ${event.data?.name || 'New report'}`;
      case 'consent':
        return `${event.data?.type || 'Consent'} request - ${event.data?.status || 'pending'}`;
      case 'prescription':
        return `Prescription uploaded: ${event.data?.name || 'New prescription'}`;
      case 'family-note':
        return `Family note: ${event.data?.text || ''}`;
      default:
        return 'Activity recorded';
    }
  };

  const handleAddFamilyNote = async (e) => {
    e.preventDefault();
    if (!familyNoteText.trim()) {
      setFormError('Please enter a note');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const patientId = localStorage.getItem('patientId');
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      const newNote = {
        id: Date.now().toString(),
        text: familyNoteText.trim(),
        sentAt: new Date().toISOString(),
        familyEmail: user?.email || 'Family'
      };

      const updatedNotes = [...(data.familyNotes || []), newNote];
      await updateDoc(docRef, { familyNotes: updatedNotes });

      const timelineRef = collection(db, 'patients', patientId, 'timeline');
      await addDoc(timelineRef, {
        patientId: patientId,
        type: 'family-note',
        data: { text: familyNoteText.trim(), familyEmail: user?.email || 'Family' },
        timestamp: new Date().toISOString(),
        staffName: 'Family Member'
      });

      setFamilyNotes(updatedNotes);
      try {
        const staffSnapshot = await getDocs(collection(db, 'staff'));
        await Promise.all(staffSnapshot.docs.map(staffDoc =>
          addDoc(collection(db, 'notifications'), {
            userId: staffDoc.id,
            userType: 'staff',
            title: 'New Family Note',
            message: `${patientData.name}'s family: "${familyNoteText.trim().slice(0, 80)}"`,
            type: 'note',
            read: false,
            data: { patientId },
            createdAt: new Date().toISOString()
          })
        ))
      } catch (notifyError) {
        console.error('Error notifying staff:', notifyError)
      }
       if (data.assignedDoctorId) {
      try {
        const doctorDoc = await getDoc(doc(db, 'doctors', data.assignedDoctorId));
        if (doctorDoc.exists()) {
          await addDoc(collection(db, 'notifications'), {
            userId: data.assignedDoctorId,
            userType: 'doctor',
            title: 'New Family Note',
            message: `${data.name || 'Patient'}'s family: "${familyNoteText.trim().slice(0, 80)}"`,
            type: 'note',
            read: false,
            data: { patientId },
            createdAt: new Date().toISOString()
          });
        }
      } catch (doctorError) {
        console.error('Error notifying doctor:', doctorError);
      }
    }

    setFamilyNotes(updatedNotes);
      
      setFormSuccess('Note sent to staff and doctor successfully!');
      setFamilyNoteText('');
      setTimeout(() => {
        setFormSuccess('');
        setShowAddFamilyNote(false);
      }, 3000);
    } catch (error) {
      setFormError('Failed to send note. Please try again.');
    }
  };

  const handleUploadPrescription = async (e) => {
    e.preventDefault();
    
    if (!prescriptionFile) {
      setFormError('Please select a file');
      return;
    }

    if (!prescriptionName.trim()) {
      setFormError('Please enter a prescription name');
      return;
    }

    const patientId = localStorage.getItem('patientId');
    setUploading(true);
    setUploadProgress(0);
    setFormError('');
    setFormSuccess('');

    try {
      const fileExt = prescriptionFile.name.split('.').pop();
      const fileName = `${patientId}/${Date.now()}_prescription_${prescriptionName.replace(/\s+/g, '_')}.${fileExt}`;
      const storageRef = ref(storage, `reports/${fileName}`);
      
      await uploadBytes(storageRef, prescriptionFile);
      setUploadProgress(50);
      
      const downloadUrl = await getDownloadURL(storageRef);
      setUploadProgress(100);

      const newPrescription = {
        id: Date.now().toString(),
        name: prescriptionName.trim(),
        type: prescriptionType,
        fileName: prescriptionFile.name,
        fileType: prescriptionFile.type,
        fileSize: prescriptionFile.size,
        downloadUrl: downloadUrl,
        storagePath: `reports/${fileName}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.email || 'Family'
      };

      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      const updatedPrescriptions = [...(data.prescriptions || []), newPrescription];
      await updateDoc(docRef, { prescriptions: updatedPrescriptions });

      const timelineRef = collection(db, 'patients', patientId, 'timeline');
      await addDoc(timelineRef, {
        patientId: patientId,
        type: 'prescription',
        data: { name: prescriptionName.trim(), type: prescriptionType, fileName: prescriptionFile.name },
        timestamp: new Date().toISOString(),
        staffName: 'Family Member'
      });

      setPrescriptions(updatedPrescriptions);
      setFormSuccess('Prescription uploaded successfully!');
      setShowUploadPrescription(false);
      setPrescriptionFile(null);
      setPrescriptionName('');
      setUploadProgress(0);
      
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setFormError('Failed to upload prescription. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  const handleVerifyChain = async () => {
  const result = await verifyConsentChain(clinicalData.consentEvents, clinicalData.consentChainHead)
  setChainVerification(result)
  setTimeout(() => setChainVerification(null), 5000)
}

  const handleVerifyConsentOTP = async (consentId) => {
    const otpValue = consentOTP.join('');
    if (otpValue.length !== 6) {
      setFormError('Please enter all 6 digits');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const consentEvent = (clinicalData.consentEvents || []).find(c => c.id === consentId);
      if (!consentEvent) {
        setFormError('Consent request not found');
        return;
      }

      if (consentEvent.status !== 'pending') {
        setFormError('This consent request is no longer pending');
        return;
      }

      if (consentEvent.otp !== otpValue) {
        setFormError('Invalid OTP. Please try again.');
        return;
      }

      const patientId = localStorage.getItem('patientId');
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      const familySignature = user?.displayName || user?.email || 'Family Member';
      const respondedAt = new Date().toISOString()
      const approveLink = await computeChainLink(
        consentId, 'approved', respondedAt, data.clinical?.consentChainHead
      )
      appendToImmutableLog(db, patientId, { ...approveLink, eventId: consentId })
      
      const updatedEvents = (data.clinical?.consentEvents || []).map(c => {
        if (c.id === consentId) {
          return { 
            ...c, 
            status: 'approved', 
            respondedAt,
            familySignature,
            chainLinks: [...(c.chainLinks || []), approveLink]
          };
        }
        return c;
      });

      const updatedClinical = {
        ...data.clinical,
        consentEvents: updatedEvents,
        consentChainHead: approveLink.hash
      };

      await updateDoc(docRef, { clinical: updatedClinical });

      const updatedTimelineRef = collection(db, 'patients', patientId, 'timeline');
      await addDoc(updatedTimelineRef, {
        patientId: patientId,
        type: 'consent',
        data: { 
          ...consentEvent, 
          status: 'approved', 
          respondedAt: new Date().toISOString(),
          familyEmail: user?.email || 'Family',
          familySignature: familySignature
        },
        timestamp: new Date().toISOString(),
        staffName: 'Family Member'
      });

      setClinicalData(prev => ({
        ...prev,
        consentEvents: updatedEvents
      }));

      setFormSuccess('Consent approved successfully!');
      setShowConsentOTP(false);
      setConsentOTP(['', '', '', '', '', '']);
      setSelectedConsent(null);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      setFormError('Failed to verify OTP. Please try again.');
    }
  };

  const handleRejectConsent = async (consentId) => {
    try {
      const consentEvent = (clinicalData.consentEvents || []).find(c => c.id === consentId);
      if (!consentEvent) {
        setFormError('Consent request not found');
        return;
      }

      if (consentEvent.status !== 'pending') {
        setFormError('This consent request is no longer pending');
        return;
      }

      const patientId = localStorage.getItem('patientId');
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      const updatedEvents = (data.clinical?.consentEvents || []).map(c => {
        if (c.id === consentId) {
          return { 
            ...c, 
            status: 'rejected', 
            respondedAt: new Date().toISOString()
          };
        }
        return c;
      });

      const updatedClinical = {
        ...data.clinical,
        consentEvents: updatedEvents
      };

      await updateDoc(docRef, { clinical: updatedClinical });

      const updatedTimelineRef = collection(db, 'patients', patientId, 'timeline');
      await addDoc(updatedTimelineRef, {
        patientId: patientId,
        type: 'consent',
        data: { 
          ...consentEvent, 
          status: 'rejected', 
          respondedAt: new Date().toISOString(),
          familyEmail: user?.email || 'Family'
        },
        timestamp: new Date().toISOString(),
        staffName: 'Family Member'
      });

      setClinicalData(prev => ({
        ...prev,
        consentEvents: updatedEvents
      }));

      setFormSuccess('Consent rejected.');
      setShowConsentOTP(false);
      setSelectedConsent(null);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      setFormError('Failed to reject consent. Please try again.');
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;
    const newOTP = [...consentOTP];
    newOTP[index] = value;
    setConsentOTP(newOTP);

    if (value && index < 5) {
      document.getElementById(`family-consent-otp-${index + 1}`)?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !consentOTP[index] && index > 0) {
      document.getElementById(`family-consent-otp-${index - 1}`)?.focus();
    }
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('userRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('patientId');
    localStorage.removeItem('patientData');
    navigate('/login');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingConsents = (clinicalData.consentEvents || []).filter(c => c.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading patient information...</p>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center p-4">
        <div className="bg-white/85 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-teal-500/10">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Patient Found</h2>
          <p className="text-gray-500 mb-6">
            Please contact hospital staff to get your access code.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 hover:scale-[1.02] transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const pendingConsentEvents = (clinicalData.consentEvents || []).filter(c => c.status === 'pending');
  const isDischarged = dischargeData.discharged;

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/family')} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-all duration-300">
                  <img 
                    src="/src/assets/Logo.png" 
                    alt="AarogyaSandesh Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AarogyaSandesh</h1>
                  <p className="text-xs text-teal-600">Family Portal</p>
                </div>
              </button>
            </div>

         <div className="flex items-center gap-6">
  {pendingConsentEvents.length > 0 && (
    <div className="relative">
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
      <button className="p-2 text-gray-500 hover:text-teal-600 transition-colors">
        <Bell size={20} />
      </button>
    </div>
  )}
  
  <LanguageToggle />
  <NotificationBell userId={localStorage.getItem('patientId')} userType="family" />
  <div className="flex items-center gap-3">
    <div className="text-right hidden sm:block">
      <p className="text-sm font-medium text-gray-900">{user?.email}</p>
      <p className="text-xs text-gray-500">Family Member</p>
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
        {pendingConsentEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-gray-900 text-sm font-medium">Consent Request Pending</p>
                <p className="text-gray-500 text-xs">{pendingConsentEvents.length} consent request{pendingConsentEvents.length > 1 ? 's' : ''} awaiting your response</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('clinical')}
              className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm hover:bg-violet-200 transition-colors"
            >
              Review Now
            </button>
          </motion.div>
        )}

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
                {patientData.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{patientData.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span>Age: {patientData.age} years</span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span>Gender: {patientData.gender || 'N/A'}</span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span>Patient ID: {patientData.patientId || 'N/A'}</span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  {isDischarged ? (
                    <span className="text-emerald-600 font-medium">● Discharged</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">● Active</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-teal-50 text-teal-600 rounded-xl text-sm border border-teal-100">
                📅 {new Date(patientData.admitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{t('family.patient.length_of_stay')}</p>
            <p className="text-xl font-bold text-gray-900">{lengthOfStay} days</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{t('family.billing.total')}</p>
            <p className="text-xl font-bold text-rose-600">₹{totalBill.toLocaleString()}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{t('family.billing.deposits')}</p>
            <p className="text-xl font-bold text-yellow-600">₹{totalDeposits.toLocaleString()}</p>
          </div>
          <div className={`bg-white/80 backdrop-blur-sm border rounded-xl p-4 shadow-sm ${balance >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
            <p className="text-sm text-gray-500">{t('family.billing.balance')}</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {balance >= 0 ? '₹' : '-₹'}{Math.abs(balance).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-50 text-teal-600 border border-teal-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {tab.id === 'clinical' && pendingConsentEvents.length > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 min-h-[400px] shadow-sm">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('family.portal.tabs.overview')}</h3>
              {isDischarged && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">This patient has been discharged. Information is view-only.</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Patient ID</p>
                  <p className="font-medium text-gray-900 font-mono">{patientData.patientId || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">ABHA ID</p>
                  <p className="font-medium text-gray-900">{patientData.abhaId || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900">{patientData.phone || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Family Member</p>
                  <p className="font-medium text-gray-900">{patientData.familyMemberName}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Ward</p>
                  <p className="font-medium text-gray-900">{patientData.ward || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Bed</p>
                  <p className="font-medium text-gray-900">{patientData.bed || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Room</p>
                  <p className="font-medium text-gray-900">{patientData.room || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Diagnosis</p>
                  <p className="font-medium text-gray-900">{patientData.problem}</p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Recent Activity</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {timeline.slice(0, 10).map((event) => {
                    const details = getEventDetails(event.type);
                    const Icon = details.icon;
                    return (
                      <div key={event.id} className={`flex items-start gap-3 p-3 rounded-xl border ${details.bg} border-gray-200/50`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${details.bg}`}>
                          <Icon className={`w-4 h-4 ${details.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{formatEventData(event)}</p>
                          <p className="text-xs text-gray-400">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Just now'}</p>
                        </div>
                      </div>
                    );
                  })}
                  {timeline.length === 0 && (
                    <p className="text-gray-500 text-sm">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Treatment Timeline</h3>
              {isDischarged && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Discharged patient - historical timeline</span>
                </div>
              )}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {timeline.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-900">No Activity Yet</p>
                    <p className="text-sm">Updates will appear here as staff adds them</p>
                  </div>
                ) : (
                  timeline.map((event, index) => {
                    const details = getEventDetails(event.type);
                    const Icon = details.icon;
                    const isLast = index === timeline.length - 1;
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative"
                      >
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full ${details.bg} border-2 border-gray-200 flex items-center justify-center z-10`}>
                              <Icon className={`w-4 h-4 ${details.color}`} />
                            </div>
                            {!isLast && (
                              <div className="w-0.5 flex-1 bg-gray-200/50 mt-1" />
                            )}
                          </div>
                          <div className={`flex-1 pb-6 ${!isLast ? 'border-b border-gray-200/50' : ''}`}>
                            <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${details.bg} ${details.color}`}>
                                {details.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Just now'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">{formatEventData(event)}</p>
                            {event.type === 'note' && event.data?.text && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200/50">
                                <p className="text-sm text-gray-600 italic">"{event.data.text}"</p>
                              </div>
                            )}
                            {event.type === 'consent' && event.data?.status && (
                              <div className="mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  event.data.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                  event.data.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {event.data.status.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'clinical' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('family.portal.tabs.clinical')}</h3>
              {isDischarged && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Discharged patient - clinical history view-only</span>
                </div>
              )}
              
              {pendingConsentEvents.length > 0 && (
                <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-500" />
                    Consent Requests ({pendingConsentEvents.length})
                  </h4>
                  {pendingConsentEvents.map((c) => (
                    <div key={c.id} className="p-3 bg-white/50 rounded-lg border border-gray-200/50 mb-2 last:mb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{c.type}</p>
                          <p className="text-xs text-gray-500">{c.explanation}</p>
                          <p className="text-xs text-gray-400 mt-1">Requested: {new Date(c.requestedAt).toLocaleString()}</p>
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Timer size={12} />
                            <span>Expires in: {(() => {
                              const now = Date.now();
                              const requested = new Date(c.requestedAt).getTime();
                              const expiryMap = { routine: 24*60*60*1000, urgent: 6*60*60*1000, emergency: 60*60*1000 };
                              const expiry = expiryMap[c.urgency] || expiryMap.routine;
                              const remaining = (requested + expiry) - now;
                              if (remaining <= 0) return 'Expired';
                              const hours = Math.floor(remaining / (1000 * 60 * 60));
                              const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                              if (hours > 0) return `${hours}h ${minutes}m`;
                              return `${minutes}m`;
                            })()}</span>
                          </p>
                        </div>
                        {!isDischarged && (
                          <button
                            onClick={() => {
                              setSelectedConsent(c);
                              setShowConsentOTP(true);
                              setConsentOTP(['', '', '', '', '', '']);
                              setFormError('');
                              setFormSuccess('');
                            }}
                            className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm hover:bg-violet-200 transition-colors"
                          >
                            Respond
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      Diagnosis
                    </h4>
                    {(clinicalData.diagnosis || []).length === 0 ? (
                      <p className="text-sm text-gray-500">{t('family.clinical.no_diagnosis')}</p>
                    ) : (
                      <div className="space-y-2">
                        {(clinicalData.diagnosis || []).map((d, index) => (
                          <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                            <p className="text-sm font-medium text-gray-900">{d.diagnosis}</p>
                            {d.explainer && (
                              <p className="text-xs text-gray-500 mt-1">{d.explainer}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-emerald-500" />
                      Medicines
                    </h4>
                    {(clinicalData.medicines || []).length === 0 ? (
                      <p className="text-sm text-gray-500">{t('family.clinical.no_medicines')}</p>
                    ) : (
                      <div className="space-y-2">
                        {(clinicalData.medicines || []).map((m, index) => (
                          <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                            <p className="text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.dosage} • {m.frequency} • {m.route}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-amber-500" />
                      Vitals
                    </h4>
                  {(clinicalData.vitals || []).length === 0 ? (
  <p className="text-sm text-gray-500">{t('family.clinical.no_vitals')}</p>
) : (
  <div className="space-y-2 max-h-[300px] overflow-y-auto">
    {(clinicalData.vitals || []).slice().reverse().map((v, index) => {
      const bpStatus = getVitalStatus('bp', v.bp);
      const pulseStatus = getVitalStatus('pulse', v.pulse);
      const tempStatus = getVitalStatus('temperature', v.temperature);
      const spo2Status = getVitalStatus('oxygenSaturation', v.oxygenSaturation);
      const rrStatus = getVitalStatus('respiratoryRate', v.respiratoryRate);
      
      return (
        <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`p-2 rounded-lg border ${bpStatus.isAbnormal ? 'border-red-300' : 'border-emerald-300'}`}>
              <p className="text-gray-500">BP</p>
              <p className={`font-medium ${bpStatus.color}`}>{v.bp || '--'}</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${bpStatus.bg} ${bpStatus.color}`}>
                {bpStatus.label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${pulseStatus.isAbnormal ? 'border-red-300' : 'border-emerald-300'}`}>
              <p className="text-gray-500">Pulse</p>
              <p className={`font-medium ${pulseStatus.color}`}>{v.pulse || '--'} bpm</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${pulseStatus.bg} ${pulseStatus.color}`}>
                {pulseStatus.label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${tempStatus.isAbnormal ? 'border-red-300' : 'border-emerald-300'}`}>
              <p className="text-gray-500">Temp</p>
              <p className={`font-medium ${tempStatus.color}`}>{v.temperature || '--'}°C</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${tempStatus.bg} ${tempStatus.color}`}>
                {tempStatus.label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${spo2Status.isAbnormal ? 'border-red-300' : 'border-emerald-300'}`}>
              <p className="text-gray-500">SpO2</p>
              <p className={`font-medium ${spo2Status.color}`}>{v.oxygenSaturation || '--'}%</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${spo2Status.bg} ${spo2Status.color}`}>
                {spo2Status.label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${rrStatus.isAbnormal ? 'border-red-300' : 'border-emerald-300'}`}>
              <p className="text-gray-500">RR</p>
              <p className={`font-medium ${rrStatus.color}`}>{v.respiratoryRate || '--'}/min</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${rrStatus.bg} ${rrStatus.color}`}>
                {rrStatus.label}
              </div>
            </div>
            <div className="col-span-3">
              <p className="text-xs text-gray-400 mt-1">{new Date(v.recordedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
                  </div>

                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-violet-500" />
                      Consent History
                    </h4>
                     <div className="flex items-center gap-2 mb-3">
    <button
      onClick={handleVerifyChain}
      className="px-3 py-1 bg-violet-500/10 text-violet-600 rounded-lg text-xs border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
    >
      🔒 Verify Chain Integrity
    </button>
    {chainVerification && (
      <span className={`px-3 py-1 rounded-lg text-xs ${chainVerification.valid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
        {chainVerification.valid ? '✅ Chain verified — no tampering detected' : `⚠️ Chain broken at link ${chainVerification.brokenAt}`}
      </span>
    )}
  </div>
                    {(clinicalData.consentEvents || []).length === 0 ? (
                      <p className="text-sm text-gray-500">{t('family.clinical.no_consent')}</p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {(clinicalData.consentEvents || []).slice().reverse().map((c, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            c.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                            c.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                            c.status === 'rejected' ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 capitalize">{c.type}</p>
                                <p className="text-xs text-gray-500">{c.explanation}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                c.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {c.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(c.requestedAt).toLocaleString()}
                            </p>
                            {c.status === 'approved' && (
                              <p className="text-xs text-emerald-600 mt-1">✓ Approved at {new Date(c.respondedAt).toLocaleString()}</p>
                            )}
                            {c.status === 'rejected' && (
                              <p className="text-xs text-red-600 mt-1">✗ Rejected at {new Date(c.respondedAt).toLocaleString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('family.billing.title')}</h3>
              {isDischarged && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Discharged patient - final billing summary</span>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    Cost Ledger
                    <span className="ml-auto text-sm text-rose-600">Total: ₹{totalBill.toLocaleString()}</span>
                  </h4>
                  {(billingData.items || []).length === 0 ? (
                    <p className="text-sm text-gray-500">{t('family.billing.no_items')}</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(billingData.items || []).map((item, index) => (
                        <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{item.description}</p>
                            <p className="text-sm font-bold text-rose-600">₹{item.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full">{item.category || 'Other'}</span>
                            <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-yellow-500" />
                    Deposits
                    <span className="ml-auto text-sm text-yellow-600">Total: ₹{totalDeposits.toLocaleString()}</span>
                  </h4>
                  {(billingData.deposits || []).length === 0 ? (
                    <p className="text-sm text-gray-500">{t('family.billing.no_deposits')}</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(billingData.deposits || []).map((deposit, index) => (
                        <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{deposit.reason}</p>
                            <p className="text-sm font-bold text-yellow-600">₹{deposit.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className={`px-2 py-0.5 rounded-full ${
                              deposit.urgency === 'emergency' ? 'bg-red-100 text-red-700' :
                              deposit.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {deposit.urgency || 'routine'}
                            </span>
                            <span>{new Date(deposit.depositedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'anomaly' && (
            <div>
              <BillAnomalyDetector 
                billingItems={billingData.items || []} 
                patientId={localStorage.getItem('patientId')}
                onFlaggedItem={(flagged) => {
                  console.log('Flagged items:', flagged)
                }}
              />
            </div>
          )}

          {activeTab === 'hospital' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('family.portal.tabs.hospital_info')}</h3>
              {isDischarged && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Discharged patient - reference information</span>
                </div>
              )}
              
              <div className="mb-6 p-4 bg-white/50 rounded-xl border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-500" />
                  Your Doctor
                </h4>
                {assignedDoctor ? (
                  <div className="p-4 bg-teal-50/50 rounded-lg border border-teal-200/50">
                    <p className="font-semibold text-gray-900 text-lg">{assignedDoctor.name}</p>
                    <p className="text-gray-600">{assignedDoctor.specialization}</p>
                    {assignedDoctor.department && (
                      <p className="text-sm text-gray-500">Department: {assignedDoctor.department}</p>
                    )}
                    {assignedDoctor.phone && (
                      <p className="text-sm text-gray-500">📞 {assignedDoctor.phone}</p>
                    )}
                    {assignedDoctor.email && (
                      <p className="text-sm text-gray-500">✉️ {assignedDoctor.email}</p>
                    )}
                    {assignedDoctor.experience && (
                      <p className="text-sm text-gray-500">Experience: {assignedDoctor.experience}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">{t('family.hospital_info.no_doctor')}</p>
                )}
              </div>

              <div className="mb-6 p-4 bg-white/50 rounded-xl border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-500" />
                  All Doctors ({doctors.filter(d => d.availability === 'available').length} available)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {doctors.map((doctor) => (
                    <div key={doctor.id} className="p-3 bg-gray-50/50 rounded-lg border border-gray-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{doctor.name}</p>
                          <p className="text-sm text-gray-500">{doctor.specialization}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${
                          doctor.availability === 'available' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {doctor.availability === 'available' ? '● Available' : '● Unavailable'}
                        </span>
                      </div>
                      {doctor.department && (
                        <p className="text-xs text-gray-400">{doctor.department}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white/50 rounded-xl border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-amber-500" />
                  Visiting Hours
                </h4>
                {(() => {
  const norm = (s) => (s || '').toString().toLowerCase().replace(/ward/gi, '').trim();

const relevantVisitingTimes = patientVisitingTimes.length > 0
  ? patientVisitingTimes
  : visitingTimes.filter((t) => {
      const patientWard = norm(patientData?.ward);
      const timeWard = norm(t.wardName || t.ward);
      return patientWard && timeWard && patientWard === timeWard;
    });
  return relevantVisitingTimes.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {relevantVisitingTimes.map((time) => (
        <div key={time.id} className="p-3 bg-amber-50/30 rounded-lg border border-amber-200/30">
          <p className="font-medium text-gray-900">{time.wardName}</p>
          <p className="text-sm text-gray-600">🕐 {time.visitingHours}</p>
          <p className="text-sm text-gray-500">📅 {time.visitingDays}</p>
          {time.maxVisitors && (
            <p className="text-xs text-gray-400">👥 Max {time.maxVisitors} visitors</p>
          )}
          {time.specialInstructions && (
            <p className="text-xs text-amber-600 mt-1">📋 {time.specialInstructions}</p>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-gray-500">{t('family.hospital_info.no_visiting_hours')}</p>
  );
})()}
              </div>

              {!isDischarged && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowVisitingPass(true)}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 9h6M9 12h6M9 15h4" />
                    </svg>
                    Get Visiting Pass
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'insurance' && (
            <div>
              <InsuranceDashboard 
                patientId={localStorage.getItem('patientId')}
                patientName={patientData?.name}
              />
            </div>
          )}

          {activeTab === 'discharge' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('family.portal.tabs.discharge')}</h3>
              {dischargeData.discharged ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Patient Discharged</h4>
                  <p className="text-gray-500">
                    Discharged on {new Date(dischargeData.actualTime).toLocaleString()}
                  </p>
                  {dischargeData.dischargeSummary && (
                    <button className="mt-4 px-6 py-2 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-colors">
                      View Summary
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Checklist Progress</h4>
                    <div className="space-y-2">
                      {Object.entries(dischargeData.checklist || {}).map(([key, value]) => {
                        const labels = {
                          doctorCertificate: 'Doctor Certificate',
                          finalBill: 'Final Bill',
                          dischargeMedicines: 'Discharge Medicines',
                          patientReady: 'Patient Ready',
                          bedReleased: 'Bed Released'
                        };
                        return (
                          <div key={key} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-gray-200/50">
                            <span className="text-sm text-gray-500">{labels[key] || key}</span>
                            {value ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Discharge Time</h4>
                    {dischargeData.estimatedTime ? (
                      <div className="p-4 bg-white/50 rounded-lg border border-gray-200/50">
                        <p className="text-sm text-gray-500">Estimated Time</p>
                        <p className="text-gray-900 font-medium">{new Date(dischargeData.estimatedTime).toLocaleString()}</p>
                        <p className="text-sm text-amber-600 mt-2">{countdown || 'Ready for discharge'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Discharge time not set yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('family.portal.tabs.reports')}</h3>
                  <p className="text-sm text-gray-500">
                    {reports.length} reports, {prescriptions.length} prescriptions
                  </p>
                </div>
                {!isDischarged && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowUploadPrescription(true)}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                    >
                      <FileSignature size={16} />
                      Upload Prescription
                    </button>
                    <button
                      onClick={() => setShowAddFamilyNote(true)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                    >
                      <MessageSquare size={16} />
                      Send Note to Staff
                    </button>
                  </div>
                )}
                {isDischarged && (
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">
                    <CheckCircle className="inline w-4 h-4 mr-1" />
                    Discharged - View Only
                  </div>
                )}
              </div>

              {reports.length === 0 && prescriptions.length === 0 ? (
                <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900">{t('family.reports.no_documents')}</p>
                  <p className="text-sm">Upload prescriptions or send notes to staff</p>
                </div>
              ) : (
                <div>
                  {reports.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Reports</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reports.map((report) => (
                          <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/50 rounded-xl border border-gray-200/50 overflow-hidden"
                          >
                            {report.fileType?.includes('image') ? (
                              <div className="relative h-40 bg-gray-100 overflow-hidden">
                                <img
                                  src={report.downloadUrl}
                                  alt={report.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-40 bg-gray-50 flex items-center justify-center">
                                <FileText className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-medium text-gray-900 truncate">{report.name}</h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <span className="px-2 py-0.5 bg-gray-100 rounded-full">{report.type}</span>
                                <span>{new Date(report.uploadedAt).toLocaleDateString()}</span>
                              </div>
                              <a
                                href={report.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm transition-colors"
                              >
                                <Eye size={16} />
                                View Report
                              </a>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {prescriptions.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Prescriptions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prescriptions.map((prescription) => (
                          <motion.div
                            key={prescription.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/50 rounded-xl border border-gray-200/50 overflow-hidden hover:border-pink-300 transition-all duration-300"
                          >
                            {prescription.fileType?.includes('image') ? (
                              <div className="relative h-40 bg-gray-100 overflow-hidden">
                                <img
                                  src={prescription.downloadUrl}
                                  alt={prescription.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-40 bg-gray-50 flex items-center justify-center">
                                <FileSignature className="w-12 h-12 text-pink-400" />
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-medium text-gray-900 truncate">{prescription.name}</h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <span className="px-2 py-0.5 bg-gray-100 rounded-full">{prescription.type}</span>
                                <span>{new Date(prescription.uploadedAt).toLocaleDateString()}</span>
                              </div>
                              <a
                                href={prescription.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 text-sm transition-colors"
                              >
                                <Eye size={16} />
                                View Prescription
                              </a>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {familyNotes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Family Notes</h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {familyNotes.slice().reverse().map((note) => (
                          <div key={note.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm text-gray-900">{note.text}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(note.sentAt).toLocaleString()} • Sent to staff
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(() => {
  const doctorNotes = (familyNotes || []).filter(n => n.sentBy === 'doctor');
  return doctorNotes.length > 0 && (
    <div className="mt-4">
      <h4 className="font-medium text-gray-900 mb-3">Doctor's Notes</h4>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {doctorNotes.slice().reverse().map((note) => (
          <div key={note.id} className="p-3 bg-violet-50 rounded-lg border border-violet-200">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Dr. {note.doctorName || 'Doctor'}</span>
              <span className="text-xs text-gray-400 ml-auto">{new Date(note.sentAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-900">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
})()}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <ChatbotButton
  patientData={patientData}
  clinicalData={clinicalData}
  billingData={billingData}
  reports={reports}
  prescriptions={prescriptions}
  dischargeData={dischargeData}
  assignedDoctor={assignedDoctor}
  totalBill={totalBill}
  totalDeposits={totalDeposits}
  balance={balance}
   onNavigate={setActiveTab}
/>

      <AnimatePresence>
        {showAddFamilyNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddFamilyNote(false);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Send Note to Staff
                </h3>
                <button 
                  onClick={() => {
                    setShowAddFamilyNote(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddFamilyNote}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Note *</label>
                  <textarea
                    value={familyNoteText}
                    onChange={(e) => setFamilyNoteText(e.target.value)}
                    placeholder="Write a note to the hospital staff..."
                    className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 min-h-[120px]"
                    rows="4"
                    required
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddFamilyNote(false);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                  >
                    Send Note
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUploadPrescription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUploadPrescription(false);
                setFormError('');
                setFormSuccess('');
                setPrescriptionFile(null);
                setUploadProgress(0);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-pink-500" />
                  Upload Prescription
                </h3>
                <button 
                  onClick={() => {
                    setShowUploadPrescription(false);
                    setFormError('');
                    setFormSuccess('');
                    setPrescriptionFile(null);
                    setUploadProgress(0);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadPrescription}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Name *</label>
                  <input
                    type="text"
                    value={prescriptionName}
                    onChange={(e) => setPrescriptionName(e.target.value)}
                    placeholder="e.g., Medicine Prescription, Therapy Plan"
                    className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Type</label>
                  <select
                    value={prescriptionType}
                    onChange={(e) => setPrescriptionType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                  >
                    {prescriptionTypes.map((type) => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
                  <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${prescriptionFile ? 'border-pink-400 bg-pink-50/30' : 'border-gray-300 hover:border-gray-400'}`}>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
                          if (!validTypes.includes(file.type)) {
                            setFormError('Please upload JPEG, PNG, or PDF files only');
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            setFormError('File size must be less than 10MB');
                            return;
                          }
                          setPrescriptionFile(file);
                          setFormError('');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {prescriptionFile ? (
                      <div className="space-y-3">
                        <FileSignature className="w-12 h-12 text-pink-500 mx-auto" />
                        <p className="text-sm text-gray-900">{prescriptionFile.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(prescriptionFile.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          <FileSignature className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">Click or drag to upload</p>
                        <p className="text-xs text-gray-400">JPEG, PNG, PDF (Max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {uploadProgress > 0 && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{uploadProgress}% uploaded</p>
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadPrescription(false);
                      setFormError('');
                      setFormSuccess('');
                      setPrescriptionFile(null);
                      setUploadProgress(0);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !prescriptionFile}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileSignature size={16} />
                        Upload Prescription
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConsentOTP && selectedConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowConsentOTP(false);
                setFormError('');
                setFormSuccess('');
                setSelectedConsent(null);
                setConsentOTP(['', '', '', '', '', '']);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-500" />
                  Consent Request
                </h3>
                <button 
                  onClick={() => {
                    setShowConsentOTP(false);
                    setFormError('');
                    setFormSuccess('');
                    setSelectedConsent(null);
                    setConsentOTP(['', '', '', '', '', '']);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

             <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200/50">
  <p className="text-sm font-medium text-gray-900 capitalize">{selectedConsent.type}</p>
  <p className="text-xs text-gray-500 mt-1">{selectedConsent.explanation}</p>
  <p className="text-xs text-gray-400 mt-2">Please enter the 6-digit OTP sent to the family phone</p>
  <p className="text-sm font-semibold text-violet-600 mt-2">Your OTP: {selectedConsent.otp}</p>
</div>

              <div className="flex justify-center gap-2 mb-6">
                {consentOTP.map((digit, index) => (
                  <input
                    key={index}
                    id={`family-consent-otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-semibold bg-white/90 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle size={18} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConsentOTP(false);
                    setFormError('');
                    setFormSuccess('');
                    setSelectedConsent(null);
                    setConsentOTP(['', '', '', '', '', '']);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectConsent(selectedConsent.id)}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleVerifyConsentOTP(selectedConsent.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                >
                  Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showVisitingPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <VisitingPass
            patientId={localStorage.getItem('patientId')}
            patientName={patientData?.name}
            visitorName={patientData?.familyMemberName || 'Family Member'}
            ward={patientData?.ward || 'General'}
            onClose={() => setShowVisitingPass(false)}
          />
        </div>
      )}

      <footer className="mt-16 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <img 
                    src="/src/assets/Logo.png" 
                    alt="AarogyaSandesh Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-lg font-bold text-gray-900">AarogyaSandesh</span>
              </div>
              <p className="text-sm text-gray-500">A Health Update, Delivered</p>
              <p className="text-xs text-gray-400 mt-2">Real-time hospital-to-family transparency platform</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate('/family')} className="text-gray-500 hover:text-teal-600 transition-colors">Dashboard</button></li>
                <li><button onClick={() => setActiveTab('timeline')} className="text-gray-500 hover:text-teal-600 transition-colors">Treatment Timeline</button></li>
                <li><button onClick={() => setActiveTab('billing')} className="text-gray-500 hover:text-teal-600 transition-colors">Cost Ledger</button></li>
                <li><button onClick={() => setActiveTab('discharge')} className="text-gray-500 hover:text-teal-600 transition-colors">Discharge Status</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="text-gray-500 hover:text-teal-600 transition-colors">Help Center</button></li>
                <li><button className="text-gray-500 hover:text-teal-600 transition-colors">Contact Us</button></li>
                <li><button className="text-gray-500 hover:text-teal-600 transition-colors">Privacy Policy</button></li>
                <li><button className="text-gray-500 hover:text-teal-600 transition-colors">Terms of Service</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">📧 aarogyasandesh.support@gmail.com</li>
                <li className="flex items-center gap-2">📞 +91 1800-123-4567</li>
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

export default FamilyPortal;