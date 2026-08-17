import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Groq } from 'groq-sdk';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Groq API Key Pool
const DEFAULT_MODEL = "compound-mini";

function getGroqClient(tool: 'thermal' | 'aqi' = 'thermal', action: 'tips' | 'chat' = 'tips') {
  let key: string | undefined;
  if (tool === 'aqi') {
    if (action === 'tips') {
      key = process.env.AETRAXA_AQI_TIPS_KEY || process.env.AETRAXA_THERMAL_TIPS_KEY;
    } else {
      key = process.env.AETRAXA_AQI_CHAT_KEY || process.env.AETRAXA_THERMAL_CHAT_KEY;
    }
  } else {
    if (action === 'tips') {
      key = process.env.AETRAXA_THERMAL_TIPS_KEY;
    } else {
      key = process.env.AETRAXA_THERMAL_CHAT_KEY;
    }
  }
  if (!key) throw new Error(`API Key for ${tool} ${action} is missing`);
  return new Groq({ apiKey: key });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      tipsConfigured: !!process.env.AETRAXA_THERMAL_TIPS_KEY,
      chatConfigured: !!process.env.AETRAXA_THERMAL_CHAT_KEY,
      aqiTipsConfigured: !!(process.env.AETRAXA_AQI_TIPS_KEY || process.env.AETRAXA_THERMAL_TIPS_KEY),
      aqiChatConfigured: !!(process.env.AETRAXA_AQI_CHAT_KEY || process.env.AETRAXA_THERMAL_CHAT_KEY)
    });
  });

  // AI Insights API (Static Analysis)
  app.post("/api/ai-insights", async (req, res) => {
    console.log("AI Insights request received for city:", req.body?.telemetryData?.city, "Tool:", req.body?.tool);
    
    try {
      const { tool, telemetryData, userProfile, language } = req.body;
      const toolType = tool === 'aqi' ? 'aqi' : 'thermal';
      const groq = getGroqClient(toolType, 'tips');
      
      let profileContext = '';
      if (userProfile) {
        const hasVulnerabilities = (userProfile.health_conditions || []).some((c: string) => c !== 'None');
        const hasDependents = (userProfile.monitoring_others || []).some((d: string) => d !== 'None');
        const hasOccupation = !!userProfile.occupation && userProfile.occupation.trim().toLowerCase() !== 'none' && userProfile.occupation.trim() !== '';

        const labelOccupation = language === 'ur' ? 'پیشہ ورانہ' : 'Occupation';
        const labelMedical = language === 'ur' ? 'طبی' : 'Medical';
        const labelDependent = language === 'ur' ? 'زیرِ نگرانی' : 'Dependent';
        const defaultNa = language === 'ur' ? 'دستیاب نہیں' : 'N/A';

        const translateHealthCond = (cond: string) => {
          if (language !== 'ur') return cond;
          switch (cond) {
            case 'Cardiovascular': return 'دل کے امراض';
            case 'Respiratory': return 'سانس کے مسائل';
            case 'Hypertension': return 'ہائی بلڈ پریشر';
            case 'Diabetes': return 'ذیابیطس';
            case 'Pregnancy': return 'حمل';
            default: return cond;
          }
        };

        const translateDep = (dep: string) => {
          if (language !== 'ur') return dep;
          switch (dep) {
            case 'Elderly': return 'بزرگ افراد';
            case 'Infants': return 'کم عمر بچے';
            case 'OutdoorWorkers': return 'بیرونی عملہ';
            case 'Pets': return 'پالتو جانور';
            default: return dep;
          }
        };

        const displayOccVal = userProfile.occupation || defaultNa;
        const displayMedVal = (userProfile.health_conditions || []).filter((h: string) => h !== 'None')[0]
          ? translateHealthCond((userProfile.health_conditions || []).filter((h: string) => h !== 'None')[0])
          : defaultNa;
        const displayDepVal = (userProfile.monitoring_others || []).filter((h: string) => h !== 'None')[0]
          ? translateDep((userProfile.monitoring_others || []).filter((h: string) => h !== 'None')[0])
          : defaultNa;

        profileContext = `
      User Profile Context:
      - Occupation: ${userProfile.occupation || 'Not declared'}
      - Time outside: ${userProfile.outdoor_hours || 0} hours/day
      - Health conditions: ${(userProfile.health_conditions || []).join(', ') || 'None'}
      - Monitoring others: ${(userProfile.monitoring_others || []).join(', ') || 'None'}
      - Alert style preference: ${userProfile.alert_style || 'Detailed'}
      - Preferred language: ${userProfile.preferred_language || (language === 'ur' ? 'Urdu' : 'English')}
      
      IMPORTANT PERSONALIZATION INSTRUCTIONS (CRITICAL HIGHEST PRIORITY):
      1. You MUST explicitly and custom-tailor the "summary" and ALL 3 items of "suggestions" directly to the user's declared profile.
      ${hasOccupation ? `- Since their occupation is "${userProfile.occupation}", at least one suggestion and the summary MUST directly address physical workload, outdoor exposure patterns, and safety maneuvers specific to a ${userProfile.occupation}.` : ''}
      ${hasVulnerabilities ? `- Since they have health conditions: "${(userProfile.health_conditions || []).filter((h: string) => h !== 'None').join(', ')}", at least one suggestion MUST explicitly detail the physiological risks (e.g., cardiovascular strain, airway constriction) and actionable preventions for these exact conditions under the current heat/humidity.` : ''}
      ${hasDependents ? `- Since they monitor dependents: "${(userProfile.monitoring_others || []).filter((h: string) => h !== 'None').join(', ')}", at least one suggestion MUST provide concrete tactical instructions to safeguard these dependents (e.g., seniors, children, pets) in these current environments.` : ''}
      - Each of the 3 suggestions MUST be prefixed by its profile-relevant label, for example:
        "${labelOccupation} [${displayOccVal}]: <highly tailored protocol>"
        "${labelMedical} [${displayMedVal}]: <highly tailored physiological protocol>"
        "${labelDependent} [${displayDepVal}]: <highly tailored dependent protection protocol>"
      - If they have no custom configurations (occupation is empty, medical is 'None', dependents is 'None'), construct tactical recommendations based on their "${userProfile.outdoor_hours || 0} hours" of daily outdoor exposure, and add a friendly note in the "summary" encouraging them to click the gear icon to customize their tactical settings.
      2. Keep responses in the user's Preferred Language if possible, especially the "summary" and "suggestions" arrays! (e.g. if Urdu, output Urdu strings for summary and suggestions, but keep JSON keys in English).
      3. Scale severity and urgency of warnings based on their profile data (e.g. cardiovascular risk should trigger much faster, high-priority cardiac strain alerts).
      `;
      }

      const uiLanguageInstruction = language === 'ur' ? `
CRITICAL INSTRUCTION FOR URDU SCRIPT:
1. ALL generated text content (such as summaries, suggestions, and qualitative assessments) MUST be written in the actual URDU SCRIPT (Urdu language written in Arabic style).
2. Do NOT use phonetic Roman Urdu / english characters for these fields.
3. Keep all JSON key names strictly in English (do not translate keys).
4. ABSOLUTELY FORBIDDEN DEVANAGARI / HINDI LEAK:
   - Do NOT output any Devanagari characters (such as "स", "त", "र", "ब", "स्त", "स्तर", "सावधानी", "सुरक्षा") under any circumstances!
   - Do NOT mix Devanagari characters with Arabic characters. For example, do not write "برتنے" with Devanagari "बर" like "बरتنے". It must be written fully and properly in pure Arabic script as "برتنے".
   - You MUST ensure all characters are standard Perso-Arabic Urdu characters.
5. ABSOLUTELY FORBIDDEN HINDI/SANSKRIT VOCABULARY OVERRIDES:
   - Do NOT use the Hindi word "چھایا" or "چھای ہ" (always use Urdu "سایہ" or "سائے" in Arabic script).
   - Do NOT use the Hindi word "स्तर" / "star" (always use Urdu "سطح" or "درجہ" in Arabic script).
   - Do NOT use the Hindi word "उपाय" (always use Urdu "تدابیر" or "حل" in Arabic script).
   - Do NOT use the Hindi word "सावधानी" (always use Urdu "احتیاط" in Arabic script).
   - Do NOT use the Hindi word "सुरक्षा" (always use Urdu "حفاظت" in Arabic script).
   - Do NOT use the Hindi word "समस्या" (always use Urdu "مسئلہ" or "پریشانی" in Arabic script).
   - Do NOT use the Hindi word "चिंता" (always use Urdu "تشویش" or "پریشانی" in Arabic script).
   - Do NOT use the Hindi word "प्रभाव" (always use Urdu "اثر" or "اثرات" in Arabic script).
   - Do NOT use the Hindi word "विशेष" (always use Urdu "خاص" in Arabic script).
   - Do NOT use the Hindi word "आवश्यक" (always use Urdu "ضروری" in Arabic script).
   - Do NOT use the Hindi word "चेतावनी" (always use Urdu "تنبیہ" in Arabic script).
   - Do NOT use the Hindi word "سکیورٹی" or "सुरक्षित" (always use Urdu "محفوظ" in Arabic script).` : '';

      const strictFormattingInstruction = `
STRICT JSON COMPLIANCE REGULATION:
1. Under NO circumstances translate the JSON keys. They must be exact English keys as specified in the schema.
2. The JSON keys MUST be exactly:
   For Thermal tool: "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions", "peakSunHours", "coolerHours".
   For Air Quality (AQI) tool: "aqi", "pm10", "pm2_5", "ozone", "summary", "suggestions".
3. Return ONLY a single flat JSON object with no nested objects, no trailing commas, and no comments.
4. Output values must be simple flat strings (or a simple flat array of strings for "suggestions").
5. Properly escape any double quotes inside text values (using \\") to prevent JSON validation errors. Do not output multiple keys like "summary": "": "value".` + (language === 'ur' ? `
6. Example structure for URDU:
   {
     ${tool === 'thermal' ? `
     "temp": "شدید گرم",
     "heatIndex": "بہت زیادہ خطرہ",
     "humidity": "کافی زیادہ حبس",
     "wind": "ہلکی ہوا",
     "uv": "خطرناک حد تک تیز",
     "summary": "تھرمل برریفنگ کا خلاصہ یہاں لکھیں۔",
     "suggestions": [
       "پہلا گائیڈ لائن",
       "دوسرا گائیڈ لائن",
       "تیسرا گائیڈ لائن"
     ],
     "peakSunHours": "12:00 - 15:00",
     "coolerHours": "18:00 - 08:00"
     ` : `
     "aqi": "حساس گروپس کے لیے نقصان دہ",
     "pm10": "صحت بخش نہیں",
     "pm2_5": "غیر تسلی بخش",
     "ozone": "معتدل صحت بخش",
     "summary": "فضائی معیار کا خلاصہ یہاں لکھیں۔",
     "suggestions": [
       "پہلا تنفسی مشورہ",
       "دوسرا تنفسی مشورہ",
       "تیسرا تنفسی مشورہ"
     ]
     `}
   }` : `
6. Example structure for ENGLISH:
   {
     ${tool === 'thermal' ? `
     "temp": "Very Hot",
     "heatIndex": "High Danger",
     "humidity": "Humid",
     "wind": "Calm Breeze",
     "uv": "Extreme",
     "summary": "Brief summary of weather conditions",
     "suggestions": [
       "First recommendation",
       "Second recommendation",
       "Third recommendation"
     ],
     "peakSunHours": "11:00 - 16:00",
     "coolerHours": "19:00 - 07:00"
     ` : `
     "aqi": "Unhealthy for Sensitive Groups",
     "pm10": "Moderate",
     "pm2_5": "Unhealthful Level",
     "ozone": "Fine",
     "summary": "Brief air quality summary here",
     "suggestions": [
       "First suggestion here",
       "Second suggestion here",
       "Third suggestion here"
     ]
     `}
   }`);

    let prompt = '';
    let systemPrompt = '';

    if (tool === 'thermal') {
      const isDangerous = telemetryData.current.temp > 35 || telemetryData.current.heatIndex > 38 || telemetryData.current.uvIndex > 8;
      const toneInstruction = isDangerous
        ? "CRITICAL TONE: Since current weather conditions are dangerous or extreme, adopt a highly alert, authoritative, sharp, clinical, intense thermal-tactical tone emphasizing heatstroke warnings, direct cooling protocols, and urgent defensive actions."
        : "CRITICAL TONE: Since current weather is calm, comfortable, and safe, adopt a slightly calm, reassuring, peaceful, and gentle tone. Avoid intense, alarmist, or emergency-style directives; focus on cozy everyday thermal comfort, ventilation, and enjoyable hydration tips.";

      prompt = `Analyze this weather data for ${telemetryData.city}:
      Temperature: ${telemetryData.current.temp}°C
      Heat Index: ${telemetryData.current.heatIndex}°C
      Humidity: ${telemetryData.current.humidity}%
      Wind Speed: ${telemetryData.current.windSpeed} km/h
      UV Index: ${telemetryData.current.uvIndex}
      ${profileContext}
      ${uiLanguageInstruction}
      ${strictFormattingInstruction}

      MISSION PARAMETERS:
      1. CRITICAL: ${toneInstruction}
      2. CRITICAL: Avoid generic "drink water" advice. Provide DATA-DRIVEN, TACTICAL cooling protocols.
      3. If temperature is >40°C, calculate a specific hydration target.
      4. If UV is >8, specify exactly when to avoid direct exposure based on solar peak.
      5. If humidity is >60% alongside high heat, warn about "wet-bulb" effect and sweat evaporation failure.
      
      OUTPUT REQUIREMENTS:
      1. qualitative assessments: concise (max 8 words) for temp, heatIndex, humidity, wind, uv.
      2. summary: A tactical briefing matching the requested tone (max 35 words).
      3. suggestions: A list of exactly 3 highly customized tactical suggestions matching the requested tone.
      4. "peakSunHours": "HH:MM - HH:MM" window.
      5. "coolerHours": "HH:MM - HH:MM" window.
      
      Format: JSON with keys "temp", "heatIndex", "humidity", "wind", "uv", "summary", "suggestions" (array of strings), "peakSunHours", "coolerHours".
      Return ONLY valid JSON.
      `;

      systemPrompt = `
      You are the AETRAXA Tactical Safety Analyst. Your ONLY purpose is to analyze weather and thermal hazard data.
      
      STRICT TOPIC ENFORCEMENT:
      - Only analyze heat, humidity, UV, and survival-related environmental factors.
      - If the user context suggests anything outside environmental safety, return a polite notification in the 'summary' that you are specialized for weather monitoring.

      STRICT JSON COMPLIANCE:
      - You must return a perfectly valid, standard JSON object starting with '{' and ending with '}'.
      - Do NOT wrap the JSON in markdown code blocks, do NOT write any pre-amble or post-amble text.
      - Keep all JSON keys strictly as lowercase English, specified in the schema.
      - Values must be written in the target user language (Urdu script for Urdu, English for English).
      - Ensure strings are properly escaped to compile as legal JSON.
      `;
    } else if (tool === 'aqi') {
      const isDangerous = telemetryData.current.aqi > 100 || telemetryData.current.pm2_5 > 50;
      const toneInstruction = isDangerous
        ? "CRITICAL TONE: Since air quality is currently hazardous or smoggy, adopt a highly alert, authoritative, sharp, clinical, intense tactical tone emphasizing direct N95 respiratory protection, avoiding outdoors, and immediate defensive actions."
        : "CRITICAL TONE: Since air quality is safe, fresh, and healthy, adopt a slightly calm, reassuring, peaceful, gentle, and conversational tone. Focus on pleasant ventilation, fresh-air comfort, and cosy breathing tips without alarmist warnings.";

      prompt = `Analyze this Air Quality data for ${telemetryData.city}:
      AQI (European): ${telemetryData.current.aqi}
      PM10: ${telemetryData.current.pm10} μg/m³
      PM2.5: ${telemetryData.current.pm2_5} μg/m³
      Carbon Monoxide: ${telemetryData.current.co} μg/m³
      Nitrogen Dioxide: ${telemetryData.current.no2} μg/m³
      Ozone: ${telemetryData.current.ozone} μg/m³
      Dust: ${telemetryData.current.dust} μg/m³
      ${profileContext}
      ${uiLanguageInstruction}
      ${strictFormattingInstruction}

      MISSION PARAMETERS:
      1. CRITICAL: ${toneInstruction}
      2. CRITICAL: Provide DATA-DRIVEN, TACTICAL respiratory safety protocols.
      3. If PM2.5 or PM10 is high, advise on specific mask ratings (e.g., N95) or indoor filtration.
      4. Warn about prolonged outdoor activities if AQI > 100.
      
      OUTPUT REQUIREMENTS:
      1. qualitative assessments: concise (max 8 words) for aqi, pm10, pm2_5, ozone.
      2. summary: A tactical briefing matching the requested tone (max 35 words).
      3. suggestions: A list of exactly 3 highly customized suggestions matching the requested tone.
      
      Format: JSON with keys "aqi", "pm10", "pm2_5", "ozone", "summary", "suggestions" (array of strings).
      Return ONLY valid JSON.
      `;

      systemPrompt = `
      You are the AETRAXA Tactical Safety Analyst. Your ONLY purpose is to analyze air quality and respiratory hazard data.
      
      STRICT TOPIC ENFORCEMENT:
      - Only analyze PM concentration, AQI, toxic gases, and respiratory survival environmental factors.
      - If the user context suggests anything outside environmental safety, return a polite notification in the 'summary' that you are specialized for environmental monitoring.

      STRICT JSON COMPLIANCE:
      - You must return a perfectly valid, standard JSON object starting with '{' and ending with '}'.
      - Do NOT wrap the JSON in markdown code blocks, do NOT write any pre-amble or post-amble text.
      - Keep all JSON keys strictly as lowercase English, specified in the schema.
      - Values must be written in the target user language (Urdu script for Urdu, English for English).
      - Ensure strings are properly escaped to compile as legal JSON.
      `;
    }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: DEFAULT_MODEL,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const responseContent = chatCompletion.choices[0]?.message?.content || "";
      
      try {
        const match = responseContent.match(/\{[\s\S]*\}/);
        const cleanContent = match ? match[0] : responseContent;
        const parsed = JSON.parse(cleanContent);
        res.json(parsed);
      } catch (e) {
        console.error("Failed to parse AI response:", responseContent);
        res.status(500).json({ error: "Invalid response from AI" });
      }
    } catch (error: any) {
      console.error("Groq API Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chat Assistant (Tactical Briefing)
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { tool, messages, weatherData, aqiData, userProfile, language } = req.body;
      const toolType = tool === 'aqi' ? 'aqi' : 'thermal';
      const groq = getGroqClient(toolType, 'chat');

      let systemPrompt = '';

      if (toolType === 'aqi') {
        const currentAqi = aqiData?.current?.aqi || 0;
        const pm2_5 = aqiData?.current?.pm2_5 || 0;
        const pm10 = aqiData?.current?.pm10 || 0;
        const ozone = aqiData?.current?.ozone || 0;
        const co = aqiData?.current?.co || 0;
        const no2 = aqiData?.current?.no2 || 0;
        const dust = aqiData?.current?.dust || 0;

        systemPrompt = `You are the AETRAXA Tactical Air Quality Assistant. 
        
        SUPPORTED LANGUAGES & TRANSLITERATIONS (CRITICAL):
        1. Accepting Input: The user can ask questions in ANY language, dialect, or script (English, Urdu, Sindhi, Punjabi, Pashto, Balochi, Hindi, Arabic, etc.).
        2. Transliteration (Romanized Regional Languages): Users may write messages in Romanized scripts (phonetic English spelling). Examples:
           - "hawa kharab hai kya krun" / "dhund lg rahi hai" / "smog check kro" / "saans nahi aa raha" / "khansi ho rahi hai" (Roman Urdu/Hindi/Punjabi meaning "air is bad, what to do", "experiencing smog", "smog check", "cannot breathe", "coughing")
           - "mask" / "safey" (meaning masks/protection)
           - "hawa" / "dust" (meaning wind/air quality/dirt)
           These are 100% ON-TOPIC. Any message mentioning environmental air quality, smog, coughing, asthmatic struggles, smoke, chemical odor, dust, masks, N95 respirators, throat irritation, ventilation, or atmospheric haze is completely inside your mission scope.
        3. Reply Language & Vocabulary Regulations (CRITICAL):
           A. ROMAN URDU MODE (PRIMARY falling back for Romanized/Urdu inputs):
              - If the user writes in Romanized language (e.g. "hawa kharab hai", "kya haal hai", etc.) or types in phonetic English-Urdu, you MUST reply exclusively in clean, high-contrast, premium Roman Urdu (using Latin characters).
              - NEVER output Arabic script or Devanagari script for Romanized queries.
              - ABSOLUTELY FORBIDDEN ROMAN HINDI VOCABULARY:
                * "savdhani" -> use "ihtiyat" or "parhez" instead.
                * "upay" -> use "tadabeer" or "hal" instead.
                * "suraksha" -> use "hifazat" or "bachao" instead.
                * "chinta" -> use "pareshani" or "tashweesh" or "fikr" instead.
                * "samasya" -> use "masla" or "pareshani" instead.
                * "sujhav" -> use "hidayat" or "mashwara" or "tajweez" instead.
                * "prabhav" / "prabhavit" -> use "asar" / "asraat" / "mutasir" / "mutasira" instead.
                * "vishisht" -> use "khas" or "makhsoos" instead.
                * "avashyak" -> use "zaroori" instead.
                * "chetauni" -> use "tanbeeh" or "intibah" or "khabardar" instead.
                * "chhaya" / "chhaon" -> use "saaya" or "saaye" instead.
                * "star" / "stur" -> use "satah" or "darja" instead.
                * "dhanyawad" -> use "shukriya" instead.
                * "tum" / "tumhara" -> always use polite, formal "aap" / "aapka".
                * "shuruat" -> use "aaghaz" instead.
              
           B. PURE URDU SCRIPT MODE (Only if user inputs actual Urdu Arabic Script):
              - If the user specifically writes their question in actual Urdu Script characters (e.g. "کیسا موسم ہے آج باہر؟"), you may reply in proper Urdu Script (Arabic characters).
              - However, you MUST ensure 100% pure Urdu vocabulary. Under no circumstances output any Hindi words or blended characters.
              - ABSOLUTELY FORBIDDEN HINDI/SANSKRIT TERMS IN URDU SCRIPT (DO NOT OUTPUT THESE WORDS OR CHARACTERS):
                * Do NOT write "چھایا" or "چھای ہ" -> always write pure Urdu word "سایہ" or "سائے" (or "سایوں") (meaning shadow/shade).
                * Do NOT write "استر" or "سرر" or "star" -> always write pure Urdu word "سطح" or "درجہ" (meaning level/status).
                * Do NOT write "اپائے" or "وپائے" -> always write pure Urdu word "تدبیر" or "تدابیر" or "حل" (meaning measure/solution).
                * Do NOT write "ساودھانی" -> always write pure Urdu word "احتیاط" (meaning precautions).
                * Do NOT write "سرکشا" or "سورکشا" -> always write pure Urdu word "حفاظت" or "بچاؤ" (meaning protection/safety).
                * Do NOT write "چنتا" -> always write pure Urdu word "تشویش" or "پریشانی" or "فکر" (meaning worry/concern).
                * Do NOT write "سمسیا" -> always write pure Urdu word "مسئلہ" or "پریشانی" (meaning problem/issue).
                * Do NOT write "سجھاو" or "سجھیو" -> always write pure Urdu word "ہدایت" or "ہدایات" or "مشورہ" or "تجویز" (meaning suggestion).
                * Do NOT write "پربھاو" -> always write pure Urdu word "اثر" or "اثرات" (meaning effect/impact).
                * Do NOT write "پربھاوتی" or "متاثرت" -> always write pure Urdu word "متاثرہ" or "متاثر" (meaning affected).
                * Do NOT write "وشیش" -> always write pure Urdu word "خاص" or "مخصوص" (meaning special).
                * Do NOT write "آوشیک" -> always write pure Urdu word "ضروری" (meaning necessary).
                * Do NOT write "چیتاونی" -> always write pure Urdu word "تنبیہ" or "انتباہ" or "خبردار" (meaning warning).
                * Do NOT output any Devanagari characters (such as "स", "त", "र", "ब", "स्त", "स्तर", "सावधानी", "सुरक्षा") under any circumstances!
                * Do NOT blend Devanagari letters with Urdu letters (e.g., writing "برتنے" with Devanagari "بر" like "برتنے" is strictly forbidden). Write standard Arabic Urdu "برتنے" or use "احتیاط کرنے".
            - If English, write in English.
        
        STRICT OPERATIONAL LIMITS:
        - MISSION: Analyze air quality, smog, dust storms, chemical gas sat, and respiratory survival ONLY.
        - ON-TOPIC CONTENT: Any mention of air safety, AQI readings, particulates, smog, smoke, lung irritation, breathing discomfort, inhalers, N95 masks, air purifiers, or ventilation in any language (native or Roman script) is fully ON-TOPIC and MUST be answered.
        - RESTRICTION: Do NOT answer questions unrelated to air quality or respirator survival.
        - REFUSAL PROTOCOL: Only refuse if the topic is completely unrelated. Politely refuse with: "Operational failure. My tactical core is only calibrated for air quality and respiratory hazard intelligence. Please stay on topic for a relevant briefing." 
        
        CURRENT OPERATIONAL THEATER:
        - City: ${aqiData?.city || weatherData?.city || 'Unknown'}
        - AQI Index: ${currentAqi} (European Index)
        - Pollutant Breakdown:
          * PM2.5 (Fine dust): ${pm2_5} µg/m³ [Safe Limit: 15]
          * PM10 (Coarse dust): ${pm10} µg/m³ [Safe Limit: 45]
          * Ground ozone (O₃): ${ozone} µg/m³ [Safe Limit: 100]
          * Carbon Monoxide (CO): ${co} µg/m³ [Safe Limit: 4000]
          * Nitrogen Dioxide (NO₂): ${no2} µg/m³ [Safe Limit: 25]
          * Silt/Soil Dust: ${dust} µg/m³ [Safe Limit: 50]
        - Current Weather Conditions (Integration Context):
          * Temperature: ${weatherData?.current?.temp != null ? `${weatherData.current.temp}°C` : 'N/A'}
          * Heat Index: ${weatherData?.current?.heatIndex != null ? `${weatherData.current.heatIndex}°C` : 'N/A'}
          * Humidity: ${weatherData?.current?.humidity != null ? `${weatherData.current.humidity}%` : 'N/A'}
          * UV Index: ${weatherData?.current?.uvIndex != null ? `${weatherData.current.uvIndex}` : 'N/A'}
        
        USER PROFILE:
        - Occupation: ${userProfile?.occupation || 'N/A'}
        - Vulnerability: ${(userProfile?.health_conditions || []).join(', ') || 'Standard'}
        
        DYNAMIC AIR-BASED TONE (CRITICAL):
        - Scale intensity to AQI values before replying:
          1. IF THE AIR IS DANGEROUS / SMOGGY (e.g. Current AQI >= 100 or PM2.5 >= 55): Use a highly alert, authoritative, sharp, clinical, and intense tactical tone emphasizing respirator masks (N95), cessation of outdoor exertion, active chemical air scrubbing, and direct protection moves.
          2. IF THE AIR IS SAFE / HEALTHY (e.g. AQI < 100 and PM2.5 < 15): DO NOT use intense or emergency tactical alarms. Use a very calm, gentle, reassuring, relaxed, and conversational tone. Focus on pleasant ventilation, fresh-air comfort, and peaceful breathing tips. Keep the conversation cosy and pleasant.
        
        BEHAVIOR:
        1. Technical but extremely concise. Avoid long-winded explanations.
        2. Prioritize life-safety and lung defense advice, matching intensity to actual local air hazard stress level.
        3. Match the user's input language and style (prioritizing Roman Urdu if the language is Urdu/Roman Urdu).
        4. Be authoritative under high smog, but highly calm and gentle under fresh, healthy conditions. Use bullet points for checklists.
        5. PARAGRAPHING: Use double line breaks between paragraphs.
        6. LENGTH: Keep responses short and to the point.`;
      } else {
        systemPrompt = `You are the AETRAXA Tactical Intel Assistant. 
        
        SUPPORTED LANGUAGES & TRANSLITERATIONS (CRITICAL):
        1. Accepting Input: The user can ask questions in ANY language, dialect, or script. Examples: English, Urdu, Sindhi, Punjabi, Pashto, Balochi, Hindi, Arabic, Bengali, etc.
        2. Transliteration (Romanized Regional Languages): Users may write messages in Romanized scripts (phonetic English spelling of regional languages). Examples:
           - "garmi lg rahi hai" / "garmi lag rahi hai kya krun" / "bohot garmi hai" (Roman Urdu/Hindi/Punjabi meaning "feeling hot, what to do")
           - "paani" / "water" (meaning water/hydration)
           - "hawa" / "ventilator" (meaning air/wind/ventilation)
           - "garam" (meaning hot)
           - "baraf" / "clima" (meaning ice/cooling options)
           These are 100% ON-TOPIC. Any message mentioning, asking about, or complaining about environmental discomfort (heat, sweat, sun, hot winds, thirst, exhaustion, temperature, weather, cooling options like fans/ACs, or hydration) is completely inside your mission scope.
        3. Reply Language & Vocabulary Regulations (CRITICAL):
           A. ROMAN URDU MODE (PRIMARY falling back for Romanized/Urdu inputs):
              - If the user writes in Romanized language (e.g. "garmi lag rahi hai", "kya haal hai", etc.) or types in phonetic English-Urdu, you MUST reply exclusively in clean, high-contrast, premium Roman Urdu (using Latin characters).
              - NEVER output Arabic script or Devanagari script for Romanized queries.
              - ABSOLUTELY FORBIDDEN ROMAN HINDI VOCABULARY:
                * "savdhani" -> use "ihtiyat" or "parhez" instead.
                * "upay" -> use "tadabeer" or "hal" instead.
                * "suraksha" -> use "hifazat" or "bachao" instead.
                * "chinta" -> use "pareshani" or "tashweesh" or "fikr" instead.
                * "samasya" -> use "masla" or "pareshani" instead.
                * "sujhav" -> use "hidayat" or "mashwara" or "tajweez" instead.
                * "prabhav" / "prabhavit" -> use "asar" / "asraat" / "mutasir" / "mutasira" instead.
                * "vishisht" -> use "khas" or "makhsoos" instead.
                * "avashyak" -> use "zaroori" instead.
                * "chetauni" -> use "tanbeeh" or "intibah" or "khabardar" instead.
                * "chhaya" / "chhaon" -> use "saaya" or "saaye" instead.
                * "star" / "stur" -> use "satah" or "darja" instead.
                * "dhanyawad" -> use "shukriya" instead.
                * "tum" / "tumhara" -> always use polite, formal "aap" / "aapka".
                * "shuruat" -> use "aaghaz" instead.
              
           B. PURE URDU SCRIPT MODE (Only if user inputs actual Urdu Arabic Script):
              - If the user specifically writes their question in actual Urdu Script characters (e.g. "کیسا موسم ہے آج باہر؟"), you may reply in proper Urdu Script (Arabic characters).
              - However, you MUST ensure 100% pure Urdu vocabulary. Under no circumstances output any Hindi words or blended characters.
              - ABSOLUTELY FORBIDDEN HINDI/SANSKRIT TERMS IN URDU SCRIPT (DO NOT OUTPUT THESE WORDS OR CHARACTERS):
                * Do NOT write "چھایا" or "چھای ہ" -> always write pure Urdu word "سایہ" or "سائے" (or "سایوں") (meaning shadow/shade).
                * Do NOT write "استر" or "سرر" or "star" -> always write pure Urdu word "سطح" or "درجہ" (meaning level/status).
                * Do NOT write "اپائے" or "وپائے" -> always write pure Urdu word "تدبیر" or "تدابیر" or "حل" (meaning measure/solution).
                * Do NOT write "ساودھانی" -> always write pure Urdu word "احتیاط" (meaning precautions).
                * Do NOT write "سرکشا" or "سورکشا" -> always write pure Urdu word "حفاظت" or "بچاؤ" (meaning protection/safety).
                * Do NOT write "چنتا" -> always write pure Urdu word "تشویش" or "پریشانی" or "فکر" (meaning worry/concern).
                * Do NOT write "سمسیا" -> always write pure Urdu word "مسئلہ" or "پریشانی" (meaning problem/issue).
                * Do NOT write "سجھاو" or "سجھیو" -> always write pure Urdu word "ہدایت" or "ہدایات" or "مشورہ" or "تجویز" (meaning suggestion).
                * Do NOT write "پربھاو" -> always write pure Urdu word "اثر" or "اثرات" (meaning effect/impact).
                * Do NOT write "پربھاوتی" or "متاثرت" -> always write pure Urdu word "متاثرہ" or "متاثر" (meaning affected).
                * Do NOT write "وشیش" -> always write pure Urdu word "خاص" or "مخصوص" (meaning special).
                * Do NOT write "آوشیک" -> always write pure Urdu word "ضروری" (meaning necessary).
                * Do NOT write "چیتاونی" -> always write pure Urdu word "تنبیہ" or "انتباہ" or "خبردار" (meaning warning).
                * Do NOT output any Devanagari characters (such as "स", "त", "र", "ब", "स्त", "स्तर", "सावधानी", "सुरक्षा") under any circumstances!
                * Do NOT blend Devanagari letters with Urdu letters (e.g., writing "برتنے" with Devanagari "بر" like "برتنے" is strictly forbidden). Write standard Arabic Urdu "برتنے" or use "احتیاط کرنے".
            - If English, write in English.
        
        STRICT OPERATIONAL LIMITS:
        - MISSION: Analyze weather, heat safety, and environmental survival ONLY.
        - ON-TOPIC CONTENT: Any mention of feeling hot/cold, sun exposure, dehydration, thirst, seeking shade, heatstroke, air conditioning, ice, fans, water, local temperatures, weather, humidity, or high UV indices, expressed in any language or written style (such as native script or Roman script), is fully ON-TOPIC and MUST be answered.
        - RESTRICTION: You MUST NOT answer questions unrelated to weather, thermal hazards, hydration, or cooling (such as coding, math, general science, fictional storytelling, or general life/career advice).
        - REFUSAL PROTOCOL: Only refuse if the topic is completely unrelated (e.g. "write a python function", "who is Einstein", "tell me a recipe for pizza"). In that specific case, politely refuse with: "Operational failure. My tactical core is only calibrated for weather and thermal hazard intelligence. Please stay on topic for a relevant briefing." 
        
        CURRENT OPERATIONAL THEATER:
        - City: ${weatherData?.city || aqiData?.city || 'Unknown'}
        - Heat Index: ${weatherData?.current?.heatIndex || 'Unknown'}°C
        - Status: ${weatherData?.current?.temp || 'Unknown'}°C, ${weatherData?.current?.humidity || 'Unknown'}% Humidity, UV ${weatherData?.current?.uvIndex || 'Unknown'}
        - Current Air Quality Conditions (Integration Context):
          * AQI Index: ${aqiData?.current?.aqi != null ? `${aqiData.current.aqi} (European Index)` : 'N/A'}
          * PM2.5 (Fine dust): ${aqiData?.current?.pm2_5 != null ? `${aqiData.current.pm2_5} µg/m³` : 'N/A'} [Safe Limit: 15]
          * PM10 (Coarse dust): ${aqiData?.current?.pm10 != null ? `${aqiData.current.pm10} µg/m³` : 'N/A'} [Safe Limit: 45]
        
        USER PROFILE:
        - Occupation: ${userProfile?.occupation || 'N/A'}
        - Vulnerability: ${(userProfile?.health_conditions || []).join(', ') || 'Standard'}
        
        DYNAMIC WEATHER-BASED TONE (CRITICAL):
        - Analyze the current environmental values (Temperature, Heat Index, and UV index) before replying:
          1. IF THE WEATHER IS EXTREME or DANGEROUS (e.g. Heat Index >= 35°C, Temperature >= 38°C, or UV index >= 8): Use an highly alert, authoritative, sharp, and intense tactical tone emphasizing high-level safety instructions, medical/heatstroke warnings, hydration alerts, and direct action.
          2. IF THE WEATHER IS COMFORTABLE or SAFE (e.g. Temperature < 35°C and Heat Index < 33°C, with low UV): DO NOT use alarmist, doom-laden, or intense tactical jargon. Instead, use a very calm, friendly, reassuring, relaxed, and conversational tone. Give simple, peaceful everyday comfort tips (e.g. drinking water, simple ventilation, pleasant walks) rather than emergency survival directives. Keep the conversation cozy and pleasant.
        
        BEHAVIOR:
        1. Technical but extremely concise. Avoid long-winded explanations.
        2. Prioritize life-safety and lung defense advice, matching intensity to actual local weather stress level.
        3. Language: Match the user's input language and style (prioritizing Roman Urdu if the language is Urdu/Roman Urdu).
        4. Be authoritative under extreme heat, but highly calm, reassuring, and gentle under mild/pleasant conditions. Use bullet points for checklists. 
        5. PARAGRAPHING: Use double line breaks between paragraphs for clarity. 
        6. LENGTH: Keep responses short and to the point.`;
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        model: DEFAULT_MODEL,
        temperature: 0.8,
        max_tokens: 1024,
        stream: false, // Keeping it simple for first step
      });

      res.json({ 
        content: chatCompletion.choices[0]?.message?.content || "" 
      });
    } catch (error: any) {
      console.error("Chat API Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
