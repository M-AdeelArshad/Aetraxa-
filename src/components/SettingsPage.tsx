import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft as ArrowLeftIcon, 
  Settings as SettingsIcon, 
  Check as CheckIcon, 
  User as UserIcon,
  ShieldAlert as ShieldAlertIcon,
  Eye as EyeIcon,
  Radio as RadioIcon,
  Activity as ActivityIcon,
  Sliders as SlidersIcon
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { UserProfile } from '../App';

interface SettingsPageProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.25 }
  }
};

const cardItemVariants: any = {
  hidden: { y: 25, opacity: 0, scale: 0.99 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
  }
};

export const SettingsPage = React.memo(({ profile, onSave, onBack }: SettingsPageProps) => {
  const { language, t } = useLanguage();
  
  const [occupation, setOccupation] = useState(profile.occupation);
  const [outdoorHours, setOutdoorHours] = useState(profile.outdoor_hours);
  const [healthConditions, setHealthConditions] = useState<string[]>(profile.health_conditions.length > 0 ? profile.health_conditions : ['None']);
  const [monitoringOthers, setMonitoringOthers] = useState<string[]>(profile.monitoring_others.length > 0 ? profile.monitoring_others : ['None']);
  const [alertStyle, setAlertStyle] = useState(profile.alert_style);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferred_language);
  const [showToast, setShowToast] = useState(false);

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
    }, 2000);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-24 flex flex-col gap-8 sm:gap-12 relative z-10"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] bg-[#f2f6f9] text-[#050507] px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(5,5,7,0.4)] flex items-center gap-3 border border-[#687075]/25"
          >
            <CheckIcon className="w-4 h-4 text-[#050507] stroke-[3]" />
            {t('settingsSaved')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner - PRESERVED EXACTLY AS IS */}
      <motion.div 
        variants={cardItemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)]"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2f6f9]/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="flex items-center gap-4 md:gap-6 relative z-10 w-full justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(242,246,249,0.1)' }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-3 md:p-4 rounded-2xl bg-[#f2f6f9]/5 border border-[#687075]/20 text-[#f2f6f9] transition-all flex-shrink-0 cursor-pointer focus:outline-none"
              aria-label="Go back to dashboard"
            >
              <ArrowLeftIcon className="w-4 h-4 md:w-6 md:h-6" aria-hidden="true" />
            </motion.button>
            <div className="space-y-1 text-left">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter text-[#f2f6f9] leading-none">{t('tacticalSettings')}</h2>
              <p className="text-[10px] sm:text-xs md:text-base uppercase font-black tracking-widest text-[#687075] mt-1 md:mt-2">{t('personalSafetyProfile')}</p>
            </div>
          </div>
          
          <div className="hidden sm:flex p-3 sm:p-4 rounded-2xl bg-[#f2f6f9]/5 border border-[#687075]/25 text-[#f2f6f9] shadow-inner shrink-0 leading-none">
            <SettingsIcon className="w-6 h-6 text-[#687075]" aria-hidden="true" />
          </div>
        </div>
      </motion.div>

      {/* Redesigned setting contents - Gorgeous, spacious layout matching Main Landing Page style */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-8 sm:gap-12 text-left">
        
        {/* SECTION 1: EXPOSURE & OCCUPATION PROFILE */}
        <motion.div 
          variants={cardItemVariants}
          className="bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-6 md:gap-8 group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2f6f9]/3 blur-[80px] rounded-full -mr-32 -mt-32 transition-all duration-700 pointer-events-none group-hover:bg-[#f2f6f9]/6" />
          
          {/* Header indicator inside card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#687075]/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f2f6f9]/5 flex items-center justify-center border border-[#687075]/30">
                <UserIcon className="w-6 h-6 text-[#687075]" />
              </div>
              <div>
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-normal text-[#f2f6f9]">
                  {language === 'ur' ? 'گرمی اور سورج کے خطرات کے لیے کردار' : '01 • Exposure Profile'}
                </h3>
                <p className="text-xs md:text-sm text-[#687075] font-semibold mt-1 leading-relaxed">
                  {language === 'ur' ? 'یہ آپ کے کام اور مقام کی بنیاد پر جسمانی دباؤ کا حساب لگاتا ہے۔' : 'Calibrate daily physical stress indices based on labor or duties.'}
                </p>
              </div>
            </div>
            <div className="text-4xl font-black text-[#687075]/15 uppercase tracking-normal">01</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Occupation Input */}
            <div className="space-y-3 flex flex-col justify-between h-full">
              <div>
                <label className="text-xs sm:text-sm font-bold text-[#687075] uppercase tracking-normal block mb-2">
                  {t('occupationLabel')}
                </label>
                <input 
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder={t('occupationPlaceholder')}
                  className="w-full bg-[#050507]/60 border border-[#687075]/25 rounded-2xl px-5 py-4 text-base text-[#f2f6f9] focus:outline-none focus:border-[#687075]/60 font-semibold placeholder:text-[#687075]/35 transition-all shadow-inner focus:ring-1 focus:ring-[#687075]/40"
                />
              </div>
              <p className="text-sm lg:text-base text-[#687075] font-medium leading-relaxed mt-4">
                {language === 'ur' 
                  ? 'نوٹ: کام کی نوعیت بیرونی کام کے دوران سورج اور دھول مٹی سے متاثر ہونے کی حد کا تعین کرتی ہے۔' 
                  : 'Your specific occupational environment helps AETRAXA predict direct UV impacts and atmospheric particulate thresholds relative to thermal stress.'}
              </p>
            </div>

            {/* Outdoor Exposure Hours Slider */}
            <div className="space-y-6 bg-[#050507]/30 border border-[#687075]/15 p-6 rounded-2xl flex flex-col justify-center">
              <div className="flex justify-between items-center">
                <label className="text-xs sm:text-sm font-bold text-[#687075] uppercase tracking-normal">
                  {t('outdoorHoursLabel')}
                </label>
                <span className="text-sm md:text-base font-black text-[#f2f6f9] bg-[#687075]/15 border border-[#687075]/30 px-4 py-2 rounded-xl">
                  {outdoorHours} {language === 'ur' ? 'گھنٹے' : 'Hours'}
                </span>
              </div>
              <div className="relative flex items-center px-1">
                <input 
                  type="range"
                  min="0"
                  max="24"
                  value={outdoorHours}
                  onChange={(e) => setOutdoorHours(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#687075]/25 rounded-full appearance-none cursor-pointer accent-[#f2f6f9] focus:outline-none"
                />
              </div>
              <div className="flex justify-between text-xs md:text-sm font-bold text-[#687075] uppercase tracking-normal px-1">
                <span>0 Hours (Shielded)</span>
                <span>12 Hours</span>
                <span>24 Hours (Full)</span>
              </div>
            </div>
          </div>
        </motion.div>


        {/* SECTION 2: BIOMETRIC VULNERABILITIES & ALERTMETRIC TRIGGERS */}
        <motion.div 
          variants={cardItemVariants}
          className="bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-6 md:gap-8 group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2f6f9]/3 blur-[80px] rounded-full -mr-32 -mt-32 transition-all duration-700 pointer-events-none group-hover:bg-[#f2f6f9]/6" />

          {/* Header indicator inside card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#687075]/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f2f6f9]/5 flex items-center justify-center border border-[#687075]/30">
                <ShieldAlertIcon className="w-6 h-6 text-[#687075]" />
              </div>
              <div>
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-normal text-[#f2f6f9]">
                  {language === 'ur' ? 'طبی و جینیاتی خطرات' : '02 • Vulnerability & Co-factors'}
                </h3>
                <p className="text-xs md:text-sm text-[#687075] font-semibold mt-1 leading-relaxed">
                  {language === 'ur' ? 'ان ترتیبات کی مدد سے سسٹم خطرات کی رپورٹ کو ذاتی بناتا ہے۔' : 'Establish critical biophysical triggers and custody alerts.'}
                </p>
              </div>
            </div>
            <div className="text-4xl font-black text-[#687075]/15 uppercase tracking-normal">02</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Health Conditions */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#687075] uppercase tracking-normal block">
                  {t('healthConditionsLabel')}
                </label>
                <p className="text-xs text-[#687075] tracking-normal font-medium mt-1">
                  {language === 'ur' ? 'ان کو منتخب کریں جو لاگو ہوں' : 'Personal medical vectors requiring increased thresholds'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left focus:outline-none cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f2f6f9]/10 border-[#687075]/60 text-[#f2f6f9] shadow-md' 
                          : 'bg-[#050507]/30 border-[#687075]/15 text-[#687075] hover:border-[#687075]/35 hover:text-[#f2f6f9]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'border-[#f2f6f9] bg-[#f2f6f9] text-[#050507]' : 'border-[#687075]/35 bg-[#050507]'
                      }`}>
                        {isSelected && <CheckIcon className="w-3 h-3 text-[#050507] stroke-[3]" />}
                      </div>
                      <span className="text-sm font-bold uppercase tracking-normal leading-relaxed">{t(opt.labelKey as any)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custody / Monitoring Others */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#687075] uppercase tracking-normal block">
                  {t('monitoringOthersLabel')}
                </label>
                <p className="text-xs text-[#687075] tracking-normal font-medium mt-1">
                  {language === 'ur' ? 'ان میں سے جو آپ کے پاس ہوں' : 'Dependents in your custody receiving custom telemetry advisories'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left focus:outline-none cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f2f6f9]/10 border-[#687075]/60 text-[#f2f6f9] shadow-md' 
                          : 'bg-[#050507]/30 border-[#687075]/15 text-[#687075] hover:border-[#687075]/35 hover:text-[#f2f6f9]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'border-[#f2f6f9] bg-[#f2f6f9] text-[#050507]' : 'border-[#687075]/35 bg-[#050507]'
                      }`}>
                        {isSelected && <CheckIcon className="w-3 h-3 text-[#050507] stroke-[3]" />}
                      </div>
                      <span className="text-sm font-bold uppercase tracking-normal leading-relaxed">{t(opt.labelKey as any)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>


        {/* SECTION 3: SYSTEM INTERFACE, LANG, AND ALERT TELEMETRY STYLES */}
        <motion.div 
          variants={cardItemVariants}
          className="bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-6 md:gap-8 group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2f6f9]/3 blur-[80px] rounded-full -mr-32 -mt-32 transition-all duration-700 pointer-events-none group-hover:bg-[#f2f6f9]/6" />

          {/* Header indicator inside card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#687075]/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f2f6f9]/5 flex items-center justify-center border border-[#687075]/30">
                <SlidersIcon className="w-6 h-6 text-[#687075]" />
              </div>
              <div>
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-normal text-[#f2f6f9]">
                  {language === 'ur' ? 'سستم اور انٹرفیس' : '03 • Interface Calibration'}
                </h3>
                <p className="text-xs md:text-sm text-[#687075] font-semibold mt-1 leading-relaxed">
                  {language === 'ur' ? 'زبان اور سکرین پر ظاہر ہونے والی ڈسپلے کی معلومات کو ترتیب دیں۔' : 'Configure translation feeds and notification architecture style.'}
                </p>
              </div>
            </div>
            <div className="text-4xl font-black text-[#687075]/15 uppercase tracking-normal">03</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            {/* Transmission Alert Style */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#687075] uppercase tracking-normal block">
                  {t('alertStyleLabel')}
                </label>
                <p className="text-xs text-[#687075] tracking-normal font-medium mt-1">
                  {language === 'ur' ? 'اطلاعات کا ڈسپلے فارمیٹ منتخب کریں' : 'Density of safety warnings, metrics alerts, and analytical reports'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-300 text-center focus:outline-none cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f2f6f9]/10 border-[#687075]/60 text-[#f2f6f9] shadow-md font-black' 
                          : 'bg-[#050507]/30 border-[#687075]/15 text-[#687075] hover:border-[#687075]/35 hover:text-[#f2f6f9]'
                      }`}
                    >
                      <span className="text-sm font-bold uppercase tracking-normal mb-1.5">{opt.key}</span>
                      <span className="text-xs font-medium opacity-70 leading-relaxed uppercase">{t(opt.labelKey as any)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Translation Feeds */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#687075] uppercase tracking-normal block">
                  {t('selectLanguage')}
                </label>
                <p className="text-xs text-[#687075] tracking-normal font-medium mt-1">
                  {language === 'ur' ? 'زبان منتخب کریں' : 'Active regional translations interface feed'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
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
                      className={`p-5 rounded-2xl border transition-all duration-300 text-center focus:outline-none cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f2f6f9]/10 border-[#687075]/60 text-[#f2f6f9] shadow-md font-black' 
                          : 'bg-[#050507]/30 border-[#687075]/15 text-[#687075] hover:border-[#687075]/35 hover:text-[#f2f6f9]'
                      }`}
                    >
                      <span className="text-sm uppercase font-bold tracking-normal leading-normal">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>


        {/* SYSTEM RECALIBRATION GLOBAL CONTROL BANNER (ELEGANT BOTTOM FOOTER WITHIN SETTINGS) */}
        <motion.div 
          variants={cardItemVariants}
          className="bg-[#050507]/75 border border-[#687075]/20 p-6 md:p-8 rounded-[2rem] relative z-10 flex flex-col sm:flex-row gap-6 justify-between items-center text-left backdrop-blur-lg shadow-[0_30px_100px_rgba(5,5,7,0.8)]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-xl bg-[#f2f6f9]/5 border border-[#687075]/20 text-[#687075] shrink-0 mt-0.5">
              <ActivityIcon className="w-5 h-5 text-[#687075]" />
            </div>
            <div className="flex flex-col gap-1 max-w-xl">
              <span className="text-sm md:text-base font-bold text-[#f2f6f9] uppercase tracking-normal leading-relaxed">
                {language === 'ur' ? 'مربوط ماحولیاتی ترتیبات چالو ہیں' : 'UNIFIED METEOROLOGICAL MATRIX SECURITY'}
              </span>
              <span className="text-xs md:text-sm text-[#687075] font-medium leading-relaxed">
                {language === 'ur' 
                  ? 'یہ جسمانی ترتیبات دونوں فعال ٹولز (تھرمل ہیٹ انڈیکس اور اے کیو آئی ایئر کوالٹی) کے محفوظ حدوں اور ہیلتھ الرٹس کو منظم کرنے کے لیے مشترکہ طور پر استعمال ہوتی ہیں۔' 
                  : 'Recalibrating values will simultaneously update health tolerances for both heat index anomalies and particulate exposures live on your navigation terminals.'}
              </span>
            </div>
          </div>
          <div className="text-xs font-bold text-[#687075]/40 uppercase tracking-normal flex items-center gap-1.5 shrink-0 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#687075]/40 animate-pulse"></span>
            STABLE v4.2-SAT
          </div>
        </motion.div>


        {/* ACTION BUTTON GRID */}
        <motion.div 
          variants={cardItemVariants}
          className="flex flex-col sm:flex-row gap-5 items-stretch sm:items-center sm:justify-between border-t border-[#687075]/20 pt-10"
        >
          <button
            type="button"
            onClick={onBack}
            className="px-8 py-4.5 rounded-2xl border border-[#687075]/20 text-[#687075] hover:text-[#f2f6f9] text-sm font-bold uppercase tracking-normal hover:bg-[#f2f6f9]/[0.05] transition-all focus:outline-none w-full sm:w-auto text-center cursor-pointer"
          >
            {language === 'ur' ? 'ڈیش بورڈ پر واپس جائیں' : 'Return to Dashboard'}
          </button>
          
          <button
            type="submit"
            style={{ backgroundColor: '#f2f6f9' }}
            className="px-12 sm:px-16 py-4.5 text-[#050507] hover:opacity-90 focus:ring-2 focus:ring-[#687075]/40 rounded-2xl text-sm font-bold uppercase tracking-normal transition-all shadow-[0_12px_35px_rgba(242,246,249,0.15)] border-none focus:outline-none w-full sm:w-auto text-center cursor-pointer"
          >
            {t('saveSettings')}
          </button>
        </motion.div>

      </form>
    </motion.div>
  );
});
