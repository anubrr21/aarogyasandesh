import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db, storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase/firebase';
import { doc, getDoc, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import Logo from '../assets/Logo.png';
import Wordmark from '../components/common/Wordmark';
import { computeChainLink, verifyConsentChain,appendToImmutableLog } from '../utils/consentChain'
import { getVitalStatus, getVitalIcon, VITALS_NORMAL_RANGES } from '../utils/vitalsUtils';
import { formatDoctorName } from '../utils/formatDoctorName';
import { sendPushNotification } from '../utils/pushNotifications';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Activity, 
  Clock, 
  LogOut,
  Users,
  Bell,
  FileText,
  Stethoscope,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Heart,
  Pill,
  Syringe,
  Clipboard,
  Plus,
  X,
  Upload,
  CalendarDays,
  MessageSquare,
  Droplets,
  Thermometer,
  Scissors,
  Microscope,
  Ambulance,
  FilePlus,
  Brain,
  HeartPulse,
  Wallet,
  IndianRupee,
  Landmark,
  FileCheck,
  AlertTriangle,
  Download,
  Printer,
  Send,
  Home,
  Clock as ClockIcon,
  CheckSquare,
  Square,
  Image,
  File,
  Trash2,
  Eye,
  ZoomIn,
  Phone,
  MapPin,
  IdCard,
  Shield,
  Key,
  Check,
  X as XIcon,
  Timer,
  FileSignature,
  Pencil,
  Receipt
} from 'lucide-react';
import PaymentStatusBadge from '../components/billing/PaymentStatusBadge';
import CategoryBreakdown from '../components/billing/CategoryBreakdown';
import BillingSummaryPanel from '../components/billing/BillingSummaryPanel';
import { getItemStatus, computePaymentTotals, getInvoiceNumber, BILL_CATEGORIES } from '../utils/billingHelpers';
import { downloadInvoicePDF, printInvoicePDF } from '../utils/generateInvoicePDF';
import VitalsTrendSummary from '../components/discharge/VitalsTrendSummary';
import DischargeSummaryView from '../components/discharge/DischargeSummaryView';
import FamilySummaryPanel from '../components/discharge/FamilySummaryPanel';

const PatientDetail = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeline, setTimeline] = useState([]);
  const [chainVerification, setChainVerification] = useState(null)
  const [autoChainStatus, setAutoChainStatus] = useState(null)
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
    dischargeSummary: null,
    doctorNotes: '',
    instructions: '',
    followUpDate: ''
  });
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [familyNotes, setFamilyNotes] = useState([]);
  const [totalBill, setTotalBill] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [balance, setBalance] = useState(0);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [showFinalBill, setShowFinalBill] = useState(false);
  const [showUploadReport, setShowUploadReport] = useState(false);
  const [showUploadPrescription, setShowUploadPrescription] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showAddVital, setShowAddVital] = useState(false);
  const [showAddBillItem, setShowAddBillItem] = useState(false);
  const [showAddDeposit, setShowAddDeposit] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  
  const [noteText, setNoteText] = useState('');
  const [diagnosisData, setDiagnosisData] = useState({
    diagnosis: '',
    explainer: '',
    type: 'primary'
  });
  const [medicineData, setMedicineData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    route: 'Oral'
  });
  const [vitalData, setVitalData] = useState({
    bp: '',
    pulse: '',
    temperature: '',
    temperatureUnit: 'C',
    oxygenSaturation: '',
    respiratoryRate: ''
  });
  const [billItemData, setBillItemData] = useState({
    description: '',
    amount: '',
    category: 'Diagnostic'
  });
  const [depositData, setDepositData] = useState({
    amount: '',
    reason: '',
    urgency: 'routine'
  });
  const [editingBillItemIndex, setEditingBillItemIndex] = useState(null);
  const [editingDepositIndex, setEditingDepositIndex] = useState(null);
  const [consentData, setConsentData] = useState({
    type: 'surgery',
    explanation: '',
    urgency: 'routine'
  });
  const [estimatedTime, setEstimatedTime] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('lab');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionName, setPrescriptionName] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('medicine');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [lengthOfStay, setLengthOfStay] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const navigate = useNavigate();

  const categories = ['Diagnostic', 'Procedure', 'Medicine', 'Room', 'Consultation', 'Other'];
  const urgencyLevels = ['routine', 'urgent', 'emergency'];
  const reportTypes = ['lab', 'imaging', 'pathology', 'radiology', 'other'];
  const prescriptionTypes = ['medicine', 'therapy', 'exercise', 'diet', 'other'];
  const consentTypes = [
    { value: 'surgery', label: 'Surgery', icon: Scissors },
    { value: 'ventilator', label: 'Ventilator Support', icon: HeartPulse },
    { value: 'high-cost', label: 'High-Cost Procedure', icon: CreditCard },
    { value: 'blood-transfusion', label: 'Blood Transfusion', icon: Droplets },
    { value: 'chemotherapy', label: 'Chemotherapy', icon: Syringe },
    { value: 'other', label: 'Other', icon: FileText }
  ];

  const consentExpiry = {
    routine: 24 * 60 * 60 * 1000,
    urgent: 6 * 60 * 60 * 1000,
    emergency: 60 * 60 * 1000
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'clinical', label: 'Clinical', icon: Stethoscope },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'discharge', label: 'Discharge', icon: CheckCircle },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'notes', label: 'Notes', icon: MessageSquare },

  ];

  const routes = ['Oral', 'IV', 'Injection', 'Topical', 'Sublingual', 'Inhalation'];

  const checklistItems = [
    { id: 'doctorCertificate', label: 'Doctor Certificate', icon: Stethoscope },
    { id: 'finalBill', label: 'Final Bill Prepared', icon: CreditCard },
    { id: 'dischargeMedicines', label: 'Discharge Medicines Ready', icon: Pill },
    { id: 'patientReady', label: 'Patient Ready Physically', icon: Heart },
    { id: 'bedReleased', label: 'Bed Released', icon: Home }
  ];

  const getEventDetails = (type) => {
    const details = {
      'admission': { 
        icon: Ambulance, 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20',
        label: 'Admission'
      },
      'diagnosis': { 
        icon: Brain, 
        color: 'text-purple-400', 
        bg: 'bg-purple-500/10', 
        border: 'border-purple-500/20',
        label: 'Diagnosis'
      },
      'medicine': { 
        icon: Pill, 
        color: 'text-forest-400', 
        bg: 'bg-forest-600/10', 
        border: 'border-forest-600/20',
        label: 'Medicine'
      },
      'vital': { 
        icon: HeartPulse, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        label: 'Vitals'
      },
      'note': { 
        icon: MessageSquare, 
        color: 'text-forest-400', 
        bg: 'bg-forest-500/10', 
        border: 'border-forest-500/20',
        label: 'Note'
      },
      'bill': { 
        icon: CreditCard, 
        color: 'text-rose-400', 
        bg: 'bg-rose-500/10', 
        border: 'border-rose-500/20',
        label: 'Bill'
      },
      'deposit': { 
        icon: FilePlus, 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/10', 
        border: 'border-yellow-500/20',
        label: 'Deposit'
      },
      'discharge': { 
        icon: CheckCircle, 
        color: 'text-forest-400', 
        bg: 'bg-forest-600/10', 
        border: 'border-forest-600/20',
        label: 'Discharge'
      },
      'procedure': { 
        icon: Scissors, 
        color: 'text-indigo-400', 
        bg: 'bg-indigo-500/10', 
        border: 'border-indigo-500/20',
        label: 'Procedure'
      },
      'report': { 
        icon: Microscope, 
        color: 'text-orange-400', 
        bg: 'bg-orange-500/10', 
        border: 'border-orange-500/20',
        label: 'Report'
      },
      'consent': { 
        icon: Shield, 
        color: 'text-violet-400', 
        bg: 'bg-violet-500/10', 
        border: 'border-violet-500/20',
        label: 'Consent'
      },
      'prescription': { 
        icon: FileSignature, 
        color: 'text-pink-400', 
        bg: 'bg-pink-500/10', 
        border: 'border-pink-500/20',
        label: 'Prescription'
      },
      'family-note': { 
        icon: MessageSquare, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        label: 'Family Note'
      }
    };
    return details[type] || { 
      icon: Clock, 
      color: 'text-slate-400', 
      bg: 'bg-slate-500/10', 
      border: 'border-slate-500/20',
      label: 'Activity'
    };
  };

  const formatEventData = (event) => {
    switch(event.type) {
      case 'admission':
        return `Patient admitted by ${event.data?.staffName || 'Staff'}`;
      case 'diagnosis':
        return `${event.data?.diagnosis || 'Diagnosis'} ${event.data?.explainer ? '- ' + event.data.explainer : ''}`;
      case 'medicine':
        return `${event.data?.name || 'Medicine'} ${event.data?.dosage || ''} - ${event.data?.frequency || ''} (${event.data?.route || 'Oral'})`;
      case 'vital':
        return `BP: ${event.data?.bp || '--'} | Pulse: ${event.data?.pulse || '--'} | Temp: ${event.data?.temperature || '--'}°${event.data?.temperatureUnit || 'C'} | SpO2: ${event.data?.oxygenSaturation || '--'}% | RR: ${event.data?.respiratoryRate || '--'}/min`;
      case 'note':
        return event.data?.text || 'Progress note added';
      case 'bill':
        return `${event.data?.description || 'Bill item'} - ₹${event.data?.amount || 0} (${event.data?.category || 'Other'})`;
      case 'deposit':
        return `${event.data?.reason || 'Deposit'} - ₹${event.data?.amount || 0} (${event.data?.urgency || 'routine'})`;
      case 'discharge':
        return `Patient discharged - ${event.data?.summary || 'Discharged successfully'}`;
      case 'procedure':
        return `${event.data?.name || 'Procedure'} scheduled${event.data?.date ? ' on ' + event.data.date : ''}`;
      case 'report':
        return `Report uploaded: ${event.data?.name || 'New report'} (${event.data?.type || 'lab'})`;
      case 'consent':
        return `${event.data?.type || 'Consent'} request - ${event.data?.status || 'pending'} ${event.data?.explanation ? ': ' + event.data.explanation : ''}`;
      case 'prescription':
        return `Prescription uploaded: ${event.data?.name || 'New prescription'}`;
      case 'family-note':
        return `Family note: ${event.data?.text || ''}`;
      default:
        return 'Activity recorded';
    }
  };

  const notifyFamily = async (title, message, type = 'general', data = {}) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: id,
        userType: 'family',
        title,
        message,
        type,
        read: false,
        data,
        createdAt: new Date().toISOString()
      })
      sendPushNotification({ userId: id, userType: 'family', title, message, data })
    } catch (error) {
      console.error('Error creating family notification:', error)
    }
  }

  const handleVerifyChain = async () => {
    const result = await verifyConsentChain(clinicalData.consentEvents, clinicalData.consentChainHead)
    setChainVerification(result)
    setTimeout(() => setChainVerification(null), 5000)
  }

  useEffect(() => {
    let cancelled = false
    const checkChainAutomatically = async () => {
      if (!(clinicalData.consentEvents || []).length) {
        setAutoChainStatus(null)
        return
      }
      const result = await verifyConsentChain(clinicalData.consentEvents, clinicalData.consentChainHead)
      if (!cancelled) setAutoChainStatus(result)
    }
    checkChainAutomatically()
    return () => { cancelled = true }
  }, [clinicalData.consentEvents, clinicalData.consentChainHead])

  useEffect(() => {
    const docRef = doc(db, 'patients', id);
    const unsubscribePatient = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setPatient(data);

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
          setDischargeData({ doctorNotes: '', instructions: '', followUpDate: '', ...data.discharge });
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
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching patient:', error);
      setLoading(false);
    });

    const timelineRef = collection(db, 'patients', id, 'timeline');
    const q = query(timelineRef);
    const unsubscribeTimeline = onSnapshot(q, (snapshot) => {
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

    return () => {
      unsubscribePatient();
      unsubscribeTimeline();
    };
  }, [id]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'doctors'));
        const doctorsList = [];
        snapshot.forEach((doc) => {
          doctorsList.push({ id: doc.id, ...doc.data() });
        });
        setAvailableDoctors(doctorsList.filter(d => d.availability === 'available'));
        
        if (patient?.assignedDoctorId) {
          setAssignedDoctor(patient.assignedDoctorId);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    fetchDoctors();
  }, [patient]);

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
    const checkExpiredConsents = async () => {
      const now = Date.now();
      let head = clinicalData.consentChainHead
      const updatedEvents = []
      for (const c of (clinicalData.consentEvents || [])) {
        if (c.status === 'pending') {
          const requestedTime = new Date(c.requestedAt).getTime();
          const expiryMs = consentExpiry[c.urgency] || consentExpiry.routine;
          if (now - requestedTime > expiryMs) {
            const link = await computeChainLink(c.id, 'expired', new Date().toISOString(), head)
            head = link.hash
            appendToImmutableLog(db, id, { ...link, eventId: c.id })
            updatedEvents.push({ ...c, status: 'expired', chainLinks: [...(c.chainLinks || []), link] })
            continue
          }
        }
        updatedEvents.push(c)
      }

      if (JSON.stringify(updatedEvents) !== JSON.stringify(clinicalData.consentEvents)) {
        const updatedClinical = { ...clinicalData, consentEvents: updatedEvents, consentChainHead: head };
        setClinicalData(updatedClinical);
        updatePatientClinical(updatedClinical);
      }
    };

    checkExpiredConsents();
    const interval = setInterval(checkExpiredConsents, 60000);
    return () => clearInterval(interval);
  }, [clinicalData.consentEvents]);

  const addTimelineEvent = async (type, data) => {
    try {
      const timelineRef = collection(db, 'patients', id, 'timeline');
      await addDoc(timelineRef, {
        patientId: id,
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        staffId: user?.uid || 'unknown',
        staffEmail: user?.email || 'unknown',
        staffName: user?.displayName || 'Staff'
      });
      return true;
    } catch (error) {
      console.error('Error adding timeline event:', error);
      return false;
    }
  };

  const updatePatientBilling = async (data) => {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { billing: data });
      return true;
    } catch (error) {
      console.error('Error updating billing data:', error);
      return false;
    }
  };

  const updatePatientClinical = async (data) => {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { clinical: data });
      return true;
    } catch (error) {
      console.error('Error updating clinical data:', error);
      return false;
    }
  };

  const updatePatientDischarge = async (data) => {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { discharge: data });
      return true;
    } catch (error) {
      console.error('Error updating discharge data:', error);
      return false;
    }
  };

  const updatePatientReports = async (data) => {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { reports: data });
      return true;
    } catch (error) {
      console.error('Error updating reports data:', error);
      return false;
    }
  };

  const updatePatientPrescriptions = async (data) => {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { prescriptions: data });
      return true;
    } catch (error) {
      console.error('Error updating prescriptions data:', error);
      return false;
    }
  };

  const handleAssignDoctor = async (doctorId) => {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { assignedDoctorId: doctorId });
      setAssignedDoctor(doctorId);
      setFormSuccess('Doctor assigned successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      setFormError('Failed to assign doctor');
    }
  };

  const generateConsentOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleRequestConsent = async (e) => {
    e.preventDefault();
    if (!consentData.explanation.trim()) {
      setFormError('Please provide an explanation');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const otp = generateConsentOTP();
      const newConsent = {
        id: Date.now().toString(),
        type: consentData.type,
        explanation: consentData.explanation.trim(),
        urgency: consentData.urgency,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        respondedAt: null,
        familyPhone: patient.phone || 'Not provided',
        otp: otp,
        staffName: user?.displayName || 'Staff',
        staffEmail: user?.email || 'unknown',
        familySignature: null,
        expiryTime: new Date(Date.now() + consentExpiry[consentData.urgency]).toISOString()
      };

      const requestLink = await computeChainLink(
        newConsent.id,
        'requested',
        newConsent.requestedAt,
        clinicalData.consentChainHead,
        { type: newConsent.type, urgency: newConsent.urgency }
      )
      newConsent.chainLinks = [requestLink]
      appendToImmutableLog(db, id, { ...requestLink, eventId: newConsent.id })

      const updatedClinical = {
        ...clinicalData,
        consentEvents: [...(clinicalData.consentEvents || []), newConsent],
        consentChainHead: requestLink.hash
      };

      const success1 = await updatePatientClinical(updatedClinical);
      const success2 = await addTimelineEvent('consent', newConsent);

      if (success1 && success2) {
        setClinicalData(updatedClinical);
        notifyFamily(
          `${consentTypes.find(c => c.value === consentData.type)?.label || 'Consent'} Required`,
          newConsent.explanation,
          'consent',
          { consentId: newConsent.id }
        )
        setFormSuccess('Consent request sent successfully!');
        setConsentData({ type: 'surgery', explanation: '', urgency: 'routine' });
        setTimeout(() => {
          setFormSuccess('');
          setShowConsentModal(false);
        }, 5000);
      } else {
        setFormError('Failed to send consent request. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to send consent request. Please try again.');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) {
      setFormError('Please enter a note');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const success = await addTimelineEvent('note', {
        text: noteText.trim(),
        type: 'progress'
      });

      if (success) {
        setFormSuccess('Note added successfully!');
        setNoteText('');
        setTimeout(() => {
          setFormSuccess('');
          setShowAddNote(false);
        }, 2000);
      } else {
        setFormError('Failed to add note. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to add note. Please try again.');
    }
  };

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (!diagnosisData.diagnosis.trim()) {
      setFormError('Please enter a diagnosis');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const newDiagnosis = {
        diagnosis: diagnosisData.diagnosis.trim(),
        explainer: diagnosisData.explainer.trim(),
        type: diagnosisData.type,
        recordedAt: new Date().toISOString(),
        recordedBy: user?.email || 'Staff'
      };

      const updatedClinical = {
        ...clinicalData,
        diagnosis: [...(clinicalData.diagnosis || []), newDiagnosis]
      };

      const success1 = await updatePatientClinical(updatedClinical);
      const success2 = await addTimelineEvent('diagnosis', newDiagnosis);

      if (success1 && success2) {
        setClinicalData(updatedClinical);
        setFormSuccess('Diagnosis added successfully!');
        setDiagnosisData({ diagnosis: '', explainer: '', type: 'primary' });
        setTimeout(() => {
          setFormSuccess('');
          setShowAddDiagnosis(false);
        }, 2000);
      } else {
        setFormError('Failed to add diagnosis. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to add diagnosis. Please try again.');
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!medicineData.name.trim() || !medicineData.dosage.trim() || !medicineData.frequency.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const newMedicine = {
        ...medicineData,
        prescribedAt: new Date().toISOString(),
        prescribedBy: user?.email || 'Staff',
        status: 'active'
      };

      const updatedClinical = {
        ...clinicalData,
        medicines: [...(clinicalData.medicines || []), newMedicine]
      };

      const success1 = await updatePatientClinical(updatedClinical);
      const success2 = await addTimelineEvent('medicine', newMedicine);

      if (success1 && success2) {
        setClinicalData(updatedClinical);
        setFormSuccess('Medicine prescribed successfully!');
        setMedicineData({ name: '', dosage: '', frequency: '', route: 'Oral' });
        setTimeout(() => {
          setFormSuccess('');
          setShowAddMedicine(false);
        }, 2000);
      } else {
        setFormError('Failed to prescribe medicine. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to prescribe medicine. Please try again.');
    }
  };

  const handleAddVital = async (e) => {
    e.preventDefault();
    if (!vitalData.bp.trim() || !vitalData.pulse.trim()) {
      setFormError('Please enter at least BP and Pulse');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const newVital = {
        ...vitalData,
        recordedAt: new Date().toISOString(),
        recordedBy: user?.email || 'Staff'
      };

      const updatedClinical = {
        ...clinicalData,
        vitals: [...(clinicalData.vitals || []), newVital]
      };

      const success1 = await updatePatientClinical(updatedClinical);
      const success2 = await addTimelineEvent('vital', newVital);

      if (success1 && success2) {
        setClinicalData(updatedClinical);
        setFormSuccess('Vitals logged successfully!');
        setVitalData({
          bp: '',
          pulse: '',
          temperature: '',
          temperatureUnit: 'C',
          oxygenSaturation: '',
          respiratoryRate: ''
        });

        // Automatic notification trigger — fires the instant an abnormal reading is saved, instead
        // of relying on the family happening to notice it next time they open the app. Reuses the
        // exact same abnormality thresholds already shown on the vitals cards (getVitalStatus), and
        // the exact same notification helpers already used for bills/reports/discharge.
        const abnormalFlags = []
        if (getVitalStatus('bp', newVital.bp).isAbnormal) abnormalFlags.push(`BP ${newVital.bp}`)
        if (getVitalStatus('pulse', newVital.pulse).isAbnormal) abnormalFlags.push(`Pulse ${newVital.pulse} bpm`)
        if (getVitalStatus('temperature', newVital.temperature, `°${newVital.temperatureUnit || 'C'}`).isAbnormal) {
          abnormalFlags.push(`Temp ${newVital.temperature}°${newVital.temperatureUnit || 'C'}`)
        }
        if (getVitalStatus('oxygenSaturation', newVital.oxygenSaturation).isAbnormal) abnormalFlags.push(`SpO2 ${newVital.oxygenSaturation}%`)
        if (getVitalStatus('respiratoryRate', newVital.respiratoryRate).isAbnormal) abnormalFlags.push(`RR ${newVital.respiratoryRate}/min`)

        if (abnormalFlags.length > 0) {
          const alertMessage = `${patient?.name || 'Patient'}: ${abnormalFlags.join(', ')}`
          notifyFamily('⚠️ Abnormal Vitals Recorded', alertMessage, 'vitals', { patientId: id })
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/notify-staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '⚠️ Abnormal Vitals Recorded',
              message: alertMessage,
              type: 'vitals',
              data: { patientId: id }
            })
          }).catch(err => console.error('Error notifying staff of abnormal vitals:', err))
          if (patient?.assignedDoctorId) {
            addDoc(collection(db, 'notifications'), {
              userId: patient.assignedDoctorId,
              userType: 'doctor',
              title: '⚠️ Abnormal Vitals Recorded',
              message: alertMessage,
              type: 'vitals',
              read: false,
              data: { patientId: id },
              createdAt: new Date().toISOString()
            }).then(() => {
              sendPushNotification({ userId: patient.assignedDoctorId, userType: 'doctor', title: '⚠️ Abnormal Vitals Recorded', message: alertMessage, data: { patientId: id } })
            }).catch(err => console.error('Error notifying doctor of abnormal vitals:', err))
          }
        }

        setTimeout(() => {
          setFormSuccess('');
          setShowAddVital(false);
        }, 2000);
      } else {
        setFormError('Failed to log vitals. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to log vitals. Please try again.');
    }
  };

  const handleAddBillItem = async (e) => {
    e.preventDefault();
    if (!billItemData.description.trim() || !billItemData.amount.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const isEditing = editingBillItemIndex !== null;
      const existingItems = billingData.items || [];
      const newItem = isEditing
        ? {
            ...existingItems[editingBillItemIndex],
            ...billItemData,
            amount: parseFloat(billItemData.amount),
            editedAt: new Date().toISOString(),
            editedBy: user?.email || 'Staff'
          }
        : {
            ...billItemData,
            amount: parseFloat(billItemData.amount),
            status: 'unpaid',
            addedAt: new Date().toISOString(),
            addedBy: user?.email || 'Staff'
          };

      const updatedItems = isEditing
        ? existingItems.map((item, idx) => (idx === editingBillItemIndex ? newItem : item))
        : [...existingItems, newItem];

      const updatedBilling = {
        ...billingData,
        items: updatedItems
      };

      const success1 = await updatePatientBilling(updatedBilling);
      const success2 = isEditing ? true : await addTimelineEvent('bill', newItem);

      if (success1 && success2) {
        setBillingData(updatedBilling);
        const newTotal = updatedBilling.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setTotalBill(newTotal);
        setBalance(totalDeposits - newTotal);
        if (!isEditing) notifyFamily('New Bill Item Added', `${newItem.description} - ₹${newItem.amount}`, 'bill')
        setFormSuccess(isEditing ? 'Bill item updated successfully!' : 'Bill item added successfully!');
        setBillItemData({ description: '', amount: '', category: 'Diagnostic' });
        setEditingBillItemIndex(null);
        setTimeout(() => {
          setFormSuccess('');
          setShowAddBillItem(false);
        }, 2000);
      } else {
        setFormError('Failed to save bill item. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to save bill item. Please try again.');
    }
  };

  const handleStartEditBillItem = (index) => {
    const item = (billingData.items || [])[index];
    if (!item) return;
    setBillItemData({ description: item.description || '', amount: String(item.amount ?? ''), category: item.category || 'Diagnostic' });
    setEditingBillItemIndex(index);
    setShowAddBillItem(true);
  };

  const handleDeleteBillItem = async (index) => {
    if (!window.confirm('Remove this bill item? This cannot be undone.')) return;
    const updatedItems = (billingData.items || []).filter((_, idx) => idx !== index);
    const updatedBilling = { ...billingData, items: updatedItems };
    const success = await updatePatientBilling(updatedBilling);
    if (success) {
      setBillingData(updatedBilling);
      const newTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      setTotalBill(newTotal);
      setBalance(totalDeposits - newTotal);
    }
  };

  const handleToggleBillItemPaid = async (index) => {
    const items = billingData.items || [];
    const item = items[index];
    if (!item) return;
    const updatedItems = items.map((it, idx) =>
      idx === index ? { ...it, status: getItemStatus(it) === 'paid' ? 'unpaid' : 'paid' } : it
    );
    const updatedBilling = { ...billingData, items: updatedItems };
    const success = await updatePatientBilling(updatedBilling);
    if (success) setBillingData(updatedBilling);
  };

  const handleDownloadInvoice = () => {
    downloadInvoicePDF({ patient, billingData, totalBill, totalDeposits, balance });
  };

  const handlePrintInvoice = () => {
    printInvoicePDF({ patient, billingData, totalBill, totalDeposits, balance });
  };

  const handleAddDeposit = async (e) => {
    e.preventDefault();
    if (!depositData.amount.trim() || !depositData.reason.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const isEditing = editingDepositIndex !== null;
      const existingDeposits = billingData.deposits || [];
      const newDeposit = isEditing
        ? {
            ...existingDeposits[editingDepositIndex],
            ...depositData,
            amount: parseFloat(depositData.amount),
            editedAt: new Date().toISOString(),
            editedBy: user?.email || 'Staff'
          }
        : {
            ...depositData,
            amount: parseFloat(depositData.amount),
            depositedAt: new Date().toISOString(),
            depositedBy: user?.email || 'Staff',
            status: 'pending'
          };

      const updatedDeposits = isEditing
        ? existingDeposits.map((d, idx) => (idx === editingDepositIndex ? newDeposit : d))
        : [...existingDeposits, newDeposit];

      const updatedBilling = {
        ...billingData,
        deposits: updatedDeposits
      };

      const success1 = await updatePatientBilling(updatedBilling);
      const success2 = isEditing ? true : await addTimelineEvent('deposit', newDeposit);

      if (success1 && success2) {
        setBillingData(updatedBilling);
        const newDepTotal = updatedBilling.deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        setTotalDeposits(newDepTotal);
        setBalance(newDepTotal - totalBill);
        setFormSuccess(isEditing ? 'Deposit updated successfully!' : 'Deposit request added successfully!');
        setDepositData({ amount: '', reason: '', urgency: 'routine' });
        setEditingDepositIndex(null);
        setTimeout(() => {
          setFormSuccess('');
          setShowAddDeposit(false);
        }, 2000);
      } else {
        setFormError('Failed to save deposit. Please try again.');
      }
    } catch (error) {
      setFormError('Failed to save deposit. Please try again.');
    }
  };

  const handleStartEditDeposit = (index) => {
    const deposit = (billingData.deposits || [])[index];
    if (!deposit) return;
    setDepositData({ amount: String(deposit.amount ?? ''), reason: deposit.reason || '', urgency: deposit.urgency || 'routine' });
    setEditingDepositIndex(index);
    setShowAddDeposit(true);
  };

  const handleDeleteDeposit = async (index) => {
    if (!window.confirm('Remove this deposit record? This cannot be undone.')) return;
    const updatedDeposits = (billingData.deposits || []).filter((_, idx) => idx !== index);
    const updatedBilling = { ...billingData, deposits: updatedDeposits };
    const success = await updatePatientBilling(updatedBilling);
    if (success) {
      setBillingData(updatedBilling);
      const newDepTotal = updatedDeposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      setTotalDeposits(newDepTotal);
      setBalance(newDepTotal - totalBill);
    }
  };

  const toggleChecklistItem = async (itemId) => {
    try {
      const updatedChecklist = {
        ...dischargeData.checklist,
        [itemId]: !dischargeData.checklist[itemId]
      };
      
      const updatedDischarge = {
        ...dischargeData,
        checklist: updatedChecklist
      };
      
      await updatePatientDischarge(updatedDischarge);
      setDischargeData(updatedDischarge);
      
      const itemName = checklistItems.find(i => i.id === itemId)?.label || itemId;
      await addTimelineEvent('note', {
        text: `Checklist item "${itemName}" ${updatedChecklist[itemId] ? 'completed' : 'unchecked'}`,
        type: 'checklist'
      });
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const handleSetEstimatedTime = async () => {
    if (!estimatedTime) {
      setFormError('Please select an estimated discharge time');
      return;
    }

    try {
      const updatedDischarge = {
        ...dischargeData,
        estimatedTime: new Date(estimatedTime).toISOString()
      };
      
      await updatePatientDischarge(updatedDischarge);
      setDischargeData(updatedDischarge);
      setFormSuccess('Estimated discharge time set successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      setFormError('Failed to set discharge time');
    }
  };

  const handleSaveDischargeNotes = async () => {
    try {
      const updatedDischarge = {
        ...dischargeData,
        doctorNotes: dischargeData.doctorNotes || '',
        instructions: dischargeData.instructions || '',
        followUpDate: dischargeData.followUpDate || ''
      };
      const success = await updatePatientDischarge(updatedDischarge);
      if (success) {
        setDischargeData(updatedDischarge);
        setFormSuccess('Discharge notes saved!');
        setTimeout(() => setFormSuccess(''), 2000);
      } else {
        setFormError('Failed to save discharge notes');
      }
    } catch (error) {
      setFormError('Failed to save discharge notes');
    }
  };

  const handleDischargePatient = async () => {
    try {
      const allCompleted = Object.values(dischargeData.checklist).every(v => v === true);
      
      if (!allCompleted) {
        setFormError('Please complete all checklist items before discharging');
        return;
      }

      const summary = {
        patientName: patient.name,
        age: patient.age,
        diagnosis: patient.problem,
        admitDate: patient.admitDate,
        dischargeDate: new Date().toISOString(),
        lengthOfStay: lengthOfStay,
        totalBill: totalBill,
        totalDeposits: totalDeposits,
        balance: balance,
        medicines: clinicalData.medicines || [],
        vitals: clinicalData.vitals || [],
        diagnosisList: clinicalData.diagnosis || [],
        doctorNotes: dischargeData.doctorNotes || '',
        instructions: dischargeData.instructions || '',
        followUpDate: dischargeData.followUpDate || ''
      };

      const updatedDischarge = {
        ...dischargeData,
        discharged: true,
        actualTime: new Date().toISOString(),
        dischargeSummary: summary
      };
      
      await updatePatientDischarge(updatedDischarge);
      await updateDoc(doc(db, 'patients', id), { discharged: true });
      await addTimelineEvent('discharge', summary);
      
      setDischargeData(updatedDischarge);
      notifyFamily('Patient Discharged', `${patient.name} has been discharged. Final bill is ready to view.`, 'discharge')
      setShowDischargeConfirm(false);
      setShowFinalBill(true);
      setFormSuccess('Patient discharged successfully!');
      
      setTimeout(() => {
        navigate('/staff');
      }, 5000);
    } catch (error) {
      setFormError('Failed to discharge patient');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFormError('Please upload JPEG, PNG, or PDF files only');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setFormError('File size must be less than 10MB');
      return;
    }

    setReportFile(file);
    setReportName(file.name);
    setFormError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadReport = async (e) => {
    e.preventDefault();
    
    if (!reportFile) {
      setFormError('Please select a file');
      return;
    }

    if (!reportName.trim()) {
      setFormError('Please enter a report name');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setFormError('');
    setFormSuccess('');

    try {
      const fileExt = reportFile.name.split('.').pop();
      const fileName = `${id}/${Date.now()}_report_${reportName.replace(/\s+/g, '_')}.${fileExt}`;
      const storageRef = ref(storage, `reports/${fileName}`);
      
      await uploadBytes(storageRef, reportFile);
      setUploadProgress(50);
      
      const downloadUrl = await getDownloadURL(storageRef);
      setUploadProgress(100);

      const newReport = {
        id: Date.now().toString(),
        name: reportName.trim(),
        type: reportType,
        fileName: reportFile.name,
        fileType: reportFile.type,
        fileSize: reportFile.size,
        downloadUrl: downloadUrl,
        storagePath: `reports/${fileName}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.email || 'Staff'
      };

      const updatedReports = [...reports, newReport];
      await updatePatientReports(updatedReports);
      
      await addTimelineEvent('report', {
        name: reportName.trim(),
        type: reportType,
        fileName: reportFile.name
      });

      setReports(updatedReports);
      notifyFamily('New Report Uploaded', reportName.trim(), 'report')
      setFormSuccess('Report uploaded successfully!');
      setShowUploadReport(false);
      setReportFile(null);
      setReportName('');
      setPreviewUrl(null);
      setUploadProgress(0);
      
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setFormError('Failed to upload report. Please try again.');
    } finally {
      setUploading(false);
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

    setUploading(true);
    setUploadProgress(0);
    setFormError('');
    setFormSuccess('');

    try {
      const fileExt = prescriptionFile.name.split('.').pop();
      const fileName = `${id}/${Date.now()}_prescription_${prescriptionName.replace(/\s+/g, '_')}.${fileExt}`;
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
        uploadedBy: user?.email || 'Staff'
      };

      const updatedPrescriptions = [...prescriptions, newPrescription];
      await updatePatientPrescriptions(updatedPrescriptions);
      
      await addTimelineEvent('prescription', {
        name: prescriptionName.trim(),
        type: prescriptionType,
        fileName: prescriptionFile.name
      });

      setPrescriptions(updatedPrescriptions);
      notifyFamily('New Prescription Uploaded', prescriptionName.trim(), 'prescription')
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

  const handleDeleteReport = async (reportId, storagePath) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }

      const updatedReports = reports.filter(r => r.id !== reportId);
      await updatePatientReports(updatedReports);
      setReports(updatedReports);
      setFormSuccess('Report deleted successfully!');
      setTimeout(() => setFormSuccess(''), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      setFormError('Failed to delete report. Please try again.');
    }
  };

  const handleDeletePrescription = async (prescriptionId, storagePath) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;

    try {
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }

      const updatedPrescriptions = prescriptions.filter(p => p.id !== prescriptionId);
      await updatePatientPrescriptions(updatedPrescriptions);
      setPrescriptions(updatedPrescriptions);
      setFormSuccess('Prescription deleted successfully!');
      setTimeout(() => setFormSuccess(''), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      setFormError('Failed to delete prescription. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/staff');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-forest-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">Patient Not Found</h2>
          <button
            onClick={handleBack}
            className="w-full py-3 bg-gradient-to-r from-forest-500 to-forest-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-forest-500/25 transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const allChecklistComplete = Object.values(dischargeData.checklist).every(v => v === true);
  const checklistProgress = Object.values(dischargeData.checklist).filter(v => v === true).length;
  const totalChecklistItems = Object.values(dischargeData.checklist).length;
  const pendingConsents = (clinicalData.consentEvents || []).filter(c => c.status === 'pending');

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <File className="w-6 h-6 text-red-400" />;
    if (fileType?.includes('image')) return <Image className="w-6 h-6 text-blue-400" />;
    return <File className="w-6 h-6 text-gray-400" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getConsentTimeRemaining = (consent) => {
    if (consent.status !== 'pending') return null;
    const now = Date.now();
    const requested = new Date(consent.requestedAt).getTime();
    const expiry = consentExpiry[consent.urgency] || consentExpiry.routine;
    const remaining = (requested + expiry) - now;
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBack}
                className="p-2 text-gray-500 hover:text-forest-700 hover:bg-forest-500/10 rounded-xl transition-all duration-200"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-forest-500/20">
                  <img src={Logo} alt="AarogyaSandesh" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <Wordmark size="xs" stacked={false} className="text-gray-900" hiClassName="text-forest-700" />
                  <p className="text-xs text-forest-700">Patient Details</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button className="relative p-2 text-gray-500 hover:text-forest-700 transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-forest-500 to-forest-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
                {patient.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span>Age: {patient.age} years</span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span>Gender: {patient.gender || 'N/A'}</span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span>Access: {patient.accessCode}</span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  {dischargeData.discharged ? (
                    <span className="text-forest-400">● Discharged</span>
                  ) : (
                    <span className="text-forest-400">● Active</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-forest-500/10 text-forest-700 rounded-xl text-sm border border-forest-500/20">
                📅 {new Date(patient.admitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Length of Stay</p>
            <p className="text-xl font-bold text-gray-900">{lengthOfStay} day(s)</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Bill</p>
            <p className="text-xl font-bold text-rose-400">₹{totalBill.toLocaleString()}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Deposits</p>
            <p className="text-xl font-bold text-yellow-400">₹{totalDeposits.toLocaleString()}</p>
          </div>
          <div className={`bg-white/80 backdrop-blur-sm border rounded-xl p-4 ${balance >= 0 ? 'border-forest-600/20' : 'border-red-500/20'}`}>
            <p className="text-sm text-gray-500">Balance</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-forest-400' : 'text-red-400'}`}>
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
                  ? 'bg-forest-500/10 text-forest-700 border border-forest-500/30'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 min-h-[400px]">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">Patient Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Patient ID</p>
                  <p className="font-medium text-gray-900 font-mono">{patient.patientId || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">ABHA ID</p>
                  <p className="font-medium text-gray-900">{patient.abhaId || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900">{patient.phone || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Family Member</p>
                  <p className="font-medium text-gray-900">{patient.familyMemberName}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Ward</p>
                  <p className="font-medium text-gray-900">{patient.ward || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Bed</p>
                  <p className="font-medium text-gray-900">{patient.bed || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Room</p>
                  <p className="font-medium text-gray-900">{patient.room || 'Not Assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                  <p className="text-sm text-gray-500">Diagnosis</p>
                  <p className="font-medium text-gray-900">{patient.problem}</p>
                </div>
                <div className="md:col-span-2 p-4 bg-forest-50/50 rounded-xl border border-forest-200/50">
                  <p className="text-sm text-gray-500">Assigned Doctor</p>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mt-2">
                    <div className="flex-1">
                      {assignedDoctor ? (
                        <div className="p-3 bg-white rounded-lg border border-forest-200">
                          <p className="font-medium text-gray-900">
                            {availableDoctors.find(d => d.id === assignedDoctor)?.name || 'Doctor assigned'}
                          </p>
                          <p className="text-sm text-forest-700">
                            {availableDoctors.find(d => d.id === assignedDoctor)?.specialization || ''}
                          </p>
                          {availableDoctors.find(d => d.id === assignedDoctor)?.department && (
                            <p className="text-xs text-gray-500">
                              Department: {availableDoctors.find(d => d.id === assignedDoctor)?.department}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No doctor assigned</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <select
                        value={assignedDoctor || ''}
                        onChange={(e) => handleAssignDoctor(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                      >
                        <option value="">Select a doctor</option>
                        {availableDoctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name} - {doctor.specialization}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Recent Activity</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {timeline.slice(0, 10).map((event) => {
                    const details = getEventDetails(event.type);
                    const Icon = details.icon;
                    return (
                      <div key={event.id} className={`flex items-start gap-3 p-3 rounded-xl border ${details.border} ${details.bg}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${details.bg}`}>
                          <Icon className={`w-4 h-4 ${details.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{formatEventData(event)}</p>
                          <p className="text-xs text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Just now'}</p>
                        </div>
                        {event.data?.staffName && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{event.data.staffName}</span>
                        )}
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-gray-900">Activity Timeline</h3>
                  <p className="text-sm text-gray-500">{timeline.length} events recorded</p>
                </div>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="px-4 py-2 bg-gradient-to-r from-forest-500 to-forest-500 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/25 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Note
                </button>
              </div>

              <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
                {timeline.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-900">No Activity Yet</p>
                    <p className="text-sm">Add a note to start the timeline</p>
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
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="relative"
                      >
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full ${details.bg} border-2 ${details.border} flex items-center justify-center z-10`}>
                              <Icon className={`w-5 h-5 ${details.color}`} />
                            </div>
                            {!isLast && (
                              <div className="w-0.5 flex-1 bg-gradient-to-b from-gray-200 to-gray-200/20 mt-1" />
                            )}
                          </div>
                          <div className={`flex-1 pb-6 ${!isLast ? 'border-b border-gray-200/30' : ''}`}>
                            <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${details.bg} ${details.color}`}>
                                  {details.label}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {formatEventData(event)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                                <CalendarDays size={12} />
                                <span>{event.timestamp ? new Date(event.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                                <Clock size={12} />
                                <span>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                              </div>
                            </div>
                            {event.data?.staffName && (
                              <div className="flex items-center gap-1 mt-1">
                                <User size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-500">by {event.data.staffName}</span>
                              </div>
                            )}
                            {event.type === 'note' && event.data?.text && (
                              <div className="mt-2 p-3 bg-gray-50/50 rounded-lg border border-gray-200/50">
                                <p className="text-sm text-gray-700 italic">"{event.data.text}"</p>
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-gray-900">Clinical Management</h3>
                  <p className="text-sm text-gray-500">Manage diagnosis, medicines, vitals, and consent</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowAddDiagnosis(true)}
                    className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-sm border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                  >
                    <Brain size={14} />
                    Add Diagnosis
                  </button>
                  <button
                    onClick={() => setShowAddMedicine(true)}
                    className="px-3 py-1.5 bg-forest-600/10 text-forest-400 rounded-lg text-sm border border-forest-600/20 hover:bg-forest-600/20 transition-colors flex items-center gap-1"
                  >
                    <Pill size={14} />
                    Add Medicine
                  </button>
                  <button
                    onClick={() => setShowAddVital(true)}
                    className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-sm border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                  >
                    <HeartPulse size={14} />
                    Log Vitals
                  </button>
                  <button
                    onClick={() => setShowConsentModal(true)}
                    className="px-3 py-1.5 bg-violet-500/10 text-violet-400 rounded-lg text-sm border border-violet-500/20 hover:bg-violet-500/20 transition-colors flex items-center gap-1"
                  >
                    <Shield size={14} />
                    Request Consent
                    {pendingConsents.length > 0 && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Diagnosis
                    </h4>
                    {(clinicalData.diagnosis || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No diagnosis recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {(clinicalData.diagnosis || []).map((d, index) => (
                          <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                            <p className="text-sm font-medium text-gray-900">{d.diagnosis}</p>
                            {d.explainer && (
                              <p className="text-xs text-gray-500 mt-1">{d.explainer}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">by {d.recordedBy || 'Staff'} • {new Date(d.recordedAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

      {/* Medicines Card */}
<div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
    <Pill className="w-4 h-4 text-forest-400" />
    Medicines
  </h4>
  {(clinicalData.medicines || []).length === 0 ? (
    <p className="text-sm text-gray-500">No medicines prescribed</p>
  ) : (
    <div className="space-y-2">
      {(clinicalData.medicines || []).map((m, index) => (
        <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">{m.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs ${m.status === 'active' ? 'bg-forest-600/10 text-forest-400' : 'bg-gray-500/10 text-gray-400'}`}>
              {m.status || 'active'}
            </span>
          </div>
          <p className="text-xs text-gray-500">{m.dosage} • {m.frequency} • {m.route}</p>
          <p className="text-xs text-gray-400 mt-1">by {m.prescribedBy || 'Staff'} • {new Date(m.prescribedAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )}
</div>
</div>


{/* Vitals Card - NOW SEPARATE */}
 <div className="space-y-4">
<div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
    <HeartPulse className="w-4 h-4 text-amber-400" />
    Vitals
  </h4>
  {(clinicalData.vitals || []).length === 0 ? (
    <p className="text-sm text-gray-500">No vitals logged</p>
  ) : (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {(clinicalData.vitals || []).slice().reverse().map((v, index) => (
        <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`p-2 rounded-lg border ${getVitalStatus('bp', v.bp).isAbnormal ? 'border-red-300' : 'border-forest-300'}`}>
              <p className="text-gray-500">BP</p>
              <p className={`font-medium ${getVitalStatus('bp', v.bp).color}`}>{v.bp || '--'}</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getVitalStatus('bp', v.bp).bg} ${getVitalStatus('bp', v.bp).color}`}>
                {getVitalStatus('bp', v.bp).label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${getVitalStatus('pulse', v.pulse).isAbnormal ? 'border-red-300' : 'border-forest-300'}`}>
              <p className="text-gray-500">Pulse</p>
              <p className={`font-medium ${getVitalStatus('pulse', v.pulse).color}`}>{v.pulse || '--'} bpm</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getVitalStatus('pulse', v.pulse).bg} ${getVitalStatus('pulse', v.pulse).color}`}>
                {getVitalStatus('pulse', v.pulse).label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${getVitalStatus('temperature', v.temperature, `°${v.temperatureUnit || 'C'}`).isAbnormal ? 'border-red-300' : 'border-forest-300'}`}>
              <p className="text-gray-500">Temp</p>
              <p className={`font-medium ${getVitalStatus('temperature', v.temperature, `°${v.temperatureUnit || 'C'}`).color}`}>{v.temperature || '--'}°{v.temperatureUnit || 'C'}</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getVitalStatus('temperature', v.temperature, `°${v.temperatureUnit || 'C'}`).bg} ${getVitalStatus('temperature', v.temperature, `°${v.temperatureUnit || 'C'}`).color}`}>
                {getVitalStatus('temperature', v.temperature, `°${v.temperatureUnit || 'C'}`).label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${getVitalStatus('oxygenSaturation', v.oxygenSaturation).isAbnormal ? 'border-red-300' : 'border-forest-300'}`}>
              <p className="text-gray-500">SpO2</p>
              <p className={`font-medium ${getVitalStatus('oxygenSaturation', v.oxygenSaturation).color}`}>{v.oxygenSaturation || '--'}%</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getVitalStatus('oxygenSaturation', v.oxygenSaturation).bg} ${getVitalStatus('oxygenSaturation', v.oxygenSaturation).color}`}>
                {getVitalStatus('oxygenSaturation', v.oxygenSaturation).label}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${getVitalStatus('respiratoryRate', v.respiratoryRate).isAbnormal ? 'border-red-300' : 'border-forest-300'}`}>
              <p className="text-gray-500">RR</p>
              <p className={`font-medium ${getVitalStatus('respiratoryRate', v.respiratoryRate).color}`}>{v.respiratoryRate || '--'}/min</p>
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getVitalStatus('respiratoryRate', v.respiratoryRate).bg} ${getVitalStatus('respiratoryRate', v.respiratoryRate).color}`}>
                {getVitalStatus('respiratoryRate', v.respiratoryRate).label}
              </div>
            </div>
            <div className="col-span-3">
              <p className="text-xs text-gray-400 mt-1">{new Date(v.recordedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-violet-400" />
                      Consent Ledger
                      {pendingConsents.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                          {pendingConsents.length} pending
                        </span>
                      )}
                    </h4>
                    {autoChainStatus && !autoChainStatus.valid && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                        ⚠️ Something doesn't look right in this consent history. Please double-check these records.
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={handleVerifyChain}
                        className="px-3 py-1 bg-violet-500/10 text-violet-600 rounded-lg text-xs border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                      >
                        🔒 Verify Chain Integrity
                      </button>
                      {chainVerification && (
                        <span className={`px-3 py-1 rounded-lg text-xs ${chainVerification.valid ? 'bg-forest-600/10 text-forest-700' : 'bg-red-500/10 text-red-600'}`}>
                          {chainVerification.valid ? '✅ Chain verified — no tampering detected' : `⚠️ Chain broken at link ${chainVerification.brokenAt}`}
                        </span>
                      )}
                    </div>
                    {(clinicalData.consentEvents || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No consent requests</p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {(clinicalData.consentEvents || []).slice().reverse().map((c, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            c.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' :
                            c.status === 'approved' ? 'bg-forest-600/10 border-forest-600/30' :
                            c.status === 'rejected' ? 'bg-red-500/10 border-red-500/30' :
                            c.status === 'expired' ? 'bg-gray-700/30 border-gray-700/30' :
                            'bg-gray-700/30 border-gray-700/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 capitalize">{c.type}</p>
                                <p className="text-xs text-gray-500">{c.explanation}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  c.status === 'approved' ? 'bg-forest-600/20 text-forest-400' :
                                  c.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  c.status === 'expired' ? 'bg-gray-500/20 text-gray-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {c.status}
                                </span>
                                {c.status === 'pending' && (
                                  <div className="flex items-center gap-1 text-xs text-amber-400">
                                    <Timer size={12} />
                                    <span>{getConsentTimeRemaining(c)}</span>
                                  </div>
                                )}
                                {c.status === 'approved' && c.familySignature && (
                                  <div className="text-xs text-forest-400">
                                    ✓ {c.familySignature}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(c.requestedAt).toLocaleString()} • {c.staffName}
                            </p>
                            {c.status === 'approved' && (
                              <p className="text-xs text-forest-400 mt-1">✓ Approved at {new Date(c.respondedAt).toLocaleString()}</p>
                            )}
                            {c.status === 'rejected' && (
                              <p className="text-xs text-red-400 mt-1">✗ Rejected at {new Date(c.respondedAt).toLocaleString()}</p>
                            )}
                            {c.status === 'expired' && (
                              <p className="text-xs text-gray-400 mt-1">⏰ Expired</p>
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-gray-900">Billing Management</h3>
                  <p className="text-sm text-gray-500">Manage cost items and deposits</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingBillItemIndex(null);
                      setBillItemData({ description: '', amount: '', category: 'Diagnostic' });
                      setShowAddBillItem(true);
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-sm border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Bill Item
                  </button>
                  <button
                    onClick={() => {
                      setEditingDepositIndex(null);
                      setDepositData({ amount: '', reason: '', urgency: 'routine' });
                      setShowAddDeposit(true);
                    }}
                    className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-sm border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors flex items-center gap-1"
                  >
                    <FilePlus size={14} />
                    Add Deposit
                  </button>
                  <button
                    onClick={handleDownloadInvoice}
                    className="px-3 py-1.5 bg-forest-50 text-forest-700 rounded-lg text-sm border border-forest-200 hover:bg-forest-100 transition-colors flex items-center gap-1"
                  >
                    <Receipt size={14} />
                    Invoice
                  </button>
                </div>
              </div>

              <BillingSummaryPanel
                totalPaid={computePaymentTotals(billingData.items || []).paid}
                totalUnpaid={computePaymentTotals(billingData.items || []).unpaid}
                totalDeposits={totalDeposits}
                balance={balance}
                className="mb-6"
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-rose-400" />
                      Cost Ledger
                      <span className="ml-auto text-sm text-rose-400">Total: ₹{totalBill.toLocaleString()}</span>
                    </h4>
                    {(billingData.items || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No bill items added</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {(billingData.items || []).map((item, index) => (
                          <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900">{item.description}</p>
                              <p className="text-sm font-bold text-rose-400 whitespace-nowrap">₹{item.amount.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                              <span className="px-2 py-0.5 bg-gray-200/50 rounded-full">{item.category || 'Other'}</span>
                              <PaymentStatusBadge status={getItemStatus(item)} />
                              <span>by {item.addedBy || 'Staff'}</span>
                              <span>• {new Date(item.addedAt).toLocaleDateString()}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleBillItemPaid(index)}
                                  title={getItemStatus(item) === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                                  className="p-1 text-gray-400 hover:text-forest-700 transition-colors"
                                >
                                  <CheckCircle size={13} />
                                </button>
                                <button
                                  onClick={() => handleStartEditBillItem(index)}
                                  title="Edit"
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBillItem(index)}
                                  title="Delete"
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(billingData.items || []).length > 0 && (
                      <CategoryBreakdown items={billingData.items} className="mt-4 pt-4 border-t border-gray-200/50" />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-yellow-400" />
                      Deposits
                      <span className="ml-auto text-sm text-yellow-400">Total: ₹{totalDeposits.toLocaleString()}</span>
                    </h4>
                    {(billingData.deposits || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No deposits recorded</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {(billingData.deposits || []).map((deposit, index) => (
                          <div key={index} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900">{deposit.reason}</p>
                              <p className="text-sm font-bold text-yellow-400 whitespace-nowrap">₹{deposit.amount.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full ${deposit.urgency === 'emergency' ? 'bg-red-500/20 text-red-400' : deposit.urgency === 'urgent' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {deposit.urgency || 'routine'}
                              </span>
                              <span>by {deposit.depositedBy || 'Staff'}</span>
                              <span>• {new Date(deposit.depositedAt).toLocaleDateString()}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEditDeposit(index)}
                                  title="Edit"
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDeposit(index)}
                                  title="Delete"
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-blue-400" />
                      Insurance
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Provider</span>
                        <span className="text-gray-900">{billingData.insurance?.provider || 'Not Provided'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Policy Number</span>
                        <span className="text-gray-900">{billingData.insurance?.policyNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Claim Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${billingData.insurance?.claimStatus === 'approved' ? 'bg-forest-600/20 text-forest-400' : billingData.insurance?.claimStatus === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {billingData.insurance?.claimStatus || 'pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Coverage Used</span>
                        <span className="text-gray-900">₹{(billingData.insurance?.coverageUsed || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Out of Pocket</span>
                        <span className="text-gray-900">₹{(billingData.insurance?.outOfPocket || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discharge' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-gray-900">Discharge Management</h3>
                  <p className="text-sm text-gray-500">
                    {dischargeData.discharged ? 'Patient discharged successfully' : `${checklistProgress}/${totalChecklistItems} checklist items completed`}
                  </p>
                </div>
                {!dischargeData.discharged && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDischargeConfirm(true)}
                      disabled={!allChecklistComplete}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium ${
                        allChecklistComplete
                          ? 'bg-gradient-to-r from-forest-600 to-forest-500 text-white hover:shadow-lg hover:shadow-forest-600/25'
                          : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle size={16} />
                      Complete Discharge
                    </button>
                  </div>
                )}
              </div>

              {dischargeData.discharged ? (
                <div>
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-forest-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-forest-400" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-gray-900 mb-2">Patient Discharged Successfully</h3>
                    <p className="text-gray-500">
                      Discharged on {new Date(dischargeData.actualTime).toLocaleString()}
                    </p>
                    <button
                      onClick={() => setShowFinalBill(true)}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-forest-500 to-forest-500 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/25 transition-all duration-300 flex items-center gap-2 mx-auto"
                    >
                      <FileText size={16} />
                      View Final Bill
                    </button>
                  </div>

                  <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-5">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-forest-700" />
                      Discharge Summary
                    </h4>
                    <DischargeSummaryView dischargeSummary={dischargeData.dischargeSummary} patient={patient} />
                  </div>

                  <FamilySummaryPanel patient={patient} dischargeSummary={dischargeData.dischargeSummary} role="staff" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-forest-700" />
                          Discharge Checklist
                          <span className="ml-auto text-sm text-gray-500">{checklistProgress}/{totalChecklistItems}</span>
                        </h4>
                        <div className="space-y-3">
                          {checklistItems.map((item) => {
                            const isChecked = dischargeData.checklist[item.id];
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => toggleChecklistItem(item.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                                  isChecked
                                    ? 'bg-forest-600/10 border border-forest-600/30'
                                    : 'bg-gray-50/50 border border-gray-200/50 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {isChecked ? (
                                    <CheckCircle className="w-5 h-5 text-forest-400" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-500" />
                                  )}
                                  <Icon className={`w-4 h-4 ${isChecked ? 'text-forest-400' : 'text-gray-500'}`} />
                                  <span className={`text-sm ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {item.label}
                                  </span>
                                </div>
                                {isChecked && (
                                  <span className="text-xs text-forest-400">✓ Done</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-4 w-full bg-gray-200/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-forest-500 to-forest-600 rounded-full transition-all duration-500"
                            style={{ width: `${(checklistProgress / totalChecklistItems) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-amber-400" />
                          Discharge Time
                        </h4>
                        {dischargeData.estimatedTime ? (
                          <div>
                            <p className="text-sm text-gray-500">
                              Estimated: {new Date(dischargeData.estimatedTime).toLocaleString()}
                            </p>
                            <p className="text-lg font-bold text-gray-900 mt-2">{countdown || 'Ready'}</p>
                            <button
                              onClick={() => {
                                setEstimatedTime('');
                                document.getElementById('timePicker')?.focus();
                              }}
                              className="mt-2 text-xs text-forest-700 hover:text-forest-800 transition-colors"
                            >
                              Update Time
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              id="timePicker"
                              type="datetime-local"
                              value={estimatedTime}
                              onChange={(e) => setEstimatedTime(e.target.value)}
                              className="flex-1 px-4 py-2 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              onClick={handleSetEstimatedTime}
                              className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors"
                            >
                              Set Time
                            </button>
                          </div>
                        )}
                        {formError && (
                          <p className="text-red-400 text-sm mt-2">{formError}</p>
                        )}
                        {formSuccess && (
                          <p className="text-forest-400 text-sm mt-2">{formSuccess}</p>
                        )}
                      </div>

                      <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-forest-700" />
                          Discharge Summary
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Patient</span>
                            <span className="text-gray-900">{patient.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Admitted</span>
                            <span className="text-gray-900">{new Date(patient.admitDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Length of Stay</span>
                            <span className="text-gray-900">{lengthOfStay} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Bill</span>
                            <span className="text-rose-400">₹{totalBill.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Deposits</span>
                            <span className="text-yellow-400">₹{totalDeposits.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200/50 pt-2">
                            <span className="text-gray-500">Balance</span>
                            <span className={balance >= 0 ? 'text-forest-400' : 'text-red-400'}>
                              {balance >= 0 ? '₹' : '-₹'}{Math.abs(balance).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-forest-700" />
                          Vitals Trend This Stay
                        </h4>
                        <VitalsTrendSummary vitals={clinicalData.vitals || []} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gray-50/50 rounded-xl border border-gray-200/50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-forest-700" />
                      Discharge Notes &amp; Instructions
                      <span className="text-xs text-gray-400 font-normal ml-1">(optional, included in the discharge summary)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Doctor's Notes</label>
                        <textarea
                          value={dischargeData.doctorNotes || ''}
                          onChange={(e) => setDischargeData({ ...dischargeData, doctorNotes: e.target.value })}
                          placeholder="Clinical summary, condition at discharge, etc."
                          rows={3}
                          className="w-full px-3 py-2 bg-white/70 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Discharge Instructions</label>
                        <textarea
                          value={dischargeData.instructions || ''}
                          onChange={(e) => setDischargeData({ ...dischargeData, instructions: e.target.value })}
                          placeholder="Diet, activity level, warning signs to watch for, etc."
                          rows={3}
                          className="w-full px-3 py-2 bg-white/70 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Appointment</label>
                        <input
                          type="date"
                          value={dischargeData.followUpDate || ''}
                          onChange={(e) => setDischargeData({ ...dischargeData, followUpDate: e.target.value })}
                          className="px-3 py-2 bg-white/70 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <button
                        onClick={handleSaveDischargeNotes}
                        className="px-4 py-2 bg-forest-50 text-forest-700 rounded-lg text-sm border border-forest-200 hover:bg-forest-100 transition-colors"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-gray-900">Reports & Diagnostics</h3>
                  <p className="text-sm text-gray-500">{reports.length} reports uploaded</p>
                </div>
                <div className="flex gap-2">
                  {!dischargeData.discharged && (
                    <>
                      <button
                        onClick={() => setShowUploadReport(true)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                      >
                        <Upload size={16} />
                        Upload Report
                      </button>
                      <button
                        onClick={() => setShowUploadPrescription(true)}
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                      >
                        <FileSignature size={16} />
                        Upload Prescription
                      </button>
                    </>
                  )}
                </div>
              </div>

              {reports.length === 0 && prescriptions.length === 0 ? (
                <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200/50 rounded-xl">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900">No Documents Uploaded</p>
                  <p className="text-sm">Upload reports, prescriptions, and other documents</p>
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
                            className="bg-gray-50/50 rounded-xl border border-gray-200/50 overflow-hidden hover:border-forest-500/30 transition-all duration-300"
                          >
                            {report.fileType?.includes('image') ? (
                              <div className="relative h-48 bg-gray-100/50 overflow-hidden">
                                <img
                                  src={report.downloadUrl}
                                  alt={report.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                                  <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">Image</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-48 bg-gray-100/50 flex items-center justify-center">
                                {getFileIcon(report.fileType)}
                                <span className="ml-2 text-sm text-gray-500">{report.fileName}</span>
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-medium text-gray-900 truncate">{report.name}</h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span className="px-2 py-0.5 bg-gray-200/50 rounded-full">{report.type}</span>
                                <span>{formatFileSize(report.fileSize)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-xs text-gray-400">
                                  {new Date(report.uploadedAt).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                  <a
                                    href={report.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-500 hover:text-forest-700 transition-colors"
                                    title="View Report"
                                  >
                                    <Eye size={16} />
                                  </a>
                                  <a
                                    href={report.downloadUrl}
                                    download={report.fileName}
                                    className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                                    title="Download Report"
                                  >
                                    <Download size={16} />
                                  </a>
                                  {!dischargeData.discharged && (
                                    <button
                                      onClick={() => handleDeleteReport(report.id, report.storagePath)}
                                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                      title="Delete Report"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {prescriptions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Prescriptions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prescriptions.map((prescription) => (
                          <motion.div
                            key={prescription.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-50/50 rounded-xl border border-gray-200/50 overflow-hidden hover:border-pink-500/30 transition-all duration-300"
                          >
                            {prescription.fileType?.includes('image') ? (
                              <div className="relative h-48 bg-gray-100/50 overflow-hidden">
                                <img
                                  src={prescription.downloadUrl}
                                  alt={prescription.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                                  <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">Image</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-48 bg-gray-100/50 flex items-center justify-center">
                                {getFileIcon(prescription.fileType)}
                                <span className="ml-2 text-sm text-gray-500">{prescription.fileName}</span>
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-medium text-gray-900 truncate">{prescription.name}</h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span className="px-2 py-0.5 bg-gray-200/50 rounded-full">{prescription.type}</span>
                                <span>{formatFileSize(prescription.fileSize)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-xs text-gray-400">
                                  {new Date(prescription.uploadedAt).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                  <a
                                    href={prescription.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-500 hover:text-pink-400 transition-colors"
                                    title="View Prescription"
                                  >
                                    <Eye size={16} />
                                  </a>
                                  <a
                                    href={prescription.downloadUrl}
                                    download={prescription.fileName}
                                    className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                                    title="Download Prescription"
                                  >
                                    <Download size={16} />
                                  </a>
                                  {!dischargeData.discharged && (
                                    <button
                                      onClick={() => handleDeletePrescription(prescription.id, prescription.storagePath)}
                                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                      title="Delete Prescription"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === 'notes' && (
  <div>
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-display font-semibold text-gray-900">Doctor Notes</h3>
        <p className="text-sm text-gray-500">View all notes for this patient</p>
      </div>
    </div>
    
    <div className="space-y-4 max-h-[500px] overflow-y-auto">
      {(() => {
        const allNotes = (familyNotes || []).filter(n => n.sentBy === 'doctor' || n.sentBy === 'family');
        if (allNotes.length === 0) {
          return (
            <div className="text-center py-16 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900">No Notes Yet</p>
              <p className="text-sm">Notes will appear here</p>
            </div>
          );
        }
        return allNotes.slice().reverse().map((note) => (
          <div key={note.id} className={`p-4 rounded-xl border ${
            note.sentBy === 'doctor' ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  note.sentBy === 'doctor' ? 'bg-violet-200 text-violet-700' : 'bg-amber-200 text-amber-700'
                }`}>
                  {note.sentBy === 'doctor' ? formatDoctorName(note.doctorName) : 'Family'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(note.sentAt).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-gray-900">{note.text}</p>
          </div>
        ));
      })()}
    </div>
  </div>
)}
        </div>
      </main>

      <AnimatePresence>
        {showAddNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddNote(false);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-forest-700" />
                  Add Progress Note
                </h3>
                <button 
                  onClick={() => {
                    setShowAddNote(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddNote}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note Content *</label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter progress note..."
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300 min-h-[120px]"
                    rows="4"
                    required
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNote(false);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-forest-500 to-forest-500 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/25 transition-all"
                  >
                    Add Note
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddDiagnosis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddDiagnosis(false);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Add Diagnosis
                </h3>
                <button 
                  onClick={() => {
                    setShowAddDiagnosis(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddDiagnosis}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
                  <input
                    type="text"
                    value={diagnosisData.diagnosis}
                    onChange={(e) => setDiagnosisData({ ...diagnosisData, diagnosis: e.target.value })}
                    placeholder="Enter diagnosis (e.g., Pneumonia)"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plain Language Explainer</label>
                  <textarea
                    value={diagnosisData.explainer}
                    onChange={(e) => setDiagnosisData({ ...diagnosisData, explainer: e.target.value })}
                    placeholder="Explain in simple terms (e.g., 'This means there is infection in the lungs')"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 min-h-[80px]"
                    rows="2"
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDiagnosis(false);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                  >
                    Add Diagnosis
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMedicine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddMedicine(false);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-forest-400" />
                  Prescribe Medicine
                </h3>
                <button 
                  onClick={() => {
                    setShowAddMedicine(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddMedicine}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    value={medicineData.name}
                    onChange={(e) => setMedicineData({ ...medicineData, name: e.target.value })}
                    placeholder="Enter medicine name"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
                  <input
                    type="text"
                    value={medicineData.dosage}
                    onChange={(e) => setMedicineData({ ...medicineData, dosage: e.target.value })}
                    placeholder="e.g., 500mg"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                  <input
                    type="text"
                    value={medicineData.frequency}
                    onChange={(e) => setMedicineData({ ...medicineData, frequency: e.target.value })}
                    placeholder="e.g., Twice daily"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                  <select
                    value={medicineData.route}
                    onChange={(e) => setMedicineData({ ...medicineData, route: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all duration-300"
                  >
                    {routes.map((route) => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMedicine(false);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-forest-600 to-forest-500 text-white rounded-xl hover:shadow-lg hover:shadow-forest-600/25 transition-all"
                  >
                    Prescribe
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddVital && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddVital(false);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-amber-400" />
                  Log Vitals
                </h3>
                <button 
                  onClick={() => {
                    setShowAddVital(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddVital}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">BP *</label>
                    <input
                      type="text"
                      value={vitalData.bp}
                      onChange={(e) => setVitalData({ ...vitalData, bp: e.target.value })}
                      placeholder="e.g., 120/80"
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pulse *</label>
                    <input
                      type="text"
                      value={vitalData.pulse}
                      onChange={(e) => setVitalData({ ...vitalData, pulse: e.target.value })}
                      placeholder="e.g., 72"
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                    <input
                      type="text"
                      value={vitalData.temperature}
                      onChange={(e) => setVitalData({ ...vitalData, temperature: e.target.value })}
                      placeholder={vitalData.temperatureUnit === 'F' ? 'e.g., 98.6' : 'e.g., 37'}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                    />
                    <div className="flex w-fit rounded-xl border border-gray-200 overflow-hidden mt-2">
                      <button
                        type="button"
                        onClick={() => setVitalData({ ...vitalData, temperatureUnit: 'C' })}
                        className={`px-3 py-1 text-sm font-medium transition-colors ${vitalData.temperatureUnit === 'F' ? 'bg-white/50 text-gray-500' : 'bg-amber-500 text-white'}`}
                      >
                        °C
                      </button>
                      <button
                        type="button"
                        onClick={() => setVitalData({ ...vitalData, temperatureUnit: 'F' })}
                        className={`px-3 py-1 text-sm font-medium transition-colors ${vitalData.temperatureUnit === 'F' ? 'bg-amber-500 text-white' : 'bg-white/50 text-gray-500'}`}
                      >
                        °F
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">SpO2</label>
                    <input
                      type="text"
                      value={vitalData.oxygenSaturation}
                      onChange={(e) => setVitalData({ ...vitalData, oxygenSaturation: e.target.value })}
                      placeholder="e.g., 98"
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div className="mb-3 col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Respiratory Rate</label>
                    <input
                      type="text"
                      value={vitalData.respiratoryRate}
                      onChange={(e) => setVitalData({ ...vitalData, respiratoryRate: e.target.value })}
                      placeholder="e.g., 16"
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddVital(false);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                  >
                    Log Vitals
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddBillItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddBillItem(false);
                setEditingBillItemIndex(null);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-400" />
                  {editingBillItemIndex !== null ? 'Edit Bill Item' : 'Add Bill Item'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddBillItem(false);
                    setEditingBillItemIndex(null);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddBillItem}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    value={billItemData.description}
                    onChange={(e) => setBillItemData({ ...billItemData, description: e.target.value })}
                    placeholder="e.g., Blood Test, X-Ray, Medicine"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={billItemData.amount}
                    onChange={(e) => setBillItemData({ ...billItemData, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-300"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={billItemData.category}
                    onChange={(e) => setBillItemData({ ...billItemData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-300"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBillItem(false);
                      setEditingBillItemIndex(null);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
                  >
                    {editingBillItemIndex !== null ? 'Save Changes' : 'Add Bill Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddDeposit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddDeposit(false);
                setEditingDepositIndex(null);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-yellow-400" />
                  {editingDepositIndex !== null ? 'Edit Deposit' : 'Add Deposit Request'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddDeposit(false);
                    setEditingDepositIndex(null);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddDeposit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={depositData.amount}
                    onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                    placeholder="Enter deposit amount"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <input
                    type="text"
                    value={depositData.reason}
                    onChange={(e) => setDepositData({ ...depositData, reason: e.target.value })}
                    placeholder="e.g., Surgery deposit, ICU charges"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select
                    value={depositData.urgency}
                    onChange={(e) => setDepositData({ ...depositData, urgency: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                  >
                    {urgencyLevels.map((level) => (
                      <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDeposit(false);
                      setEditingDepositIndex(null);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-yellow-500/25 transition-all"
                  >
                    {editingDepositIndex !== null ? 'Save Changes' : 'Add Deposit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConsentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowConsentModal(false);
                setFormError('');
                setFormSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-400" />
                  Request Consent
                </h3>
                <button 
                  onClick={() => {
                    setShowConsentModal(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRequestConsent}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consent Type *</label>
                  <select
                    value={consentData.type}
                    onChange={(e) => setConsentData({ ...consentData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                  >
                    {consentTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Explanation *</label>
                  <textarea
                    value={consentData.explanation}
                    onChange={(e) => setConsentData({ ...consentData, explanation: e.target.value })}
                    placeholder="Explain why this consent is needed (will be shown to family)"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300 min-h-[100px]"
                    rows="3"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select
                    value={consentData.urgency}
                    onChange={(e) => setConsentData({ ...consentData, urgency: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                  >
                    {urgencyLevels.map((level) => (
                      <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 p-3 bg-gray-50/50 rounded-lg border border-gray-200/50">
                  <p className="text-xs text-gray-500">
                    Family phone: <span className="text-gray-900">{patient.phone || 'Not provided'}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">OTP will be sent to this number</p>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConsentModal(false);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                  >
                    Send Consent Request
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDischargeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDischargeConfirm(false);
                setFormError('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-8 max-w-md w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-display font-semibold text-gray-900 mb-2">Confirm Discharge</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to discharge {patient.name}?<br />
                  All checklist items are completed. This action cannot be undone.
                </p>
                {formError && (
                  <p className="text-red-400 text-sm mb-4">{formError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDischargeConfirm(false);
                      setFormError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDischargePatient}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-forest-600 to-forest-500 text-white rounded-xl hover:shadow-lg hover:shadow-forest-600/25 transition-all"
                  >
                    Confirm Discharge
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFinalBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowFinalBill(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-display font-semibold text-gray-900">Final Bill</h3>
                <div className="flex gap-2">
                  <button onClick={handleDownloadInvoice} title="Download PDF" className="p-2 text-gray-500 hover:text-forest-700 transition-colors">
                    <Download size={20} />
                  </button>
                  <button onClick={handlePrintInvoice} title="Print" className="p-2 text-gray-500 hover:text-forest-700 transition-colors">
                    <Printer size={20} />
                  </button>
                  <button
                    onClick={() => setShowFinalBill(false)}
                    className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-gray-200/50 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src={Logo} alt="AarogyaSandesh" className="w-8 h-8 object-contain" />
                      <Wordmark size="sm" stacked={false} className="text-gray-900" hiClassName="text-forest-700" />
                    </div>
                    <span className="text-xs font-mono text-forest-700 bg-forest-50 border border-forest-200 rounded px-2 py-1">
                      {getInvoiceNumber(billingData, patient?.patientId)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">A Health Update, Delivered</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Patient Name</p>
                    <p className="text-gray-900 font-medium">{patient.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Age</p>
                    <p className="text-gray-900 font-medium">{patient.age} years</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Admit Date</p>
                    <p className="text-gray-900 font-medium">{new Date(patient.admitDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Discharge Date</p>
                    <p className="text-gray-900 font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Length of Stay</p>
                    <p className="text-gray-900 font-medium">{lengthOfStay} days</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Access Code</p>
                    <p className="text-gray-900 font-medium">{patient.accessCode}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200/50 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Bill Details</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(billingData.items || []).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          {item.description} <span className="text-xs text-gray-400">({item.category})</span>
                          <PaymentStatusBadge status={getItemStatus(item)} />
                        </span>
                        <span className="text-gray-900 whitespace-nowrap">₹{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {billingData.items?.length === 0 && (
                      <p className="text-gray-500 text-sm">No bill items</p>
                    )}
                  </div>
                  {(billingData.items || []).length > 0 && (
                    <CategoryBreakdown items={billingData.items} className="mt-4 pt-4 border-t border-gray-200/50" />
                  )}
                </div>

                <div className="border-t border-gray-200/50 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">₹{totalBill.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deposits</span>
                    <span className="text-gray-900">- ₹{totalDeposits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200/50 pt-2">
                    <span className="text-gray-900">Balance</span>
                    <span className={balance >= 0 ? 'text-forest-400' : 'text-red-400'}>
                      {balance >= 0 ? '₹' : '-₹'}{Math.abs(balance).toLocaleString()}
                    </span>
                  </div>
                  {balance > 0 && (
                    <p className="text-xs text-forest-400">Amount to be refunded</p>
                  )}
                  {balance < 0 && (
                    <p className="text-xs text-red-400">Amount due from family</p>
                  )}
                </div>

                <div className="border-t border-gray-200/50 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Diagnosis</h4>
                  <p className="text-sm text-gray-500">{patient.problem}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowFinalBill(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowFinalBill(false);
                      navigate('/staff');
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-forest-500 to-forest-500 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Home size={16} />
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUploadReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUploadReport(false);
                setFormError('');
                setFormSuccess('');
                setReportFile(null);
                setPreviewUrl(null);
                setUploadProgress(0);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-400" />
                  Upload Report
                </h3>
                <button 
                  onClick={() => {
                    setShowUploadReport(false);
                    setFormError('');
                    setFormSuccess('');
                    setReportFile(null);
                    setPreviewUrl(null);
                    setUploadProgress(0);
                  }}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadReport}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Name *</label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="e.g., Blood Test Report, MRI Scan"
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                  >
                    {reportTypes.map((type) => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
                  <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${reportFile ? 'border-forest-600/50 bg-forest-600/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.pdf"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {previewUrl ? (
                      <div className="space-y-3">
                        <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                        <p className="text-sm text-gray-900">{reportFile?.name}</p>
                        <p className="text-xs text-gray-500">{reportFile ? formatFileSize(reportFile.size) : ''}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100/50 rounded-full flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">Click or drag to upload</p>
                        <p className="text-xs text-gray-400">JPEG, PNG, PDF (Max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {uploadProgress > 0 && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
                    <CheckCircle size={18} />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadReport(false);
                      setFormError('');
                      setFormSuccess('');
                      setReportFile(null);
                      setPreviewUrl(null);
                      setUploadProgress(0);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !reportFile}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        <Upload size={16} />
                        Upload Report
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
        {showUploadPrescription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
              className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-gray-900 flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-pink-400" />
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
                  className="text-gray-500 hover:text-gray-900 transition-colors"
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
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Type</label>
                  <select
                    value={prescriptionType}
                    onChange={(e) => setPrescriptionType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                  >
                    {prescriptionTypes.map((type) => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
                  <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${prescriptionFile ? 'border-pink-500/50 bg-pink-500/5' : 'border-gray-200 hover:border-gray-300'}`}>
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
                        <FileSignature className="w-12 h-12 text-pink-400 mx-auto" />
                        <p className="text-sm text-gray-900">{prescriptionFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(prescriptionFile.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100/50 rounded-full flex items-center justify-center mx-auto">
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
                    <div className="w-full bg-gray-200/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 text-forest-400 text-sm mb-4 p-3 bg-forest-600/10 border border-forest-600/20 rounded-xl">
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
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

export default PatientDetail;