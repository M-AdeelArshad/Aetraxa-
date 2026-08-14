import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wind as WindIcon, 
  Activity as ActivityIcon, 
  Shield as ShieldIcon, 
  Zap as ZapIcon, 
  Flame as FlameIcon, 
  Globe as GlobeIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Info as InfoIcon,
  CheckCircle2 as CheckIcon,
  AlertTriangle as AlertIcon
} from 'lucide-react';

interface PollutantInfo {
  chemical: string;
  name: string;
  nameUrdu: string;
  whoLimit: number;
  unit: string;
  source: string;
  sourceUrdu: string;
  hazard: string;
  hazardUrdu: string;
  protection: string;
  protectionUrdu: string;
  icon: React.ReactNode;
}

const POLLUTANTS: Record<string, PollutantInfo> = {
  pm2_5: {
    chemical: "PM2.5",
    name: "Fine Particulate Matter",
    nameUrdu: "باریک دھول مٹی کے ذرات",
    whoLimit: 15,
    unit: "µg/m³",
    source: "Engine combustion, industrial emissions, soot, smoke, and fine chemical vapors.",
    sourceUrdu: "گاڑیوں کا دھواں، صنعتی اخراج، سوٹ، آگ کا دھواں، اور باریک کیمیائی بخارات۔",
    hazard: "Extremely tiny sizes allow PM2.5 to bypass respiratory filters, traveling deep into lungs and entering blood corridors.",
    hazardUrdu: "انتہائی باریک سائز کی وجہ سے یہ ہمارے سانس کی نالی کے فلٹرز سے بچ کر براہ راست پھیپھڑوں اور خون کی رگوں میں داخل ہو سکتے ہیں۔",
    protection: "Maintain high-efficiency N95 respirator masks, activate indoor HEPA filters, and shut outdoor windows.",
    protectionUrdu: "صحت بخش N95 ریسپریٹر ماسک کا استعمال کریں، کمروں میں HEPA ایئر پیوریفائر چلائیں، اور باہر کی کھڑکیاں بند رکھیں۔",
    icon: <WindIcon className="w-5 h-5" />
  },
  pm10: {
    chemical: "PM10",
    name: "Inhalable Coarse Dust",
    nameUrdu: "سانس کے ساتھ جانے والے بڑے ذرات",
    whoLimit: 45,
    unit: "µg/m³",
    source: "Agricultural tillage, crushing operations, windblown road grit, pollen, and construction dust.",
    sourceUrdu: "گاڑیوں کی اڑنے والی دھول، تعمیراتی کام، پولن اور کھیتوں کی مٹی کے معلق ذرات۔",
    hazard: "Deposits in bronchial tubes and airway passages, accelerating asthma attacks, throat irritation, and coughing fits.",
    hazardUrdu: "یہ پھیپھڑوں کی سانس کی نالیوں میں جمع ہو کر دمہ کی علامات، گلے کی سوزش، اور کھانسی کا سبب بنتے ہیں۔",
    protection: "Utilize surgical face masks, minimize high-intensity outdoor work, and sweep spaces with damp mops.",
    protectionUrdu: "معیاری سرجیکل ماسک استعمال کریں، باہر محنت کے کاموں سے پرہیز کریں، اور مٹی اڑانے کے بجائے گیلے کپڑے سے صفائی کریں۔",
    icon: <ActivityIcon className="w-5 h-5" />
  },
  ozone: {
    chemical: "O₃",
    name: "Ground-Level Ozone",
    nameUrdu: "زمینی اوزون گیس",
    whoLimit: 100,
    unit: "µg/m³",
    source: "Reaction of sunlight on industrial VOC gases and motor vehicle exhaust emissions near ground level.",
    sourceUrdu: "صنعتی اور گاڑیوں سے نکلنے والے انجن گیسوں پر تیز دھوپ پڑنے کی وجہ سے زمینی سطح پر پیدا ہونے والی زہریلی گیس۔",
    hazard: "Acts as a powerful lung corroder, causing inflammation, heavy chest tightness, coughing, and airway narrowing.",
    hazardUrdu: "پھیپھڑوں کے لیے سخت تیزابی عمل کا کام کرتی ہے، سینے میں جکڑن، شدید کھانسی، اور سانس کی نالیوں کو تنگ کرتی ہے۔",
    protection: "Shift heavy outdoor activities or exercise to cooler morning hours before active sunlight peaks.",
    protectionUrdu: "کھیل کود اور محنت کے کام دھوپ تیز ہونے سے پہلے صبح سویرے یا شام کے ٹھنڈے اوقات میں کریں۔",
    icon: <ZapIcon className="w-5 h-5" />
  },
  co: {
    chemical: "CO",
    name: "Carbon Monoxide Gas",
    nameUrdu: "کاربن مونو آکسائیڈ گیس",
    whoLimit: 4000,
    unit: "µg/m³",
    source: "Incomplete combustion of wood, gas fuels, coal heaters, and old gasoline engines.",
    sourceUrdu: "لکڑی، گیس کے چولہے، گیزر، کوئلے کے ہیٹر، اور گاڑیوں کے ادھورے جلنے والے فیول سے پیدا ہونے والی بے رنگ گیس۔",
    hazard: "Reduces systemic oxygen transport into tissues by binding rapidly to hemoglobin, causing fatigue, headache, and dizziness.",
    hazardUrdu: "خون میں آکسیجن جذب کرنے کی صلاحیت کو کم درجہ دیتی ہے، جس سے تھکاوٹ، سر درد، غنودگی اور چکر آتے ہیں۔",
    protection: "Keep indoor gas ranges well-ventilated, inspect chimney exhaust vents, and avoid high traffic bottlenecks.",
    protectionUrdu: "کچن اور گیزر کے پاس ہوا کا دباؤ بہتر رکھیں، چولہے کے اخراج کی نالی چیک کریں، اور ٹریفک ازدحام سے دور رہیں۔",
    icon: <FlameIcon className="w-5 h-5" />
  },
  no2: {
    chemical: "NO₂",
    name: "Nitrogen Dioxide Gas",
    nameUrdu: "نائٹروجن ڈائی آکسائیڈ گیس",
    whoLimit: 25,
    unit: "µg/m³",
    source: "Arising from high-temperature combustion in diesel power generation plants and urban traffic corridors.",
    sourceUrdu: "ڈیزل جنریٹر، پاور پلانٹس اور بڑے صنعتی گاڑیوں کے بہت تیز درجہ حرارت پر ایندھن جلنے سے پیدا ہونے والی گیس۔",
    hazard: "Corrodes airway lining tissues, triggering airway hypersensitivity, heavy wheezing, and recurring chest infections.",
    hazardUrdu: "ہوا کے راستوں کے گلیوں کو جلاتا ہے، جس سے سانس کی نالی میں شدید چڑچڑاہٹ، دمہ کی بگڑتی حالت، اور انفیکشن ہوتے ہیں۔",
    protection: "Avoid outdoor active walking pathways alongside diesel motorways and maintain indoor carbon filtration.",
    protectionUrdu: "شاہراہوں اور ہیوی ڈیزل گاڑیوں کے راستوں پر چہل قدمی سے بچیں اور گاڑی کے فلٹرز کو صاف رکھیں۔",
    icon: <ShieldIcon className="w-5 h-5" />
  },
  dust: {
    chemical: "Dust",
    name: "Atmospheric Soil & Silt",
    nameUrdu: "فضائی مٹی اور ریت کے ذرات",
    whoLimit: 50,
    unit: "µg/m³",
    source: "Silt storms, pulverized sand erosion, planetary desert dust currents, and micro-debris.",
    sourceUrdu: "ریتلے طوفان, صحرائی ہواؤں کا غبار، فضا میں اڑنے والی مٹی اور ریت کے نہایت چھوٹے معلق مٹی ذرات۔",
    hazard: "Impairs visibility and clogs protective sinus lining membranes, resulting in heavy allergic rhinitis and dry throat.",
    hazardUrdu: "بینائی کو متاثر کرتی ہے، سانس لینے میں رکاوٹ لاتی ہے اور ناک کی جھلی کو خشک کر کے شدید الرجی کا باعث بنتی ہے۔",
    protection: "Damp-wipe residential areas often, wrap eyes/face in protective fabric shields, and rinse sinuses daily.",
    protectionUrdu: "گھروں میں گیلے کپڑے سے گرد صاف کریں، ہوا کثیف ہونے پر چہرہ اور آنکھیں ڈھانپیں، اور ناک میں پانی ڈال کر صاف کریں۔",
    icon: <GlobeIcon className="w-5 h-5" />
  }
};

interface DetailedPollutantsBreakdownProps {
  aqiData: any;
  loading: boolean;
  language: 'en' | 'ur';
}

export const DetailedPollutantsBreakdown: React.FC<DetailedPollutantsBreakdownProps> = ({ aqiData, loading, language }) => {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!aqiData || !aqiData.current) return null;

  const currentValues: Record<string, number> = {
    pm2_5: aqiData.current.pm2_5 || 0,
    pm10: aqiData.current.pm10 || 0,
    ozone: aqiData.current.ozone || 0,
    co: aqiData.current.co || 0,
    no2: aqiData.current.no2 || 0,
    dust: aqiData.current.dust || 0
  };

  const isUrdu = language === 'ur';

  return (
    <div className="w-full bg-[#000000]/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3.5rem] border border-[#687075]/20 p-5 sm:p-6 md:p-10 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-7 sm:mb-10 pb-5 sm:pb-6 border-b border-white/10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#52b72c] animate-pulse shadow-[0_0_8px_rgba(82,183,44,0.6)]" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#52b72c]">
              {isUrdu ? "ماحول مانیٹرنگ اور حفاظتی گائیڈ" : "Atmospheric Monitoring & Mitigation Protocol"}
            </h4>
          </div>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1 font-sans">
            {isUrdu ? "چھ اہم فضائی آلودگیوں کا تفصیلی تجزیہ" : "Detailed Six-Pollutant Breakdown"}
          </h3>
          <p className="text-xs text-stone-400 mt-2 max-w-xl font-medium leading-relaxed">
            {isUrdu 
              ? "عالمی ادارۂ صحت (WHO) کے طے شدہ حفاظتی معیارات کی بنیاد پر اپنے ارد گرد کی ہوا کی کوالٹی کے اثرات اور حفاظتی طریقوں کو سمجھیں۔"
              : "Analyze live atmospheric pollutant densities compared against World Health Organization (WHO) safety standards to secure clear airway protection."}
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-fit">
          <InfoIcon className="w-3.5 h-3.5 text-[#52b72c] flex-shrink-0" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#edffde] select-none">
            {isUrdu ? "مزید جاننے کے لیے ہر کارڈ پر کلک کریں۔" : "Click panels to read protective details."}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {Object.entries(POLLUTANTS).map(([key, item]) => {
          const value = currentValues[key];
          const isOverLimit = value > item.whoLimit;
          const pct = Math.min(100, Math.ceil((value / (item.whoLimit * 2)) * 100));
          const isExpanded = !!expandedKeys[key];
          
          return (
            <motion.div
              layout="position"
              key={key}
              className={`bg-[#020402]/95 border transition-all duration-300 rounded-[2.2rem] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group ${isExpanded ? 'border-[#52b72c]/60 shadow-[0_0_30px_rgba(82,183,44,0.18)]' : 'border-[#687075]/20 hover:border-[#52b72c]/40 hover:shadow-[0_0_20px_rgba(82,183,44,0.08)]'}`}
            >
              <div>
                {/* Subtle top indicator bar */}
                <div className={`absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r transition-all duration-500 opacity-0 group-hover:opacity-100 ${isOverLimit ? 'from-orange-500/60 to-transparent' : 'from-[#52b72c]/60 to-transparent'}`} />
                
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-white/5 border border-white/5 transition-all duration-300 group-hover:bg-[#52b72c]/10 group-hover:border-[#52b72c]/15 ${isOverLimit ? 'text-amber-400' : 'text-[#52b72c]'}`}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-lg sm:text-xl font-bold text-white uppercase group-hover:text-[#52b72c] transition-colors leading-none tracking-tight">
                        {item.chemical}
                      </h4>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mt-1.5 leading-none">
                        {isUrdu ? item.nameUrdu : item.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${isOverLimit ? 'bg-orange-500/10 border-orange-500/15 text-orange-400' : 'bg-[#52b72c]/10 border-[#52b72c]/15 text-[#52b72c]'}`}>
                    {isOverLimit ? (
                      <>
                        <AlertIcon className="w-3 h-3 animate-pulse" />
                        <span>{isUrdu ? "حد سے زیادہ" : "Elevated"}</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-3 h-3" />
                        <span>{isUrdu ? "Safe" : "Safe"}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="my-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-none ${isOverLimit ? 'text-orange-400' : 'text-[#edffde]'}`}>
                      {value !== undefined ? (typeof value === 'number' ? value.toFixed(1) : value) : "0.0"}
                    </span>
                    <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      {item.unit}
                    </span>
                  </div>
                  
                  {/* WHO Reference Guidance */}
                  <div className="flex justify-between items-center mt-4 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    <span>{isUrdu ? "عالمی معیار حد" : "WHO 24HR Safety Limit"}:</span>
                    <span className="text-white/90 font-bold text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10">{item.whoLimit} {item.unit}</span>
                  </div>

                  {/* Relative safety progress bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3 relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-[#52b72c] to-[#edffde]'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Expander Trigger */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-3">
                <button
                  onClick={() => toggleExpand(key)}
                  className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.22em] text-[#edffde]/70 hover:text-[#52b72c] transition-colors py-1 focus:outline-none cursor-pointer"
                >
                  <span>{isExpanded ? (isUrdu ? "تفصیل چھپائیں" : "Hide Technical Briefing") : (isUrdu ? "فضائی معلومات اور حفاظت" : "Understand Pollutant")}</span>
                  {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-[#52b72c]" /> : <ChevronDownIcon className="w-4 h-4 text-[#edffde]/50 group-hover:text-[#52b72c]" />}
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden flex flex-col gap-4 text-xs leading-relaxed text-stone-300 font-semibold border-t border-white/5 pt-4"
                    >
                      <div>
                        <span className="text-[9px] font-black text-[#52b72c] uppercase tracking-wider block mb-1">
                          {isUrdu ? "یہ کیا چیز ہے؟" : "What is this Pollutant?"}
                        </span>
                        <p className="text-white/85 font-medium leading-relaxed">
                          {isUrdu ? item.sourceUrdu : item.source}
                        </p>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider block mb-1">
                          {isUrdu ? "جسمانی نقصان اور صحت پر خطرہ" : "Exposure & Health Hazard"}
                        </span>
                        <p className="text-white/85 font-medium leading-relaxed">
                          {isUrdu ? item.hazardUrdu : item.hazard}
                        </p>
                      </div>

                      <div className="bg-[#52b72c]/10 border border-[#52b72c]/20 rounded-xl p-4 mt-1">
                        <span className="text-[9px] font-black text-[#52b72c] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                          <ShieldIcon className="w-3.5 h-3.5 text-[#52b72c]" />
                          <span>{isUrdu ? "طبی حفاظتی تدابیر" : "Operative Protection Measures"}</span>
                        </span>
                        <p className="text-white/95 text-xs leading-relaxed font-semibold">
                          {isUrdu ? item.protectionUrdu : item.protection}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
