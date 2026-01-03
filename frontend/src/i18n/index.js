import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import bn from './locales/bn.json';

const resources = {
  en: { translation: en },
  bn: { translation: bn }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

export const toBanglaDate = (dateString, useBengaliNumerals = true) => {
  if (!dateString) return '';
  
  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = banglaMonths[date.getMonth()];
  const year = date.getFullYear();
  
  if (useBengaliNumerals) {
    return `${toBengaliNumeral(day)} ${month}, ${toBengaliNumeral(year)}`;
  }
  return `${day} ${month}, ${year}`;
};

export const formatNumber = (num, language) => {
  if (language === 'bn') {
    return toBengaliNumeral(num);
  }
  return String(num);
};

export default i18n;
