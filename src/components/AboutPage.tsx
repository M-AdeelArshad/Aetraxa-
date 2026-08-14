import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft as ArrowLeftIcon, 
  Info as InfoIcon, 
  ShieldAlert as ShieldAlertIcon, 
  Flame as FlameIcon, 
  Wind as WindIcon,
  Cpu as CpuIcon,
  Globe as EarthIcon,
  BookOpen as BookOpenIcon,
  Activity as ActivityIcon,
  Database as DatabaseIcon
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface AboutPageProps {
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

export const AboutPage = React.memo(({ onBack }: AboutPageProps) => {
  const { language, t } = useLanguage();
  
  // Custom bilingual texts for dense and rich explanation covering both tools
  const content = {
    en: {
      tag: "Aetraxa Matrix",
      missionTitle: "Platform Overview & Mission",
      missionDesc: "AETRAXA is an advanced meteorological intelligence network designed as a dual-instrument atmospheric observatory. Operating on decentralized client-side computing, AETRAXA processes high-fidelity microclimatic telemetry to calculate localized extreme solar impact and respirable health risks, empowering operatives to navigate hostile environment matrices.",
      
      thermalTitle: "Heatwave & Thermal Analytics",
      thermalDesc: "The thermal analytics engine calculates physical heat stress indices by compounding dry-bulb temperatures with moisture quotients. Incorporating NOAA-standard thermometric heat indexes, wet-bulb values, and solar radiation, it warns users of progressive heat exhaustion and provides safety cooldown directives tailored to your biophysical thresholds.",
      thermalKey1: "Evaporative Sweat Efficiency Factors",
      thermalKey2: "Core Apparent Temp Math",
      thermalKey3: "Heat Exertion Level Alarm System",

      aqiTitle: "Atmospheric Pollutant Tracking",
      aqiDesc: "Monitoring the respirable medium, this instrument intercepts raw data for fine particulates (PM2.5, PM10), alongside reactive combustion and photochemical gases (NO2, O3, SO2, CO). It computes localized CAQI/AQI metrics to outline critical safety durations, forecasting environmental pollutants up to 7 days ahead for active risk profiling.",
      aqiKey1: "Particulate Density Assessments (PM2.5/PM10)",
      aqiKey2: "Critical Gaseous Oxide Monitoring",
      aqiKey3: "Personalized Outdoor Safety Exposure Limit",

      archTitle: "Computational Architecture",
      archOpenMeteo: "Global Multi-Model Telemetry",
      archOpenMeteoDesc: "Integrates directly with numerical global models (ECMWF, GFS) through Open-Meteo APIs. Ingests fresh hourly vectors with zero commercial trackers, or storage telemetry, ensuring absolute operational privacy.",
      archLocal: "On-Device Physics Computation",
      archLocalDesc: "Raw wet-bulb values and mathematical conversions are resolved locally in your terminal. No external background processing occurs, retaining 100% data sovereign insulation and minimal bandwidth latency.",

      guideTitle: "Tactical Field Guidelines",
      guide1Title: "Sector Scoping",
      guide1Desc: "Target coordinates by searching urban sectors or using geo-triangulation directly in your active terminal board.",
      guide2Title: "Calibrate Profiles",
      guide2Desc: "Open Settings to define outdoor labor hours, dependent alerts, and medical factors to refine intelligence thresholds.",
      guide3Title: "Action Response",
      guide3Desc: "Observe dynamic color-coded clearance alerts and consult the on-duty AI Operative Assistant for scheduled travel windows.",
      
      footerBadge: "AETRAXA DISTRIBUTED ATMOSPHERIC MONITORING NODES • OFF-GRID COMPATIBLE",
    },
    ur: {
      tag: "آیٹراکسا میٹرکس",
      missionTitle: "پلیٹ فارم کا جائزہ اور مقصد",
      missionDesc: "آیٹراکسا ایک جدید ترین اور کثیر المقاصد ماحولیاتی مانیٹرنگ اور موسمیاتی نگرانی کا نیٹ ورک ہے۔ سیٹلائٹ ٹیلی میٹری اور جدید ماحولیاتی ماڈلنگ کا استعمال کرتے ہوئے، یہ نظام انتہائی درست زمینی درجہ حرارت اور ہوا کے معیار (AQI) کا گہرا تجزیہ کرتا ہے، تاکہ آپریٹوز کو ہر طرح کے موسمی خطرات اور جسمانی دباؤ سے محفوظ رکھا جا سکے۔",
      
      thermalTitle: "تھرمل اور ہیٹ ویو تجزیہ کار",
      thermalDesc: "تھرمل انجن فیلڈ کے درجہ حرارت اور ہوا کی نمی کا متناسب موازنہ کر کے اصل گرمی کی شدت (ہیٹ انڈیکس) کا حساب لگاتا ہے۔ یہ NOAA فارمولے اور گیلے بلب کے درجہ حرارت کے مطابق ہیٹ اسٹروک کے خطرات کی نگرانی کرتا ہے اور صارف کی عمر اور طبی حالات کے مطابق مخصوص حفاظتی پروٹوکولز جاری کرتا ہے۔",
      thermalKey1: "پسینے کے اخراج اور جسمانی تھکن کا حساب",
      thermalKey2: "نمایاں ظاہری درجہ حرارت کا کلیہ",
      thermalKey3: "شدید ترین لو اور ہیٹ ویو کا انتباہی نظام",

      aqiTitle: "ہوا کا معیار اور زہریلی گیسیں",
      aqiDesc: "یہ ٹول ہوا میں معلق مائیکرو پارٹیکلز (PM2.5، PM10) اور نقصان دہ گیسوں جیسے وزون (O3) اور نائٹروجن ڈائی آکائیڈ (NO2) کا معائنہ کرتا ہے۔ یہ علاقائی CAQI/AQI انڈیکس تیار کرتا ہے اور آئندہ 7 دنوں کے فضائی آلودگی کے مانیٹرنگ چارٹ پیش کرتا ہے تاکہ سانس کی بیماریوں سے بچا جا سکے۔",
      aqiKey1: "باریک گرد کے ذرات کی پیمائش (PM2.5/PM10)",
      aqiKey2: "نائٹروجن اور سلفر گیسوں کی مسلسل نگرانی",
      aqiKey3: "مقامی فضا کے مطابق باہر وقت گزارنے کی حد",

      archTitle: "سائنسی و تیکنیکی ڈھانچہ",
      archOpenMeteo: "عالمی پیمانے کا موسمی ڈیٹا",
      archOpenMeteoDesc: "اوپن-میٹیو نیٹ ورک کے ذریعے دنیا کے جدید ترین موسمیاتی ماڈلز سے اپ ڈیٹ شدہ ڈیٹا لمحہ بہ لمحہ حاصل کیا جاتا ہے۔ اس عمل میں کسی بھی قسم کے پوشیدہ کمرشل ٹریکر یا تھرڈ پارٹی مارکیٹنگ کا کوئی دخل نہیں ہے۔",
      archLocal: "آف لائن لوکل پراسیسنگ انجن",
      archLocalDesc: "تمام حساب کتاب اور الرٹس آپ کے اپنے ٹرمینل پر لوکل طور پر حل کیے جاتے ہیں۔ کوئی بیرونی سرور اس ڈیٹا کو اسٹور نہیں کرتا، جو آپ کی رازداری اور تیز ترین کارکردگی کو یقینی بناتا ہے۔",

      guideTitle: "فیلڈ مانیٹرنگ اور مینوئل",
      guide1Title: "مقام کا انتخاب",
      guide1Desc: "اپنے قریبی شہر کا نام سرچ بار میں درج کریں یا براہ راست لوکیشن سروسز کے ذریعے مقامی ٹیلی میٹری حاصل کریں۔",
      guide2Title: "پروفائل کی ترتیبات",
      guide2Desc: "ترتیبات کے پینل میں جا کر اپنی عمر، بیرونی ڈیوٹی کا وقت اور طبی حساسیت کے مطابق اپنے انتباہی الرٹس تبدیل کریں۔",
      guide3Title: "حفاظتی کارروائی",
      guide3Desc: "رنگدار کلئیرنس کوڈز کا مشاہدہ کریں اور سفر کے بہترین سازگار اوقات کے انتخاب کے لیے مصنوعی ذہانت والے اسسٹنٹ سے مدد لیں۔",
      
      footerBadge: "آیٹراکسا ماحولیاتی نگرانی کا نیٹ ورک • تمام ڈیوائسز پر کام کرنے کے لیے مستعد",
    }
  };

  const activeContent = language === 'ur' ? content.ur : content.en;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-24 flex flex-col gap-8 sm:gap-12 relative z-10"
    >
      {/* Header Banner - Matches Settings page header style identically */}
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
              aria-label="Go back"
            >
              <ArrowLeftIcon className="w-4 h-4 md:w-6 md:h-6" aria-hidden="true" />
            </motion.button>
            <div className="space-y-1 text-left">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter text-[#f2f6f9] leading-none">{t('aboutTitle')}</h2>
              <p className="text-[10px] sm:text-xs md:text-base uppercase font-black tracking-widest text-[#687075] mt-1 md:mt-2">{t('aboutSubtitle')}</p>
            </div>
          </div>
          
          <div className="hidden sm:flex p-3 sm:p-4 rounded-2xl bg-[#f2f6f9]/5 border border-[#687075]/25 text-[#f2f6f9] shadow-inner shrink-0 leading-none">
            <InfoIcon className="w-6 h-6 text-[#687075]" aria-hidden="true" />
          </div>
        </div>
      </motion.div>

      {/* Grid containing Overview & Twin Instruments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 text-left">
        
        {/* Card 1: Platform Overview & Mission - Spans 7 columns on desktop */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-7 bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-5 md:gap-6 group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2f6f9]/3 blur-[80px] rounded-full -mr-32 -mt-32 transition-all duration-700 pointer-events-none group-hover:bg-[#f2f6f9]/6" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#687075]/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f2f6f9]/5 flex items-center justify-center border border-[#687075]/30 text-[#f2f6f9]">
                <EarthIcon className="w-6 h-6 text-[#687075]" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-normal text-[#f2f6f9]">{activeContent.missionTitle}</h3>
                <p className="text-xs text-[#687075] font-semibold mt-1 tracking-wider uppercase">{activeContent.tag}</p>
              </div>
            </div>
          </div>

          <p className="text-sm md:text-base text-[#687075] font-semibold leading-relaxed mt-2 text-justify">
            {activeContent.missionDesc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-[#f2f6f9]/3 border border-[#687075]/10 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f2f6f9]/50 block mb-2">{language === 'ur' ? 'تھرمل مانیٹرنگ' : 'Solar Sensor Node'}</span>
              <span className="text-xs font-bold text-[#687075] leading-relaxed">{language === 'ur' ? 'جسمانی ہیٹ انڈیکس اور لو کے خطرات فورا ناپتا ہے۔' : 'Predicts critical sweat cooling efficiencies under direct radiant sun indices.'}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#f2f6f9]/3 border border-[#687075]/10 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f2f6f9]/50 block mb-2">{language === 'ur' ? 'فضائی مانیٹرنگ' : 'Environmental Node'}</span>
              <span className="text-xs font-bold text-[#687075] leading-relaxed">{language === 'ur' ? 'مائیکرو پارٹیکلز اور آلودگی کے انڈیکس پر نظر رکھتا ہے۔' : 'Synthesizes aggregate particle filters with dynamic forecast trends.'}</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Dual Instruments Focus (The Two Tools) - Spans 5 columns on desktop */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-5 bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-5 md:gap-6 group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2f6f9]/3 blur-[80px] rounded-full -mr-32 -mt-32 transition-all duration-700 pointer-events-none group-hover:bg-[#f2f6f9]/6" />
          
          <div className="flex flex-col pb-4 border-b border-[#687075]/20">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-normal text-[#f2f6f9]">
              {language === 'ur' ? 'دو طرفہ آبزرویٹری' : 'Instrument Matrix'}
            </h3>
            <p className="text-xs text-[#687075] font-semibold mt-1">
              {language === 'ur' ? 'انتہائی کارکردگی کے حامل دو بڑے مانیٹرنگ ٹولز' : 'Dual processing capabilities aligned in real-time'}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Tool 1 */}
            <div className="flex gap-4 items-start pb-4 border-b border-[#687075]/10">
              <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 mt-1">
                <FlameIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-[#f2f6f9]">
                  {language === 'ur' ? 'تھرمل انالیٹکس' : 'Thermal Diagnostics'}
                </h4>
                <p className="text-xs text-[#687075] leading-relaxed">
                  {language === 'ur' 
                    ? 'گرمی کی شدت اور نمی کے ملاپ سے انسانی جسم کے اصل درجہ حرارت کا تجزیہ۔' 
                    : 'Calculates heat indices & wet-bulb strain on biological frameworks.'}
                </p>
              </div>
            </div>

            {/* Tool 2 */}
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1">
                <WindIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-[#f2f6f9]">
                  {language === 'ur' ? 'ایئر کوالٹی مانیٹرنگ' : 'Environmental AQI'}
                </h4>
                <p className="text-xs text-[#687075] leading-relaxed">
                  {language === 'ur' 
                    ? 'ہوا میں موجود باریک ذرات (PM2.5/PM10) اور نقصان دہ کاربن و نائٹروجن گیسوں کی مسلسل جانچ۔' 
                    : 'Charts respirable dust density trends & secondary smog particles.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Deep Technical Breakdown - Spans 12 columns */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-12 bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-6 md:gap-8 group"
        >
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-white) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#687075]/20 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f2f6f9]/5 flex items-center justify-center border border-[#687075]/30 text-[#f2f6f9]">
                <CpuIcon className="w-6 h-6 text-[#687075]" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-normal text-[#f2f6f9]">{activeContent.archTitle}</h3>
                <p className="text-xs text-[#687075] font-semibold mt-1">
                  {language === 'ur' ? 'سسٹم کے کام کرنے کا مربوط میکانزم' : 'Client-side numerical pipelines and local computational boundaries'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Column A: Data Source */}
            <div className="p-6 rounded-[1.75rem] bg-[#050507]/30 border border-[#687075]/15 space-y-4 hover:border-[#687075]/35 transition-all">
              <div className="flex items-center gap-3">
                <DatabaseIcon className="w-5 h-5 text-[#687075]" />
                <h4 className="text-base font-black uppercase tracking-wider text-[#f2f6f9]">{activeContent.archOpenMeteo}</h4>
              </div>
              <p className="text-xs md:text-sm text-[#687075] font-medium leading-relaxed">
                {activeContent.archOpenMeteoDesc}
              </p>
              <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-[#687075]/50 uppercase tracking-widest">
                <span>Model Ingestion: Live Hourly</span>
                <span>Coordinates: Globally Scaled</span>
              </div>
            </div>

            {/* Column B: Local Computations */}
            <div className="p-6 rounded-[1.75rem] bg-[#050507]/30 border border-[#687075]/15 space-y-4 hover:border-[#687075]/35 transition-all">
              <div className="flex items-center gap-3">
                <CpuIcon className="w-5 h-5 text-[#687075]" />
                <h4 className="text-base font-black uppercase tracking-wider text-[#f2f6f9]">{activeContent.archLocal}</h4>
              </div>
              <p className="text-xs md:text-sm text-[#687075] font-medium leading-relaxed">
                {activeContent.archLocalDesc}
              </p>
              <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-[#687075]/50 uppercase tracking-widest">
                <span>Data Volatility: Insulated</span>
                <span>Process Latency: ~12ms</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Twin Tools Core Data Variables - Spans 12 columns */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Thermal Engine Details */}
          <div className="bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[#687075]/20">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                <FlameIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black uppercase text-[#f2f6f9]">{activeContent.thermalTitle}</h4>
                <p className="text-xs text-[#687075] font-semibold">{language === 'ur' ? 'جسمانی تھکن کی نگرانی کا کلیہ' : 'Hydric thermal load calculations'}</p>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-[#687075] font-medium leading-relaxed">
              {activeContent.thermalDesc}
            </p>

            <div className="space-y-3">
              {[activeContent.thermalKey1, activeContent.thermalKey2, activeContent.thermalKey3].map((keyText, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-bold text-[#f2f6f9] uppercase tracking-normal">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>{keyText}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AQI Engine Details */}
          <div className="bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[#687075]/20">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <WindIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black uppercase text-[#f2f6f9]">{activeContent.aqiTitle}</h4>
                <p className="text-xs text-[#687075] font-semibold">{language === 'ur' ? 'سانس اور پھیپھڑوں کی حفاظت' : 'Respirable health index variables'}</p>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-[#687075] font-medium leading-relaxed">
              {activeContent.aqiDesc}
            </p>

            <div className="space-y-3">
              {[activeContent.aqiKey1, activeContent.aqiKey2, activeContent.aqiKey3].map((keyText, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-bold text-[#f2f6f9] uppercase tracking-normal">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{keyText}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Card 5: Step-by-Step User Instructions - Spans 12 columns */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-12 bg-[#050507]/75 backdrop-blur-lg border border-[#687075]/20 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-[0_30px_100px_rgba(5,5,7,0.8)] flex flex-col gap-5 md:gap-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#687075]/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f2f6f9]/5 flex items-center justify-center border border-[#687075]/30 text-[#f2f6f9]">
                <BookOpenIcon className="w-6 h-6 text-[#687075]" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-normal text-[#f2f6f9]">{activeContent.guideTitle}</h3>
                <p className="text-xs text-[#687075] font-semibold mt-1">
                  {language === 'ur' ? 'سسٹم کو چلانے اور رہنمائی کی گائیڈ' : 'User directives to maximize utility from both meteorological tools'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex gap-4 items-center">
                <span className="text-3xl font-black text-[#687075]/20 leading-none">01</span>
                <h4 className="text-sm font-black uppercase tracking-widest text-[#f2f6f9]">{activeContent.guide1Title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-[#687075] font-medium leading-relaxed">
                {activeContent.guide1Desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="flex gap-4 items-center">
                <span className="text-3xl font-black text-[#687075]/20 leading-none">02</span>
                <h4 className="text-sm font-black uppercase tracking-widest text-[#f2f6f9]">{activeContent.guide2Title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-[#687075] font-medium leading-relaxed">
                {activeContent.guide2Desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="flex gap-4 items-center">
                <span className="text-3xl font-black text-[#687075]/20 leading-none">03</span>
                <h4 className="text-sm font-black uppercase tracking-widest text-[#f2f6f9]">{activeContent.guide3Title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-[#687075] font-medium leading-relaxed">
                {activeContent.guide3Desc}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Global Security Summary Banner (matches settings format) */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-12 bg-[#050507]/75 border border-[#687075]/20 p-6 md:p-8 rounded-[2rem] relative z-10 flex flex-col sm:flex-row gap-6 justify-between items-center backdrop-blur-lg shadow-[0_30px_100px_rgba(5,5,7,0.8)]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-xl bg-[#f2f6f9]/5 border border-[#687075]/20 text-[#687075] shrink-0 mt-0.5">
              <ActivityIcon className="w-5 h-5 text-[#687075]" />
            </div>
            <div className="flex flex-col gap-1 max-w-xl">
              <span className="text-sm md:text-base font-bold text-[#f2f6f9] uppercase tracking-normal leading-relaxed">
                {language === 'ur' ? 'مشترکہ ماحولیاتی مانیٹرنگ پروٹوکول' : 'COOPERATIVE ENVIRONMENTAL PROTOCOLS'}
              </span>
              <span className="text-xs md:text-sm text-[#687075] font-medium leading-relaxed">
                {language === 'ur' 
                  ? 'آیٹراکسا تھرمل الرٹس اور اے کیو آئی کی رپورٹ مسلسل اپ ڈیٹ کرتا ہے تاکہ آپ باہر کے تمام حالات سے باخبر اور ہر وقت باحفاظت رہیں۔' 
                  : 'By cross-referencing thermal moisture load with dust density layers, AETRAXA secures a dual-sensor atmospheric protection shield.'}
              </span>
            </div>
          </div>
          <div className="text-xs font-bold text-[#687075]/40 uppercase tracking-normal flex items-center gap-1.5 shrink-0 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#687075]/40 animate-pulse"></span>
            STABLE v4.2-SAT
          </div>
        </motion.div>

        {/* Return Button Area */}
        <motion.div 
          variants={cardItemVariants}
          className="lg:col-span-12 flex items-center justify-start border-t border-[#687075]/20 pt-10"
        >
          <button
            type="button"
            onClick={onBack}
            className="px-10 py-4.5 rounded-2xl border border-[#687075]/20 text-[#687075] hover:text-[#f2f6f9] text-sm font-bold uppercase tracking-normal hover:bg-[#f2f6f9]/[0.05] transition-all focus:outline-none w-full sm:w-auto text-center cursor-pointer"
          >
            {language === 'ur' ? 'مرکزی ڈیش بورڈ پر منتقل ہوں' : 'Back to Terminal Dashboard'}
          </button>
        </motion.div>

      </div>
      
      {/* Footer Branding Elements - Matches the bottom design style */}
      <motion.div 
        variants={cardItemVariants}
        className="flex flex-col items-center gap-4 pt-12 border-t border-white/5"
      >
        <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-[0.4em] text-[#687075]/40 text-center">
          {activeContent.footerBadge}
        </p>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-8 h-1 bg-white/5 rounded-full" />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
});
