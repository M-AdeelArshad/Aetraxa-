import express from "express";
import { GoogleGenAI } from "@google/genai";
import { Groq } from 'groq-sdk';
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getGroqClient(tool: 'thermal' | 'aqi' = 'thermal', action: 'tips' | 'chat' = 'tips'): Groq | null {
  let key: string | undefined;
  if (tool === 'aqi') {
    if (action === 'tips') {
      key = process.env.AETRAXA_AQI_TIPS_KEY || process.env.AETRAXA_THERMAL_TIPS_KEY || process.env.GROQ_API_KEY;
    } else {
      key = process.env.AETRAXA_AQI_CHAT_KEY || process.env.AETRAXA_THERMAL_CHAT_KEY || process.env.GROQ_API_KEY;
    }
  } else {
    if (action === 'tips') {
      key = process.env.AETRAXA_THERMAL_TIPS_KEY || process.env.AETRAXA_AQI_TIPS_KEY || process.env.GROQ_API_KEY;
    } else {
      key = process.env.AETRAXA_THERMAL_CHAT_KEY || process.env.AETRAXA_AQI_CHAT_KEY || process.env.GROQ_API_KEY;
    }
  }
  if (!key) return null;
  return new Groq({ apiKey: key });
}

function generateFallbackInsights(tool: 'thermal' | 'aqi', telemetryData: any, userProfile: any, language: string) {
  const isUr = language === 'ur';
  const occ = userProfile?.occupation || (isUr ? 'دستیاب نہیں' : 'N/A');
  const conds = (userProfile?.health_conditions || []).filter((c: string) => c !== 'None');
  const deps = (userProfile?.monitoring_others || []).filter((d: string) => d !== 'None');

  const occLabel = isUr ? 'پیشہ ورانہ' : 'Occupation';
  const medLabel = isUr ? 'طبی' : 'Medical';
  const depLabel = isUr ? 'زیرِ نگرانی' : 'Dependent';

  if (tool === 'thermal') {
    const temp = telemetryData?.current?.temp ?? 32;
    const hi = telemetryData?.current?.heatIndex ?? temp;
    const humidity = telemetryData?.current?.humidity ?? 50;
    const wind = telemetryData?.current?.windSpeed ?? 10;
    const uv = telemetryData?.current?.uvIndex ?? 5;
    const city = telemetryData?.city || (isUr ? 'منتخب مقام' : 'Current Location');

    let tempDesc = isUr ? "معتدل" : "Moderate";
    let hiDesc = isUr ? "محفوظ سطح" : "Nominal";
    let humDesc = isUr ? `${humidity}% متوازن نمی` : `${humidity}% Normal`;
    let windDesc = isUr ? `${wind} کلومیٹر/گھنٹہ معتدل ہوا` : `${wind} km/h Breeze`;
    let uvDesc = isUr ? `UV ${uv} مناسب` : `UV ${uv} Moderate`;

    if (hi >= 52) {
      tempDesc = isUr ? "انتہائی شدید ترین گرمی" : "Critical Extreme Heat";
      hiDesc = isUr ? "ہیٹ اسٹروک کا شدید ترین خطرہ" : "Critical Heatstroke Threat";
      uvDesc = isUr ? `UV ${uv} انتہائی خطرناک شعاعیں` : `UV ${uv} Extreme Radiative Load`;
    } else if (hi >= 45) {
      tempDesc = isUr ? "شدید خطرناک گرمی" : "Dangerous Thermal Load";
      hiDesc = isUr ? "شدید تھکن و لو کا خطرہ" : "High Danger Zone";
      uvDesc = isUr ? `UV ${uv} تیز ترین دھوپ` : `UV ${uv} Very High`;
    } else if (hi >= 39) {
      tempDesc = isUr ? "شدید گرم" : "Extreme Heat";
      hiDesc = isUr ? "زیادہ خطرہ" : "Extreme Caution";
    } else if (hi >= 34) {
      tempDesc = isUr ? "گرم موسم" : "High Warmth";
      hiDesc = isUr ? "محتاط رہیں" : "Caution Tier";
    }

    let summary = "";
    if (hi >= 45) {
      summary = isUr 
        ? `${city} میں گرمی کا انڈیکس ${Math.round(hi)}°C تک پہنچ چکا ہے۔ لو لگنے کے خطرات کے پیشِ نظر براہِ راست دھوپ اور غیر ضروری محنت سے مکمل پرہیز کریں۔`
        : `Thermal index for ${city} reaches a hazardous ${Math.round(hi)}°C. High physiological strain detected—limit direct sun exposure and hydrate aggressively.`;
    } else if (hi >= 35) {
      summary = isUr
        ? `${city} میں گرمی کی شدت ${Math.round(hi)}°C ہے۔ وافر پانی کے استعمال اور دوپہر کے اوقات میں سایہ دار جگہوں پر رہنے کی ہدایت دی جاتی ہے۔`
        : `Active heat index in ${city} is elevated at ${Math.round(hi)}°C. Maintain constant electrolyte hydration and take scheduled cooling breaks.`;
    } else {
      summary = isUr
        ? `${city} میں تھرمل حالات پرسکون اور محفوظ ہیں۔ عام معمولات جاری رکھے جا سکتے ہیں، مناسب ہائیڈریشن برقرار رکھیں۔`
        : `Atmospheric thermal conditions in ${city} are within safe comfort zones. Standard hydration and normal outdoor routines are recommended.`;
    }

    const suggestions: string[] = [];
    if (userProfile && userProfile.occupation && userProfile.occupation.toLowerCase() !== 'none') {
      suggestions.push(isUr 
        ? `${occLabel} [${occ}]: کام کے دوران ہر 20 منٹ بعد سایہ دار یا ٹھنڈی جگہ پر 5 منٹ کا وقفہ لیں اور مسلسل او آر ایس یا پانی استعمال کریں۔`
        : `${occLabel} [${occ}]: Implement 5-minute shaded recovery intervals every 20 minutes of physical workload; carry dynamic electrolyte hydration.`);
    } else {
      suggestions.push(isUr
        ? `${occLabel} [${occ}]: دن کے گرم ترین اوقات (12:00 سے 16:00) میں باہر کی سخت جسمانی مشقت محدود رکھیں۔`
        : `${occLabel} [${occ}]: Regulate outdoor physical exertion during peak heating periods (12:00-16:00) with proactive water intake.`);
    }

    if (conds.length > 0) {
      suggestions.push(isUr
        ? `${medLabel} [${conds[0]}]: گرمی کے دوران دل کی دھڑکن اور سانس کے ردِعمل پر نظر رکھیں۔ ٹھنڈے کمرے میں رہیں اور باقاعدہ آرام کریں۔`
        : `${medLabel} [${conds[0]}]: Monitor cardiovascular and airway strain under heat load; prioritize air-conditioned resting environments.`);
    } else {
      suggestions.push(isUr
        ? `${medLabel} [${isUr ? 'صحت مند' : 'None'}]: دن بھر میں کم از کم 2.5 سے 3 لیٹر پانی کا استعمال یقینی بنائیں تاکہ پانی کی کمی نہ ہو۔`
        : `${medLabel} [Optimal]: Maintain a target intake of 2.5–3.0L of water throughout the day to prevent sub-clinical dehydration.`);
    }

    if (deps.length > 0) {
      suggestions.push(isUr
        ? `${depLabel} [${deps[0]}]: زیرِ نگرانی افراد کے لیے ٹھنڈے ماحول اور مسلسل تازہ مشروبات کی فراہمی یقینی بنائیں۔`
        : `${depLabel} [${deps[0]}]: Ensure continuous passive cooling and verified fluid intake for monitored dependents throughout peak heat hours.`);
    } else {
      suggestions.push(isUr
        ? `${depLabel} [${isUr ? 'کوئی نہیں' : 'None'}]: براہِ راست دھوپ سے بچنے کے لیے چھتری، ٹوپی اور ہلکے سوتی کپڑوں کا انتخاب کریں۔`
        : `${depLabel} [Standard]: Utilize UV-blocking headwear, loose breathable fabrics, and seek shaded transit paths when walking outdoors.`);
    }

    return {
      temp: tempDesc,
      heatIndex: hiDesc,
      humidity: humDesc,
      wind: windDesc,
      uv: uvDesc,
      summary,
      suggestions,
      peakSunHours: "11:30 - 16:00",
      coolerHours: "19:00 - 08:00"
    };
  } else {
    // AQI Fallback
    const aqi = telemetryData?.current?.aqi ?? 65;
    const pm2_5 = telemetryData?.current?.pm2_5 ?? 22;
    const pm10 = telemetryData?.current?.pm10 ?? 45;
    const ozone = telemetryData?.current?.ozone ?? 30;
    const city = telemetryData?.city || (isUr ? 'منتخب مقام' : 'Current Location');

    let aqiDesc = isUr ? "معتدل فضائی معیار" : "Moderate";
    let pm10Desc = isUr ? `${pm10} µg/m³ معتدل` : `${pm10} µg/m³ Moderate`;
    let pm25Desc = isUr ? `${pm2_5} µg/m³ قابلِ قبول` : `${pm2_5} µg/m³ Acceptable`;
    let ozoneDesc = isUr ? `${ozone} µg/m³ محفوظ` : `${ozone} µg/m³ Good`;

    if (aqi >= 300) {
      aqiDesc = isUr ? "انتہائی خطرناک فضائی آلودگی" : "Hazardous Emergency";
      pm25Desc = isUr ? `${pm2_5} µg/m³ انتہائی زہریلا` : `${pm2_5} µg/m³ Severe Toxic Load`;
    } else if (aqi >= 200) {
      aqiDesc = isUr ? "بہت غیر صحت بخش" : "Very Unhealthy";
      pm25Desc = isUr ? `${pm2_5} µg/m³ شدید آلودگی` : `${pm2_5} µg/m³ High Alert`;
    } else if (aqi >= 150) {
      aqiDesc = isUr ? "غیر صحت بخش" : "Unhealthy";
    } else if (aqi >= 100) {
      aqiDesc = isUr ? "حساس افراد کے لیے نقصان دہ" : "Unhealthy for Sensitive Groups";
    } else if (aqi <= 50) {
      aqiDesc = isUr ? "بہترین اور صاف ہوا" : "Good / Fresh";
    }

    let summary = "";
    if (aqi >= 150) {
      summary = isUr
        ? `${city} میں ایئر کوالٹی انڈیکس ${aqi} پر آلودہ ترین درجے میں ہے۔ باہر نکلتے وقت این 95 ماسک لازمی استعمال کریں اور کھڑکیاں بند رکھیں۔`
        : `Air quality index for ${city} sits at ${aqi} (Unhealthy). High particulate burden warrants N95 respirators and indoor air filtration.`;
    } else if (aqi >= 100) {
      summary = isUr
        ? `${city} میں فضا میں دھواں اور باریک ذرات موجود ہیں (AQI ${aqi})۔ حساس اور معمر افراد کھلی جگہوں پر دیر تک رہنے سے پرہیز کریں۔`
        : `Localized atmosphere in ${city} shows elevated particulate concentrations (AQI ${aqi}). Sensitive individuals should limit prolonged outdoor exposure.`;
    } else {
      summary = isUr
        ? `${city} میں فضائی معیار تسلی بخش ہے۔ ہوا تازہ ہے اور کھلی فضا میں عام سرگرمیاں بغیر کسی تشویش کے جاری رکھی جا سکتی ہیں۔`
        : `Atmospheric air conditions in ${city} are within safe regulatory standards (AQI ${aqi}). Safe for normal outdoor movement and natural ventilation.`;
    }

    const suggestions: string[] = [];
    if (userProfile && userProfile.occupation && userProfile.occupation.toLowerCase() !== 'none') {
      suggestions.push(isUr
        ? `${occLabel} [${occ}]: گرد و غبار اور سموگ کے دوران بیرونی کام کرتے وقت معیاری ریسپریٹر ماسک کا مسلسل استعمال یقینی بنائیں۔`
        : `${occLabel} [${occ}]: Equip tight-fitting N95 particulate filtration when operating in traffic-dense or dust-exposed field zones.`);
    } else {
      suggestions.push(isUr
        ? `${occLabel} [${occ}]: صبح اور شام کے اوقات میں ہوا کا جائزہ لے کر ہی چہل قدمی یا بیرونی ورزش کا شیڈول بنائیں۔`
        : `${occLabel} [${occ}]: Check hourly particulate forecasts prior to scheduling high-ventilation cardio or outdoor tasks.`);
    }

    if (conds.length > 0) {
      suggestions.push(isUr
        ? `${medLabel} [${conds[0]}]: تنفسی اور قلبی دباؤ سے بچنے کے لیے بند کمرے میں ایئر پیوریفائر یا مناسب وینٹیلیشن استعمال کریں۔`
        : `${medLabel} [${conds[0]}]: Protect respiratory tract with HEPA air purification indoors and carry prescribed rescue medication.`);
    } else {
      suggestions.push(isUr
        ? `${medLabel} [${isUr ? 'صحت مند' : 'None'}]: آلودگی کی صورت میں آنکھوں کو ٹھنڈے پانی سے دھوئیں اور گلے کو تر رکھیں۔`
        : `${medLabel} [Nominal]: Rinse face and eyes with fresh water after extended transit to clear fine surface particulates.`);
    }

    if (deps.length > 0) {
      suggestions.push(isUr
        ? `${depLabel} [${deps[0]}]: بچوں اور بزرگوں کو دھواں زدہ یا ٹریفک والے مصروف راستوں سے دور رکھیں۔`
        : `${depLabel} [${deps[0]}]: Restrict vulnerable dependents from high-emission thoroughfares and maintain clean indoor airflow.`);
    } else {
      suggestions.push(isUr
        ? `${depLabel} [${isUr ? 'کوئی نہیں' : 'None'}]: گھر کے اندر نمی اور صفائی برقرار رکھیں تاکہ باریک ذرات فضا میں معلق نہ رہیں۔`
        : `${depLabel} [General]: Keep household seals intact during atmospheric haze spikes to sustain clean ambient air.`);
    }

    return {
      aqi: aqiDesc,
      pm10: pm10Desc,
      pm2_5: pm25Desc,
      ozone: ozoneDesc,
      summary,
      suggestions
    };
  }
}

function generateFallbackChat(
  tool: 'thermal' | 'aqi',
  userMessage: string,
  weatherData: any,
  aqiData: any,
  userProfile: any,
  language: string
): string {
  const msgLower = userMessage.toLowerCase();
  const isUrduQuery = /[\u0600-\u06FF]/.test(userMessage) || language === 'ur';
  const isRomanUrdu = /(kya|hai|garmi|hawa|paani|pani|thand|masla|khansi|saans|bachao|krun|karun|batao)/i.test(userMessage);

  if (tool === 'thermal') {
    const temp = weatherData?.current?.temp ?? 34;
    const hi = weatherData?.current?.heatIndex ?? temp;
    const hum = weatherData?.current?.humidity ?? 55;
    const city = weatherData?.city || 'Current Location';

    if (isUrduQuery) {
      if (msgLower.includes('پانی') || msgLower.includes('ہائیڈریشن')) {
        return `موجودہ درجہ حرارت (${temp}°C) اور گرمی کے انڈیکس (${Math.round(hi)}°C) کے مطابق ہر گھنٹے کم از کم 2 سے 3 گلاس پانی پینا ضروری ہے۔ جسم میں نمکیات کی کمی سے بچنے کے لیے لیموں پانی یا او آر ایس کا استعمال کریں۔`;
      }
      return `مقام: ${city}\nموجودہ درجہ حرارت: ${temp}°C\nگرمی کا حقیقی احساس: ${Math.round(hi)}°C\n\nتجاویز:\n- دن کے گرم ترین اوقات میں براہِ راست دھوپ سے پرہیز کریں۔\n- ڈھیلے اور ہلکے رنگ کے سوتی کپڑے پہنیں۔\n- اگر چکر یا متلی محسوس ہو تو فوری طور پر ٹھنڈی اور سایہ دار جگہ پر آرام کریں۔`;
    }

    if (isRomanUrdu) {
      return `Sector: ${city}\nCurrent Temp: ${temp}°C | Heat Index: ${Math.round(hi)}°C | Humidity: ${hum}%\n\nTactical Hidayat:\n- Garmi ki shiddat zyada hai, har 20 minute baad paani ya ORS istemal karein.\n- Dhoop mein nikalte waqt sar ko dhaanp kar rakhein aur halkay sooti kapray pehnein.\n- Agar kamzori ya chakkar ayein toh foran kisi thandi jagah par aaraam karein.`;
    }

    return `Tactical Assessment for ${city}:\n- Ambient Temp: ${temp}°C (Heat Index: ${Math.round(hi)}°C)\n- Humidity Quotient: ${hum}%\n\nDirectives:\n1. Maintain aggressive hydration (~500ml/hr during physical exertion).\n2. Avoid unshaded exposure between 12:00 and 16:00.\n3. Watch for early heat exhaustion symptoms (dizziness, pale skin, fatigue).`;
  } else {
    const aqi = aqiData?.current?.aqi ?? 85;
    const pm2_5 = aqiData?.current?.pm2_5 ?? 28;
    const city = aqiData?.city || 'Current Location';

    if (isUrduQuery) {
      return `فضائی صورتحال برائے ${city}:\n- ایئر کوالٹی انڈیکس (AQI): ${aqi}\n- باریک ذرات (PM2.5): ${pm2_5} µg/m³\n\nتجاویز:\n- باہر نکلتے وقت معیاری این 95 ماسک کا استعمال کریں۔\n- زیادہ ٹریفک اور گرد و غبار والے راستوں سے گریز کریں۔\n- گھر کے اندر تازہ اور صاف ہوا کی وینٹیلیشن برقرار رکھیں۔`;
    }

    if (isRomanUrdu) {
      return `Sector: ${city}\nAir Quality (AQI): ${aqi} | PM2.5: ${pm2_5} µg/m³\n\nTactical Hidayat:\n- Hawa mein gard-o-ghubaar aur smog ki wajah se bahar nikalte waqt N95 mask pehnein.\n- Zyada traffic walay ilaqon se door rahein.\n- Saans ke mareez aur buzurg afrad band kamray mein air purifier ya fresh air ventilation istemal karein.`;
    }

    return `Air Quality Intelligence for ${city}:\n- Current AQI: ${aqi} (European/US Standard)\n- Fine Particulate (PM2.5): ${pm2_5} µg/m³\n\nDirectives:\n1. Wear N95 respirator masks when commuting along major arterial roads.\n2. Sensitive respiratory profiles should minimize high-ventilation cardio outdoors.\n3. Keep indoor air clean using secondary HEPA filtration where available.`;
  }
}

app.get("/api/health", (req, res) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq = !!(
    process.env.AETRAXA_THERMAL_TIPS_KEY || 
    process.env.AETRAXA_THERMAL_CHAT_KEY || 
    process.env.AETRAXA_AQI_TIPS_KEY || 
    process.env.AETRAXA_AQI_CHAT_KEY || 
    process.env.GROQ_API_KEY
  );
  res.json({ 
    status: "ok", 
    engine: hasGemini ? "gemini" : (hasGroq ? "groq" : "fallback-active"),
    geminiConfigured: hasGemini,
    groqConfigured: hasGroq,
    model: "groq/compound",
    tipsConfigured: true,
    chatConfigured: true
  });
});

app.post("/api/ai-insights", async (req, res) => {
  const { tool, telemetryData, userProfile, language } = req.body;
  const toolType: 'thermal' | 'aqi' = tool === 'aqi' ? 'aqi' : 'thermal';

  let profileContext = '';
  if (userProfile) {
    const hasOccupation = !!userProfile.occupation && userProfile.occupation.trim().toLowerCase() !== 'none' && userProfile.occupation.trim() !== '';
    const hasVulnerabilities = (userProfile.health_conditions || []).some((c: string) => c !== 'None');
    const hasDependents = (userProfile.monitoring_others || []).some((d: string) => d !== 'None');

    const labelOccupation = language === 'ur' ? 'پیشہ ورانہ' : 'Occupation';
    const labelMedical = language === 'ur' ? 'طبی' : 'Medical';
    const labelDependent = language === 'ur' ? 'زیرِ نگرانی' : 'Dependent';
    const defaultNa = language === 'ur' ? 'دستیاب نہیں' : 'N/A';

    profileContext = `
    User Profile Context:
    - Occupation: ${userProfile.occupation || 'Not declared'}
    - Time outside: ${userProfile.outdoor_hours || 0} hours/day
    - Health conditions: ${(userProfile.health_conditions || []).join(', ') || 'None'}
    - Monitoring others: ${(userProfile.monitoring_others || []).join(', ') || 'None'}
    - Alert style preference: ${userProfile.alert_style || 'Detailed'}
    - Preferred language: ${userProfile.preferred_language || (language === 'ur' ? 'Urdu' : 'English')}
    
    IMPORTANT PERSONALIZATION INSTRUCTIONS:
    1. Tailor "summary" and all 3 items of "suggestions" to the user's declared profile.
    ${hasOccupation ? `- Occupation is "${userProfile.occupation}": provide specific physical workload and outdoor safety advice for a ${userProfile.occupation}.` : ''}
    ${hasVulnerabilities ? `- Health condition "${(userProfile.health_conditions || []).filter((h: string) => h !== 'None').join(', ')}": highlight physiological risks and prevention.` : ''}
    ${hasDependents ? `- Monitoring dependents "${(userProfile.monitoring_others || []).filter((h: string) => h !== 'None').join(', ')}": specify protection measures.` : ''}
    - Format suggestions with prefixes:
      "${labelOccupation} [${userProfile.occupation || defaultNa}]: <actionable advice>"
      "${labelMedical} [${(userProfile.health_conditions || []).filter((h: string) => h !== 'None')[0] || defaultNa}]: <actionable advice>"
      "${labelDependent} [${(userProfile.monitoring_others || []).filter((h: string) => h !== 'None')[0] || defaultNa}]: <actionable advice>"
    `;
  }

  const uiLanguageInstruction = language === 'ur' ? `
  CRITICAL INSTRUCTION FOR URDU SCRIPT:
  1. Write all text values (summary, suggestions, assessments) in authentic, formal URDU SCRIPT (Arabic style).
  2. Do NOT use phonetic Roman Urdu or Devanagari characters.
  3. Keep all JSON keys in English as specified.
  ` : '';

  let prompt = '';
  let systemPrompt = '';

  if (toolType === 'thermal') {
    prompt = `Analyze this weather data for ${telemetryData?.city || 'Current Location'}:
    Temperature: ${telemetryData?.current?.temp}°C
    Heat Index: ${telemetryData?.current?.heatIndex}°C
    Humidity: ${telemetryData?.current?.humidity}%
    Wind Speed: ${telemetryData?.current?.windSpeed} km/h
    UV Index: ${telemetryData?.current?.uvIndex}
    ${profileContext}
    ${uiLanguageInstruction}

    Return a JSON object with keys:
    "temp": qualitative short description
    "heatIndex": qualitative danger level
    "humidity": qualitative humidity status
    "wind": qualitative wind status
    "uv": qualitative uv level
    "summary": concise tactical safety briefing (max 35 words)
    "suggestions": array of exactly 3 customized tactical strings
    "peakSunHours": "HH:MM - HH:MM"
    "coolerHours": "HH:MM - HH:MM"
    `;

    systemPrompt = `You are the AETRAXA Tactical Thermal Safety Analyst. Return ONLY a valid JSON object matching the requested schema.`;
  } else {
    prompt = `Analyze this Air Quality data for ${telemetryData?.city || 'Current Location'}:
    AQI: ${telemetryData?.current?.aqi}
    PM10: ${telemetryData?.current?.pm10} μg/m³
    PM2.5: ${telemetryData?.current?.pm2_5} μg/m³
    Ozone: ${telemetryData?.current?.ozone} μg/m³
    ${profileContext}
    ${uiLanguageInstruction}

    Return a JSON object with keys:
    "aqi": qualitative status
    "pm10": qualitative level
    "pm2_5": qualitative level
    "ozone": qualitative level
    "summary": concise respiratory safety briefing (max 35 words)
    "suggestions": array of exactly 3 customized tactical strings
    `;

    systemPrompt = `You are the AETRAXA Tactical Air Quality Analyst. Return ONLY a valid JSON object matching the requested schema.`;
  }

  // 1. Try Gemini
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const text = response.text || "";
      const parsed = JSON.parse(text);
      if (parsed && (parsed.summary || parsed.suggestions)) {
        return res.json(parsed);
      }
    } catch (err: any) {
      console.warn("[Gemini Insights API] Failed, falling back:", err.message);
    }
  }

  // 2. Try Groq if configured
  const groq = getGroqClient(toolType, 'tips');
  if (groq) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        model: "groq/compound",
        temperature: 0.7,
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
      });

      let content = chatCompletion.choices[0]?.message?.content || "";
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(content);
      if (parsed && (parsed.summary || parsed.suggestions)) {
        return res.json(parsed);
      }
    } catch (err: any) {
      console.warn("[Groq Insights API] Failed, falling back:", err.message);
    }
  }

  // 3. Fallback
  const fallback = generateFallbackInsights(toolType, telemetryData, userProfile, language);
  return res.json(fallback);
});

app.post("/api/ai-chat", async (req, res) => {
  const { tool, messages, weatherData, aqiData, userProfile, language } = req.body;
  const toolType: 'thermal' | 'aqi' = tool === 'aqi' ? 'aqi' : 'thermal';
  const lastUserMessage = messages?.[messages.length - 1]?.content || "";

  let systemPrompt = '';
  if (toolType === 'aqi') {
    systemPrompt = `You are the AETRAXA Tactical Air Quality Assistant.
    Mission: Analyze air quality, smog, PM2.5, PM10, respiratory defense, and ventilation.
    City: ${aqiData?.city || 'Current Location'}
    Current AQI: ${aqiData?.current?.aqi || 'N/A'}, PM2.5: ${aqiData?.current?.pm2_5 || 'N/A'} µg/m³
    User Profile: Occupation: ${userProfile?.occupation || 'N/A'}, Vulnerabilities: ${(userProfile?.health_conditions || []).join(', ') || 'None'}
    Rules:
    - If user speaks English, reply in concise English.
    - If user writes in Roman Urdu (e.g. "hawa kharab hai", "kya karun"), reply in clean, polite Roman Urdu.
    - If user writes in Urdu script or language is Urdu, reply in proper Urdu script.
    - Keep responses concise, actionable, and formatted with bullet points for protocols.`;
  } else {
    systemPrompt = `You are the AETRAXA Tactical Weather & Thermal Intel Assistant.
    Mission: Analyze temperature, heat index, humidity, UV index, and tactical cooling protocols.
    City: ${weatherData?.city || 'Current Location'}
    Current Temp: ${weatherData?.current?.temp || 'N/A'}°C, Heat Index: ${weatherData?.current?.heatIndex || 'N/A'}°C, Humidity: ${weatherData?.current?.humidity || 'N/A'}%, UV: ${weatherData?.current?.uvIndex || 'N/A'}
    User Profile: Occupation: ${userProfile?.occupation || 'N/A'}, Vulnerabilities: ${(userProfile?.health_conditions || []).join(', ') || 'None'}
    Rules:
    - If user speaks English, reply in concise English.
    - If user writes in Roman Urdu (e.g. "bohot garmi hai", "kya karun"), reply in clean, polite Roman Urdu.
    - If user writes in Urdu script or language is Urdu, reply in proper Urdu script.
    - Keep responses concise, actionable, and formatted with bullet points for cooling protocols.`;
  }

  // 1. Try Gemini
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const contents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || "" }]
      }));

      const response = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: lastUserMessage || "Hello" }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
        },
      });

      const reply = response.text || "";
      if (reply) {
        return res.json({ content: reply });
      }
    } catch (err: any) {
      console.warn("[Gemini Chat API] Failed, falling back:", err.message);
    }
  }

  // 2. Try Groq if configured
  const groq = getGroqClient(toolType, 'chat');
  if (groq) {
    try {
      const groqMessages = [
        { role: "system", content: systemPrompt },
        ...(messages || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || ""
        }))
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages: groqMessages,
        model: "groq/compound",
        temperature: 0.8,
        max_completion_tokens: 2048,
      });

      const reply = chatCompletion.choices[0]?.message?.content || "";
      if (reply) {
        return res.json({ content: reply });
      }
    } catch (err: any) {
      console.warn("[Groq Chat API] Failed, falling back:", err.message);
    }
  }

  // 3. Fallback
  const fallbackReply = generateFallbackChat(toolType, lastUserMessage, weatherData, aqiData, userProfile, language);
  return res.json({ content: fallbackReply });
});

export default app;
