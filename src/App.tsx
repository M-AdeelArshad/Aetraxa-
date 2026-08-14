import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

export const TempUnitContext = createContext<{ tempUnit: 'celsius' | 'fahrenheit', setTempUnit: (u: 'celsius' | 'fahrenheit') => void }>({ tempUnit: 'celsius', setTempUnit: () => {} });
export const useTempUnit = () => useContext(TempUnitContext);

import { 
  Search as SearchIcon, 
  Droplets as DropletsIcon, 
  Thermometer as ThermometerIcon, 
  AlertTriangle as AlertTriangleIcon, 
  Wind as WindIcon, 
  Clock as ClockIcon, 
  Share2 as ShareIcon,
  Settings as SettingsIcon,
  Navigation as NavigationIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  Menu as MenuIcon,
  Info as InfoIcon,
  User as UserIcon,
  LogOut as LogOutIcon,
  Flame as FlameIcon,
  Sparkles as SparklesIcon,
  CloudRain as RainIcon,
  ShieldAlert as ShieldAlertIcon,
  Zap as ZapIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle2 as CheckIcon,
  Link as LinkIcon,
  X as CloseIcon,
  Download as DownloadIcon,
  Globe as GlobeIcon,
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  Shield as ShieldIcon,
  Radar as RadarIcon,
  Cpu as CpuIcon
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { AetraxaSunIcon as SunIcon } from './components/AetraxaSunIcon';
import { AetraxaLogo } from './components/AetraxaLogo';

import { ForecastChart } from './components/ForecastChart';
import { AqiForecastChart } from './components/AqiForecastChart';
import { RadialAqiGauge } from './components/RadialAqiGauge';
import { DetailedPollutantsBreakdown } from './components/DetailedPollutantsBreakdown';
import { HeatwaveSafetyTips } from './components/HeatwaveSafetyTips';
import { getWeatherData, calculateHeatIndex as calcHI, searchCities, getAqiData } from './services/weatherService';
import { COUNTRIES, CITIES_BY_COUNTRY } from './constants/locations';
import { useLanguage } from './LanguageContext';
import { translateLocation } from './translations';
import Markdown from 'react-markdown';

// --- Types & Constants ---

import { AboutPage } from './components/AboutPage';
import { SettingsPage } from './components/SettingsPage';
import { ScrollFramesBackground } from './components/ScrollFramesBackground';

export interface UserProfile {
  occupation: string;
  outdoor_hours: number;
  health_conditions: string[];
  monitoring_others: string[];
  alert_style: string;
  preferred_language: 'en' | 'ur';
}

enum Page {
  Landing = 'landing',
  Main = 'main',
  About = 'about',
  SharedReport = 'shared_report',
  Settings = 'settings'
}

interface WeatherData {
  city: string;
  timezone: string;
  windows: {
    hazard: string;
    optimal: string;
  };
  current: {
    temp: number;
    humidity: number;
    apparentTemp: number;
    uvIndex: number;
    windSpeed: number;
    windGusts?: number;
    weatherCode: number;
    heatIndex: number;
  };
  hourly: HourlyForecast[];
  daily: {
    tempMax: number;
    tempMin: number;
    uvIndexMax: number;
    sunrise: string;
    sunset: string;
  };
  lastUpdated: string;
  timestamp: string;
}

interface HourlyForecast {
  time: string;
  temp: number;
  humidity: number;
  heatIndex: number;
}

const DANGER_CATEGORIES = [
  { label: 'Optimal', labelUrdu: 'بہترین', min: 0, max: 26, color: '#10b981', text: 'text-emerald-500' },
  { label: 'Moderate', labelUrdu: 'درمیانہ', min: 26, max: 30, color: '#facc15', text: 'text-yellow-400' },
  { label: 'Caution', labelUrdu: 'محتاط', min: 30, max: 34, color: '#f97316', text: 'text-orange-500' },
  { label: 'Severe', labelUrdu: 'شدید', min: 34, max: 39, color: '#ef4444', text: 'text-red-500' },
  { label: 'Extreme', labelUrdu: 'انتہائی', min: 39, max: 45, color: '#b91c1c', text: 'text-red-700' },
  { label: 'Danger', labelUrdu: 'خطرناک', min: 45, max: 52, color: '#86198f', text: 'text-fuchsia-800' },
  { label: 'Critical', labelUrdu: 'انتہائی خطرناک', min: 52, max: 200, color: '#2e1065', text: 'text-violet-950' },
];

// --- Utilities ---

const AQI_CATEGORIES = [
  { min: 0, max: 50, label: 'Good', labelUrdu: 'بہترین', description: 'Air quality is considered satisfactory, and air pollution poses little or no risk.', color: '#52b72c' },
  { min: 51, max: 100, label: 'Moderate', labelUrdu: 'درمیانہ', description: 'Air quality is acceptable; however, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.', color: '#eab308' },
  { min: 101, max: 150, label: 'Unhealthy for Sensitive Groups', labelUrdu: 'حساس گروہوں کے لیے غیر صحت بخش', description: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.', color: '#f97316' },
  { min: 151, max: 200, label: 'Unhealthy', labelUrdu: 'غیر صحت بخش', description: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.', color: '#ef4444' },
  { min: 201, max: 300, label: 'Very Unhealthy', labelUrdu: 'انتہائی غیر صحت بخش', description: 'Health alert: everyone may experience more serious health effects.', color: '#8b5cf6' },
  { min: 301, max: 1000, label: 'Hazardous', labelUrdu: 'خطرناک', description: 'Health warnings of emergency conditions. The entire population is more likely to be affected.', color: '#7f1d1d' }
];

const getDangerLevel = (hi: number) => {
  return DANGER_CATEGORIES.find(c => hi >= c.min && hi < c.max) || DANGER_CATEGORIES[DANGER_CATEGORIES.length - 1];
};

const getAqiDangerLevel = (aqi: number) => {
  return AQI_CATEGORIES.find(c => aqi >= c.min && aqi <= c.max) || AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
};

const formatTemp = (celsius: number, unit: 'celsius' | 'fahrenheit'): number => {
  if (unit === 'fahrenheit') {
    return (celsius * 9) / 5 + 32;
  }
  return celsius;
};

// --- Components ---

const NavbarMainLanding = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: { 
  onStart: () => void, 
  onSectionChange: (section: string) => void, 
  onOpenSettings: () => void,
  activeTool: 'thermal' | 'aqi' | null,
  setActiveTool: (tool: 'thermal' | 'aqi' | null) => void,
  setCurrentPage: (page: Page) => void,
  currentPage?: Page
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <nav id="navbar-main-landing" className="navbar-main-landing fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0f0f12] backdrop-blur-lg transition-all rounded-full border border-[#687075]/25 tracking-tight shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1"  
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <AetraxaLogo style={{ color: '#f2f6f9' }} className="w-8 h-8 text-[#f2f6f9]" aria-hidden="true" />
        <span style={{ fontFamily: 'Inter', color: '#f2f6f9', paddingLeft: '0px', paddingTop: '1px', fontSize: '15px' }} className="font-bold uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div style={{ paddingTop: '1px' }} className="flex items-center gap-6 border-r border-[#687075]/20 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#f2f6f9' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#f2f6f9', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#f2f6f9] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#f2f6f9' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#f2f6f9', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#f2f6f9] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{ color: '#f2f6f9' }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] transition-all border border-[#687075]/20 rounded-full px-4 py-2 text-center focus:outline-none min-w-[60px] gap-2 bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40"
          >
            <GlobeIcon style={{ color: '#f2f6f9' }} className="w-3.5 h-3.5" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)', borderColor: 'rgba(104,112,117,0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40 focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon style={{ color: '#f2f6f9' }} className="w-4 h-4" />
          </motion.button>
        </div>
          
        {/* Tools Dropdown Button */}
        <div className="relative ml-2" ref={toolsRef}>
          <motion.button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            style={{ color: '#050507', backgroundColor: '#f2f6f9' }}
            className="w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-transparent focus:outline-none flex items-center justify-center gap-2"
          >
            <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('tools')}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#050507] transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isToolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-72 origin-top-right rounded-[2rem] border border-[#687075]/25 bg-[#050507]/95 backdrop-blur-xl p-5 shadow-2xl z-[200] flex flex-col gap-3"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#687075] px-2 block mb-1 border-b border-[#687075]/10 pb-2">
                  Intelligence Tools
                </span>
                
                <button
                  onClick={() => {
                    setActiveTool('thermal');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <SunIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('thermalAnalytics')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Thermal hazard protocol, health risks & field cooling indices.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('aqi');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <WindIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('aqiDashboard')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Multi-factor air quality monitoring & respiratory guidance.
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#687075]/20 pr-2 sm:pr-3 mr-1">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#050507]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#f2f6f9]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-1.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
          </motion.button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#f2f6f9] focus:outline-none hover:bg-[#f2f6f9]/5 rounded-full transition-colors border border-transparent hover:border-[#687075]/20"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#050507]/95 backdrop-blur-xl border border-[#687075]/20 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('about')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors flex items-center gap-2 text-left"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
              {t('tacticalSettings')}
            </button>
            
            <div className="w-full h-[1px] bg-[#687075]/20 my-2" />
            
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#687075] px-4 pt-1 pb-1">
              {t('tools')}
            </div>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('thermal');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><SunIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('thermalAnalytics')}
            </button>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('aqi');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><WindIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('aqiDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// 2. THERMAL LANDING NAVBAR
const NavbarThermalLanding = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: any) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <nav id="navbar-thermal-landing" className="navbar-thermal-landing fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0f0f12] backdrop-blur-lg transition-all rounded-full border border-[#687075]/25 tracking-tight shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1"  
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <AetraxaLogo style={{ color: '#dd611f' }} className="w-8 h-8 text-[#f2f6f9]" aria-hidden="true" />
        <span style={{ fontFamily: 'Inter', color: '#fff2d0', paddingLeft: '0px', paddingTop: '1px', fontSize: '15px' }} className="font-bold uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div className="flex items-center gap-6 border-r border-[#687075]/20 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{ color: '#fff2d0' }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] transition-all border border-[#687075]/20 rounded-full px-4 py-2 text-center focus:outline-none min-w-[60px] gap-2 bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40"
          >
            <GlobeIcon style={{ color: '#dd611f' }} className="w-3.5 h-3.5" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)', borderColor: 'rgba(104,112,117,0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40 focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon style={{ color: '#dd611f' }} className="w-4 h-4" />
          </motion.button>
        </div>
          
        {/* Tools Dropdown Button */}
        <div className="relative ml-2" ref={toolsRef}>
          <motion.button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            style={{ color: '#000000', backgroundColor: '#dd611f' }}
            className="w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-transparent focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('tools')}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#050507] transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isToolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-72 origin-top-right rounded-[2rem] border border-[#687075]/25 bg-[#050507]/95 backdrop-blur-xl p-5 shadow-2xl z-[200] flex flex-col gap-3"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#687075] px-2 block mb-1 border-b border-[#687075]/10 pb-2">
                  Intelligence Tools
                </span>
                
                <button
                  onClick={() => {
                    setActiveTool('thermal');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <SunIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('thermalAnalytics')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Thermal hazard protocol, health risks & field cooling indices.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('aqi');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <WindIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('aqiDashboard')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Multi-factor air quality monitoring & respiratory guidance.
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Get Started Button */}
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(214, 80, 31, 0.45)" }}
          whileTap={{ scale: 0.95 }}
          style={{ color: '#000000' }}
          className="ml-2 w-[145px] h-[40px] bg-primary-accent text-black uppercase font-black text-[10px] tracking-[0.25em] rounded-full shadow-[0_0_10px_rgba(214, 80, 31, 0.2)] focus:outline-none transition-all cursor-pointer flex items-center justify-center"
        >
          <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('launchSystem')}</span>
        </motion.button>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <motion.button 
          onClick={onStart}
          whileTap={{ scale: 0.95 }}
          style={{ color: '#000000' }}
          className="px-3 py-1.5 bg-primary-accent rounded-full font-black text-[8px] uppercase tracking-widest focus:outline-none cursor-pointer text-black"
        >
          {t('launchSystem')}
        </motion.button>

        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#687075]/20 pr-2 sm:pr-3 mr-1">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#050507]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#f2f6f9]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-1.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
          </motion.button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#f2f6f9] focus:outline-none hover:bg-[#f2f6f9]/5 rounded-full transition-colors border border-transparent hover:border-[#687075]/20"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#050507]/95 backdrop-blur-xl border border-[#687075]/20 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); onStart(); }}
              className="w-full px-4 py-3 text-xs font-black tracking-widest uppercase bg-primary-accent text-black rounded-2xl transition-all mb-2 text-center cursor-pointer"
            >
              {t('launchSystem')}
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('about')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors flex items-center gap-2 text-left"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
              {t('tacticalSettings')}
            </button>
            
            <div className="w-full h-[1px] bg-[#687075]/20 my-2" />
            
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#687075] px-4 pt-1 pb-1">
              {t('tools')}
            </div>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('thermal');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><SunIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('thermalAnalytics')}
            </button>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('aqi');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><WindIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('aqiDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// 3. THERMAL APP NAVBAR
const NavbarThermalApp = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: any) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <nav id="navbar-thermal-app" className="navbar-thermal-app fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0f0f12] backdrop-blur-lg transition-all rounded-full border border-[#687075]/25 tracking-tight shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1" 
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <AetraxaLogo style={{ color: '#dd611f' }} className="w-8 h-8 text-[#dd611f]" aria-hidden="true" />
        <span style={{ fontFamily: 'Inter', color: '#fff2d0', paddingLeft: '0px', paddingTop: '1px', fontSize: '15px' }} className="font-bold uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div className="flex items-center gap-6 border-r border-[#687075]/20 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{ color: '#fff2d0' }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] transition-all border border-[#687075]/20 rounded-full px-4 py-2 text-center focus:outline-none min-w-[60px] gap-2 bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40"
          >
            <GlobeIcon style={{ color: '#dd611f' }} className="w-3.5 h-3.5" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)', borderColor: 'rgba(104,112,117,0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40 focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon style={{ color: '#dd611f' }} className="w-4 h-4" />
          </motion.button>
        </div>
          
        {/* Tools Dropdown Button */}
        <div className="relative ml-2" ref={toolsRef}>
          <motion.button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            style={{ color: '#000000', backgroundColor: '#dd611f' }}
            className="w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-transparent focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('tools')}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#050507] transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isToolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-72 origin-top-right rounded-[2rem] border border-[#687075]/25 bg-[#050507]/95 backdrop-blur-xl p-5 shadow-2xl z-[200] flex flex-col gap-3"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#687075] px-2 block mb-1 border-b border-[#687075]/10 pb-2">
                  Intelligence Tools
                </span>
                
                <button
                  onClick={() => {
                    setActiveTool('thermal');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <SunIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('thermalAnalytics')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Thermal hazard protocol, health risks & field cooling indices.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('aqi');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <WindIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('aqiDashboard')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Multi-factor air quality monitoring & respiratory guidance.
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#687075]/20 pr-2 sm:pr-3 mr-1">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#050507]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#f2f6f9]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-1.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
          </motion.button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#f2f6f9] focus:outline-none hover:bg-[#f2f6f9]/5 rounded-full transition-colors border border-transparent hover:border-[#687075]/20"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#050507]/95 backdrop-blur-xl border border-[#687075]/20 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('about')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors flex items-center gap-2 text-left"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
              {t('tacticalSettings')}
            </button>
            
            <div className="w-full h-[1px] bg-[#687075]/20 my-2" />
            
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#687075] px-4 pt-1 pb-1">
              {t('tools')}
            </div>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('thermal');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><SunIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('thermalAnalytics')}
            </button>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('aqi');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><WindIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('aqiDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// 4. API (AQI) LANDING NAVBAR
const NavbarApiLanding = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: any) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <nav id="navbar-api-landing" className="navbar-api-landing fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0f0f12] backdrop-blur-lg transition-all rounded-full border border-[#687075]/25 tracking-tight shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1" 
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <AetraxaLogo style={{ color: '#dd611f' }} className="w-8 h-8 text-[#f2f6f9]" aria-hidden="true" />
        <span style={{ fontFamily: 'Inter', color: '#fff2d0', paddingLeft: '0px', paddingTop: '1px', fontSize: '15px' }} className="font-bold uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div className="flex items-center gap-6 border-r border-[#687075]/20 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{ color: '#fff2d0' }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] transition-all border border-[#687075]/20 rounded-full px-4 py-2 text-center focus:outline-none min-w-[60px] gap-2 bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40"
          >
            <GlobeIcon style={{ color: '#dd611f' }} className="w-3.5 h-3.5" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)', borderColor: 'rgba(104,112,117,0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40 focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon style={{ color: '#dd611f' }} className="w-4 h-4" />
          </motion.button>
        </div>
          
        {/* Tools Dropdown Button */}
        <div className="relative ml-2" ref={toolsRef}>
          <motion.button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            style={{ color: '#000000', backgroundColor: '#52b72c' }}
            className="w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-transparent focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('tools')}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#050507] transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isToolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-72 origin-top-right rounded-[2rem] border border-[#687075]/25 bg-[#050507]/95 backdrop-blur-xl p-5 shadow-2xl z-[200] flex flex-col gap-3"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#687075] px-2 block mb-1 border-b border-[#687075]/10 pb-2">
                  Intelligence Tools
                </span>
                
                <button
                  onClick={() => {
                    setActiveTool('thermal');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <SunIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('thermalAnalytics')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Thermal hazard protocol, health risks & field cooling indices.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('aqi');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <WindIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('aqiDashboard')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Multi-factor air quality monitoring & respiratory guidance.
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* GET STARTED Button */}
        <motion.button
          onClick={() => {
            if (onStart) onStart();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="ml-2 w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all bg-[#52b72c] hover:bg-[#52b72c]/90 text-black border border-transparent focus:outline-none flex items-center justify-center cursor-pointer shadow-lg shadow-[#52b72c]/10"
        >
          <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('launchSystem')}</span>
        </motion.button>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#687075]/20 pr-2 sm:pr-3 mr-1">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#050507]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#f2f6f9]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-1.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
          </motion.button>
        </div>

        {/* Mobile Highlight GET STARTED Button */}
        <motion.button
          onClick={() => {
            if (onStart) onStart();
          }}
          whileTap={{ scale: 0.95 }}
          className="px-3.5 py-1.5 rounded-full font-black text-[8px] sm:text-[9px] uppercase tracking-[0.15em] transition-all bg-[#52b72c] hover:bg-[#52b72c]/90 text-black border border-transparent focus:outline-none flex items-center gap-1 cursor-pointer"
        >
          <span>START</span>
        </motion.button>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#f2f6f9] focus:outline-none hover:bg-[#f2f6f9]/5 rounded-full transition-colors border border-transparent hover:border-[#687075]/20"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#050507]/95 backdrop-blur-xl border border-[#687075]/20 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); if (onStart) onStart(); }}
              className="w-full text-center px-4 py-3 text-xs font-black tracking-[0.2em] uppercase bg-[#52b72c] hover:bg-[#52b72c]/90 text-black rounded-2xl transition-all shadow-md cursor-pointer mb-2"
            >
              GET STARTED
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('about')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors flex items-center gap-2 text-left"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
              {t('tacticalSettings')}
            </button>
            
            <div className="w-full h-[1px] bg-[#687075]/20 my-2" />
            
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#687075] px-4 pt-1 pb-1">
              {t('tools')}
            </div>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('thermal');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><SunIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('thermalAnalytics')}
            </button>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('aqi');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><WindIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('aqiDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// 5. API (AQI) APP NAVBAR
const NavbarApiApp = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: any) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <nav id="navbar-api-app" className="navbar-api-app fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0f0f12] backdrop-blur-lg transition-all rounded-full border border-[#687075]/25 tracking-tight shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1" 
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <AetraxaLogo style={{ color: '#dd611f' }} className="w-8 h-8 text-[#f2f6f9]" aria-hidden="true" />
        <span style={{ fontFamily: 'Inter', color: '#fff2d0', paddingLeft: '0px', paddingTop: '1px', fontSize: '15px' }} className="font-bold uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div className="flex items-center gap-6 border-r border-[#687075]/20 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#fff2d0' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#fff2d0', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#fff2d0] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{ color: '#fff2d0' }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] transition-all border border-[#687075]/20 rounded-full px-4 py-2 text-center focus:outline-none min-w-[60px] gap-2 bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40"
          >
            <GlobeIcon style={{ color: '#dd611f' }} className="w-3.5 h-3.5" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)', borderColor: 'rgba(104,112,117,0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40 focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon style={{ color: '#dd611f' }} className="w-4 h-4" />
          </motion.button>
        </div>
          
        {/* Tools Dropdown Button */}
        <div className="relative ml-2" ref={toolsRef}>
          <motion.button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            style={{ color: '#000000', backgroundColor: '#52b72c' }}
            className="w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-transparent focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('tools')}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#050507] transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isToolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-72 origin-top-right rounded-[2rem] border border-[#687075]/25 bg-[#050507]/95 backdrop-blur-xl p-5 shadow-2xl z-[200] flex flex-col gap-3"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#687075] px-2 block mb-1 border-b border-[#687075]/10 pb-2">
                  Intelligence Tools
                </span>
                
                <button
                  onClick={() => {
                    setActiveTool('thermal');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <SunIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('thermalAnalytics')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Thermal hazard protocol, health risks & field cooling indices.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('aqi');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <WindIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('aqiDashboard')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Multi-factor air quality monitoring & respiratory guidance.
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#687075]/20 pr-2 sm:pr-3 mr-1">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#050507]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#f2f6f9]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-1.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
          </motion.button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#f2f6f9] focus:outline-none hover:bg-[#f2f6f9]/5 rounded-full transition-colors border border-transparent hover:border-[#687075]/20"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#050507]/95 backdrop-blur-xl border border-[#687075]/20 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('about')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors flex items-center gap-2 text-left"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
              {t('tacticalSettings')}
            </button>
            
            <div className="w-full h-[1px] bg-[#687075]/20 my-2" />
            
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#687075] px-4 pt-1 pb-1">
              {t('tools')}
            </div>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('thermal');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><SunIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('thermalAnalytics')}
            </button>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('aqi');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><WindIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('aqiDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// 6. ABOUT NAVBAR
const NavbarAbout = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: any) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <nav id="navbar-about" className="navbar-about fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0f0f12] backdrop-blur-lg transition-all rounded-full border border-[#687075]/25 tracking-tight shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1" 
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <AetraxaLogo style={{ color: '#f2f6f9' }} className="w-8 h-8 text-[#f2f6f9]" aria-hidden="true" />
        <span style={{ fontFamily: 'Inter', color: '#f2f6f9', paddingLeft: '0px', paddingTop: '1px', fontSize: '15px' }} className="font-bold uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div className="flex items-center gap-6 border-r border-[#687075]/20 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#f2f6f9' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#f2f6f9', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#f2f6f9] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#f2f6f9' }}
            whileTap={{ y: 0, scale: 0.95 }}
            style={{ color: '#f2f6f9', fontSize: '12px' }}
            className="font-bold tracking-wide uppercase transition-colors focus:text-[#f2f6f9] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{ color: '#f2f6f9' }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] transition-all border border-[#687075]/20 rounded-full px-4 py-2.5 text-center focus:outline-none min-w-[60px] gap-2 bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40"
          >
            <GlobeIcon style={{ color: '#f2f6f9' }} className="w-3.5 h-3.5" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(242,246,249,0.08)', borderColor: 'rgba(104,112,117,0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md hover:border-[#687075]/40 focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon style={{ color: '#f2f6f9' }} className="w-4 h-4" />
          </motion.button>
        </div>
          
        {/* Tools Dropdown Button */}
        <div className="relative ml-2" ref={toolsRef}>
          <motion.button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            style={{ color: '#050507', backgroundColor: '#f2f6f9' }}
            className="w-[145px] h-[40px] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-transparent focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span style={{ fontSize: '12px', paddingTop: '1px' }}>{t('tools')}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#050507] transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isToolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-72 origin-top-right rounded-[2rem] border border-[#687075]/25 bg-[#050507]/95 backdrop-blur-xl p-5 shadow-2xl z-[200] flex flex-col gap-3"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#687075] px-2 block mb-1 border-b border-[#687075]/10 pb-2">
                  Intelligence Tools
                </span>
                
                <button
                  onClick={() => {
                    setActiveTool('thermal');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <SunIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('thermalAnalytics')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Thermal hazard protocol, health risks & field cooling indices.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('aqi');
                    setCurrentPage(Page.Landing);
                    setIsToolsOpen(false);
                  }}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#687075]/10 border border-transparent hover:border-[#687075]/20 text-left transition-all group w-full cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-[#687075]/10 text-[#687075] group-hover:scale-105 transition-transform shrink-0">
                    <WindIcon className="w-5 h-5 text-[#687075]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#f2f6f9] uppercase tracking-wide group-hover:text-[#f2f6f9] transition-colors">
                      {t('aqiDashboard')}
                    </div>
                    <div className="text-[10px] text-[#687075] mt-1 leading-normal font-medium max-w-[200px]">
                      Multi-factor air quality monitoring & respiratory guidance.
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#687075]/20 pr-2 sm:pr-3 mr-1">
          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#050507]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#f2f6f9]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>

          <motion.button 
            onClick={onOpenSettings}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-1.5 text-[#f2f6f9] transition-all border border-[#687075]/20 rounded-full bg-[#050507]/40 backdrop-blur-md focus:outline-none"
            aria-label={t('tacticalSettings')}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
          </motion.button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#f2f6f9] focus:outline-none hover:bg-[#f2f6f9]/5 rounded-full transition-colors border border-transparent hover:border-[#687075]/20"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#050507]/95 backdrop-blur-xl border border-[#687075]/20 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors text-left"
            >
              {t('about')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#f2f6f9]/5 rounded-2xl transition-colors flex items-center gap-2 text-left"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#f2f6f9]" />
              {t('tacticalSettings')}
            </button>
            
            <div className="w-full h-[1px] bg-[#687075]/20 my-2" />
            
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#687075] px-4 pt-1 pb-1">
              {t('tools')}
            </div>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('thermal');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><SunIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('thermalAnalytics')}
            </button>
            <button 
              onClick={() => { 
                setIsMenuOpen(false); 
                setActiveTool('aqi');
                setCurrentPage(Page.Landing);
              }}
              className="w-full text-left px-4 py-3 text-xs font-black tracking-wider uppercase text-[#f2f6f9] hover:text-[#f2f6f9] hover:bg-[#687075]/10 rounded-2xl transition-all flex items-center gap-3 border border-transparent hover:border-[#687075]/25 text-left"
            >
              <span className="p-1 rounded bg-[#687075]/10 text-[#687075]"><WindIcon className="w-3.5 h-3.5 text-[#687075]" /></span>
              {t('aqiDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// MULTIPLEXER NAVBAR
const Navbar = ({ 
  onStart, 
  onSectionChange, 
  onOpenSettings,
  activeTool,
  setActiveTool,
  setCurrentPage,
  currentPage
}: { 
  onStart: () => void, 
  onSectionChange: (section: string) => void, 
  onOpenSettings: () => void,
  activeTool: 'thermal' | 'aqi' | null,
  setActiveTool: (tool: 'thermal' | 'aqi' | null) => void,
  setCurrentPage: (page: Page) => void,
  currentPage?: Page
}) => {
  const props = { onStart, onSectionChange, onOpenSettings, activeTool, setActiveTool, setCurrentPage, currentPage };

  if (currentPage === Page.Landing) {
    if (activeTool === 'thermal') {
      return <NavbarThermalLanding {...props} />;
    } else if (activeTool === 'aqi') {
      return <NavbarApiLanding {...props} />;
    } else {
      return <NavbarMainLanding {...props} />;
    }
  } else if (currentPage === Page.Main) {
    if (activeTool === 'thermal') {
      return <NavbarThermalApp {...props} />;
    } else if (activeTool === 'aqi') {
      return <NavbarApiApp {...props} />;
    }
  } else if (currentPage === Page.About || currentPage === Page.Settings) {
    return <NavbarAbout {...props} />;
  }

  // Falls through to NavbarMainLanding as safe default for unset activeTool
  return <NavbarMainLanding {...props} />;
};

export const SearchableDropdown = React.memo(({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled = false,
  onSearchQueryChange,
  onOptionSelect,
  variant = 'standard',
  onOpenChange,
  theme = 'thermal'
}: { 
  options: any[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder: string,
  disabled?: boolean,
  onSearchQueryChange?: (query: string) => void,
  onOptionSelect?: (opt: any) => void,
  variant?: 'standard' | 'borderless',
  onOpenChange?: (open: boolean) => void,
  theme?: 'thermal' | 'aqi'
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen && !disabled) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  useEffect(() => {
    if (onSearchQueryChange) {
      const timer = setTimeout(() => {
        onSearchQueryChange(search);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, onSearchQueryChange]);

  const getLabel = (opt: any) => typeof opt === 'string' ? opt : (opt.displayName || opt.name);

  const filteredOptions = onSearchQueryChange ? options : options.filter(opt => {
    const label = getLabel(opt);
    const translation = translateLocation(label, language);
    return label.toLowerCase().includes(search.toLowerCase()) ||
           translation.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? 'z-[2000]' : 'z-10'}`}>
      <button 
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={value ? `${placeholder}: ${value}` : placeholder}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={variant === 'borderless' 
          ? `w-full min-h-[44px] bg-transparent border-none px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors group ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none'}`
          : `w-full min-h-[48px] bg-transparent border ${isOpen ? (theme === 'aqi' ? 'border-[#52b72c]/50 shadow-[0_0_10px_rgba(82,183,44,0.15)]' : 'border-primary-accent/50 shadow-[0_0_10px_rgba(197,87,27,0.1)]') : 'border-black'} rounded-full px-5 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-all group ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none focus:border-white/20'}`
        }
      >
        <span className={variant === 'borderless'
          ? `${value ? (theme === 'aqi' ? 'text-[#edffde]' : 'text-[#fff2d0]') : 'text-[#687075]'} truncate mr-2 font-bold uppercase tracking-wider text-xs`
          : `${value ? 'text-white' : 'text-white/30'} truncate mr-2 font-semibold`
        }>
          {translateLocation(value, language) || placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                if (onOptionSelect) onOptionSelect(null);
                setSearch('');
              }}
              className="p-1 rounded-full cursor-pointer hover:bg-white/10 text-[#687075] hover:text-white transition-colors z-10"
              title="Clear selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </span>
          )}
          <ChevronDownIcon 
            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-white' : 'text-[#687075]'
            }`} 
            aria-hidden="true" 
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute top-full left-0 w-full mt-2 border rounded-2xl overflow-hidden z-[3000] shadow-2xl backdrop-blur-xl ${
              theme === 'aqi' ? 'bg-[#020402] border-[#52b72c]/20' : 'bg-black border-white/10'
            }`}
          >
            <div className={`p-3 border-b ${theme === 'aqi' ? 'border-[#52b72c]/10' : 'border-white/5'}`}>
              <input 
                autoFocus
                type="text"
                role="searchbox"
                aria-label="Filter options"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                }}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none font-bold ${
                  theme === 'aqi' ? 'bg-[#020402] border-[#52b72c]/20 focus:border-[#52b72c]/40' : 'bg-black border-white/5 focus:border-primary-accent/30'
                }`}
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => {
                  const label = getLabel(opt);
                  const isSelected = value === label;
                  return (
                    <div 
                      key={`${label}-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        onChange(label);
                        if (onOptionSelect) onOptionSelect(opt);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onChange(label);
                          if (onOptionSelect) onOptionSelect(opt);
                          setIsOpen(false);
                          setSearch('');
                        }
                      }}
                      className={`px-5 py-3 text-sm cursor-pointer focus:outline-none transition-colors flex justify-between items-center group/item ${
                        theme === 'aqi' 
                          ? isSelected 
                            ? 'bg-[#52b72c]/10 text-[#edffde]' 
                            : 'text-[#edffde]/60 hover:bg-[#52b72c]/10 hover:text-[#edffde] focus:bg-[#52b72c]/10 focus:text-[#edffde]'
                          : isSelected
                            ? 'bg-orange-500/5 text-orange-400'
                            : 'text-white/40 hover:text-white focus:text-white hover:bg-orange-500/10 focus:bg-orange-500/10'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`${
                          theme === 'aqi'
                            ? isSelected ? 'text-[#edffde]' : 'text-[#edffde]/80'
                            : isSelected ? 'text-orange-400' : 'text-white/60 focus:text-white'
                        } font-bold`}>{translateLocation(label, language)}</span>
                        {opt.type && (
                          <span className={`text-[10px] uppercase tracking-widest font-black ${
                            theme === 'aqi' ? 'text-[#52b72c]/50' : 'text-white/30'
                          }`}>{opt.type}</span>
                        )}
                      </div>
                      {isSelected && (
                        <div 
                          className={`w-1.5 h-1.5 rounded-full ${
                            theme === 'aqi' 
                              ? 'bg-[#52b72c] shadow-[0_0_8px_rgba(82,183,44,0.6)]' 
                              : 'bg-orange-500 shadow-[0_0_8px_var(--color-primary-accent)]'
                          }`} 
                          aria-hidden="true" 
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div role="status" className={`p-5 text-center text-xs uppercase tracking-widest ${
                  theme === 'aqi' ? 'text-[#edffde]/30' : 'text-white/30'
                }`}>No results found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Qualitative Assessment Helpers
const getLocationTypeLabel = (code: string) => {
  if (!code) return '';
  const c = code.toUpperCase();
  if (c === 'PCLI') return 'Country';
  if (c.startsWith('ADM')) return 'Region';
  if (c === 'PPLC') return 'Capital';
  if (c.startsWith('PPL')) return 'City';
  return '';
};

const getHumidityStatus = (h: number) => {
  if (h < 30) return "Arid Condition";
  if (h < 50) return "Comfortable";
  if (h < 70) return "High Moisture";
  return "Tropical Saturated";
};

const getWindStatus = (s: number, gust?: number, humidity?: number) => {
  const maxWind = Math.max(s, gust || 0);
  if (maxWind >= 40 && humidity !== undefined && humidity < 35) {
    return "Severe Sandstorm Hazard Detected";
  }
  if (maxWind >= 50) return "Gale / Storm Warning";
  if (maxWind >= 35) return "Intense Velocity";
  if (maxWind >= 20) return "Moderate Gusts";
  if (maxWind >= 8) return "Light Breeze";
  return "Calm Air";
};

const getUVStatus = (uv: number) => {
  if (uv <= 2) return "Safe Exposure";
  if (uv <= 5) return "Moderate Risk";
  if (uv <= 7) return "High Hazard";
  return "Extreme Alert";
};

export default function App() {
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>(() => {
    return (localStorage.getItem('aetraxaTempUnit') as 'celsius' | 'fahrenheit') || 'celsius';
  });

  useEffect(() => {
    localStorage.setItem('aetraxaTempUnit', tempUnit);
  }, [tempUnit]);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('aetraxaUserProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          occupation: parsed.occupation || '',
          outdoor_hours: parsed.outdoor_hours !== undefined ? parsed.outdoor_hours : 0,
          health_conditions: parsed.health_conditions || [],
          monitoring_others: parsed.monitoring_others || [],
          alert_style: parsed.alert_style || 'Detailed',
          preferred_language: parsed.preferred_language || 'en'
        };
      } catch (e) {
        console.error("Failed to parse user profile from localStorage", e);
      }
    }
    return {
      occupation: '',
      outdoor_hours: 0,
      health_conditions: [],
      monitoring_others: [],
      alert_style: 'Detailed',
      preferred_language: 'en'
    };
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState<Page>(Page.Landing);

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCityData, setSelectedCityData] = useState<any>(null);
  const [baseCities, setBaseCities] = useState<any[]>([]);
  const [dynamicCities, setDynamicCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [aqi, setAqi] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [lastThermalAnalysisTime, setLastThermalAnalysisTime] = useState<number>(0);
  const [lastThermalCity, setLastThermalCity] = useState<string>('');
  const [lastAqiAnalysisTime, setLastAqiAnalysisTime] = useState<number>(0);
  const [lastAqiCity, setLastAqiCity] = useState<string>('');
  const [lastThermalChatTime, setLastThermalChatTime] = useState<number>(0);
  const [lastAqiChatTime, setLastAqiChatTime] = useState<number>(0);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [thermalChatMessages, setThermalChatMessages] = useState<any[]>([]);
  const [aqiChatMessages, setAqiChatMessages] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [cooldownToastMsg, setCooldownToastMsg] = useState<string | null>(null);
  
  const [activeTool, setActiveTool] = useState<'thermal' | 'aqi' | null>(null);

  // Scroll to top on page or tool transitions synchronously before screen paint
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [currentPage, activeTool]);

  // Reset AI insights when switching between tools to avoid bleeding state
  React.useEffect(() => {
    setAiInsights(null);
  }, [activeTool]);

  const [sharedReportScale, setSharedReportScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const padding = window.innerWidth < 640 ? 32 : 48;
      const maxW = 600;
      const availableWidth = Math.min(window.innerWidth - padding, maxW);
      setSharedReportScale(Math.min(availableWidth / 600, 1));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (userProfile.preferred_language !== language) {
      setUserProfile(prev => ({ ...prev, preferred_language: language }));
    }
  }, [language]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareCityParam = params.get('shareCity');
    const shareTypeParam = params.get('shareType') || 'thermal';
    if (shareCityParam) {
      setLoading(true);
      if (shareTypeParam === 'aqi') {
        getAqiData(shareCityParam)
          .then(data => {
            setAqi(data);
            getAIInsights(data, 'aqi', true);
            setActiveTool('aqi');
            setCurrentPage(Page.SharedReport);
          })
          .catch(err => {
            console.error("Failed to load shared AQI city:", err);
            setError("Failed to load the shared AQI location report.");
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        getWeatherData(shareCityParam)
          .then(data => {
            setWeather(data);
            getAIInsights(data, 'thermal', true);
            setActiveTool('thermal');
            setCurrentPage(Page.SharedReport);
          })
          .catch(err => {
            console.error("Failed to load shared city:", err);
            setError("Failed to load the shared location report.");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, []);

  const getAIInsights = useCallback(async (data: any, toolType: 'thermal' | 'aqi', force = false, profileOverride?: UserProfile) => {
    const now = Date.now();
    const lTime = toolType === 'aqi' ? lastAqiAnalysisTime : lastThermalAnalysisTime;
    if (!force && now - lTime < 60000 && aiInsights) {
      console.log("Analysis cooldown active. Using cached insights.");
      return;
    }
    
    setAiLoading(true);
    try {
      const activeProfile = profileOverride || userProfile;
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolType, telemetryData: data, userProfile: activeProfile, language })
      });
      
      if (response.ok) {
        const insights = await response.json();
        setAiInsights(insights);
        if (toolType === 'aqi') {
          setLastAqiAnalysisTime(Date.now());
        } else {
          setLastThermalAnalysisTime(Date.now());
        }
      } else if (response.status === 401) {
        setAiInsights({ 
          summary: "Invalid Groq API Key detected. Please ensure you have set a valid GROQ_API_KEY in the application settings.", 
          suggestions: ["Check your API key in the Settings menu.", "Deploy with a valid key for AI features."] 
        });
      } else {
        const text = await response.text();
        let errorMessage = response.statusText || 'Unknown error';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, use status text or a snippet of the body
          if (text.includes('<!DOCTYPE html>')) {
            errorMessage = `Server Error (${response.status}): The API endpoint was not found or returned an HTML page.`;
          } else {
            errorMessage = text.substring(0, 100) || errorMessage;
          }
        }
        console.error("AI Insight fetch error:", { status: response.status, body: text });
        setAiInsights({ summary: `AI Error: ${errorMessage}`, suggestions: [] });
      }
    } catch (err) {
      console.error("AI Insight fetch failed", err);
      setAiInsights({ summary: "AI Service unavailable. Try again later.", suggestions: [] });
    } finally {
      setAiLoading(false);
    }
  }, [language, userProfile, lastThermalAnalysisTime, lastAqiAnalysisTime, aiInsights]);

  const handleSaveProfile = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('aetraxaUserProfile', JSON.stringify(profile));
    if (profile.preferred_language !== language) {
      setLanguage(profile.preferred_language);
    }
    if (activeTool === 'thermal' && weather) {
      getAIInsights(weather, 'thermal', true, profile);
    } else if (activeTool === 'aqi' && aqi) {
      getAIInsights(aqi, 'aqi', true, profile);
    }
  }, [language, setLanguage, weather, aqi, activeTool, getAIInsights]);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!message.trim() || (activeTool === 'thermal' && !weather) || (activeTool === 'aqi' && !aqi)) return;

    const now = Date.now();
    const lChatTime = activeTool === 'aqi' ? lastAqiChatTime : lastThermalChatTime;
    const currentMessages = activeTool === 'aqi' ? aqiChatMessages : thermalChatMessages;
    const setMessages = activeTool === 'aqi' ? setAqiChatMessages : setThermalChatMessages;
    const setChatTime = activeTool === 'aqi' ? setLastAqiChatTime : setLastThermalChatTime;

    if (now - lChatTime < 60000) {
      const remaining = Math.ceil((60000 - (now - lChatTime)) / 1000);
      setMessages(prev => [...prev, { role: 'assistant', content: `Protocol delay active. Next transmission ready in ${remaining}s.` }]);
      return;
    }

    const newUserMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: activeTool,
          messages: [...currentMessages, newUserMessage],
          weatherData: weather,
          aqiData: aqi,
          userProfile,
          language 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        setChatTime(Date.now());
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Protocol failure. Briefing interrupted." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Communication link severed. Signal lost." }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [thermalChatMessages, aqiChatMessages, weather, aqi, language, userProfile, activeTool, lastThermalChatTime, lastAqiChatTime]);

  const processLocation = useCallback(async (latitude: number, longitude: number, cityName?: string) => {
    try {
      setError(null);
      setAiInsights(null);
      if (activeTool === 'thermal') {
        const weatherData = await getWeatherData({ lat: latitude, lon: longitude, name: cityName });
        setWeather(weatherData);
        setSelectedCity(weatherData.city);
        if (weatherData.country) {
          setSelectedCountry(weatherData.country);
        }
        setSelectedCityData({ lat: latitude, lon: longitude });
        getAIInsights(weatherData, 'thermal');
      } else {
        const aqiData = await getAqiData({ lat: latitude, lon: longitude, name: cityName });
        setAqi(aqiData);
        setSelectedCity(aqiData.city);
        if (aqiData.country) {
          setSelectedCountry(aqiData.country);
        }
        setSelectedCityData({ lat: latitude, lon: longitude });
        getAIInsights(aqiData, 'aqi');
      }
      
      if (currentPage !== Page.Main) {
        setCurrentPage(Page.Main);
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Location process error:", err);
      setError(err.message || "Failed to retrieve weather for this location.");
    } finally {
      setIsLocating(false);
      setLoading(false);
    }
  }, [getAIInsights, currentPage, activeTool, setSelectedCountry]);

  const handleLocateMe = useCallback(async () => {
    const tool = activeTool === 'aqi' ? 'aqi' : 'thermal';
    const lTime = tool === 'aqi' ? lastAqiAnalysisTime : lastThermalAnalysisTime;
    const hasCachedData = tool === 'aqi' ? !!aqi : !!weather;
    const now = Date.now();

    if (now - lTime < 60000 && hasCachedData) {
      if (currentPage !== Page.Main) {
        setCurrentPage(Page.Main);
      }
      return;
    }

    setIsLocating(true);
    setError(null);
    setLoading(true);
    if (currentPage !== Page.Main) {
      setCurrentPage(Page.Main);
    }
    let locationResolved = false;

    const fallbackToIp = async () => {
      if (locationResolved) return;
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (!res.ok) throw new Error("IP Lookup failed");
        const data = await res.json();
        if (!data.latitude || !data.longitude) throw new Error("Location data incomplete");
        
        await processLocation(data.latitude, data.longitude);
        locationResolved = true;
      } catch (fbErr) {
        if (!locationResolved) {
          console.error("Fallback location failed:", fbErr);
          setError("Unable to automatically detect location. Please search for your city directly.");
        }
        setIsLocating(false);
        setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationResolved = true;
        processLocation(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        if (!locationResolved) {
          console.warn("Geolocation failed, trying fallback:", err);
          fallbackToIp();
        }
      },
      { 
        timeout: 10000, 
        enableHighAccuracy: true,
        maximumAge: 0 
      }
    );
  }, [processLocation, currentPage, activeTool, lastAqiAnalysisTime, lastThermalAnalysisTime, aqi, weather]);

  const handleCitySearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setDynamicCities(baseCities);
      return;
    }
    
    // Filter base cities locally first
    const filteredBase = baseCities.filter(c => 
      c.displayName.toLowerCase().includes(query.toLowerCase())
    );

    const countryCode = COUNTRIES.find(c => c.name === selectedCountry)?.code;
    const results = await searchCities(query, countryCode);
    const fromApi = results.map((r: any) => {
      const parts = [r.name];
      if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
      return {
        name: r.name,
        displayName: parts.join(', '),
        lat: r.latitude,
        lon: r.longitude,
        type: getLocationTypeLabel(r.feature_code)
      };
    }).filter((r: any) => {
      // If a country is selected, filter out results that are just the country themselves
      if (selectedCountry && r.type === 'Country' && r.name.toLowerCase() === selectedCountry.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Merge: Filtered base cities + API results (avoiding duplicates)
    setDynamicCities(() => {
      const seen = new Set(filteredBase.map(c => c.displayName.toLowerCase()));
      const uniqueNew = fromApi.filter(c => !seen.has(c.displayName.toLowerCase()));
      return [...filteredBase, ...uniqueNew];
    });
  }, [baseCities, selectedCountry]);
  
  const GLOBAL_POPULAR_CITIES = React.useMemo(() => [
    { name: 'London', displayName: 'London, United Kingdom', lat: 51.5074, lon: -0.1278, type: 'City' },
    { name: 'New York', displayName: 'New York, United States', lat: 40.7128, lon: -74.0060, type: 'City' },
    { name: 'Tokyo', displayName: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, type: 'City' },
    { name: 'Paris', displayName: 'Paris, France', lat: 48.8566, lon: 2.3522, type: 'City' },
    { name: 'Cairo', displayName: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357, type: 'City' },
    { name: 'Dubai', displayName: 'Dubai, United Arab Emirates', lat: 25.2048, lon: 55.2708, type: 'City' },
    { name: 'Sydney', displayName: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, type: 'City' },
    { name: 'Delhi', displayName: 'Delhi, India', lat: 28.6139, lon: 77.2090, type: 'City' },
    { name: 'Lahore', displayName: 'Lahore, Pakistan', lat: 31.5204, lon: 74.3587, type: 'City' },
    { name: 'Toronto', displayName: 'Toronto, Canada', lat: 43.6532, lon: -79.3832, type: 'City' },
    { name: 'Singapore', displayName: 'Singapore', lat: 1.3521, lon: 103.8198, type: 'City' },
    { name: 'Istanbul', displayName: 'Istanbul, Turkey', lat: 41.0082, lon: 28.9784, type: 'City' }
  ], []);

  useEffect(() => {
    if (selectedCountry) {
      const countryCode = COUNTRIES.find(c => c.name === selectedCountry)?.code || '';
      const localCities = CITIES_BY_COUNTRY[countryCode] || [];
      const initialList = localCities.map(c => ({ name: c, displayName: c }));
      
      setBaseCities(initialList);
      setDynamicCities(initialList);

      // Fetch top cities from API to supplement the menu
      searchCities(selectedCountry, countryCode).then(results => {
        const fromApi = results.map((r: any) => {
          const parts = [r.name];
          if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
          return {
            name: r.name,
            displayName: parts.join(', '),
            lat: r.latitude,
            lon: r.longitude,
            type: getLocationTypeLabel(r.feature_code)
          };
        }).filter((r: any) => {
          // Priority: Keep cities and capitals, maybe keep regions if sparse
          if (r.type === 'Country') return false; // Don't show country in city list
          return true;
        });
        
        // Merge lists, avoiding duplicates by name
        setBaseCities(prev => {
          const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
          const uniqueNew = fromApi.filter(c => !existingNames.has(c.name.toLowerCase()));
          const newList = [...prev, ...uniqueNew];
          setDynamicCities(newList);
          return newList;
        });
      });
    } else {
      setBaseCities(GLOBAL_POPULAR_CITIES);
      setDynamicCities(GLOBAL_POPULAR_CITIES);
    }
  }, [selectedCountry, GLOBAL_POPULAR_CITIES]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedCity) return;

    const now = Date.now();
    const tool = activeTool === 'aqi' ? 'aqi' : 'thermal';
    const lTime = tool === 'aqi' ? lastAqiAnalysisTime : lastThermalAnalysisTime;
    const cacheCity = tool === 'aqi' ? lastAqiCity : lastThermalCity;
    const hasCachedData = tool === 'aqi' ? !!aqi : !!weather;

    const isSameLocation = cacheCity ? selectedCity.trim().toLowerCase() === cacheCity.trim().toLowerCase() : false;

    if (now - lTime < 60000 && hasCachedData) {
      if (isSameLocation) {
        if (currentPage !== Page.Main) {
          setCurrentPage(Page.Main);
        } else {
          const remaining = Math.ceil((60000 - (now - lTime)) / 1000);
          setCooldownToastMsg(`Analysis cooldown active. Please wait ${remaining}s before searching again.`);
          setTimeout(() => setCooldownToastMsg(null), 3000);
        }
        return;
      } else {
        const remaining = Math.ceil((60000 - (now - lTime)) / 1000);
        setCooldownToastMsg(`Analysis cooldown active. Please wait ${remaining}s before searching another location.`);
        setTimeout(() => setCooldownToastMsg(null), 3000);
        return;
      }
    }

    setAiInsights(null);
    setLoading(true);
    setError(null);
    try {
      const query = selectedCityData || (selectedCity + (selectedCountry ? `, ${selectedCountry}` : ''));
      
      if (activeTool === 'thermal') {
        const weatherData = await getWeatherData(query);
        setWeather(weatherData);
        setLastThermalCity(selectedCity);
        getAIInsights(weatherData, 'thermal');
      } else {
        const aqiData = await getAqiData(query);
        setAqi(aqiData);
        setLastAqiCity(selectedCity);
        getAIInsights(aqiData, 'aqi');
      }

      if (currentPage !== Page.Main) {
        setCurrentPage(Page.Main);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [selectedCity, selectedCityData, selectedCountry, getAIInsights, currentPage, activeTool, lastThermalAnalysisTime, lastAqiAnalysisTime, lastThermalCity, lastAqiCity, weather, aqi]);

  const handleEmptyTransition = useCallback(() => {
    if (currentPage === Page.Main) return;
    setCurrentPage(Page.Main);
  }, [currentPage]);

  const handleGetStartedWithoutLocation = useCallback(() => {
    setSelectedCountry('');
    setSelectedCity('');
    setSelectedCityData(null);
    setWeather(null);
    setAqi(null);
    setAiInsights(null);
    setError(null);
    if (currentPage !== Page.Main) {
      setCurrentPage(Page.Main);
    }
  }, [currentPage]);

  const handleGetStartedButtonClick = useCallback(() => {
    const currentTool = activeTool || 'thermal';
    if (!activeTool) {
      setActiveTool('thermal');
    }

    const lTime = currentTool === 'aqi' ? lastAqiAnalysisTime : lastThermalAnalysisTime;
    const hasCachedData = currentTool === 'aqi' ? !!aqi : !!weather;
    const now = Date.now();
    const isCooldownActive = (now - lTime < 60000) && hasCachedData;

    if (isCooldownActive) {
      if (currentPage !== Page.Main) {
        setCurrentPage(Page.Main);
      }
    } else {
      setSelectedCountry('');
      setSelectedCity('');
      setSelectedCityData(null);
      setWeather(null);
      setAqi(null);
      setAiInsights(null);
      setError(null);
      if (currentPage !== Page.Main) {
        setCurrentPage(Page.Main);
      }
    }
  }, [activeTool, lastAqiAnalysisTime, lastThermalAnalysisTime, aqi, weather, currentPage, setActiveTool]);

  const handleHome = useCallback(() => {
    setActiveTool(null);
    if (currentPage === Page.Landing) return;
    setCurrentPage(Page.Landing);
  }, [currentPage]);

  const handleShare = useCallback(() => {
    if (activeTool === 'aqi') {
      if (!aqi) return;
    } else {
      if (!weather) return;
    }
    setIsShareModalOpen(true);
  }, [activeTool, weather, aqi]);

  return (
    <div className={`relative min-h-screen flex flex-col font-sans bg-[#050507] overflow-x-hidden selection:bg-primary-accent/30 page-${currentPage} ${(currentPage === Page.Settings || currentPage === Page.About) ? 'theme-neutral' : activeTool === 'aqi' ? 'theme-aqi' : activeTool === 'thermal' ? 'theme-thermal' : 'theme-neutral'}`}>
      <TempUnitContext.Provider value={{ tempUnit, setTempUnit }}>
        <ScrollFramesBackground 
          frameCount={(currentPage === Page.Settings || currentPage === Page.About || !activeTool) ? 83 : activeTool === 'thermal' ? 240 : 155}
          prefix={(currentPage === Page.Settings || currentPage === Page.About || !activeTool) ? "/assets/Landing Scroll/Land-scroll (" : activeTool === 'thermal' ? "/assets/frames/frame_ (" : "/assets/AQI Scroll/AQI-scroll ("}
          suffix=").webp"
          opacity={(currentPage === Page.Settings || currentPage === Page.About || !activeTool) ? 0.85 : (activeTool === 'thermal' ? 0.88 : 0.85)}
        />
      {/* Background Glow Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000">
        <div className={`absolute top-0 left-0 w-full h-full ${(currentPage === Page.Settings || currentPage === Page.About || !activeTool) ? 'bg-[#050507]/40' : activeTool === 'thermal' ? 'bg-[#050507]/20' : 'bg-[#050507]/40'} backdrop-blur-[2px] transition-all duration-1000`} />
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full bg-primary-accent/8 blur-[100px] transition-colors duration-1000" />
        <div className="absolute top-[30%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary-accent/4 blur-[80px] transition-colors duration-1000" />
      </div>

      <div className="relative z-10 w-full flex flex-col flex-grow min-h-screen">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary-accent focus:text-white focus:top-4 focus:left-4 focus:rounded-full focus:font-bold"
        >
          Skip to main content
        </a>
        <Navbar 
          onStart={handleGetStartedButtonClick} 
          onSectionChange={(section) => {
            if (section === 'home') handleHome();
            if (section === 'about') {
              setCurrentPage(Page.About);
            }
          }}
          onOpenSettings={() => setCurrentPage(Page.Settings)}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          setCurrentPage={setCurrentPage}
          currentPage={currentPage}
        />
      
        <AnimatePresence>
          {isShareModalOpen && (activeTool === 'aqi' ? aqi : weather) && (
            <ShareModal 
              weather={weather} 
              aqi={aqi}
              activeTool={activeTool}
              onClose={() => setIsShareModalOpen(false)} 
            />
          )}
        </AnimatePresence>

        {/* Pages Container */}
        <main id="main-content" className="relative z-10 w-full flex-grow overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          {currentPage === Page.Landing ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <LandingPage 
                onStart={handleSearch} 
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                setSelectedCityData={setSelectedCityData}
                onSearch={handleSearch}
                loading={loading}
                dynamicCities={dynamicCities}
                setDynamicCities={setDynamicCities}
                handleCitySearch={handleCitySearch}
                onLocateMe={handleLocateMe}
                isLocating={isLocating}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                setCurrentPage={setCurrentPage}
              />
            </motion.div>
          ) : currentPage === Page.Main ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <MainAppPage 
                weather={weather}
                aqi={aqi}
                activeTool={activeTool}
                aiInsights={aiInsights}
                aiLoading={aiLoading}
                onSearch={handleSearch}
                loading={loading}
                error={error}
                handleShare={handleShare}
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                setSelectedCityData={setSelectedCityData}
                dynamicCities={dynamicCities}
                setDynamicCities={setDynamicCities}
                handleCitySearch={handleCitySearch}
                onLocateMe={handleLocateMe}
                isLocating={isLocating}
                onOpenAssistant={() => setIsAssistantOpen(true)}
                lastAnalysisTime={activeTool === 'aqi' ? lastAqiAnalysisTime : lastThermalAnalysisTime}
              />
            </motion.div>
          ) : currentPage === Page.About ? (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <AboutPage onBack={handleHome} />
            </motion.div>
          ) : currentPage === Page.Settings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <SettingsPage 
                profile={userProfile} 
                onSave={handleSaveProfile} 
                onBack={() => {
                  if (activeTool) {
                    setCurrentPage(Page.Main);
                  } else {
                    setCurrentPage(Page.Landing);
                  }
                }} 
              />
            </motion.div>
          ) : currentPage === Page.SharedReport ? (
            <motion.div
              key="shared_report"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="max-w-4xl mx-auto px-4 pt-32 pb-8 sm:pt-36 md:pt-44 flex flex-col items-center justify-center gap-6 min-h-[75vh]"
            >
              {/* Header Badge */}
              <div className="flex items-center gap-3 mb-2 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
                <AetraxaLogo className="w-4 h-4 text-primary-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fff2d0] aetraxa-logo">AETRAXA REPORT</span>
                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">• shared artifact</span>
              </div>

              {/* Pixel-perfect Preview scaling down vectorially with zoom/scale calculation */}
              {(activeTool === 'aqi' ? aqi : weather) && (
                <div id="shared-telemetry-artifact" className="flex flex-col items-center gap-8 w-full">
                  <div 
                    style={{ 
                      width: `${600 * sharedReportScale}px`, 
                      height: `${800 * sharedReportScale}px`,
                      boxShadow: `0 30px 100px ${(activeTool === 'aqi' ? getAqiDangerLevel(aqi.current.aqi) : getDangerLevel(weather.current.heatIndex)).color}15`
                    }}
                    className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050507] relative flex items-center justify-center transition-all duration-300"
                  >
                    <div 
                      style={{ 
                        width: '600px', 
                        height: '800px',
                        transform: `scale(${sharedReportScale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                      className="origin-top-left flex-shrink-0"
                    >
                      {activeTool === 'aqi' ? (
                        <AqiReportCard aqi={aqi} />
                      ) : (
                        <ThermalReportCard weather={weather} />
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="max-w-md w-full flex flex-col gap-4 p-6 sm:p-8 text-center bg-[#050507]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Active Telemetry Received</h2>
                    <p className="text-xs text-stone-400 font-bold leading-relaxed mb-2">
                      You are viewing structural {activeTool === 'aqi' ? 'atmospheric air composition' : 'thermal levels'} for <span className="text-white font-black">{translateCity(activeTool === 'aqi' ? aqi.city : weather.city, language)}</span> as captured by our sensors. Select an action below to decrypt live sensors or explore.
                    </p>

                    <button
                      onClick={() => {
                        // Clear queries manually
                        window.history.pushState({}, '', window.location.pathname);
                        setCurrentPage(Page.Main);
                      }}
                      className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-primary-accent hover:bg-orange-600 font-black text-xs uppercase tracking-[0.3em] text-black transition-all"
                      style={{ 
                        backgroundColor: activeTool === 'aqi' ? '#52b72c' : '#d6501f',
                        boxShadow: `0 20px 50px ${activeTool === 'aqi' ? 'rgba(82, 183, 44, 0.3)' : 'rgba(214, 80, 31, 0.3)'}`
                      }}
                    >
                      <ActivityIcon className="w-4 h-4" />
                      Check Live Data of {translateCity(activeTool === 'aqi' ? aqi.city : weather.city, language)}
                    </button>

                    <button
                      onClick={() => {
                        window.history.pushState({}, '', window.location.pathname);
                        setSelectedCity('');
                        setSelectedCountry('');
                        setCurrentPage(Page.Landing);
                      }}
                      className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-stone-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest text-center"
                    >
                      Search Another Location
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
        </main>

        <AssistantDrawer 
          isOpen={isAssistantOpen} 
          onClose={() => setIsAssistantOpen(false)}
          messages={activeTool === 'aqi' ? aqiChatMessages : thermalChatMessages}
          onSendMessage={handleSendChatMessage}
          isLoading={isChatLoading}
          lastChatTime={activeTool === 'aqi' ? lastAqiChatTime : lastThermalChatTime}
        />

        {/* Cooldown Toast */}
        {cooldownToastMsg && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-[#1a1a1f] border border-primary-accent/30 text-primary-accent text-xs font-black uppercase tracking-widest rounded-full shadow-2xl backdrop-blur-xl pointer-events-none"
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
          >
            {cooldownToastMsg}
          </div>
        )}

        <AppFooter currentPage={currentPage} activeTool={activeTool} />
      </div>

      </TempUnitContext.Provider>
    </div>
  );
}

// --- Assistant Components ---

const AssistantDrawer = ({ isOpen, onClose, messages, onSendMessage, isLoading, lastChatTime }: any) => {
  const { t } = useLanguage();
  const [input, setInput] = React.useState('');
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [width, setWidth] = React.useState(448);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = 60000 - (now - lastChatTime);
      setCooldownRemaining(Math.max(0, Math.ceil(diff / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastChatTime]);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 320 && newWidth < window.innerWidth * 0.7) {
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000]"
          />
          <motion.div
            id="assistant-chat-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ width: `${width}px`, maxWidth: '100vw' }}
            className={`fixed top-0 right-0 h-full bg-black border-l border-white/10 z-[1100] shadow-2xl flex flex-col w-full sm:w-auto ${isResizing ? 'select-none' : ''}`}
          >
            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className="absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-primary-accent/30 transition-colors z-[1101] hidden sm:block"
            />

            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-4">
                <div className="p-2 sm:p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <SparklesIcon className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">{t('tacticalAssistant')}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Link</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                aria-label="Close assistant"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-6 sm:px-8">
                  <SparklesIcon className="w-12 h-12 text-white mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                    Link Established. State your inquiry for tactical assessment.
                  </p>
                </div>
              ) : (
                messages.map((m: any, i: number) => (
                  <MessageBubble key={i} message={m} />
                ))
              )}
              {isLoading && (
                <div className="flex gap-4 items-start animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex-shrink-0" />
                  <div className="space-y-2 flex-grow">
                    <div className="h-2 bg-white/5 rounded-full w-full" />
                    <div className="h-2 bg-white/5 rounded-full w-2/3" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 sm:p-6 border-t border-white/5 bg-black/50">
              <form onSubmit={handleSend} className="relative flex items-center gap-3">
                <div className="relative flex-grow min-h-[52px] flex items-center">
                  {cooldownRemaining > 0 && (
                    <div className="absolute -top-6 right-0 flex items-center gap-2 px-3 py-1 bg-orange-600/10 border border-orange-600/20 rounded-full backdrop-blur-sm">
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                       <span className="text-[7px] font-black text-orange-500 uppercase tracking-[0.2em]">
                         Protocol Calibration: {cooldownRemaining}s
                       </span>
                    </div>
                  )}
                  <textarea 
                    ref={textareaRef}
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={cooldownRemaining > 0}
                    placeholder={cooldownRemaining > 0 
                      ? "Standby for tactical sync..."
                      : t('chatPlaceholder')}
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-[15px] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all font-medium resize-none min-h-[52px] max-h-[180px] custom-scrollbar disabled:opacity-30 overflow-hidden leading-tight placeholder:whitespace-nowrap placeholder:overflow-hidden placeholder:text-ellipsis"
                    rows={1}
                  />
                  {cooldownRemaining > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10 overflow-hidden rounded-b-2xl">
                      <motion.div 
                        key={lastChatTime}
                        initial={{ width: `${Math.max(0, Math.min(100, (60000 - (Date.now() - lastChatTime)) / 60000 * 100))}%` }}
                        animate={{ width: '0%' }}
                        transition={{ duration: cooldownRemaining, ease: "linear" }}
                        className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                      />
                    </div>
                  )}
                </div>
                <button 
                  disabled={!input.trim() || isLoading || cooldownRemaining > 0}
                  type="submit"
                  className="h-[52px] px-6 rounded-xl bg-orange-600 text-black font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 disabled:bg-stone-800 disabled:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-600/20 flex-shrink-0 flex items-center justify-center"
                >
                  {isLoading ? '...' : cooldownRemaining > 0 ? `${cooldownRemaining}s` : t('send')}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MessageBubble = ({ message }: { message: any }) => {
  const isAssistant = message.role === 'assistant';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 items-start ${isAssistant ? '' : 'flex-row-reverse'}`}
    >
      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${
        isAssistant 
          ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' 
          : 'bg-white/5 border-white/10 text-white'
      }`}>
        {isAssistant ? <SparklesIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
      </div>
      <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed font-medium ${
        isAssistant 
          ? 'bg-white/[0.03] border border-white/5 text-white' 
          : 'bg-orange-600 text-black'
      }`}>
        {isAssistant ? (
          <div className="prose-custom max-w-none">
            <Markdown>{message.content}</Markdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </motion.div>
  );
};

// --- Landing Sub-Components ---

const CITY_NAME_MAP: Record<string, string> = {
  'Kuwait City': 'کویت سٹی',
  'Ahvaz': 'اہواز',
  'Basra': 'بصرہ',
  'Baghdad': 'بغداد',
  'Jacobabad': 'جیکب آباد',
  'Turbat': 'تربت',
  'Death Valley': 'ڈیتھ ویلی',
  'Phoenix': 'فینکس',
  'Riyadh': 'ریاض',
  'Mecca': 'مکہ مکرمہ',
  'Medina': 'مدینہ منورہ',
  'Khartoum': 'خرطوم',
  'Cairo': 'قاہرہ',
  'Mexicali': 'میکسیکالی',
  'Doha': 'دوحہ',
  'Abu Dhabi': 'ابوظہبی',
  'Dubai': 'دبئی',
  'Karachi': 'کراچی',
  'Las Vegas': 'لاس ویگاس',
  'Timbuktu': 'ٹمبکٹو',
  'Niamey': 'نیامی',
  'Aswan': 'اسوان',
  'Delhi': 'دہلی',
  'Seville': 'سیویل',
  'Athens': 'ایتھنز',
  'Beijing': 'بیجنگ',
  'Lahore': 'لاہور',
  'Hotan': 'ہوتان',
  'Peshawar': 'پشاور',
  'Dhaka': 'ڈھاکہ',
  'Jakarta': 'جکارتا',
  'Kabul': 'کابل',
  'Sarajevo': 'سراجیوو',
  'Tehran': 'تہران',
  'Ulaanbaatar': 'اولان باتور',
  'Shenyang': 'شینیانگ',
  'Wuhan': 'وہان',
  'Mumbai': 'ممبئی',
  'Kolkata': 'کولکتہ',
  'Kathmandu': 'کاٹمنڈو',
  'N\'Djamena': 'اینجامینا',
  'Ouagadougou': 'واگاڈوگو',
  'Ghaziabad': 'غازی آباد',
  'Patna': 'پٹنہ',
  'Chengdu': 'چنگدو',
  'Chittagong': 'چٹاگانگ',
  'Manama': 'منامہ',
  'Bhiwadi': 'بھیواڑی',
  'Hanoi': 'ہنوئی',
  'Shanghai': 'شنگھائی'
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  'Kuwait': 'کویت',
  'Iran': 'ایران',
  'Iraq': 'عراق',
  'Pakistan': 'پاکستان',
  'USA': 'امریکہ',
  'Saudi Arabia': 'سعودی عرب',
  'Sudan': 'سوڈان',
  'Egypt': 'مصر',
  'Mexico': 'میکسیکو',
  'Qatar': 'قطر',
  'UAE': 'متحدہ عرب امارات',
  'Mali': 'مالی',
  'Niger': 'نائجر',
  'Spain': 'اسپین',
  'Greece': 'یونان',
  'China': 'چین',
  'India': 'بھارت',
  'Bangladesh': 'بنگلہ دیش',
  'Indonesia': 'انڈونیشیا',
  'Afghanistan': 'افغانستان',
  'Bosnia and Herzegovina': 'بوسنیا اور ہرزیگوینا',
  'Mongolia': 'منگولیا',
  'Nepal': 'نیپال',
  'Chad': 'چاڈ',
  'Burkina Faso': 'برکینا فاسو',
  'Bahrain': 'بحرین',
  'Vietnam': 'ویتنام'
};

const translateCity = (name: string, lang: string) => {
  if (lang === 'ur') {
    const translation = translateLocation(name, 'ur');
    if (translation && translation !== name) return translation;
    if (CITY_NAME_MAP[name]) return CITY_NAME_MAP[name];
  }
  return name;
};

const translateCountry = (name: string, lang: string) => {
  if (lang === 'ur') {
    const translation = translateLocation(name, 'ur');
    if (translation && translation !== name) return translation;
    if (COUNTRY_NAME_MAP[name]) return COUNTRY_NAME_MAP[name];
  }
  return name;
};

const ThermalHotspots = React.memo(() => {
  const { language, t } = useLanguage();
  const { tempUnit } = useTempUnit();
  const [hotspotData, setHotspotData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const potentialHotspots = [
          { name: 'Kuwait City', country: 'Kuwait', lat: 29.37, lon: 47.97 },
          { name: 'Ahvaz', country: 'Iran', lat: 31.32, lon: 48.67 },
          { name: 'Basra', country: 'Iraq', lat: 30.51, lon: 47.78 },
          { name: 'Baghdad', country: 'Iraq', lat: 33.31, lon: 44.36 },
          { name: 'Jacobabad', country: 'Pakistan', lat: 28.28, lon: 68.43 },
          { name: 'Turbat', country: 'Pakistan', lat: 26.00, lon: 63.04 },
          { name: 'Death Valley', country: 'USA', lat: 36.46, lon: -116.87 },
          { name: 'Phoenix', country: 'USA', lat: 33.45, lon: -112.07 },
          { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.68 },
          { name: 'Mecca', country: 'Saudi Arabia', lat: 21.39, lon: 39.86 },
          { name: 'Medina', country: 'Saudi Arabia', lat: 24.47, lon: 39.61 },
          { name: 'Khartoum', country: 'Sudan', lat: 15.50, lon: 32.53 },
          { name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.23 },
          { name: 'Mexicali', country: 'Mexico', lat: 32.63, lon: -115.45 },
          { name: 'Doha', country: 'Qatar', lat: 25.28, lon: 51.53 },
          { name: 'Dubai', country: 'UAE', lat: 25.20, lon: 55.27 },
          { name: 'Karachi', country: 'Pakistan', lat: 24.86, lon: 67.00 },
          { name: 'Las Vegas', country: 'USA', lat: 36.17, lon: -115.14 },
          { name: 'Timbuktu', country: 'Mali', lat: 16.76, lon: -3.00 },
          { name: 'Niamey', country: 'Niger', lat: 13.51, lon: 2.11 },
          { name: 'Aswan', country: 'Egypt', lat: 24.09, lon: 32.89 },
          { name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
          { name: 'Seville', country: 'Spain', lat: 37.39, lon: -5.99 },
          { name: 'Athens', country: 'Greece', lat: 37.98, lon: 23.72 }
        ];

        const lats = potentialHotspots.map(h => h.lat).join(',');
        const lons = potentialHotspots.map(h => h.lon).join(',');
        
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m&daily=temperature_2m_max&timezone=auto`);
        const data = await res.json();
        
        // Open-Meteo returns an Array when multiple coordinates are requested
        const validResults = (Array.isArray(data) ? data : [data]).map((locationData, index) => {
          if (!locationData.current) return null;
          const city = potentialHotspots[index];
          return {
            city: city.name,
            country: city.country,
            temp: locationData.current.temperature_2m,
            peakTemp: locationData.daily?.temperature_2m_max ? locationData.daily.temperature_2m_max[0] : null,
          };
        }).filter((r): r is any => r !== null)
          .sort((a, b) => b.temp - a.temp)
          .slice(0, 6);

        setHotspotData(validResults);
      } catch (err) {
        console.error("Failed to fetch hotspot data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotspots();
  }, []);

  return (
    <div className="w-[calc(100%-2rem)] max-w-7xl mt-12 mx-auto">
      <div className="bg-[#000000]/60 rounded-[2rem] md:rounded-[3.5rem] py-8 md:py-16 px-4 sm:px-6 md:px-12 backdrop-blur-xl border border-[#687075]/20">
      <div className="flex flex-col items-start mb-10 w-full">
        <div className="flex items-center gap-3 mb-3">
          <FlameIcon className="w-5 h-5 text-primary-accent" />
          <span className="text-primary-accent text-[10px] font-black uppercase tracking-[0.2em]">{t('criticalHeatLabel')}</span>
        </div>
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
          {t('thermalHotspotsTitle1')} <span className="text-primary-accent italic">{t('thermalHotspotsTitle2')}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(loading ? Array(6).fill({}) : hotspotData).map((h, i) => (
          <motion.div
            key={h.city || i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="group relative"
          >
            <div className="relative bg-[#000000]/80 border border-[#687075]/20 p-8 rounded-[2.5rem] group-hover:border-primary-accent/40 transition-all flex flex-col gap-8 overflow-hidden h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-primary-accent/10 transition-colors" />
              
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                  <span className={`text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] ${loading ? 'bg-white/10 w-16 h-3 rounded animate-pulse' : ''}`}>
                    {!loading && translateCountry(h.country, language)}
                  </span>
                  <span className={`text-white text-lg font-black uppercase tracking-wider ${loading ? 'bg-white/10 w-24 h-6 rounded animate-pulse mt-1' : ''}`}>
                    {!loading && translateCity(h.city, language)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest font-sans">{t('live')}</span>
                  </div>
                  <span className={`text-white/30 text-[10px] font-bold uppercase tracking-widest ${loading ? 'bg-white/5 w-16 h-3 rounded animate-pulse mt-1' : ''}`}>
                    {!loading && h.peakTemp !== null && `${t('peak')}: ${Math.floor(formatTemp(h.peakTemp, tempUnit))}°`}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mt-auto">
                <span className={`text-6xl font-black text-white font-mono tracking-tighter ${loading ? 'bg-white/10 w-20 h-14 rounded animate-pulse' : ''}`}>
                  {!loading && `${Math.round(formatTemp(h.temp, tempUnit))}°`}
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-primary-accent uppercase leading-none font-sans tracking-wide">
                    {!loading && (language === 'ur' && getDangerLevel(h.temp).labelUrdu ? getDangerLevel(h.temp).labelUrdu : getDangerLevel(h.temp).label)}
                  </span>
                </div>
              </div>

              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: loading ? 0 : `${(h.temp/50) * 100}%` }}
                  transition={{ duration: 1.5, delay: i * 0.2 }}
                  className="bg-gradient-to-r from-orange-600 to-red-600 h-full"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
});

const DidYouKnow = React.memo(() => {
  const { t } = useLanguage();
  const [globalStats, setGlobalStats] = React.useState({ hottest: 'Loading...', currentAvg: '32.4°C' });

  React.useEffect(() => {
    // We can't easily get a true "Global Avg" but we can show some relevant surveillance-style facts
    // that sound more technical and integrated.
  }, []);

  const facts = [
    {
      title: t('fact1Title'),
      text: t('fact1Text'),
      accent: "text-orange-500",
      icon: <SparklesIcon className="w-5 h-5" />
    },
    {
      title: t('fact2Title'),
      text: t('fact2Text'),
      accent: "text-emerald-500",
      icon: <ZapIcon className="w-5 h-5" />
    },
    {
      title: t('fact3Title'),
      text: t('fact3Text'),
      accent: "text-red-500",
      icon: <ShieldAlertIcon className="w-5 h-5" />
    }
  ];

  return (
    <div className="w-[calc(100%-2rem)] max-w-7xl mt-32 mb-20 mx-auto">
      <div className="bg-[#000000]/60 rounded-[2rem] md:rounded-[3.5rem] py-8 md:py-16 px-4 sm:px-6 md:px-12 backdrop-blur-xl border border-[#687075]/20">
      <div className="flex flex-col items-start mb-14 w-full">
        <div className="flex items-center gap-3 mb-3">
          <SparklesIcon className="w-5 h-5 text-primary-accent animate-pulse" />
          <span className="text-primary-accent text-[10px] font-black uppercase tracking-[0.2em]">{t('deepFieldIntel')}</span>
        </div>
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
          {t('aetraxaProtocols1')} <span className="text-primary-accent italic">{t('aetraxaProtocols2')}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {facts.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            transition={{ delay: i * 0.15, duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="group relative"
          >
            <div className="relative p-10 bg-[#000000]/80 border border-[#687075]/20 rounded-[2.5rem] flex flex-col gap-6 group hover:border-primary-accent/40 transition-all h-full overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 ${f.accent} group-hover:bg-white/10 transition-all w-fit shadow-inner`}>
                {f.icon}
              </div>
              <div className="space-y-3">
                <h4 className="text-lg font-black uppercase tracking-tight text-white leading-tight group-hover:text-primary-accent transition-colors">{f.title}</h4>
                <p className="text-sm text-white/40 leading-relaxed font-bold tracking-wide italic">"{f.text}"</p>
              </div>
              
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{t('activeIntelligence')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary-accent animate-ping" />
                  <span className="text-[9px] font-black text-primary-accent uppercase">{t('verified')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
});

// --- Sub-Components ---

const RadialDangerGauge = ({ heatIndex, currentLevel, isHighRisk, t }: { heatIndex: number, currentLevel: any, isHighRisk: boolean, t: any }) => {
  const cx = 200;
  const cy = 200;
  
  const outerRadius = 140;
  const innerRadius = 110;
  const tickRadius = 165;
  const strokeWidth = 18;

  const minVisual = 20;
  const maxVisual = 60;
  
  // Clamped value for visual purpose
  const currentVal = Math.max(minVisual, Math.min(maxVisual, heatIndex || 0));
  const progressRatio = (currentVal - minVisual) / (maxVisual - minVisual);

  // We want to span 240 degrees. 0 = top.
  const startAngle = -120;
  const endAngle = 120;
  const totalAngle = 240;

  // Convert polar to cartesian
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    // 0 degrees is up (12 o'clock)
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x: number, y: number, radius: number, startDegree: number, endDegree: number) => {
    const start = polarToCartesian(x, y, radius, startDegree);
    const end = polarToCartesian(x, y, radius, endDegree);
    const largeArcFlag = endDegree - startDegree <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(" ");
  };

  // Generate tick marks
  const tickCount = 40;
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    const ratio = i / tickCount;
    const angle = startAngle + (ratio * totalAngle); 
    const innerPoint = polarToCartesian(cx, cy, tickRadius, angle);
    const outerPoint = polarToCartesian(cx, cy, tickRadius + (i % 5 === 0 ? 8 : 3), angle);
    
    // In the image, ticks are white/gray with low opacity.
    return (
      <line 
        key={i} 
        x1={innerPoint.x} y1={innerPoint.y} 
        x2={outerPoint.x} y2={outerPoint.y}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />
    );
  });

  // Background arcs spanning full 240 deg
  const fullOuterArc = describeArc(cx, cy, outerRadius, startAngle, endAngle);
  const fullInnerArc = describeArc(cx, cy, innerRadius, startAngle, endAngle);

  // Base needle at 0 angle (straight up)
  const needleStart = polarToCartesian(cx, cy, innerRadius - 20, 0);
  const needleEnd = polarToCartesian(cx, cy, outerRadius, 0);
  // Calculates what angle we need to rotate to
  const needleAngle = startAngle + (progressRatio * totalAngle);

  return (
    <div className={`relative flex flex-col items-center justify-center w-full pb-8`}>
      {/* Soft background glow */}
      <div className="absolute inset-x-0 bottom-12 top-1/2 flex items-center justify-center pointer-events-none">
         <div className="w-56 h-56 bg-primary-accent/20 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      <svg width="100%" height="auto" viewBox="0 0 400 290" className="overflow-visible z-10 relative" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f9e8c4" />
            <stop offset="20%" stopColor="#dc5e1e" />
            <stop offset="40%" stopColor="#a3441b" />
            <stop offset="60%" stopColor="#672412" />
            <stop offset="80%" stopColor="#40180f" />
            <stop offset="100%" stopColor="#1c100d" />
          </linearGradient>
        </defs>

        {/* Ticks */}
        <g className="transition-opacity duration-700 delay-300">
          {ticks}
        </g>
        
        {/* Background Tracks */}
        <path d={fullOuterArc} fill="none" stroke="#262220" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={fullInnerArc} fill="none" stroke="#262220" strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Progress Tracks */}
        <motion.path 
          d={fullOuterArc} 
          fill="none" 
          stroke="url(#gauge-gradient)" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progressRatio }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          filter="url(#gauge-glow)"
        />
        <motion.path 
          d={fullInnerArc} 
          fill="none" 
          stroke="url(#gauge-gradient)" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progressRatio }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center Values */}
      <div className="absolute inset-x-0 top-1/2 flex flex-col items-center justify-center transform translate-y-6 pointer-events-none z-20">
        <span className="text-6xl lg:text-7xl font-black tracking-tight text-[#f9e8c4] leading-none mb-3 drop-shadow-md">
          {heatIndex !== undefined ? Math.floor(heatIndex) : 0}°
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-[#dc5e1e]">
          {currentLevel?.label || 'MAXIMUM'}
        </span>
      </div>
    </div>
  );
};

const AqiHotspots = React.memo(() => {
  const { language, t } = useLanguage();
  const [hotspotData, setHotspotData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const potentialHotspots = [
          { name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
          { name: 'Lahore', country: 'Pakistan', lat: 31.52, lon: 74.35 },
          { name: 'Hotan', country: 'China', lat: 37.11, lon: 79.92 },
          { name: 'Peshawar', country: 'Pakistan', lat: 34.01, lon: 71.52 },
          { name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41 },
          { name: 'Baghdad', country: 'Iraq', lat: 33.31, lon: 44.36 },
          { name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.23 },
          { name: 'Jakarta', country: 'Indonesia', lat: -6.20, lon: 106.81 },
          { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.68 },
          { name: 'Kabul', country: 'Afghanistan', lat: 34.56, lon: 69.20 },
          { name: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.86, lon: 18.41 },
          { name: 'Tehran', country: 'Iran', lat: 35.69, lon: 51.39 },
          { name: 'Beijing', country: 'China', lat: 39.90, lon: 116.40 },
          { name: 'Ulaanbaatar', country: 'Mongolia', lat: 47.89, lon: 106.91 },
          { name: 'Shenyang', country: 'China', lat: 41.81, lon: 123.43 },
          { name: 'Wuhan', country: 'China', lat: 30.59, lon: 114.31 },
          { name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
          { name: 'Kolkata', country: 'India', lat: 22.57, lon: 88.36 },
          { name: 'Karachi', country: 'Pakistan', lat: 24.86, lon: 67.00 },
          { name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32 },
          { name: 'N\'Djamena', country: 'Chad', lat: 12.11, lon: 15.04 },
          { name: 'Ouagadougou', country: 'Burkina Faso', lat: 12.37, lon: -1.53 },
          { name: 'Ghaziabad', country: 'India', lat: 28.67, lon: 77.45 },
          { name: 'Patna', country: 'India', lat: 25.60, lon: 85.12 },
          { name: 'Chengdu', country: 'China', lat: 30.66, lon: 104.06 },
          { name: 'Chittagong', country: 'Bangladesh', lat: 22.36, lon: 91.78 },
          { name: 'Manama', country: 'Bahrain', lat: 26.23, lon: 50.59 },
          { name: 'Bhiwadi', country: 'India', lat: 28.21, lon: 76.87 },
          { name: 'Hanoi', country: 'Vietnam', lat: 21.03, lon: 105.85 },
          { name: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47 }
        ];

        const lats = potentialHotspots.map(h => h.lat).join(',');
        const lons = potentialHotspots.map(h => h.lon).join(',');
        
        const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi,european_aqi,pm2_5`);
        const data = await res.json();
        
        const validResults = (Array.isArray(data) ? data : [data]).map((locationData, index) => {
          if (!locationData.current) return null;
          const city = potentialHotspots[index];
          return {
            city: city.name,
            country: city.country,
            aqi: locationData.current.us_aqi !== undefined ? locationData.current.us_aqi : (locationData.current.european_aqi || 0),
            pm2_5: locationData.current.pm2_5 || 0,
          };
        }).filter((r): r is any => r !== null)
          .sort((a, b) => b.aqi - a.aqi)
          .slice(0, 6);

        setHotspotData(validResults);
      } catch (err) {
        console.error("Failed to fetch AQI hotspot data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotspots();
  }, []);

  return (
    <div className="w-[calc(100%-2rem)] max-w-7xl mt-12 mx-auto">
      <div className="bg-[#000000]/60 rounded-[2rem] md:rounded-[3.5rem] py-8 md:py-16 px-4 sm:px-6 md:px-12 backdrop-blur-xl border border-[#687075]/20">
      <div className="flex flex-col items-start mb-10 w-full text-left">
        <div className="flex items-center gap-3 mb-3">
          <WindIcon className="w-5 h-5 text-[#52b72c]" />
          <span className="text-[#52b72c] text-[10px] font-black uppercase tracking-[0.2em]">
            {language === 'ur' ? 'عالمی فضائی آلودگی اشاریہ' : 'Atmospheric Pollution Index'}
          </span>
        </div>
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
          {language === 'ur' ? (
            <span>اے کیو آئی کی <span className="text-[#52b72c] italic">سرگرم نگرانی</span></span>
          ) : (
            <span>Active AQI <span className="text-[#52b72c] italic">Surveillance</span></span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(loading ? Array(6).fill({}) : hotspotData).map((h, i) => {
          const category = !loading ? getAqiDangerLevel(h.aqi) : { label: 'Loading', labelUrdu: 'لوڈ ہو رہا ہے', color: '#52b72c' };
          return (
            <motion.div
              key={h.city || i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
              viewport={{ once: true, margin: "-50px" }}
              className="group relative"
            >
              <div 
                style={{ backgroundColor: '#020402' }}
                 className="relative bg-[#020402] border border-[#687075]/20 p-8 rounded-[2.5rem] group-hover:border-[#52b72c]/40 transition-all flex flex-col gap-8 overflow-hidden h-full min-h-[260px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#52b72c]/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-[#52b72c]/10 transition-colors" />
                
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] ${loading ? 'bg-white/10 w-16 h-3 rounded animate-pulse' : ''}`}>
                      {!loading && translateCountry(h.country, language)}
                    </span>
                    <span className={`text-white text-lg font-black uppercase tracking-wider ${loading ? 'bg-white/10 w-24 h-6 rounded animate-pulse mt-1' : ''}`}>
                      {!loading && translateCity(h.city, language)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest font-sans">
                        {language === 'ur' ? 'لائیو' : 'LIVE'}
                      </span>
                    </div>
                    <span className={`text-white/30 text-[10px] font-bold uppercase tracking-widest ${loading ? 'bg-white/5 w-16 h-3 rounded animate-pulse mt-1' : ''}`}>
                      {!loading && `PM2.5: ${Math.round(h.pm2_5)} µg/m³`}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-auto">
                  <span className={`text-6xl font-black text-white font-mono tracking-tighter ${loading ? 'bg-white/10 w-20 h-14 rounded animate-pulse' : ''}`}>
                    {!loading && `${Math.round(h.aqi)}`}
                  </span>
                  <div className="flex flex-col">
                    <span 
                      style={{ color: category.color }} 
                      className="text-[10px] font-bold uppercase leading-none font-sans tracking-wide"
                    >
                      {!loading && (language === 'ur' && category.labelUrdu ? category.labelUrdu : category.label)}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: loading ? 0 : `${Math.min(100, (h.aqi/150) * 100)}%` }}
                    transition={{ duration: 1.5, delay: i * 0.2 }}
                    style={{ backgroundColor: category.color }}
                    className="h-full"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      </div>
    </div>
  );
});

const AqiDidYouKnow = React.memo(() => {
  const { language, t } = useLanguage();

  const facts = [
    {
      title: t('aqiFact1Title'),
      text: t('aqiFact1Text'),
      accent: "text-[#52b72c]",
      icon: <WindIcon className="w-5 h-5" />
    },
    {
      title: t('aqiFact2Title'),
      text: t('aqiFact2Text'),
      accent: "text-blue-500",
      icon: <ActivityIcon className="w-5 h-5" />
    },
    {
      title: t('aqiFact3Title'),
      text: t('aqiFact3Text'),
      accent: "text-purple-500",
      icon: <ShieldAlertIcon className="w-5 h-5" />
    }
  ];

  return (
    <div className="w-[calc(100%-2rem)] max-w-7xl mt-32 mb-20 mx-auto">
      <div className="bg-[#000000]/60 rounded-[2rem] md:rounded-[3.5rem] py-8 md:py-16 px-4 sm:px-6 md:px-12 backdrop-blur-xl border border-[#687075]/20">
      <div className="flex flex-col items-start mb-14 w-full">
        <div className="flex items-center gap-3 mb-3">
          <SparklesIcon className="w-5 h-5 text-[#52b72c] animate-pulse" />
          <span className="text-[#52b72c] text-[10px] font-black uppercase tracking-[0.2em]">{t('atmosphereIntelBriefing')}</span>
        </div>
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
          {language === 'ur' ? (
            <span>{t('didYouKnow')}</span>
          ) : (
            <span>Did You <span className="text-[#52b72c] italic">Know?</span></span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {facts.map((fact, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            transition={{ delay: i * 0.15, duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            style={{ backgroundColor: '#020402' }}
            className="group relative p-10 bg-[#020402] border border-[#687075]/20 rounded-[2.5rem] flex flex-col gap-6 hover:border-[#52b72c]/40 transition-all h-full overflow-hidden cursor-pointer before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-transparent before:via-[#52b72c]/30 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 before:pointer-events-none"
          >
            <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 ${fact.accent} group-hover:bg-white/10 transition-all w-fit shadow-inner`}>
              {fact.icon}
            </div>
            <h4 className="text-lg font-black uppercase tracking-tight text-white leading-tight group-hover:text-[#52b72c] transition-colors">
              {fact.title}
            </h4>
            <p className="text-sm text-white/40 leading-relaxed font-bold tracking-wide italic">
              "{fact.text}"
            </p>
            <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {t('atmosphereIntel')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#52b72c] animate-pulse" />
                <span className="text-[9px] font-black text-[#52b72c] uppercase pb-[1px]">
                  {t('verified')}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
});

function LandingPage({ 
  onStart, 
  selectedCountry, 
  setSelectedCountry, 
  selectedCity, 
  setSelectedCity,
  setSelectedCityData,
  onSearch,
  loading,
  dynamicCities,
  setDynamicCities,
  handleCitySearch,
  onLocateMe,
  isLocating,
  activeTool,
  setActiveTool,
  setCurrentPage
}: { 
  onStart: () => void,
  selectedCountry: string,
  setSelectedCountry: (val: string) => void,
  selectedCity: string,
  setSelectedCity: (val: string) => void,
  setSelectedCityData: (val: any) => void,
  onSearch: (e?: React.FormEvent) => void,
  loading: boolean,
  dynamicCities: any[],
  setDynamicCities: (val: any[]) => void,
  handleCitySearch: (query: string) => void,
  onLocateMe: () => void,
  isLocating: boolean,
  activeTool: 'thermal' | 'aqi' | null,
  setActiveTool: (val: 'thermal' | 'aqi' | null) => void,
  setCurrentPage?: (page: Page) => void
}) {
  const { language, t } = useLanguage();
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const dropdownOpen = countryOpen || cityOpen;

  const handleToolSelect = (tool: 'thermal' | 'aqi') => {
    setActiveTool(tool);
  };

  return (
    <AnimatePresence mode="wait">
      {activeTool === null && (
        <motion.div
          key="selection"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full bg-transparent z-10 flex flex-col items-center"
        >
        {/* Neutral Scroll frames (Land-scroll) - moved to global root */}
        
        <div className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-24">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.05 }
              }
            }}
            className="w-[calc(100%-2rem)] max-w-7xl mx-auto flex flex-col items-center bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-8 md:p-12 lg:p-16 shadow-[0_30px_100px_rgba(5,5,7,0.8)]"
          >
            <motion.div 
              variants={{ 
                hidden: { y: 15, opacity: 0 }, 
                visible: { 
                  y: 0, 
                  opacity: 1, 
                  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } 
                } 
              }}
              className="text-center mb-8 sm:mb-12 w-full"
            >
              <h1 
                className="font-display font-black tracking-tight text-[#f2f6f9] mb-6 overflow-hidden text-[clamp(32px,8vw,75px)] leading-[1.1]"
              >
                <motion.span 
                  variants={{ hidden: { y: "45%", opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
                  className="inline-block text-[#687075] mr-3"
                >
                  {t('choose')}
                </motion.span>
                <motion.span 
                  variants={{ hidden: { y: "45%", opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
                  className="inline-block text-[#687075] mr-3"
                >
                  {t('your')}
                </motion.span>
                <br className="hidden md:inline"/>
                <motion.span 
                  variants={{ hidden: { y: "65%", opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 } } }}
                  className="inline-block text-[#f2f6f9]"
                >
                  {t('intelligenceTool')}
                </motion.span>
              </h1>
              <motion.div 
                variants={{ hidden: { width: 0 }, visible: { width: 96, transition: { duration: 0.7, ease: "easeOut" } } }}
                className="h-1 bg-[#687075]/30 mx-auto rounded-full" 
              />
            </motion.div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              {/* Thermal Tool Card */}
              <motion.div
                variants={{ 
                  hidden: { y: 25, opacity: 0, scale: 0.98 }, 
                  visible: { 
                    y: 0, 
                    opacity: 1, 
                    scale: 1,
                    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } 
                  } 
                }}
                whileHover={{ 
                  scale: 1.025, 
                  y: -6,
                  boxShadow: "0 30px 60px -15px rgba(221, 97, 31, 0.3)",
                  borderColor: "rgba(221, 97, 31, 0.5)"
                }}
                className="group relative flex flex-col bg-[#050507]/40 hover:bg-[#050507]/85 border border-[#687075]/25 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 transition-all duration-500 overflow-hidden text-left rtl:text-right cursor-pointer"
                onClick={() => handleToolSelect('thermal')}
              >
                <div className="absolute top-0 ltr:right-0 rtl:left-0 ltr:left-auto rtl:right-auto p-8 opacity-10 group-hover:opacity-20 group-hover:scale-105 transition-all duration-500">
                  <SunIcon className="w-32 h-32 text-[#f2f6f9] group-hover:text-[#dd611f] transition-colors duration-500" />
                </div>
                
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#f2f6f9]/5 group-hover:bg-[#dd611f]/10 flex items-center justify-center border border-[#687075]/30 group-hover:border-[#dd611f] mb-5 sm:mb-8 relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 self-start">
                  <SunIcon className="w-6 h-6 sm:w-8 sm:h-8 text-[#f2f6f9] group-hover:text-[#dd611f] transition-all duration-500" />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-[#f2f6f9] uppercase tracking-tight mb-3 md:mb-4 relative z-10 group-hover:text-[#dd611f] transition-colors duration-300">
                  {t('thermalHazard')}
                </h2>
                
                <p className="text-[#687075] font-medium leading-relaxed mb-6 md:mb-10 flex-grow relative z-10 text-sm sm:text-base lg:text-lg max-w-[90%] group-hover:text-[#f2f6f9]/80 transition-colors duration-300">
                  {t('thermalHazardDesc')}
                </p>
                
                <button 
                  className="mt-auto inline-flex items-center justify-between px-8 py-4 rounded-full bg-[#f2f6f9]/5 hover:bg-[#dd611f] group-hover:bg-[#dd611f] text-[#f2f6f9] font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(221,97,31,0.6)] group-hover:shadow-[0_0_30px_rgba(221,97,31,0.6)] relative z-10 w-full cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleToolSelect('thermal'); }}
                >
                  <span>{t('initializeTool')}</span>
                  <ArrowRightIcon className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform duration-300" />
                </button>
              </motion.div>

              {/* AQI Tool Card */}
              <motion.div
                variants={{ 
                  hidden: { y: 25, opacity: 0, scale: 0.98 }, 
                  visible: { 
                    y: 0, 
                    opacity: 1, 
                    scale: 1,
                    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 } 
                  } 
                }}
                whileHover={{ 
                  scale: 1.025, 
                  y: -6,
                  boxShadow: "0 30px 60px -15px rgba(82, 183, 44, 0.3)",
                  borderColor: "rgba(82, 183, 44, 0.5)"
                }}
                className="group relative flex flex-col bg-[#050507]/40 hover:bg-[#050507]/85 border border-[#687075]/25 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 transition-all duration-500 overflow-hidden text-left rtl:text-right cursor-pointer"
                onClick={() => handleToolSelect('aqi')}
              >
                <div className="absolute top-0 ltr:right-0 rtl:left-0 ltr:left-auto rtl:right-auto p-8 opacity-10 group-hover:opacity-20 group-hover:scale-105 transition-all duration-500">
                  <WindIcon className="w-32 h-32 text-[#f2f6f9] group-hover:text-[#52b72c] transition-colors duration-500" />
                </div>
                
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#f2f6f9]/5 group-hover:bg-[#0b150b] flex items-center justify-center border border-[#687075]/30 group-hover:border-[#52b72c] mb-5 sm:mb-8 relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12 self-start">
                  <WindIcon className="w-6 h-6 sm:w-8 sm:h-8 text-[#f2f6f9] group-hover:text-[#52b72c] transition-all duration-500" />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-[#f2f6f9] uppercase tracking-tight mb-3 md:mb-4 relative z-10 group-hover:text-[#52b72c] transition-colors duration-300">
                  {t('airQuality')}
                </h2>
                
                <p className="text-[#687075] font-medium leading-relaxed mb-6 md:mb-10 flex-grow relative z-10 text-sm sm:text-base lg:text-lg max-w-[90%] group-hover:text-[#f2f6f9]/80 transition-colors duration-300">
                  {t('airQualityDesc')}
                </p>
                
                <button 
                  className="mt-auto inline-flex items-center justify-between px-8 py-4 rounded-full bg-[#f2f6f9]/5 hover:bg-[#52b72c] group-hover:bg-[#52b72c] text-[#f2f6f9] font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(82,183,44,0.6)] group-hover:shadow-[0_0_30px_rgba(82,183,44,0.6)] relative z-10 w-full cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleToolSelect('aqi'); }}
                >
                  <span>{t('initializeTool')}</span>
                  <ArrowRightIcon className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform duration-300" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Platform Capabilities Bento Grid */}
        <div className="relative w-full pb-24 px-4 sm:px-6 flex flex-col items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { 
                opacity: 1, 
                y: 0, 
                transition: { 
                  type: "spring", 
                  stiffness: 60, 
                  damping: 15, 
                  staggerChildren: 0.1 
                } 
              }
            }}
            className="w-[calc(100%-2rem)] max-w-7xl mx-auto flex flex-col items-center p-6 sm:p-8 md:p-12 lg:p-16 bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_30px_100px_rgba(5,5,7,0.8)] pb-10 sm:pb-16"
          >
            <div className="text-center mb-12 w-full animate-fade-in">
              <h2 
                className="font-display font-black tracking-tight text-[#f2f6f9] uppercase mb-4 text-[clamp(22px,5vw,35px)]"
              >
                {language === 'ur' ? (
                  <>
                    پلیٹ فارم کی <span className="text-[#687075]">خصوصیات</span>
                  </>
                ) : (
                  <>
                    Platform <span className="text-[#687075]">Capabilities</span>
                  </>
                )}
              </h2>
              <p className="text-[#687075] text-sm max-w-xl mx-auto uppercase tracking-widest font-bold">
                {t('platformCapabilitiesDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full">
              {/* Card 1: Static AI Briefings */}
              <motion.div 
                variants={{ 
                  hidden: { opacity: 0, y: 25, scale: 0.98 }, 
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1, 
                    transition: { type: "spring", stiffness: 80, damping: 14 } 
                  } 
                }}
                whileHover={{ 
                  scale: 1.015,
                  y: -5,
                  borderColor: "rgba(104, 112, 117, 0.45)",
                  boxShadow: "0 25px 50px -15px rgba(242, 246, 249, 0.05)"
                }}
                className="md:col-span-2 relative flex flex-col text-left rtl:text-right bg-[#050507]/40 border border-[#687075]/10 hover:border-[#687075]/30 hover:bg-[#050507]/60 transition-all duration-500 rounded-3xl p-8 overflow-hidden group shadow-lg"
              >
                <div className="absolute top-0 ltr:right-0 rtl:left-0 ltr:left-auto rtl:right-auto p-6 opacity-10 group-hover:scale-105 group-hover:opacity-15 transition-all duration-500">
                  <CpuIcon className="w-48 h-48 text-[#687075]" />
                </div>
                <div className="w-12 h-12 bg-[#f2f6f9]/5 rounded-2xl flex items-center justify-center border border-[#687075]/20 mb-6 group-hover:scale-105 transition-transform duration-300 self-start">
                  <CpuIcon className="w-6 h-6 text-[#f2f6f9]" />
                </div>
                <h3 className="text-xl font-black text-[#f2f6f9] uppercase tracking-wider mb-3 group-hover:text-primary-accent transition-colors duration-300 font-display">{t('aiTacticalBriefing')}</h3>
                <p className="text-[#687075] font-medium leading-relaxed max-w-md group-hover:text-[#f2f6f9]/80 transition-colors duration-300">
                  {t('aiTacticalBriefingDesc')}
                </p>
              </motion.div>

              {/* Card 2: Global Scope */}
              <motion.div 
                variants={{ 
                  hidden: { opacity: 0, y: 25, scale: 0.98 }, 
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1, 
                    transition: { type: "spring", stiffness: 80, damping: 14 } 
                  } 
                }}
                whileHover={{ 
                  scale: 1.015,
                  y: -5,
                  borderColor: "rgba(104, 112, 117, 0.45)",
                  boxShadow: "0 25px 50px -15px rgba(242, 246, 249, 0.05)"
                }}
                className="md:col-span-1 relative flex flex-col text-left rtl:text-right bg-[#050507]/40 border border-[#687075]/10 hover:border-[#687075]/30 hover:bg-[#050507]/60 transition-all duration-500 rounded-3xl p-8 overflow-hidden group shadow-lg"
              >
                <div className="absolute top-0 ltr:right-0 rtl:left-0 ltr:left-auto rtl:right-auto p-6 opacity-10 group-hover:scale-105 group-hover:opacity-15 transition-all duration-500">
                  <GlobeIcon className="w-32 h-32 text-[#687075]" />
                </div>
                <div className="w-12 h-12 bg-[#f2f6f9]/5 rounded-2xl flex items-center justify-center border border-[#687075]/20 mb-6 group-hover:scale-105 transition-transform duration-300 self-start">
                  <GlobeIcon className="w-6 h-6 text-[#f2f6f9]" />
                </div>
                <h3 className="text-xl font-black text-[#f2f6f9] uppercase tracking-wider mb-3 group-hover:text-primary-accent transition-colors duration-300 font-display">{t('globalTracking')}</h3>
                <p className="text-[#687075] font-medium leading-relaxed group-hover:text-[#f2f6f9]/80 transition-colors duration-300">
                  {t('globalTrackingDesc')}
                </p>
              </motion.div>

              {/* Card 3: Advanced Telemetry */}
              <motion.div 
                variants={{ 
                  hidden: { opacity: 0, y: 25, scale: 0.98 }, 
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1, 
                    transition: { type: "spring", stiffness: 80, damping: 14 } 
                  } 
                }}
                whileHover={{ 
                  scale: 1.015,
                  y: -5,
                  borderColor: "rgba(104, 112, 117, 0.45)",
                  boxShadow: "0 25px 50px -15px rgba(242, 246, 249, 0.05)"
                }}
                className="md:col-span-1 relative flex flex-col text-left rtl:text-right bg-[#050507]/40 border border-[#687075]/10 hover:border-[#687075]/30 hover:bg-[#050507]/60 transition-all duration-500 rounded-3xl p-8 overflow-hidden group shadow-lg"
              >
                <div className="absolute bottom-0 ltr:right-0 rtl:left-0 ltr:left-auto rtl:right-auto p-4 opacity-10 group-hover:scale-105 group-hover:opacity-15 transition-all duration-500">
                  <RadarIcon className="w-32 h-32 text-[#687075]" />
                </div>
                <div className="w-12 h-12 bg-[#f2f6f9]/5 rounded-2xl flex items-center justify-center border border-[#687075]/20 mb-6 group-hover:scale-105 transition-transform duration-300 self-start">
                  <RadarIcon className="w-6 h-6 text-[#f2f6f9]" />
                </div>
                <h3 className="text-xl font-black text-[#f2f6f9] uppercase tracking-wider mb-3 group-hover:text-primary-accent transition-colors duration-300 font-display">{t('advancedTelemetry')}</h3>
                <p className="text-[#687075] font-medium leading-relaxed group-hover:text-[#f2f6f9]/80 transition-colors duration-300">
                  {t('advancedTelemetryDesc')}
                </p>
              </motion.div>

              {/* Card 4: Protection Protocols */}
              <motion.div 
                variants={{ 
                  hidden: { opacity: 0, y: 25, scale: 0.98 }, 
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1, 
                    transition: { type: "spring", stiffness: 80, damping: 14 } 
                  } 
                }}
                whileHover={{ 
                  scale: 1.015,
                  y: -5,
                  borderColor: "rgba(104, 112, 117, 0.45)",
                  boxShadow: "0 25px 50px -15px rgba(242, 246, 249, 0.05)"
                }}
                className="md:col-span-2 relative flex flex-col text-left rtl:text-right bg-[#050507]/40 border border-[#687075]/10 hover:border-[#687075]/30 hover:bg-[#050507]/60 transition-all duration-500 rounded-3xl p-8 overflow-hidden group shadow-lg"
              >
                <div className="absolute top-0 ltr:right-0 rtl:left-0 ltr:left-auto rtl:right-auto p-6 opacity-10 group-hover:scale-105 group-hover:opacity-15 transition-all duration-500">
                  <ShieldIcon className="w-48 h-48 text-[#687075]" />
                </div>
                <div className="w-12 h-12 bg-[#f2f6f9]/5 rounded-2xl flex items-center justify-center border border-[#687075]/20 mb-6 group-hover:scale-105 transition-transform duration-300 self-start">
                  <ShieldIcon className="w-6 h-6 text-[#f2f6f9]" />
                </div>
                <h3 className="text-xl font-black text-[#f2f6f9] uppercase tracking-wider mb-3 group-hover:text-primary-accent transition-colors duration-300 font-display">{t('protectionProtocols')}</h3>
                <p className="text-[#687075] font-medium leading-relaxed max-w-md group-hover:text-[#f2f6f9]/80 transition-colors duration-300">
                  {t('protectionProtocolsDesc')}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
        </motion.div>
      )}

      {activeTool === 'thermal' && (
        <motion.div
          key="thermal"
          initial="hidden"
          animate="visible"
          variants={cardStaggerVariants}
          className={`relative w-full bg-transparent flex flex-col items-center transition-all duration-200 ${dropdownOpen ? 'z-50' : 'z-10'}`}
        >
        {/* 240 scroll frames specifically for thermal - moved to global root */}
        
        {/* Hero content for Thermal landing page styled within a single unified card */}
        <div className={`relative w-full min-h-screen flex flex-col items-center justify-start md:justify-center pt-24 pb-16 md:py-24 px-4 sm:px-6 gap-12 transition-all duration-200 ${dropdownOpen ? 'z-50' : 'z-10'}`}>
          <motion.div 
            variants={heroCardStaggerVariants}
            className={`thermal-hero-card w-[calc(100%-2rem)] max-w-7xl mx-auto flex flex-col items-center bg-[#000000]/60 backdrop-blur-xl border border-[#687075]/20 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-8 md:p-12 lg:p-16 relative transition-all duration-200 ${dropdownOpen ? 'z-50' : 'z-10'}`}
          >
            {/* System Active Badge */}
            <motion.div 
              variants={cardItemVariants}
              className="thermal-active-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-accent/30 bg-black/40 text-primary-accent text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-8 select-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-accent animate-pulse" />
              {t('systemActive')}
            </motion.div>

            {/* Heading */}
            <motion.h1 
              variants={cardItemVariants}
              className="thermal-hero-title font-display font-black leading-[1.02] tracking-tight text-[#fff2d0] mb-8 uppercase text-center max-w-5xl select-none text-[clamp(36px,9vw,115px)]"
              style={{ paddingBottom: '20px' }}
            >
              {language === 'en' ? (
                <>
                  IS IT <span className="text-primary-accent font-display">SAFE</span>
                  <span className="block mt-2 sm:mt-3"><span className="text-primary-accent font-display">OUTSIDE</span> TODAY?</span>
                </>
              ) : (
                <>
                  {t('planetary')} <span className="text-primary-accent font-display">{t('surveillance')}</span>
                </>
              )}
            </motion.h1>

            {/* Line Divider */}
            <motion.div 
              variants={cardItemVariants}
              className="w-24 h-[1px] bg-primary-accent/40 mb-10" 
              style={{ borderWidth: '1px', borderColor: '#dd611f', borderStyle: 'solid' }}
            />

            {/* Description */}
            <motion.p 
              variants={cardItemVariants}
              className="thermal-hero-desc text-[#fff2d0]/80 text-xs sm:text-sm md:text-base max-w-2xl mx-auto uppercase tracking-wide font-bold leading-normal text-center mb-12"
            >
              {t('landingDesc')}
            </motion.p>

            {/* Dynamic Search & Location Control */}
            <motion.div 
              variants={cardItemVariants}
              className="w-full flex flex-col gap-6 max-w-4xl"
            >
              {/* Mobile stacked layout, desktop pill row */}
              <div className={`thermal-search-bar w-full border border-primary-accent/20 bg-black/60 backdrop-blur-xl transition-all duration-200 ${dropdownOpen ? 'z-[2010] shadow-[0_0_50px_rgba(221,97,31,0.2)]' : 'z-[140]'}
                flex flex-col sm:flex-row items-stretch sm:items-center rounded-3xl sm:rounded-full
                gap-2 p-3 sm:p-0 sm:h-14 md:h-16 sm:pl-4 sm:pr-2 sm:gap-2 relative`}>
                <div className="flex flex-row items-center gap-2 sm:contents">
                  <div className="flex-1 min-w-0">
                    <SearchableDropdown 
                      options={COUNTRIES.map(c => c.name)}
                      value={selectedCountry}
                      onChange={(val) => {
                        setSelectedCountry(val);
                        setSelectedCity('');
                        setSelectedCityData(null);
                      }}
                      placeholder={t('country')}
                      variant="borderless"
                      onOpenChange={setCountryOpen}
                    />
                  </div>
                  
                  <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
                  
                  <div className="flex-1 min-w-0">
                    <SearchableDropdown 
                      options={dynamicCities}
                      value={selectedCity}
                      onChange={setSelectedCity}
                      onOptionSelect={setSelectedCityData}
                      placeholder={t('city')}
                      disabled={false}
                      onSearchQueryChange={handleCitySearch}
                      variant="borderless"
                      onOpenChange={setCityOpen}
                    />
                  </div>
                  
                  <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
                  
                  <motion.button
                    onClick={onLocateMe}
                    whileHover={{ scale: 1.05, color: '#d6501f' }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLocating}
                    className="p-2 text-[#687075] disabled:opacity-30 flex-shrink-0 cursor-pointer transition-colors focus:outline-none"
                    title="Locate me"
                  >
                    <NavigationIcon className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
                
                <motion.button 
                  whileHover={(!selectedCity || loading) ? undefined : { scale: 1.02 }}
                  whileTap={(!selectedCity || loading) ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    if (selectedCity) {
                       onStart();
                    }
                  }}
                  disabled={!selectedCity || loading}
                  className={`whitespace-nowrap px-6 h-12 sm:h-10 md:h-12 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center w-full sm:w-auto flex-shrink-0 ${
                    !selectedCity || loading
                      ? 'bg-transparent text-[#687075]/40 border border-[#687075]/15 cursor-not-allowed opacity-50' 
                      : 'bg-primary-accent text-black hover:bg-primary-accent/90 shadow-[0_0_15px_rgba(214,80,31,0.25)] border-none cursor-pointer'
                  }`}
                >
                  {loading ? t('analyzing') : t('analyzeHeat')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Render deeper intelligence subcomponents */}
        <motion.div variants={cardItemVariants} className="w-full flex flex-col items-center">
          <ThermalHotspots />
        </motion.div>
        <motion.div variants={cardItemVariants} className="w-full flex flex-col items-center">
          <DidYouKnow />
        </motion.div>
        </motion.div>
      )}

      {activeTool === 'aqi' && (
        <motion.div
          key="aqi"
          initial="hidden"
          animate="visible"
          variants={cardStaggerVariants}
          className={`relative w-full bg-transparent flex flex-col items-center transition-all duration-200 ${dropdownOpen ? 'z-50' : 'z-10'}`}
        >
        {/* Ambient background for AQI (155 frames) - moved to global root */}
        
        {/* Hero content for AQI landing page styled within a single unified card */}
        <div className={`relative w-full min-h-screen flex flex-col items-center justify-start md:justify-center pt-24 pb-16 md:py-24 px-4 sm:px-6 gap-12 transition-all duration-200 ${dropdownOpen ? 'z-50' : 'z-10'}`}>
          <motion.div 
            variants={heroCardStaggerVariants}
            className={`w-[calc(100%-2rem)] max-w-7xl mx-auto flex flex-col items-center bg-[#000000]/60 backdrop-blur-xl border border-[#687075]/20 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-8 md:p-12 lg:p-16 relative transition-all duration-200 ${dropdownOpen ? 'z-50' : 'z-10'}`}
          >
            {/* System Active Badge */}
            <motion.div 
              variants={cardItemVariants}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#52b72c]/30 bg-black/40 text-[#52b72c] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-8 select-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#52b72c] animate-pulse" />
              Air Quality Nodes Active
            </motion.div>

            {/* Heading */}
            <motion.h1 
              variants={cardItemVariants}
              className="font-display font-black leading-[1.02] tracking-tight text-[#fff2d0] mb-8 uppercase text-center max-w-5xl select-none text-[clamp(36px,9vw,115px)]"
            >
              {language === 'en' ? (
                <>
                  IS THE <span className="text-[#52b72c] font-display">AIR</span>
                  <span className="block mt-2 sm:mt-3"><span className="text-[#52b72c] font-display">SAFE</span> TODAY?</span>
                </>
              ) : (
                <>
                  کیا آج <span className="text-[#52b72c] font-display">ہوا صاف</span> ہے؟
                </>
              )}
            </motion.h1>

            {/* Line Divider */}
            <motion.div 
              variants={cardItemVariants}
              className="w-24 h-[1px] bg-[#52b72c]/40 mb-10" 
            />

            {/* Description */}
            <motion.p 
              variants={cardItemVariants}
              className="text-[#fff2d0]/80 text-xs sm:text-sm md:text-base max-w-2xl mx-auto uppercase tracking-wide font-bold leading-normal text-center mb-12"
            >
              {t('landingDescription')}
            </motion.p>

            {/* Dynamic Search & Location Control */}
            <motion.div 
              variants={cardItemVariants}
              className="w-full flex flex-col gap-6 max-w-4xl"
            >
              {/* Mobile stacked layout, desktop pill row */}
              <div className={`w-full border border-[#52b72c]/20 bg-[#020402]/75 backdrop-blur-xl transition-all duration-200 ${dropdownOpen ? 'z-[2010] shadow-[0_0_50px_rgba(82,183,44,0.2)]' : 'z-[140]'}
                flex flex-col sm:flex-row items-stretch sm:items-center rounded-3xl sm:rounded-full
                gap-2 p-3 sm:p-0 sm:h-14 md:h-16 sm:pl-4 sm:pr-2 sm:gap-2 relative`}>
                <div className="flex flex-row items-center gap-2 sm:contents">
                  <div className="flex-1 min-w-0">
                    <SearchableDropdown 
                      options={COUNTRIES.map(c => c.name)}
                      value={selectedCountry}
                      onChange={(val) => {
                        setSelectedCountry(val);
                        setSelectedCity('');
                        setSelectedCityData(null);
                      }}
                      placeholder={t('country')}
                      variant="borderless"
                      onOpenChange={setCountryOpen}
                      theme="aqi"
                    />
                  </div>
                  
                  <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
                  
                  <div className="flex-1 min-w-0">
                    <SearchableDropdown 
                      options={dynamicCities}
                      value={selectedCity}
                      onChange={setSelectedCity}
                      onOptionSelect={setSelectedCityData}
                      placeholder={t('city')}
                      disabled={false}
                      onSearchQueryChange={handleCitySearch}
                      variant="borderless"
                      onOpenChange={setCityOpen}
                      theme="aqi"
                    />
                  </div>
                  
                  <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
                  
                  <motion.button
                    onClick={onLocateMe}
                    whileHover={{ scale: 1.05, color: '#52b72c' }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLocating}
                    className="p-2 text-[#687075] disabled:opacity-30 flex-shrink-0 cursor-pointer transition-colors focus:outline-none"
                    title="Locate me"
                  >
                    <NavigationIcon className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
                
                <motion.button 
                  whileHover={!selectedCity || loading ? {} : { scale: 1.02 }}
                  whileTap={!selectedCity || loading ? {} : { scale: 0.98 }}
                  onClick={() => {
                    if (selectedCity) {
                       onStart();
                    }
                  }}
                  disabled={!selectedCity || loading}
                  className={`whitespace-nowrap px-6 h-12 sm:h-10 md:h-12 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center w-full sm:w-auto flex-shrink-0 ${
                    !selectedCity || loading
                      ? 'bg-transparent text-[#687075]/40 border border-[#687075]/15 cursor-not-allowed opacity-50' 
                      : 'bg-[#52b72c] text-black hover:bg-[#52b72c]/90 shadow-[0_0_15px_rgba(82,183,44,0.25)] border-none cursor-pointer'
                  }`}
                >
                  {loading ? t('analyzing') : t('analyzeAir')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Render AQI surveillance metrics and brief */}
        <motion.div variants={cardItemVariants} className="w-full flex flex-col items-center">
          <AqiHotspots />
        </motion.div>
        <motion.div variants={cardItemVariants} className="w-full flex flex-col items-center">
          <AqiDidYouKnow />
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const AppFooterMainLanding = React.memo(() => {
  const { t } = useLanguage();
  return (
    <footer id="footer-main-landing" className="relative z-30 w-full border-t border-[#687075]/20 bg-[#070709] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#f2f6f9' }} className="w-8 h-8" aria-hidden="true" />
            <span style={{ color: '#f2f6f9' }} className="text-sm font-black uppercase tracking-[0.4em] aetraxa-logo">AETRAXA</span>
          </div>
          <p style={{ color: '#f2f6f9' }} className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium">
            {t('footerText')}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div style={{ color: '#f2f6f9' }} className="px-5 py-2 rounded-full border border-[#687075]/20 bg-[#050507]/40 backdrop-blur-md flex items-center gap-2">
            <span style={{ color: '#f2f6f9', backgroundColor: '#f2f6f9' }} className="w-1.5 h-1.5 rounded-full animate-pulse"></span>
            <span style={{ color: '#f2f6f9' }} className="text-[10px] font-black uppercase tracking-[0.2em]">{t('freeForever')}</span>
          </div>
          <p style={{ color: '#f2f6f9', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              style={{ color: '#f2f6f9', fontWeight: 'bold' }}
              className="hover:text-[#fff2d0]/85 underline decoration-[#687075]/30 hover:decoration-[#f2f6f9]/50 transition-all focus:outline-none focus:ring-1 focus:ring-[#687075] rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooterThermalLanding = React.memo(() => {
  const { t, language } = useLanguage();
  return (
    <footer id="footer-thermal-landing" className="relative z-30 w-full border-t border-[#687075]/25 bg-[#090705] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#f97316' }} className="w-8 h-8" aria-hidden="true" />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-[#ffddc0] aetraxa-logo">
              AETRAXA
            </span>
          </div>
          <p className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium text-[#ffdcb2]/80">
            {t('footerText')} - {language === 'ur' ? 'تھرمل پروٹیکشن یونٹ' : 'Thermal Protection Unit'}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div className="px-5 py-2 rounded-full border border-[#f97316]/20 bg-[#090705]/50 backdrop-blur-md flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316]">
              {language === 'ur' ? 'تھرمل سیکیورٹی' : 'THERMAL SECURE'}
            </span>
          </div>
          <p style={{ color: '#fff2d0', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              style={{ color: '#fff2d0', fontWeight: 'bold' }}
              className="hover:text-[#fff2d0]/85 underline decoration-[#687075]/30 hover:decoration-[#f2f6f9]/50 transition-all focus:outline-none focus:ring-1 focus:ring-[#687075] rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooterThermalApp = React.memo(() => {
  const { t, language } = useLanguage();
  return (
    <footer id="footer-thermal-app" className="relative z-30 w-full border-t border-[#687075]/20 bg-[#08080a] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#dd611f' }} className="w-8 h-8" aria-hidden="true" />
            <span style={{ color: '#fff2d0' }} className="text-sm font-black uppercase tracking-[0.4em] aetraxa-logo">
              AETRAXA
            </span>
          </div>
          <p style={{ color: '#fff2d0' }} className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium opacity-80">
            {t('footerText')}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div style={{ color: '#dd611f' }} className="px-5 py-2 rounded-full border border-[#687075]/10 bg-[#050507]/60 backdrop-blur-md flex items-center gap-2">
            <span style={{ backgroundColor: '#dd611f' }} className="w-1.5 h-1.5 rounded-full animate-pulse"></span>
            <span style={{ color: '#dd611f' }} className="text-[10px] font-black uppercase tracking-[0.2em]">
              {language === 'ur' ? 'تجزیاتی انجن' : 'ANALYTICS ENGINE'}
            </span>
          </div>
          <p style={{ color: '#fff2d0', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest opacity-80">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              className="hover:text-[#fff2d0]/85 underline transition-all focus:outline-none rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooterApiLanding = React.memo(() => {
  const { t } = useLanguage();
  return (
    <footer id="footer-api-landing" className="relative z-30 w-full border-t border-[#687075]/20 bg-[#070907] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#22c55e' }} className="w-8 h-8" aria-hidden="true" />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-[#daffd0] aetraxa-logo">AETRAXA</span>
          </div>
          <p className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium text-[#daffd0]/80">
            {t('footerText')} - {t('environmentalMonitoringNode')}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div className="px-5 py-2 rounded-full border border-[#22c55e]/20 bg-[#070907]/50 backdrop-blur-md flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#22c55e]">{t('airMetricsPlatform')}</span>
          </div>
          <p style={{ color: '#fff2d0', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              style={{ color: '#fff2d0', fontWeight: 'bold' }}
              className="hover:text-[#fff2d0]/85 underline decoration-[#687075]/30 hover:decoration-[#f2f6f9]/50 transition-all focus:outline-none focus:ring-1 focus:ring-[#687075] rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooterApiApp = React.memo(() => {
  const { t, language } = useLanguage();
  return (
    <footer id="footer-api-app" className="relative z-30 w-full border-t border-[#687075]/20 bg-[#050709] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#dd611f' }} className="w-8 h-8" aria-hidden="true" />
            <span style={{ color: '#fff2d0' }} className="text-sm font-black uppercase tracking-[0.4em] aetraxa-logo">
              AETRAXA
            </span>
          </div>
          <p style={{ color: '#fff2d0' }} className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium">
            {t('footerText')}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div style={{ color: '#dd611f' }} className="px-5 py-2 rounded-full border border-[#687075]/20 bg-[#050507]/40 backdrop-blur-md flex items-center gap-2">
            <span style={{ backgroundColor: '#dd611f' }} className="w-1.5 h-1.5 rounded-full animate-pulse"></span>
            <span style={{ color: '#dd611f' }} className="text-[10px] font-black uppercase tracking-[0.2em]">
              {language === 'ur' ? 'فضائی معیار کا پروٹوکول' : 'AIR QUALITY PROTOCOL'}
            </span>
          </div>
          <p style={{ color: '#fff2d0', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest opacity-90">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              className="hover:text-[#fff2d0]/85 underline transition-all focus:outline-none rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooterAbout = React.memo(() => {
  const { t, language } = useLanguage();
  return (
    <footer id="footer-about" className="relative z-30 w-full border-t border-[#687075]/20 bg-[#070709] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#f2f6f9' }} className="w-8 h-8" aria-hidden="true" />
            <span style={{ color: '#f2f6f9' }} className="text-sm font-black uppercase tracking-[0.4em] aetraxa-logo">
              AETRAXA
            </span>
          </div>
          <p style={{ color: '#f2f6f9' }} className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium opacity-80">
            {language === 'ur' 
              ? 'ہمارا مقصد، عالمی پیرامیٹرز اور ٹیم کا جائزہ دریافت کریں۔' 
              : 'Discover our story, mission, global parameters & team overview.'}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div style={{ color: '#f2f6f9' }} className="px-5 py-2 rounded-full border border-[#687075]/20 bg-[#050507]/40 backdrop-blur-md flex items-center gap-2">
            <span style={{ color: '#f2f6f9', backgroundColor: '#f2f6f9' }} className="w-1.5 h-1.5 rounded-full animate-pulse"></span>
            <span style={{ color: '#f2f6f9' }} className="text-[10px] font-black uppercase tracking-[0.2em]">
              {language === 'ur' ? 'معلوماتی پورٹل' : 'INFORMATION PORTAL'}
            </span>
          </div>
          <p style={{ color: '#f2f6f9', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest text-[#f2f6f9]/70">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              style={{ color: '#f2f6f9', fontWeight: 'bold' }}
              className="hover:text-[#fff2d0]/85 underline decoration-[#687075]/30 hover:decoration-[#f2f6f9]/50 transition-all focus:outline-none focus:ring-1 focus:ring-[#687075] rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooterSettings = React.memo(() => {
  const { t, language } = useLanguage();
  return (
    <footer id="footer-settings" className="relative z-30 w-full border-t border-[#687075]/20 bg-[#07070a] backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-3">
            <AetraxaLogo style={{ color: '#f2f6f9' }} className="w-8 h-8" aria-hidden="true" />
            <span style={{ color: '#f2f6f9' }} className="text-sm font-black uppercase tracking-[0.4em] aetraxa-logo">
              AETRAXA
            </span>
          </div>
          <p style={{ color: '#f2f6f9' }} className="text-xs tracking-wider leading-relaxed text-center md:text-left max-w-sm font-medium text-[#f2f6f9]/70">
            {language === 'ur' 
              ? 'اپنے ماحول کے خطرات کے احساس کو اپنی ضروریات اور ترتیبات کے مطابق ڈھالیں۔' 
              : 'Calibrate your systemic metrics, exposure profiles, language, and vulnerabilities.'}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div style={{ color: '#f2f6f9' }} className="px-5 py-2 rounded-full border border-[#687075]/20 bg-[#050507]/40 backdrop-blur-md flex items-center gap-2">
            <span style={{ backgroundColor: '#f2f6f9' }} className="w-1.5 h-1.5 rounded-full"></span>
            <span style={{ color: '#f2f6f9' }} className="text-[10px] font-black uppercase tracking-[0.2em]">
              {language === 'ur' ? 'ترتیبات مرکز' : 'CALIBRATION CONTROL'}
            </span>
          </div>
          <p style={{ color: '#f2f6f9', fontWeight: 'normal' }} className="text-[10px] uppercase tracking-widest text-[#f2f6f9]/70">
            {t('dataProvidedBy')}{' '}
            <a 
              href="https://open-meteo.com/" 
              target="_blank"  
              rel="noreferrer" 
              style={{ color: '#f2f6f9', fontWeight: 'bold' }}
              className="hover:text-[#f2f6f9]/85 underline decoration-[#687075]/30 hover:decoration-[#f2f6f9]/50 transition-all focus:outline-none focus:ring-1 focus:ring-[#687075] rounded px-1"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const AppFooter = React.memo(({ currentPage, activeTool }: { currentPage?: Page, activeTool?: 'thermal' | 'aqi' | null }) => {
  if (currentPage === Page.Landing) {
    if (activeTool === 'thermal') {
      return <AppFooterThermalLanding />;
    } else if (activeTool === 'aqi') {
      return <AppFooterApiLanding />;
    } else {
      return <AppFooterMainLanding />;
    }
  } else if (currentPage === Page.Main) {
    if (activeTool === 'thermal') {
      return <AppFooterThermalApp />;
    } else if (activeTool === 'aqi') {
      return <AppFooterApiApp />;
    }
  } else if (currentPage === Page.About) {
    return <AppFooterAbout />;
  } else if (currentPage === Page.Settings) {
    return <AppFooterSettings />;
  }

  return <AppFooterMainLanding />;
});

const cardStaggerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.02 }
  }
};

const cardItemVariants: any = {
  hidden: { y: 15, opacity: 0, scale: 0.98 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } 
  }
};

const heroCardStaggerVariants: any = {
  hidden: { y: 15, opacity: 0, scale: 0.98 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.06,
      delayChildren: 0.1
    } 
  }
};

const MainAppPage = React.memo(({ 
  weather,
  aqi,
  activeTool,
  aiInsights,
  aiLoading,
  onSearch, 
  loading, 
  error,
  handleShare,
  selectedCountry,
  setSelectedCountry,
  selectedCity,
  setSelectedCity,
  setSelectedCityData,
  dynamicCities,
  setDynamicCities,
  handleCitySearch,
  onLocateMe,
  isLocating,
  onOpenAssistant,
  lastAnalysisTime
}: any) => {
  const currentLevel = activeTool === 'aqi' 
    ? (aqi ? getAqiDangerLevel(aqi.current.aqi) : null) 
    : (weather ? getDangerLevel(weather.current.heatIndex) : null);
    
  const isHighRisk = activeTool === 'aqi' 
    ? (aqi && aqi.current.aqi >= 151) 
    : (weather && weather.current.heatIndex >= 32);
  const { tempUnit, setTempUnit } = useTempUnit();
  const tempUnitStr = tempUnit === 'celsius' ? '°C' : '°F';
  const { language, t } = useLanguage();

  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [cityOpen, setCityOpen] = React.useState(false);
  const dropdownOpen = countryOpen || cityOpen;

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = 60000 - (now - lastAnalysisTime);
      setCooldownRemaining(Math.max(0, Math.ceil(diff / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastAnalysisTime]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-20 flex flex-col gap-10">
      {activeTool === 'thermal' ? (
        <section className={`thermal-search-bar w-full border border-primary-accent/20 bg-black/60 backdrop-blur-xl rounded-[2rem] xl:rounded-full p-4 pl-8 xl:pl-16 pr-6 flex flex-col xl:flex-row items-center justify-between gap-6 relative transition-all duration-200 ${dropdownOpen ? 'z-[2010] shadow-[0_0_50px_rgba(221,97,31,0.2)]' : 'z-[140]'}`}>
          <div className="flex-grow flex flex-col min-w-0 pr-4 w-full xl:w-auto">
             <h2 className={`text-2xl md:text-3xl font-black uppercase text-white truncate text-center xl:text-left py-1 ${language === 'ur' ? 'tracking-normal leading-normal' : 'tracking-tight'}`}>
               {translateCity(weather?.city, language) || t('selectLocation')}
             </h2>
             <p className="text-[10px] text-[#dd611f] font-black uppercase tracking-[0.4em] mt-1 text-center xl:text-left">
               {weather ? `${translateCountry(selectedCountry || weather.country, language) || 'Global'} • ${t('globalPosition' as any)}` : t('initialScan' as any)}
             </p>
          </div>

          <div className="flex flex-col xl:flex-row items-center gap-4 w-full xl:w-auto xl:ml-auto">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <div className="w-full sm:w-[180px]">
                <SearchableDropdown 
                  options={COUNTRIES.map(c => c.name)}
                  value={selectedCountry}
                  onChange={(val) => {
                    setSelectedCountry(val);
                    setSelectedCity('');
                    setSelectedCityData(null);
                  }}
                  placeholder={t('country')}
                  variant="borderless"
                  onOpenChange={setCountryOpen}
                />
              </div>
              
              <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
              
              <div className="w-full sm:w-[240px] flex items-center gap-1 min-w-0 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <SearchableDropdown 
                    options={dynamicCities}
                    value={selectedCity}
                    onChange={setSelectedCity}
                    onOptionSelect={setSelectedCityData}
                    placeholder={t('city')}
                    disabled={false}
                    onSearchQueryChange={handleCitySearch}
                    variant="borderless"
                    onOpenChange={setCityOpen}
                  />
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
                
                <motion.button
                  onClick={onLocateMe}
                  whileHover={{ scale: 1.05, color: '#d6501f' }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLocating}
                  className="p-2 text-[#687075] disabled:opacity-30 flex-shrink-0 cursor-pointer transition-colors focus:outline-none"
                  title="Locate me"
                >
                  <NavigationIcon className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <div className="relative flex items-center p-1 bg-white/5 rounded-full border border-white/10 gap-0.5 h-[48px] px-2 flex-shrink-0">
                <button 
                  onClick={() => setTempUnit('celsius')}
                  className={`relative flex items-center justify-center text-[10px] sm:text-xs font-black transition-colors rounded-full w-12 h-full text-center focus:outline-none select-none ${tempUnit === 'celsius' ? 'text-white' : 'text-white/40 hover:text-white/85'}`}
                >
                  {tempUnit === 'celsius' && (
                    <motion.div 
                      layoutId="activeTempThermalApp"
                      className="absolute inset-0 bg-[#dd611f] rounded-full z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10 leading-none">°C</span>
                </button>
                <button 
                  onClick={() => setTempUnit('fahrenheit')}
                  className={`relative flex items-center justify-center text-[10px] sm:text-xs font-black transition-colors rounded-full w-12 h-full text-center focus:outline-none select-none ${tempUnit === 'fahrenheit' ? 'text-white' : 'text-white/40 hover:text-white/85'}`}
                >
                  {tempUnit === 'fahrenheit' && (
                    <motion.div 
                      layoutId="activeTempThermalApp"
                      className="absolute inset-0 bg-[#dd611f] rounded-full z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10 leading-none">°F</span>
                </button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectedCity && onSearch({ preventDefault: () => {} } as any)}
                disabled={!selectedCity || loading || cooldownRemaining > 0}
                style={{
                  backgroundColor: '#dd611f',
                  color: '#0f0c0a',
                  fontSize: '13px',
                  ...(!selectedCity || loading || cooldownRemaining > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                }}
                className={`whitespace-nowrap h-[48px] px-10 rounded-full font-bold uppercase tracking-wider transition-all duration-200 ${
                  !selectedCity || loading || cooldownRemaining > 0
                    ? 'border border-white/5 text-sm' 
                    : 'shadow-[0_0_15px_rgba(221,97,31,0.25)] border-none'
                }`}
              >
                {loading ? t('analyzing') : cooldownRemaining > 0 ? `${t('analyzeHeat')} (${cooldownRemaining}s)` : t('analyzeHeat')}
              </motion.button>
            </div>
          </div>
        </section>
      ) : (
        <section className={`w-full border border-[#52b72c]/25 bg-[#020402]/75 backdrop-blur-xl rounded-[2rem] xl:rounded-full p-4 pl-8 xl:pl-16 pr-6 flex flex-col xl:flex-row items-center justify-between gap-6 relative transition-all duration-200 ${dropdownOpen ? 'z-[2010] shadow-[0_0_50px_rgba(82,183,44,0.25)]' : 'z-[140]'}`}>
          <div className="flex-grow flex flex-col min-w-0 pr-4 w-full xl:w-auto">
             <h2 className={`text-2xl md:text-3xl font-black uppercase text-white truncate text-center xl:text-left py-1 ${language === 'ur' ? 'tracking-normal leading-normal' : 'tracking-tight'}`}>
                {translateCity(aqi?.city, language) || t('selectLocation')}
              </h2>
              <p className="text-[10px] text-[#52b72c] font-black uppercase tracking-[0.4em] mt-1 text-center xl:text-left">
                {aqi ? `${translateCountry(selectedCountry || aqi.country, language) || 'Global'} • Node Telemetry` : t('initialScan' as any)}
              </p>
          </div>

          <div className="flex flex-col xl:flex-row items-center gap-4 w-full xl:w-auto xl:ml-auto">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <div className="w-full sm:w-[180px]">
                <SearchableDropdown 
                  options={COUNTRIES.map(c => c.name)}
                  value={selectedCountry}
                  onChange={(val) => {
                    setSelectedCountry(val);
                    setSelectedCity('');
                    setSelectedCityData(null);
                  }}
                  placeholder={t('country')}
                  variant="borderless"
                  onOpenChange={setCountryOpen}
                  theme="aqi"
                />
              </div>
              
              <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
              
              <div className="w-full sm:w-[240px] flex items-center gap-1 min-w-0 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <SearchableDropdown 
                    options={dynamicCities}
                    value={selectedCity}
                    onChange={setSelectedCity}
                    onOptionSelect={setSelectedCityData}
                    placeholder={t('city')}
                    disabled={false}
                    onSearchQueryChange={handleCitySearch}
                    variant="borderless"
                    onOpenChange={setCityOpen}
                    theme="aqi"
                  />
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#687075] flex-shrink-0 hidden sm:block" />
                
                <motion.button
                  onClick={onLocateMe}
                  whileHover={{ scale: 1.05, color: '#52b72c' }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLocating}
                  className="p-2 text-[#687075] disabled:opacity-30 flex-shrink-0 cursor-pointer transition-colors focus:outline-none"
                  title="Locate me"
                >
                  <NavigationIcon className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectedCity && onSearch({ preventDefault: () => {} } as any)}
                disabled={!selectedCity || loading || cooldownRemaining > 0}
                style={{
                  backgroundColor: '#52b72c',
                  color: '#020402',
                  ...(!selectedCity || loading || cooldownRemaining > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                }}
                className={`whitespace-nowrap h-[48px] px-10 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-200 ${
                  !selectedCity || loading || cooldownRemaining > 0
                    ? 'border border-white/5' 
                    : 'shadow-[0_0_15px_rgba(82,183,44,0.25)] border-none'
                }`}
              >
                {loading ? t('analyzing') : cooldownRemaining > 0 ? `${t('analyzeAir')} (${cooldownRemaining}s)` : t('analyzeAir')}
              </motion.button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
      {!(activeTool === 'aqi' ? aqi : weather) ? (
        <motion.div 
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="flex-grow flex flex-col items-center justify-center py-16 sm:py-24 md:py-32 gap-8 bg-[#020402]/75 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 aqi-empty-state-container"
        >
          <div className="relative">
            <div className={`absolute inset-0 blur-3xl rounded-full ${activeTool === 'aqi' ? 'bg-[#52b72c]/20' : 'bg-primary-accent/20'}`} />
            <div className={`relative p-10 rounded-full bg-[#000000] border ${activeTool === 'aqi' ? 'border-[#52b72c]/30' : 'border-primary-accent/30'}`}>
               {activeTool === 'aqi' ? <WindIcon className="w-16 h-16 text-[#52b72c]" /> : <SunIcon className="w-16 h-16 text-primary-accent" />}
            </div>
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-xl font-black uppercase tracking-[0.5em] text-white">{activeTool === 'aqi' ? 'Air Quality Module' : t('atmosphericIntelligence')}</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
              Scan initialized. Please select coordinates above to begin {activeTool === 'aqi' ? 'air quality reading.' : 'heatwave analysis.'}
            </p>
          </div>
        </motion.div>
      ) : activeTool === 'thermal' && weather ? (
        <motion.div 
          key="data"
          initial="hidden"
          animate="visible"
          variants={cardStaggerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Hero Section: Gauge and Primary Metrics */}
          <motion.section 
            variants={cardItemVariants}
            className="lg:col-span-12 xl:col-span-8 bg-[#000000]/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-8 md:p-12 relative overflow-hidden flex flex-col items-center"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-accent/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
            
            <div className="w-full flex justify-between items-start mb-8 sm:mb-12 relative z-10">
               <div className="flex items-center gap-4 bg-primary-accent/10 border border-primary-accent/20 px-4 py-2 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-primary-accent animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-accent">{t('liveAtmosphere' as any)}</span>
               </div>
               
               <div className="flex items-center gap-3">
                 <motion.button 
                   whileHover={{ scale: 1.1 }} 
                   whileTap={{ scale: 0.9 }} 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleShare();
                   }} 
                   className="p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer relative z-20"
                 >
                   <ShareIcon className="w-5 h-5 pointer-events-none" />
                 </motion.button>
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8 md:gap-12">
              <div className="flex flex-col items-center md:items-start gap-6 md:gap-8 flex-1 w-full">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">{t('heatIndexLabel')}</span>
                  <div className="flex items-baseline gap-2 justify-center md:justify-start">
                    <span className="text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tighter leading-none">
                      {Math.floor(formatTemp(weather.current.heatIndex, tempUnit))}°
                    </span>
                  </div>
                </div>

                <div className="flex gap-8 sm:gap-12 justify-center md:justify-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">{t('temperatureLabel')}</span>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white/60 tracking-tight">
                      {formatTemp(weather.current.temp, tempUnit).toFixed(1)}<span className="text-base sm:text-xl text-white/30">{tempUnitStr}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">{t('statusLabel' as any)}</span>
                    <p className="text-base sm:text-xl font-black uppercase tracking-widest" style={{ color: currentLevel?.color }}>
                      {t(`status${currentLevel?.label}` as any) || currentLevel?.label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative flex-shrink-0 w-full max-w-[280px] sm:max-w-[360px] md:max-w-[400px] mx-auto md:mx-0">
                <RadialDangerGauge 
                  heatIndex={weather.current.heatIndex} 
                  currentLevel={currentLevel} 
                  isHighRisk={isHighRisk} 
                  t={t} 
                />
              </div>
            </div>
          </motion.section>

          <motion.section 
            variants={cardItemVariants}
            className="lg:col-span-12 xl:col-span-4 flex flex-col gap-8"
          >
            <div className="bg-[#000000]/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-6 md:p-8 flex flex-col gap-6 sm:gap-8 flex-grow shadow-2xl relative overflow-hidden group">
              {/* Tactical Grid Backdrop */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                   style={{ backgroundImage: `radial-gradient(var(--color-primary-light) 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-accent/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
              
              {/* AI Hub Header */}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary-accent/20 blur-xl rounded-full" />
                    <div className="relative p-3 rounded-2xl bg-primary-accent/10 border border-primary-accent/20">
                      <SparklesIcon className={`w-5 h-5 text-primary-accent ${aiLoading ? 'animate-spin-slow' : ''}`} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-primary-light leading-tight">
                      {language === 'ur' ? 'ٹیکٹیکل انٹیلی جنس مرکز' : 'Tactical Intelligence Hub'}
                    </h3>
                  </div>
                </div>
                
                {/* Tech Accents */}
                <div className="hidden sm:flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-[1px] h-3 bg-primary-light/10 h-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>

              {/* Summary Section */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-primary-accent/50 via-primary-accent/10 to-transparent" />
                {aiLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-4/6 animate-pulse" />
                  </div>
                ) : (
                  <div className="text-[16px] text-primary-light/80 font-medium leading-relaxed italic">
                    <div className="text-[9px] font-black text-primary-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                       <span className="w-5 h-[1.5px] bg-primary-accent/60" />
                       Situation Briefing
                    </div>
                    <Markdown>{aiInsights?.summary || "Analyzing current operational environment..."}</Markdown>
                  </div>
                )}
              </div>

              {/* Data Windows */}
              <div className="grid grid-cols-1 gap-6">
                {weather.windows?.optimal && (
                  <div className="relative group/win">
                    <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 transition-all group-hover/win:bg-emerald-500/10 group-hover/win:border-emerald-500/30" />
                    <div className="relative p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-1 block">{t('optimalWindow')}</span>
                        <span className="text-xl font-black text-emerald-500 tracking-tighter">{weather.windows.optimal}</span>
                      </div>
                      <div className="w-12 h-12 rounded-full border border-emerald-500/20 flex items-center justify-center">
                         <div className="w-6 h-6 rounded-full border-2 border-emerald-500/40 border-t-emerald-500 animate-spin-slow" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <div className="text-[9px] font-black text-primary-light/30 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                     <span className="w-4 h-[1px] bg-primary-light/10" />
                     Tactical Recommendations
                  </div>
                  {aiLoading || !aiInsights?.suggestions || aiInsights.suggestions.length === 0 ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-primary-accent shadow-[0_0_8px_rgba(214,80,31,0.6)] animate-ping" />
                      <p className="text-xs font-black tracking-[0.2em] text-primary-light/50 uppercase">
                        {language === 'ur' ? 'تجزیہ کیا جا رہا ہے...' : 'Synthesizing tactical recommendations...'}
                      </p>
                    </div>
                  ) : (
                    aiInsights.suggestions.slice(0, 3).map((s: string, i: number) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ x: 5 }}
                        className="flex gap-4 items-start group/item relative p-2 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all"
                      >
                        <div className="mt-1.5 flex flex-col items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary-accent shadow-[0_0_8px_rgba(214,80,31,0.6)]" />
                           <div className="w-[1px] h-3 bg-primary-accent/20 group-last:hidden" />
                        </div>
                        <p className="text-[15px] text-primary-light/80 leading-relaxed font-semibold transition-colors">{s}</p>
                      </motion.div>
                    ))
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: '#ff703a', boxShadow: '0 0 40px rgba(221,97,31,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenAssistant}
                  style={{ backgroundColor: '#dd611f' }}
                  className="mt-4 w-full h-[56px] rounded-full text-primary-dark flex items-center justify-center gap-3 group/btn transition-all duration-300 shadow-[0_0_20px_rgba(221,97,31,0.3)] border-none relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <SparklesIcon className="w-5 h-5 text-primary-dark group-hover:rotate-12 transition-transform" />
                  <span className="text-[12px] font-black uppercase tracking-[0.3em]">{t('requestIntelBriefing')}</span>
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Metrics row */}
          <motion.div 
            variants={cardItemVariants}
            className="col-span-1 lg:col-span-12 xl:col-span-12 bg-[#000000]/60 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-8 md:p-12 shadow-[0_0_40px_rgba(0,0,0,0.3)]"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-16 relative z-10">
              <MetricCard 
                icon={<DropletsIcon className="w-5 h-5" />} 
                label={t('moisture')} 
                value={`${weather.current.humidity}%`} 
                description={aiInsights?.humidity || getHumidityStatus(weather.current.humidity)}
                loading={aiLoading}
              />
              <MetricCard 
                icon={<SunIcon className="w-5 h-5" />} 
                label={t('uvIntensity')} 
                value={`${weather.current.uvIndex}`} 
                description={aiInsights?.uv || getUVStatus(weather.current.uvIndex)}
                loading={aiLoading}
              />
              <MetricCard 
                icon={<WindIcon className="w-5 h-5" />} 
                label={t('windVelocity')} 
                value={weather.current.windGusts ? `${Math.round(weather.current.windSpeed)} km/h (Gusts: ${Math.round(weather.current.windGusts)} km/h)` : `${Math.round(weather.current.windSpeed)} km/h`} 
                description={aiInsights?.wind || getWindStatus(weather.current.windSpeed, weather.current.windGusts, weather.current.humidity)}
                loading={aiLoading}
              />
            </div>
          </motion.div>
          
          <motion.div 
            variants={cardItemVariants}
            className="col-span-1 lg:col-span-12 xl:col-span-12 bg-[#000000]/80 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-8 md:p-12 h-[320px] sm:h-[400px] md:h-[450px] flex flex-col"
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8 flex-shrink-0">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <ActivityIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              </div>
              <h3 style={{ textAlign: 'left', fontSize: '14px', fontStyle: 'normal' }} className="uppercase tracking-[0.3em] sm:tracking-[0.4em] font-normal text-[#fff2d0]">{t('thermalTrajectory')}</h3>
            </div>
            <div className="flex-grow min-h-0 w-full">
               <ForecastChart data={weather.hourly} unit={tempUnit} />
            </div>
          </motion.div>

        </motion.div>
      ) : activeTool === 'aqi' && aqi ? (
        <motion.div 
          key="aqi-data"
          initial="hidden"
          animate="visible"
          variants={cardStaggerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Hero Section: AQI Metrics & Gauge */}
          <motion.section 
            variants={cardItemVariants}
            className="lg:col-span-12 xl:col-span-8 bg-[#000000]/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-8 md:p-12 relative overflow-hidden flex flex-col items-center"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#52b72c]/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
            
            <div className="w-full flex justify-between items-start mb-8 sm:mb-12 relative z-10">
               <div className="flex items-center gap-4 bg-[#52b72c]/10 border border-[#52b72c]/20 px-4 py-2 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-[#52b72c] animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#52b72c]">Atmospheric Surveillance</span>
               </div>
               
               <div className="flex items-center gap-3">
                 <motion.button 
                   whileHover={{ scale: 1.1 }} 
                   whileTap={{ scale: 0.9 }} 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleShare();
                   }} 
                   className="p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer relative z-20"
                 >
                   <ShareIcon className="w-5 h-5 pointer-events-none" />
                 </motion.button>
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8 md:gap-12 relative z-10 flex-grow">
              <div className="flex flex-col items-center md:items-start gap-6 md:gap-8 flex-1 w-full text-center md:text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Air Quality Index</span>
                  <div className="flex items-baseline gap-2 justify-center md:justify-start">
                    <span className="text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tighter leading-none">
                      {aqi.current.aqi}
                    </span>
                  </div>
                </div>

                <div className="flex gap-8 sm:gap-12 flex-wrap justify-center md:justify-start font-sans">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">PM2.5 / PM10 Level</span>
                    <p className="text-xl sm:text-2xl font-black text-white/60 tracking-tight">
                      {aqi.current.pm2_5} <span className="text-xs sm:text-sm text-white/35">/ {aqi.current.pm10} μg/m³</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Node Status</span>
                    <p className="text-base sm:text-xl font-black uppercase tracking-widest" style={{ color: getAqiDangerLevel(aqi.current.aqi).color }}>
                      {getAqiDangerLevel(aqi.current.aqi).label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative flex-shrink-0 w-full max-w-[280px] sm:max-w-[360px] md:max-w-[400px] mx-auto md:mx-0">
                <RadialAqiGauge 
                  aqiValue={aqi.current.aqi} 
                  currentLevel={getAqiDangerLevel(aqi.current.aqi)} 
                />
              </div>
            </div>
          </motion.section>
          
          {/* Briefing Section */}
          <motion.div 
            variants={cardItemVariants}
            className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6"
          >
            <div className="bg-[#000000]/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-6 md:p-8 flex flex-col gap-6 sm:gap-8 flex-grow shadow-2xl relative overflow-hidden group">
              {/* Tactical Grid Backdrop */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(#52b72c 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#52b72c]/5 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
              
              {/* AI Hub Header style matching Thermal completely */}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#52b72c]/20 blur-xl rounded-full" />
                    <div className="relative p-3 rounded-2xl bg-[#52b72c]/10 border border-[#52b72c]/20">
                      <SparklesIcon className={`w-5 h-5 text-[#52b72c] ${aiLoading ? 'animate-spin-slow' : ''}`} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white leading-tight text-left">
                      {language === 'ur' ? 'ٹیکٹیکل ایٹموسفیرک بریفنگ' : 'Atmospheric Briefing Hub'}
                    </h3>
                  </div>
                </div>
                
                {/* Tech Accents in Green */}
                <div className="hidden sm:flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-[1px] h-3 bg-[#52b72c]/10 h-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>

              {/* Summary Section matching Thermal layout */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-[#52b72c]/50 via-[#52b72c]/10 to-transparent" />
                {aiLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-4/6 animate-pulse" />
                  </div>
                ) : (
                  <div className="text-[16px] text-white/80 font-medium leading-relaxed italic text-left">
                    <div className="text-[9px] font-black text-[#52b72c] uppercase tracking-widest mb-3 flex items-center gap-2">
                       <span className="w-5 h-[1.5px] bg-[#52b72c]/60" />
                       Situation Briefing
                    </div>
                    <div className="text-left font-medium">
                      <Markdown>{aiInsights?.summary || "Analyzing current air quality environment..."}</Markdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                 <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-white/10" />
                    Protective Measures
                 </div>
                 {aiLoading || !aiInsights?.suggestions || aiInsights.suggestions.length === 0 ? (
                   <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 animate-pulse">
                     <div className="w-2 h-2 rounded-full bg-[#52b72c] shadow-[0_0_8px_rgba(82,183,44,0.6)] animate-ping" />
                     <p className="text-xs font-black tracking-[0.2em] text-white/50 uppercase text-left">
                       {language === 'ur' ? 'تجزیہ کیا جا رہا ہے...' : 'Synthesizing protective measures...'}
                     </p>
                   </div>
                 ) : (
                   aiInsights.suggestions.slice(0, 3).map((s: string, i: number) => (
                     <motion.div 
                       key={i} 
                       whileHover={{ x: 5 }}
                       className="flex gap-4 items-start group/item relative p-2 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all text-left"
                     >
                       <div className="mt-1.5 flex flex-col items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#52b72c] shadow-[0_0_8px_rgba(82,183,44,0.6)]" />
                          <div className="w-[1px] h-3 bg-[#52b72c]/20 group-last:hidden" />
                       </div>
                       <p className="text-[15px] text-white/80 leading-relaxed font-semibold transition-colors text-left">{s}</p>
                     </motion.div>
                   ))
                 )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: '#6ae23f', boxShadow: '0 0 40px rgba(82,183,44,0.5)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenAssistant}
                style={{ backgroundColor: '#52b72c' }}
                className="mt-4 w-full h-[56px] rounded-full text-black flex items-center justify-center gap-3 group/btn transition-all duration-300 shadow-[0_0_20px_rgba(82,183,44,0.3)] border-none relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <SparklesIcon className="w-5 h-5 text-black group-hover:rotate-12 transition-transform" />
                <span className="text-[12px] font-black uppercase tracking-[0.3em]">{t('requestIntelBriefing')}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Detailed Six-Pollutant Breakdown */}
          <motion.div 
            className="col-span-1 lg:col-span-12 xl:col-span-12"
            variants={cardItemVariants}
          >
            <DetailedPollutantsBreakdown 
              aqiData={aqi} 
              loading={aiLoading} 
              language={language}
            />
          </motion.div>

          {/* Trajectory Chart Row */}
          <motion.div 
            variants={cardItemVariants}
            className="col-span-1 lg:col-span-12 xl:col-span-12 bg-[#000000]/80 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-8 md:p-12 h-[320px] sm:h-[400px] md:h-[450px] flex flex-col"
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8 flex-shrink-0">
               <div className="p-2.5 sm:p-3 rounded-2xl bg-[#52b72c]/10 border border-[#52b72c]/20">
                 <ActivityIcon className="w-5 h-5 text-[#52b72c]" />
               </div>
               <h3 style={{ textAlign: 'left', fontSize: '14px', fontStyle: 'normal' }} className="uppercase tracking-[0.3em] sm:tracking-[0.4em] font-normal text-[#fff2d0]">Atmospheric Trajectory</h3>
            </div>
            <div className="flex-grow min-h-0 w-full">
               <AqiForecastChart data={aqi.hourly} />
            </div>
          </motion.div>

        </motion.div>
      ) : null}
    </AnimatePresence>
    </div>
  );
});const MetricCard = React.memo(({ icon, label, value, description, loading }: { icon: React.ReactNode, label: string, value: string, description?: string, loading?: boolean }) => {
  const renderValue = () => {
    if (typeof value === 'string' && value.includes('(')) {
      const parts = value.split('(');
      const main = parts[0].trim();
      const sub = parts[1] ? `(${parts[1]}` : '';
      return (
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <span className="text-xl sm:text-2xl md:text-3xl font-black text-[#fff2d0] leading-none tracking-tight">{main}</span>
          {sub && <span className="text-[10px] sm:text-xs font-bold text-orange-400 uppercase tracking-wider mt-1">{sub}</span>}
        </div>
      );
    }
    return <h4 className="text-xl sm:text-4xl font-black text-[#fff2d0] mb-1 truncate tracking-tight">{value}</h4>;
  };

  return (
    <div className="bg-black/60 backdrop-blur-xl rounded-[2.5rem] p-5 sm:p-8 border border-[#687075]/20 hover:border-orange-500/35 transition-all group flex flex-col gap-3 sm:gap-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-center justify-between">
        <div style={{ color: '#dd611f' }} className="p-3 rounded-2xl bg-white/5 transition-colors">
          {icon}
        </div>
        <span style={{ fontSize: '13px', fontStyle: 'normal' }} className="font-bold uppercase tracking-[0.2em] text-stone-400 group-hover:text-stone-300 transition-colors">{label}</span>
      </div>
      
      <div className="mt-2 sm:mt-4">
        {renderValue()}
        {loading ? (
          <div className="h-1.5 bg-white/5 rounded-full w-24 animate-pulse mt-2" />
        ) : (
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1.5">{description}</p>
        )}
      </div>
    </div>
  );
});


const Tip = React.memo(({ title, body, icon }: { title: string, body: string, icon: React.ReactNode }) => {
  return (
    <div className="p-8 bg-black/60 border border-[#687075]/20 rounded-[2.5rem] flex items-start gap-6 hover:border-orange-500/15 transition-all duration-700 backdrop-blur-xl">
      <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner" aria-hidden="true">
        {icon}
      </div>
      <div className="space-y-3">
        <h5 className="font-black text-xs uppercase tracking-[0.3em] text-[#fff2d0] underline decoration-orange-500/20 underline-offset-8 decoration-2">{title}</h5>
        <p className="text-sm text-stone-400 leading-relaxed font-medium">{body}</p>
      </div>
    </div>
  );
});

const AqiReportCard = React.forwardRef<HTMLDivElement, { aqi: any }>(({ aqi }, ref) => {
  const { language } = useLanguage();
  const isUr = language === 'ur';
  const dangerLevel = getAqiDangerLevel(aqi.current.aqi);
  
  const getSafetyAdvice = (level: string, isUrLanguage: boolean) => {
    if (isUrLanguage) {
      switch (level) {
        case 'Good': return "فضائی حالات انتہائی سازگار ہیں۔ باہر کے اچھے ماحول سے لطف اندوز ہوں!";
        case 'Moderate': return "ہوا کا معیار قابل قبول ہے۔ لیکن انتہائی حساس افراد کو اپنی علامات کی نگرانی کرنی چاہیے۔";
        case 'Unhealthy for Sensitive Groups': return "حساس افراد کو باہر کا سخت کام محدود کرنا چاہیے۔";
        case 'Unhealthy': return "صحت کے مسائل کا آغاز ہو سکتا ہے۔ باہر کی سرگرمیاں کم سے کم کریں۔";
        case 'Very Unhealthy': return "صحت کی ایمرجنسی وارننگ۔ طویلی یا سخت بیرونی سرگرمی سے مکمل پرہیز کریں۔";
        case 'Hazardous': return "ایمرجنسی اور تشویشناک حالات۔ تمام آبادی کے لیے سنگین ترین خطرات۔";
        default: return "فضائی کوالٹی مانیٹر کریں۔";
      }
    } else {
      switch (level) {
        case 'Good': return "Conditions are ideal for outdoor activities. Enjoy the fresh air!";
        case 'Moderate': return "Air quality is acceptable. Unusually sensitive individuals should monitor symptoms.";
        case 'Unhealthy for Sensitive Groups': return "Sensitive groups should reduce heavy outdoor exertion.";
        case 'Unhealthy': return "Everyone may begin to experience health effects. Limit heavy outdoor activity.";
        case 'Very Unhealthy': return "Health alert. Avoid prolonged or heavy exertion outdoors.";
        case 'Hazardous': return "Emergency conditions. Entire population is highly likely to be affected.";
        default: return "Monitor local standard atmosphere advisories.";
      }
    }
  };

  return (
    <div 
      ref={ref}
      style={{ width: '600px', height: '800px' }}
      className="bg-[#020402] p-12 flex flex-col justify-between relative overflow-hidden font-sans border-4 border-[#52b72c]/10"
    >
      {/* Background Grid & Accents */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-[#52b72c]/10 to-transparent blur-[120px] rounded-full -mt-40" />
      <div className="absolute bottom-0 left-0 w-3/4 h-[300px] bg-[#52b72c]/5 blur-[100px] rounded-full -mb-20" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <AetraxaLogo size={40} className="w-10 h-10 text-[#52b72c]" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase tracking-[0.5em] text-white aetraxa-logo-large">AETRAXA</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#52b72c]/60">
                {isUr ? 'فضائی مانیٹرنگ سسٹم' : 'Atmospheric Monitoring System'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Telemetry ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-[#52b72c]/80">
            {isUr ? 'مقام کا انتخاب' : 'Vector Location'}
          </p>
          <h2 className={`font-black tracking-tighter text-white uppercase leading-none break-words ${
            aqi.city.length > 20 ? 'text-3xl' : 
            aqi.city.length > 15 ? 'text-4xl' : 
            aqi.city.length > 10 ? 'text-5xl' : 
            'text-6xl'
          }`}>{translateCity(aqi.city, language)}</h2>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              {isUr ? 'ایئر کوالٹی انڈیکس' : 'Air Quality Index'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-8xl font-black tracking-tighter text-white">{aqi.current.aqi}</span>
              <span className="text-2xl font-black text-[#52b72c]">AQI</span>
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: dangerLevel.color }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">
                {isUr ? 'خطرے کا درجہ' : 'Category'}
              </p>
              <p className="text-xl font-black uppercase tracking-tight leading-6" style={{ color: dangerLevel.color }}>
                {isUr && dangerLevel.labelUrdu ? dangerLevel.labelUrdu : dangerLevel.label}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">PM2.5</p>
            <p className="text-base font-black text-white">{aqi.current.pm2_5} <span className="text-[9px] text-white/40">µg/³</span></p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">PM10</p>
            <p className="text-base font-black text-white">{aqi.current.pm10} <span className="text-[9px] text-white/40">µg/³</span></p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{isUr ? 'اوزون' : 'Ozone'}</p>
            <p className="text-base font-black text-white">{Math.round(aqi.current.ozone)} <span className="text-[9px] text-white/40">µg/³</span></p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">NO₂</p>
            <p className="text-base font-black text-white">{Math.round(aqi.current.no2)} <span className="text-[9px] text-white/40">µg/³</span></p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-[#52b72c]/5 border border-[#52b72c]/10 mb-6">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#52b72c] animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#52b72c]">
                {isUr ? 'حفاظتی اور تیکنیکی معلومات' : 'Safety Protocol Advice'}
              </p>
           </div>
           <p className="text-base font-bold text-white/60 leading-tight">
             {getSafetyAdvice(dangerLevel.label, isUr)}
           </p>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 pt-6 flex justify-between items-end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-[#52b72c] shadow-[0_0_15px_rgba(82,183,44,0.8)]" />
             <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">
               {isUr ? 'لائیو سیٹلائٹ سگنل' : 'Live Satellite Uplink'}
             </p>
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed max-w-xs">
              {isUr ? 'آیٹراکسا فضا کی درست ترین مانیٹرنگ کی باضابطہ معلومات۔' : 'Official AETRAXA Precise Atmosphere Monitoring.'}
            </p>
            <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.1em]">
              {isUr ? 'ذریعہ: فضائی سگنل AIS-Air-Y56 • اعلی ترین ٹیلی میٹری' : 'Source: AIS-Air-Y56 • Precision: High Fidelity telemetry'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="w-24 h-24 p-2 bg-white rounded-xl shadow-2xl">
              <div className="w-full h-full bg-[#020402] flex items-center justify-center p-1 rounded-lg">
                 <AetraxaLogo size={48} className="w-12 h-12 text-[#52b72c]" aria-hidden="true" />
              </div>
          </div>
          <p className="text-[9px] font-black tracking-[0.4em] text-white uppercase bg-black px-3 py-1.5 rounded-full border border-white/10 aetraxa-logo">AETRAXA.APP</p>
        </div>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1/2 w-1 flex flex-col gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="w-full h-4 bg-[#52b72c]/10" />
        ))}
      </div>
    </div>
  );
});
AqiReportCard.displayName = 'AqiReportCard';

function ShareModal({ 
  weather, 
  aqi, 
  activeTool, 
  onClose 
}: { 
  weather: WeatherData | null, 
  aqi: any, 
  activeTool: 'thermal' | 'aqi' | null, 
  onClose: () => void 
}) {
  const { tempUnit } = useTempUnit();
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instruction, setInstruction] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const modalId = React.useId();
  
  const isAqi = activeTool === 'aqi';
  const displayCity = isAqi ? aqi?.city : weather?.city;
  const dangerLevel = isAqi ? getAqiDangerLevel(aqi?.current.aqi) : getDangerLevel(weather?.current.heatIndex || 0);
  const tempUnitStr = tempUnit === 'celsius' ? '°C' : '°F';
  
  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const directShareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?shareCity=${encodeURIComponent(displayCity)}&shareType=${activeTool}`;

  const shareData = isAqi ? {
    title: `Precise Air Quality Insight: ${displayCity}`,
    text: `🍃 AETRAXA ATMOSPHERE ALERT: ${displayCity}\n\n` +
          `• Air Quality Index: ${aqi?.current.aqi} (${dangerLevel.label})\n` +
          `• PM2.5: ${aqi?.current.pm2_5} µg/m³\n` +
          `• PM10: ${aqi?.current.pm10} µg/m³\n\n` +
          `Status: ${dangerLevel.label.toUpperCase()} DETECTED. Check live updates at Aetraxa.`,
    url: directShareUrl
  } : {
    title: `Precise Heat Insight: ${displayCity}`,
    text: `🌡️ AETRAXA THERMAL ALERT: ${displayCity}\n\n` +
          `• Heat Index: ${Math.floor(formatTemp(weather?.current.heatIndex || 0, tempUnit))} ${tempUnitStr} (${dangerLevel.label})\n` +
          `• Ambient Temp: ${formatTemp(weather?.current.temp || 0, tempUnit).toFixed(1)} ${tempUnitStr}\n` +
          `• Humidity: ${weather?.current.humidity}%\n\n` +
          `Status: ${dangerLevel.label.toUpperCase()} DETECTED. Check live updates at Aetraxa.`,
    url: directShareUrl
  };

  const showFeedback = (text: string) => {
    setInstruction(text);
    setTimeout(() => {
      setInstruction(null);
    }, 6000);
  };

  const handleCopyDirect = () => {
    navigator.clipboard.writeText(directShareUrl);
    setCopied(true);
    showFeedback("✓ Direct Web Link copied to clipboard! Anyone opening this link can view the shared snapshot report.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const blob = await htmlToImage.toBlob(cardRef.current, {
        backgroundColor: '#050505',
        width: 600,
        height: 800,
        pixelRatio: 2
      });
      if (!blob) throw new Error("Failed to generate image blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Aetraxa-${isAqi ? 'Air' : 'Thermal'}-Report-${displayCity}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showFeedback(`✓ ${isAqi ? 'Atmosphere' : 'Thermal'} Report PNG downloaded to your device successfully!`);
    } catch (err) {
      console.error('Failed to generate image', err);
      showFeedback("Failed to build report PNG. Copy the direct link instead!");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to pre-generate thermal card snippet and trigger OS share or graceful download fallback
  const handleNativeShare = async () => {
    const shareText = `${shareData.text}\n\nVerify live: ${directShareUrl}`;
    
    if (!navigator.share) {
      showFeedback("Your device/browser doesn't support the native share menu. Copied link instead.");
      handleCopyDirect();
      return;
    }

    setIsGenerating(true);
    let blob: Blob | null = null;
    try {
      if (cardRef.current) {
        blob = await htmlToImage.toBlob(cardRef.current, {
          backgroundColor: '#050505',
          width: 600,
          height: 800,
          pixelRatio: 2
        });
      }
    } catch(err) {
      console.error("Failed generation", err);
    }
    setIsGenerating(false);

    try {
      const shareOptions: ShareData = {
        title: `Aetraxa ${isAqi ? 'Air' : 'Thermal'} Report: ${displayCity}`,
        text: shareText
      };
      
      if (blob && navigator.canShare) {
        const file = new File([blob], `Aetraxa-${isAqi ? 'Air' : 'Thermal'}-Report-${displayCity.replace(/\s+/g,'-')}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          shareOptions.files = [file];
        }
      }
      
      await navigator.share(shareOptions);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
         console.warn("Native share error", err);
         showFeedback("Your browser prevented sharing the report image. Please download it instead.");
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalId}
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl" 
      />
      
      {/* Hidden Card for export */}
      <div className="absolute top-[-9999px] left-[-9999px]" aria-hidden="true">
        {isAqi ? (
          <AqiReportCard ref={cardRef} aqi={aqi} />
        ) : (
          <ThermalReportCard ref={cardRef} weather={weather} />
        )}
      </div>

      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#080808] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(234,88,12,0.15)] overflow-hidden max-h-[90vh] flex flex-col"
        style={{ borderColor: `${dangerLevel.color}33`, boxShadow: `0 0 80px ${dangerLevel.color}26` }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 blur-[100px] rounded-full -mr-24 -mt-24 opacity-20 transition-colors duration-700" 
             style={{ backgroundColor: dangerLevel.color }} aria-hidden="true" />
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-primary-accent shadow-inner">
               <ShareIcon className="w-5 h-5" aria-hidden="true" />
             </div>
             <div>
               <h3 id={modalId} className="text-lg font-black text-white uppercase tracking-tight leading-tight">Share Report</h3>
               <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.25em]">{translateCity(displayCity, language)} • Telemetry</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close share modal"
            className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all bg-white/5 border border-white/5"
          >
            <CloseIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Dynamic Instructional Notification Bar inside Modal */}
        <AnimatePresence>
          {instruction && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: "auto", opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="bg-primary-accent/10 border border-primary-accent/20 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden flex-shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-primary-accent mt-1.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-xs text-stone-200 font-bold leading-normal">{instruction}</p>
              </div>
              <button onClick={() => setInstruction(null)} className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded hover:bg-white/5">
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Scrollable Body */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-4 scrollbar-thin">
          
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-[1.5rem] p-5 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-xl group-hover:scale-110 transition-transform"
                style={{ backgroundColor: `${dangerLevel.color}1a`, color: dangerLevel.color }}
              >
                {isGenerating ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Download Image</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Save to camera roll</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/10 transition-all">
              <span className="text-xs">→</span>
            </div>
          </button>

          <button
            onClick={handleCopyDirect}
            className="w-full flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-[1.5rem] p-5 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                {copied ? <CheckIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">{copied ? "Link Copied!" : "Copy Link"}</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Share URL directly</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/10 transition-all">
              <span className="text-xs">→</span>
            </div>
          </button>

          <button
            onClick={handleNativeShare}
            className="w-full flex justify-between items-center bg-primary-accent/10 hover:bg-primary-accent/20 border border-primary-accent/30 rounded-[1.5rem] p-5 transition-all text-left group disabled:opacity-50"
            disabled={isGenerating}
          >
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-xl text-black group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                style={{ backgroundColor: dangerLevel.color, boxShadow: `0 0 15px ${dangerLevel.color}66` }}
              >
                 <ShareIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-primary-accent uppercase tracking-wider">Share over Device</h4>
                <p className="text-[10px] text-primary-accent/60 uppercase tracking-widest font-black hover:text-primary-accent/80 transition-colors">WhatsApp, Instagram, messages & more</p>
              </div>
            </div>
             <div className="w-6 h-6 rounded-full bg-primary-accent/20 flex items-center justify-center text-primary-accent group-hover:bg-primary-accent group-hover:text-black transition-all">
              <span className="text-xs">→</span>
            </div>
          </button>

          {/* Minimalist Footing details */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-primary-accent/30 flex-shrink-0 mt-4">
            <span>AETRAXA SECURE TRANSMISSION</span>
            <span>DATA BY OPEN-METEO</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const ThermalReportCard = React.forwardRef<HTMLDivElement, { weather: WeatherData }>(({ weather }, ref) => {
  const { tempUnit } = useTempUnit();
  const { language } = useLanguage();
  const isUr = language === 'ur';
  const dangerLevel = getDangerLevel(weather.current.heatIndex);
  const tempUnitStr = tempUnit === 'celsius' ? '°C' : '°F';
  
  const getSafetyAdvice = (level: string, isUrLanguage: boolean) => {
    if (isUrLanguage) {
      switch (level) {
        case 'Optimal': return "معتدل حالات ہیں۔ روز مرہ کا پانی پیتے رہیں۔";
        case 'Moderate': return "ہلکا خطرہ۔ اگر دھوپ میں ہوں تو پانی کی مقدار بڑھائیں۔";
        case 'Caution': return "احتیاط برتیں۔ گرمی کے عروج پر سایہ دار جگہوں پر رہیں۔";
        case 'Severe': return "انتباہ: سخت محنت کم کریں۔ الیکٹرولائٹس والے مشروبات پیئیں۔";
        case 'Extreme': return "شدید خطرہ: باہر جانے سے گریز کریں۔ ٹھنڈی جگہوں پر رہیں۔";
        case 'Danger': return "گرمی والے مقامات سے ہٹ جائیں۔ طبی امداد کی ضرورت پڑ سکتی ہے۔";
        case 'Critical': return "جان لیوا حد: شدید ترین خطرہ۔ لازمی طور پر اندرون خانہ رہیں۔";
        default: return "مقامی موسمی ہدایات پر عمل کریں۔";
      }
    } else {
      switch (level) {
        case 'Optimal': return "Ideal conditions. Maintain standard hydration.";
        case 'Moderate': return "Slight risk. Increase fluid intake if outdoors.";
        case 'Caution': return "Exercise caution. Seek shade during peak sun.";
        case 'Severe': return "Warning: Reduce heavy exertion. Drink electrolytes.";
        case 'Extreme': return "High Risk: Avoid outdoor exposure. Stay in cooling.";
        case 'Danger': return "Evacuate core heat areas. Immediate medical risk.";
        case 'Critical': return "Lethal Threshold: Critical danger. Stay indoors.";
        default: return "Monitor local advisories.";
      }
    }
  };

  return (
    <div 
      ref={ref}
      style={{ width: '600px', height: '800px' }}
      className="bg-[#050507] p-12 flex flex-col justify-between relative overflow-hidden font-sans border-4 border-orange-500/10"
    >
      {/* Background Grid & Accents */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-orange-600/10 to-transparent blur-[120px] rounded-full -mt-40" />
      <div className="absolute bottom-0 left-0 w-3/4 h-[300px] bg-red-600/5 blur-[100px] rounded-full -mb-20" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <AetraxaLogo size={40} className="w-10 h-10 text-primary-accent" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase tracking-[0.5em] text-white aetraxa-logo-large">AETRAXA</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-accent/60">
                {isUr ? 'تھرمل اور ہیٹ ویو مانیٹرنگ' : 'Thermal Monitoring System'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Telemetry ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{new Date().toLocaleDateString()} • {weather.lastUpdated}</p>
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-primary-accent/80">
            {isUr ? 'مقام کا انتخاب' : 'Vector Location'}
          </p>
          <h2 className={`font-black tracking-tighter text-white uppercase leading-none break-words ${
            weather.city.length > 20 ? 'text-3xl' : 
            weather.city.length > 15 ? 'text-4xl' : 
            weather.city.length > 10 ? 'text-5xl' : 
            'text-6xl'
          }`}>{translateCity(weather.city, language)}</h2>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              {isUr ? 'ہیٹ انڈیکس (حقیقی گرمی)' : 'Calibrated Heat Index'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-8xl font-black tracking-tighter text-white">{Math.floor(formatTemp(weather.current.heatIndex, tempUnit))}</span>
              <span className="text-2xl font-black text-primary-accent">HI</span>
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: dangerLevel.color }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">
                {isUr ? 'خطرے کا درجہ' : 'Danger Rating'}
              </p>
              <p className="text-3xl font-black uppercase tracking-tight leading-none" style={{ color: dangerLevel.color }}>
                {isUr && dangerLevel.labelUrdu ? dangerLevel.labelUrdu : dangerLevel.label}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
              {isUr ? 'درجہ حرارت' : 'Ambient'}
            </p>
            <p className="text-base font-black text-white">{formatTemp(weather.current.temp, tempUnit).toFixed(1)}{tempUnitStr}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
              {isUr ? 'نمی' : 'Humidity'}
            </p>
            <p className="text-base font-black text-white">{weather.current.humidity}%</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
              {isUr ? 'ہوا' : 'Wind'}
            </p>
            <p className="text-sm md:text-base font-black text-white">
              {weather.current.windGusts ? `${Math.round(weather.current.windSpeed)}G${Math.round(weather.current.windGusts)}` : `${Math.round(weather.current.windSpeed)}`} <span className="text-[9px] text-white/40">km/h</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
              {isUr ? 'یو وی انڈیکس' : 'UV Index'}
            </p>
            <p className="text-base font-black text-white">{weather.current.uvIndex}</p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-primary-accent/5 border border-primary-accent/10 mb-6">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary-accent animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-accent">
                {isUr ? 'حفاظتی پروٹوکول ایڈوائس' : 'Safety Protocol Advice'}
              </p>
           </div>
           <p className="text-base font-bold text-white/60 leading-tight">
             {getSafetyAdvice(dangerLevel.label, isUr)}
           </p>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 pt-6 flex justify-between items-end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-primary-accent shadow-[0_0_15px_rgba(214,80,31,0.8)]" />
             <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">
               {isUr ? 'لائیو سیٹلائٹ سگنل' : 'Live Satellite Uplink'}
             </p>
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed max-w-xs">
              {isUr ? 'آیٹراکسا کا مصدقہ تھرمل اور ہیٹ ویو ڈیٹا۔' : 'Official AETRAXA Precise Thermal Data.'}
            </p>
            <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.1em]">
              {isUr ? 'ذریعہ: تھرمل سیٹلائٹ AIS-Sat-X42 • درستگی: +/- 0.1C' : 'Source: AIS-Sat-X42 • Precision: +/- 0.1C'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="w-24 h-24 p-2 bg-white rounded-xl shadow-2xl">
              <div className="w-full h-full bg-[#050507] flex items-center justify-center p-1 rounded-lg">
                 <AetraxaLogo size={48} className="w-12 h-12 text-primary-accent" aria-hidden="true" />
              </div>
          </div>
          <p className="text-[9px] font-black tracking-[0.4em] text-white uppercase bg-black px-3 py-1.5 rounded-full border border-white/10 aetraxa-logo">AETRAXA.APP</p>
        </div>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1/2 w-1 flex flex-col gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="w-full h-4 bg-orange-500/10" />
        ))}
      </div>
    </div>
  );
});



function TacticalSettingsModal({ profile, onClose, onSave }: { profile: UserProfile, onClose: () => void, onSave: (profile: UserProfile) => void }) {
  const { language, t } = useLanguage();
  const modalId = React.useId();
  
  const [occupation, setOccupation] = useState(profile.occupation);
  const [outdoorHours, setOutdoorHours] = useState(profile.outdoor_hours);
  const [healthConditions, setHealthConditions] = useState<string[]>(profile.health_conditions.length > 0 ? profile.health_conditions : ['None']);
  const [monitoringOthers, setMonitoringOthers] = useState<string[]>(profile.monitoring_others.length > 0 ? profile.monitoring_others : ['None']);
  const [alertStyle, setAlertStyle] = useState(profile.alert_style);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferred_language);
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'vulnerabilities' | 'preferences'>('profile');

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleToggleHealth = (conditionKey: string) => {
    if (conditionKey === 'None') {
      setHealthConditions(['None']);
    } else {
      setHealthConditions(prev => {
        const filtered = prev.filter(c => c !== 'None');
        if (filtered.includes(conditionKey)) {
          const next = filtered.filter(c => c !== conditionKey);
          return next.length === 0 ? ['None'] : next;
        } else {
          return [...filtered, conditionKey];
        }
      });
    }
  };

  const handleToggleDep = (depKey: string) => {
    if (depKey === 'None') {
      setMonitoringOthers(['None']);
    } else {
      setMonitoringOthers(prev => {
        const filtered = prev.filter(c => c !== 'None');
        if (filtered.includes(depKey)) {
          const next = filtered.filter(c => c !== depKey);
          return next.length === 0 ? ['None'] : next;
        } else {
          return [...filtered, depKey];
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      occupation,
      outdoor_hours: Number(outdoorHours),
      health_conditions: healthConditions,
      monitoring_others: monitoringOthers,
      alert_style: alertStyle,
      preferred_language: preferredLanguage
    });
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalId}
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#050507]/92 backdrop-blur-2xl" 
      />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] bg-[#f2f6f9] text-[#050507] px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 border border-[#687075]/20"
          >
            <CheckIcon className="w-4 h-4 text-[#050507] stroke-[3]" />
            {t('settingsSaved' as any)}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative w-full max-w-2xl bg-[#050507] border border-[#687075]/30 rounded-[3rem] p-6 sm:p-10 shadow-[0_30px_100px_rgba(5,5,7,0.8)] overflow-y-auto overflow-x-hidden max-h-[92vh] custom-scrollbar"
      >
        <div className="absolute top-0 right-0 w-64 h-64 blur-[120px] rounded-full -mr-32 -mt-32 opacity-10 bg-[#687075]" aria-hidden="true" />
        
        {/* Header Block */}
        <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10 gap-4">
          <div className="flex items-center gap-4">
             <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f2f6f9]/5 border border-[#687075]/25 text-[#f2f6f9] shadow-inner">
               <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#f2f6f9]" aria-hidden="true" />
             </div>
             <div>
               <h3 id={modalId} className="text-lg sm:text-xl font-black text-[#f2f6f9] uppercase tracking-tighter">{t('tacticalSettings' as any)}</h3>
               <p className="text-[9px] sm:text-[10px] text-[#687075] font-black uppercase tracking-[0.3em]">{t('personalSafetyProfile' as any)}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close settings modal"
            className="p-2.5 sm:p-3 rounded-full hover:bg-[#687075]/10 text-[#687075] hover:text-[#f2f6f9] transition-all bg-[#050507] border border-[#687075]/20 focus:outline-none focus:ring-2 focus:ring-[#f2f6f9]"
          >
            <CloseIcon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Dynamic & Unified Calibration Badge Indicator */}
        <div className="mb-6 bg-[#687075]/10 border border-[#687075]/25 p-4 rounded-3xl relative z-10 flex gap-3.5 items-start text-left">
          <div className="p-1.5 rounded-lg bg-[#f2f6f9]/15 text-[#f2f6f9] shrink-0 mt-0.5">
             <GlobeIcon className="w-4 h-4 text-[#f2f6f9]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-[#f2f6f9] uppercase tracking-wider">
              {language === 'ur' ? 'مربوط ماحولیاتی ترتیبات چالو ہیں' : 'UNIFIED METEOROLOGICAL MATRIX ACTIVE'}
            </span>
            <span className="text-[10px] text-[#687075] font-medium leading-normal">
              {language === 'ur' 
                ? 'یہ جسمانی ترتیبات دونوں فعال ٹولز (تھرمل ہیٹ انڈیکس اور اے کیو آئی ایئر کوالٹی) کے محفوظ حدوں اور ہیلتھ الرٹس کو منظم کرنے کے لیے مشترکہ طور پر استعمال ہوتی ہیں۔' 
                : 'This unified physical profile dynamically recalibrates risk thresholds and safety advisories across both the Thermal Analytics grid and the AQI Surveillance dashboard.'}
            </span>
          </div>
        </div>

        {/* Tab switch navigation */}
        <div className="flex border-b border-[#687075]/20 gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1 relative z-10 text-left scrollbar-none">
          {[
            { id: 'profile', label: language === 'ur' ? 'بنیادی معلومات' : '1. Exposure & Role' },
            { id: 'vulnerabilities', label: language === 'ur' ? 'طبی حساسیت' : '2. Vulnerabilities' },
            { id: 'preferences', label: language === 'ur' ? 'سسٹم ترتیبات' : '3. Interface Feeds' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 sm:px-4 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap focus:outline-none ${isActive ? 'border-[#f2f6f9] text-[#f2f6f9]' : 'border-transparent text-[#687075] hover:text-[#f2f6f9]'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10 text-left min-h-[290px] flex flex-col justify-between">
          <div className="flex-grow">
            {activeTab === 'profile' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-6"
              >
                {/* Occupation */}
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black text-[#687075] uppercase tracking-[0.3em] mb-2.5 block">{t('occupationLabel' as any)}</label>
                  <input 
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder={t('occupationPlaceholder' as any)}
                    className="w-full bg-[#050507] border border-[#687075]/30 rounded-2xl px-5 py-3.5 text-sm text-[#f2f6f9] focus:outline-none focus:border-[#f2f6f9]/50 font-semibold placeholder:text-[#687075]/40 transition-all shadow-inner"
                  />
                  <span className="text-[9px] text-[#687075] mt-1.5 block font-medium">
                    {language === 'ur' 
                      ? 'نوٹ: کام کی نوعیت بیرونی کام کے دوران سورج اور دھول مٹی سے متاثر ہونے کی حد کا تعین کرتی ہے۔' 
                      : 'Role helps calibrate peak UV levels and atmospheric particles exposure limits.'}
                  </span>
                </div>

                {/* Outdoor Exposure Hours */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="text-[9px] sm:text-[10px] font-black text-[#687075] uppercase tracking-[0.3em]">{t('outdoorHoursLabel' as any)}</label>
                    <span className="text-xs font-black text-[#f2f6f9] bg-[#687075]/20 px-3 py-1 rounded-full">{outdoorHours} {language === 'ur' ? 'گھنٹے' : 'h'}</span>
                  </div>
                  <div className="relative flex items-center px-1">
                    <input 
                      type="range"
                      min="0"
                      max="24"
                      value={outdoorHours}
                      onChange={(e) => setOutdoorHours(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#687075]/20 rounded-full appearance-none cursor-pointer accent-[#f2f6f9] focus:outline-none focus:ring-1 focus:ring-[#f2f6f9]/50"
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-black text-[#687075] uppercase tracking-widest mt-2 px-1">
                    <span>0h</span>
                    <span>12h</span>
                    <span>24h</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'vulnerabilities' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-6"
              >
                {/* Medical Conditions */}
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black text-[#687075] uppercase tracking-[0.3em] mb-3 block">{t('healthConditionsLabel' as any)}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'None', labelKey: 'healthNone' },
                      { key: 'Cardiovascular', labelKey: 'healthHeartDisease' },
                      { key: 'Respiratory', labelKey: 'healthRespiratory' },
                      { key: 'Hypertension', labelKey: 'healthHypertension' },
                      { key: 'Diabetes', labelKey: 'healthDiabetes' },
                      { key: 'Pregnancy', labelKey: 'healthPregnancy' },
                    ].map(opt => {
                      const isSelected = healthConditions.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleToggleHealth(opt.key)}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left focus:outline-none ${isSelected ? 'bg-[#687075]/15 border-[#f2f6f9]/50 text-[#f2f6f9] shadow-md' : 'bg-[#050507] border-[#687075]/15 text-[#687075] hover:border-[#687075]/40 hover:text-[#f2f6f9]'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'border-[#f2f6f9] bg-[#f2f6f9] text-[#050507]' : 'border-[#687075]/30'}`}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-[#050507] stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold leading-tight">{t(opt.labelKey as any)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dependents monitoring */}
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black text-[#687075] uppercase tracking-[0.3em] mb-3 block">{t('monitoringOthersLabel' as any)}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'None', labelKey: 'depNone' },
                      { key: 'Elderly', labelKey: 'depElderly' },
                      { key: 'Infants', labelKey: 'depInfants' },
                      { key: 'OutdoorWorkers', labelKey: 'depOutdoor' },
                      { key: 'Pets', labelKey: 'depPets' },
                    ].map(opt => {
                      const isSelected = monitoringOthers.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleToggleDep(opt.key)}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left focus:outline-none ${isSelected ? 'bg-[#687075]/15 border-[#f2f6f9]/50 text-[#f2f6f9] shadow-md' : 'bg-[#050507] border-[#687075]/15 text-[#687075] hover:border-[#687075]/40 hover:text-[#f2f6f9]'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'border-[#f2f6f9] bg-[#f2f6f9] text-[#050507]' : 'border-[#687075]/30'}`}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-[#050507] stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold leading-tight">{t(opt.labelKey as any)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-6"
              >
                {/* Alert Style */}
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black text-[#687075] uppercase tracking-[0.3em] mb-3 block">{t('alertStyleLabel' as any)}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { key: 'Detailed', labelKey: 'alertStyleDetailed' },
                      { key: 'Compact', labelKey: 'alertStyleCompact' },
                      { key: 'Urgent', labelKey: 'alertStyleUrgent' },
                    ].map(opt => {
                      const isSelected = alertStyle === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setAlertStyle(opt.key)}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center focus:outline-none ${isSelected ? 'bg-[#687075]/15 border-[#f2f6f9]/50 text-[#f2f6f9] shadow-md' : 'bg-[#050507] border-[#687075]/15 text-[#687075] hover:border-[#687075]/40 hover:text-[#f2f6f9]'}`}
                        >
                          <span className="text-xs font-black uppercase tracking-wider mb-1">{opt.key}</span>
                          <span className="text-[10px] font-bold opacity-60 leading-tight">{t(opt.labelKey as any)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black text-[#687075] uppercase tracking-[0.3em] mb-3 block">{t('selectLanguage' as any)}</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'en', label: t('english' as any) },
                      { key: 'ur', label: t('urdu' as any) },
                    ].map(opt => {
                      const isSelected = preferredLanguage === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setPreferredLanguage(opt.key as 'en' | 'ur')}
                          className={`p-4 rounded-2xl border transition-all text-center focus:outline-none ${isSelected ? 'bg-[#687075]/15 border-[#f2f6f9]/55 text-[#f2f6f9] shadow-sm font-black' : 'bg-[#050507] border-[#687075]/15 text-[#687075] hover:border-[#687075]/40 hover:text-[#f2f6f9] font-semibold'}`}
                        >
                          <span className="text-xs">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 items-stretch sm:items-center sm:justify-between border-t border-[#687075]/25 pt-6 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border border-[#687075]/25 text-[#687075] hover:text-[#f2f6f9] text-xs font-black uppercase tracking-wider hover:bg-[#687075]/10 hover:border-[#687075]/40 transition-all focus:outline-none w-full sm:w-auto text-center"
            >
              {t('close' as any)}
            </button>
            
            <button
              type="submit"
              className="px-6 sm:px-10 py-3 bg-[#f2f6f9] text-[#050507] hover:bg-[#f2f6f9]/90 focus:ring-2 focus:ring-[#f2f6f9]/40 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_5px_20px_rgba(242,246,249,0.15)] border border-[#f2f6f9] focus:outline-none w-full sm:w-auto text-center cursor-pointer"
            >
              {t('saveSettings' as any)}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
