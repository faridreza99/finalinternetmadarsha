import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CurrencyContext = createContext();

const CURRENCIES = {
  BDT: { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka', position: 'before' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', position: 'before' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', position: 'before' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', position: 'before' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', position: 'before' },
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('BDT');
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

  useEffect(() => {
    fetchCurrencySetting();
  }, []);

  const fetchCurrencySetting = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/institution`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.currency) {
        setCurrency(response.data.currency);
      }
    } catch (error) {
      console.log('Using default currency BDT');
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (newCurrency) => {
    setCurrency(newCurrency);
  };

  const formatCurrency = (amount, showSymbol = true) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return showSymbol ? `${CURRENCIES[currency].symbol}0` : '0';
    }
    
    const numAmount = Number(amount);
    const formatted = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    if (!showSymbol) return formatted;
    
    const currencyInfo = CURRENCIES[currency];
    return currencyInfo.position === 'before' 
      ? `${currencyInfo.symbol}${formatted}`
      : `${formatted}${currencyInfo.symbol}`;
  };

  const getCurrencySymbol = () => {
    return CURRENCIES[currency].symbol;
  };

  const getCurrencyInfo = () => {
    return CURRENCIES[currency];
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency: updateCurrency,
      formatCurrency,
      getCurrencySymbol,
      getCurrencyInfo,
      currencies: CURRENCIES,
      loading,
      refetch: fetchCurrencySetting
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;
