import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const InstitutionContext = createContext();

const API = process.env.REACT_APP_API_URL || '/api';

export const InstitutionProvider = ({ children }) => {
  const [institutionSettings, setInstitutionSettings] = useState({
    institution_type: 'school',
    ui_mode: 'standard',
    school_name: '',
    tenant_id: ''
  });
  const [loading, setLoading] = useState(true);
  const fetchAttempts = useRef(0);

  const fetchInstitutionSettings = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/institution/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setInstitutionSettings({
        institution_type: response.data.institution_type || 'school',
        ui_mode: response.data.ui_mode || 'standard',
        school_name: response.data.school_name || '',
        tenant_id: response.data.tenant_id || ''
      });
      fetchAttempts.current = 0;
    } catch (error) {
      console.error('Failed to fetch institution settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstitutionSettings();
    
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue) {
        fetchInstitutionSettings();
      }
    };

    const handleLoginEvent = () => {
      fetchInstitutionSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleLoginEvent);

    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && !institutionSettings.tenant_id && fetchAttempts.current < 5) {
        fetchAttempts.current += 1;
        fetchInstitutionSettings();
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleLoginEvent);
      clearInterval(tokenCheckInterval);
    };
  }, [fetchInstitutionSettings, institutionSettings.tenant_id]);

  const isMadrasah = institutionSettings.institution_type === 'madrasah';
  const isSimpleUI = institutionSettings.ui_mode === 'simple';
  const isMadrasahSimpleUI = isMadrasah && isSimpleUI;

  const value = {
    ...institutionSettings,
    isMadrasah,
    isSimpleUI,
    isMadrasahSimpleUI,
    loading,
    refreshSettings: fetchInstitutionSettings
  };

  return (
    <InstitutionContext.Provider value={value}>
      {children}
    </InstitutionContext.Provider>
  );
};

export const useInstitution = () => {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error('useInstitution must be used within an InstitutionProvider');
  }
  return context;
};

export default InstitutionContext;
