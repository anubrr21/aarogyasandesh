import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) {
      setPatients([]);
      setAllPatients([]);
      setLoading(false);
      return;
    }

    if (role === 'staff') {
      const q1 = query(
        collection(db, 'patients'),
        where('staffId', '==', user.uid)
      );

      const q2 = query(
        collection(db, 'patients'),
        where('assignedStaffIds', 'array-contains', user.uid)
      );

      const unsubscribe1 = onSnapshot(q1, (snapshot) => {
        const patientData = [];
        snapshot.forEach((doc) => {
          patientData.push({ id: doc.id, ...doc.data() });
        });
        setPatients(prev => {
          const merged = [...prev];
          patientData.forEach(p => {
            if (!merged.find(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          return merged;
        });
        setAllPatients(prev => {
          const merged = [...prev];
          patientData.forEach(p => {
            if (!merged.find(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          return merged;
        });
        setLoading(false);
      }, (error) => {
        console.error('Error fetching patients by staffId:', error);
      });

      const unsubscribe2 = onSnapshot(q2, (snapshot) => {
        const patientData = [];
        snapshot.forEach((doc) => {
          patientData.push({ id: doc.id, ...doc.data() });
        });
        setPatients(prev => {
          const merged = [...prev];
          patientData.forEach(p => {
            if (!merged.find(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          return merged;
        });
        setAllPatients(prev => {
          const merged = [...prev];
          patientData.forEach(p => {
            if (!merged.find(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          return merged;
        });
        setLoading(false);
      }, (error) => {
        console.error('Error fetching patients by assignedStaffIds:', error);
      });

      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    } else if (role === 'family') {
      const patientId = localStorage.getItem('patientId');
      if (patientId) {
        const docRef = doc(db, 'patients', patientId);
        const unsubscribe = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            const data = { id: doc.id, ...doc.data() };
            setPatients([data]);
            setAllPatients([data]);
          } else {
            setPatients([]);
            setAllPatients([]);
          }
          setLoading(false);
        });
        return () => unsubscribe();
      } else {
        setPatients([]);
        setAllPatients([]);
        setLoading(false);
        return () => {};
      }
    } else {
      setPatients([]);
      setAllPatients([]);
      setLoading(false);
      return () => {};
    }
  }, [user, role]);

  const addPatient = async (patientData) => {
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newPatient = {
      ...patientData,
      accessCode,
      staffId: user.uid,
      assignedStaffIds: [user.uid],
      createdAt: new Date().toISOString(),
      discharged: false,
      dischargeDate: null,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'patients'), newPatient);
    return { id: docRef.id, ...newPatient };
  };

  const updatePatient = async (id, data) => {
    const docRef = doc(db, 'patients', id);
    await updateDoc(docRef, {
      ...data,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: new Date().toISOString()
    });
  };

  const deletePatient = async (id) => {
    const docRef = doc(db, 'patients', id);
    await deleteDoc(docRef);
  };

  const assignStaffToPatient = async (patientId, staffId) => {
    const docRef = doc(db, 'patients', patientId);
    await updateDoc(docRef, {
      assignedStaffIds: arrayUnion(staffId),
      lastUpdatedBy: user.uid,
      lastUpdatedAt: new Date().toISOString()
    });
  };

  const removeStaffFromPatient = async (patientId, staffId) => {
    const docRef = doc(db, 'patients', patientId);
    await updateDoc(docRef, {
      assignedStaffIds: arrayRemove(staffId),
      lastUpdatedBy: user.uid,
      lastUpdatedAt: new Date().toISOString()
    });
  };

  const verifyAccessCode = async (accessCode) => {
    try {
      if (!accessCode || accessCode.length !== 6) {
        return { valid: false, message: 'Invalid access code format. Please enter a 6-digit code.' };
      }

      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('accessCode', '==', accessCode));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { valid: false, message: 'Invalid access code. Please check and try again.' };
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      if (data.discharged === true) {
        return { valid: false, message: 'This patient has been discharged. Please contact the hospital for access.' };
      }
      
      return { valid: true, patientId: doc.id, patientData: data };
    } catch (error) {
      console.error('Error verifying access code:', error);
      return { valid: false, message: 'Error verifying access code. Please try again.' };
    }
  };

  const value = {
    patients,
    allPatients,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
    assignStaffToPatient,
    removeStaffFromPatient,
    verifyAccessCode
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within PatientProvider');
  }
  return context;
};