import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini API client
let aiClient = null;
function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Root redirect to landing.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Explicit static serving with MIME type headers & CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* ═══════════════ AI Manifestation Voice & Story APIs ═══════════════ */

// 1. Core Logic: Generate Present-Tense Immersive Manifestation Story
async function executeStoryGeneration(req, res) {
  try {
    const { desire, name, mood, language } = req.body || {};
    if (!desire || typeof desire !== 'string' || !desire.trim()) {
      return res.status(400).json({ error: 'Desire / goal description is required' });
    }

    let ai;
    try {
      ai = getAI();
    } catch (e) {
      console.warn('Gemini API key missing, using smart high-empathy fallback engine.');
      // Return high-quality structured fallback if API key is not yet set
      const isZh = /[\u4e00-\u9fa5]/.test(desire);
      if (isZh) {
        return res.json({
          title: `心愿已成 · ${desire.slice(0, 14)}`,
          affirmation: `我已经完全沉浸在【${desire}】的美好现实中，内心充盈且富足。`,
          story: `此时此刻，你正深深地呼吸着，空气中流动着温暖而安宁的气息。\n\n你环顾四周，阳光正轻柔地洒在你的身侧。曾几何时你所渴望的一切——“${desire}”，现在就真真切切地发生在你当下的生活里。每一个细节都是如此真实，你的嘴角不自觉地扬起微笑，胸口涌动着平静而巨大的喜悦与感激。\n\n所有过去的迷茫与追寻，都在这一刻化为了笃定。你正从容地享受着这份丰盛，每一步都踏在轻盈与自由的节奏上。这就是你亲手创造并拥有的生活，你深深地知道，你本就配得上所有的美好。\n\n把手轻轻放在心口，感受那份平稳而有力的心跳——现在的你，已经安住在属于你的理想之境中。`,
          sensoryAnchor: `轻轻把右手放在心口，感受平稳温热的心跳，对自己微笑。`,
          frequency: `528Hz`,
          mood: mood || `peaceful`
        });
      } else {
        return res.json({
          title: `Reality Realized · ${desire.slice(0, 20)}`,
          affirmation: `I am fully living in the reality of ${desire}, with peace, gratitude, and boundless ease.`,
          story: `Right now, in this very moment, take a slow, gentle breath. Feel the warm, grounding air filling your lungs.\n\nLook around you. Everything you once envisioned — "${desire}" — is here, unfolding naturally in your everyday life. You feel the physical sensation of ease in your shoulders, the deep knowing in your chest that you have arrived. You are no longer waiting or wishing; you are living it.\n\nListen to the calm rhythm of this reality. You wake up with purpose and spend your moments in joyful alignment. You are peaceful, abundant, and completely at home within yourself.\n\nPlace your hand gently over your heart. Feel that warm, steady pulse — you are already here, thriving in your dream.`,
          sensoryAnchor: `Place your hand over your heart, feel its steady warmth, and smile.`,
          frequency: `528Hz`,
          mood: mood || `peaceful`
        });
      }
    }

    const prompt = `User's Manifestation Goal / Dream: "${desire.trim()}"
User's Name: "${name ? name.trim() : 'Explorer'}"
Preferred Atmosphere / Mood: "${mood || 'peaceful'}"
Preferred Language: ${language || 'Auto-detect (Match the language of user input)'}

System Directive:
You are the master voice and immersive reality architect of Luminara & Stella.
Your goal is to guide the listener into a profound, hypnotic, sensory-rich, PRESENT-TENSE ("现在进行时") lived reality where their goal is ALREADY 100% manifested and being experienced RIGHT NOW.

STRICT WRITING RULES:
1. STRICTLY PRESENT TENSE: Never say "you will", "one day", "in the future". ALWAYS write in the immediate present ("此时此刻...", "你正...", "你感受到...", "Right now you are feeling...", "The warmth is resting on your shoulders...").
2. MULTI-SENSORY DETAIL: Evoke sights, soft ambient sounds, textures, scents (e.g. fresh breeze, warm tea, sunlit pages), and the calm physical certainty of being in this reality.
3. EMOTIONAL DEPTH: Evoke profound gratitude, relief, inner quietness, and deep fulfillment.
4. PACING: Write 3 to 4 poetic, gentle paragraphs (around 220-350 Chinese characters or 140-220 English words). Include natural breathing pauses (ellipses "...", dashes).
5. LANGUAGE: Match the user's language (if user inputted Chinese, output fluent, lyrical Chinese; if English, output English).

You MUST return a strictly valid JSON object with the following fields:
{
  "title": "A poetic 4-8 word title for this manifested scene",
  "affirmation": "One definitive present-tense I AM / 我已经... affirmation summarizing this reality",
  "story": "The complete present-tense sensory immersion story with paragraphs separated by newlines",
  "sensoryAnchor": "A physical sensory anchor trigger (e.g. 轻轻将手放在心口，感受温热心跳与深长呼吸)",
  "frequency": "528Hz" or "432Hz" or "639Hz",
  "mood": "calm" | "radiant" | "cosmic" | "ocean" | "forest"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '';
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Failed to parse story JSON');
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Error generating manifestation story:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate story' });
  }
}

// 2. Core Logic: High Quality Voice Synthesis (TTS) via Gemini Neural TTS
const voiceCache = new Map();

async function executeVoiceSynthesis(req, res) {
  try {
    const { text, voiceName, mood } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const cleanText = text.replace(/[\n\r]+/g, ' ').trim().slice(0, 1000);
    const validVoices = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';
    
    // Check in-memory cache
    const cacheKey = `${chosenVoice}:${mood || 'calm'}:${cleanText}`;
    if (voiceCache.has(cacheKey)) {
      return res.json(voiceCache.get(cacheKey));
    }

    const ai = getAI();
    
    // Expressive natural human narration prompt
    const isZh = /[\u4e00-\u9fa5]/.test(cleanText);
    const expressivePrompt = isZh
      ? `请以极其自然温润、充满临场沉浸感、带有轻柔呼吸起伏与舒缓治愈语调的真人声音诵读：${cleanText}`
      : `Please read in a deeply soothing, natural, intimate human voice with gentle pauses and warm emotional presence: ${cleanText}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: expressivePrompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const result = {
        audio: base64Audio,
        format: 'pcm',
        sampleRate: 24000,
        voice: chosenVoice,
        provider: 'gemini-neural-tts'
      };
      
      // Cache up to 100 entries
      if (voiceCache.size > 100) {
        const firstKey = voiceCache.keys().next().value;
        voiceCache.delete(firstKey);
      }
      voiceCache.set(cacheKey, result);

      res.json(result);
    } else {
      res.status(500).json({ error: 'No audio returned from model' });
    }
  } catch (err) {
    console.warn('Server Neural TTS not available or error:', err.message);
    res.status(500).json({ error: err.message || 'TTS unavailable, client will fallback' });
  }
}

// ═══════════════ Unified API Gateway (POST /api) ═══════════════
// Handles all actions via a single endpoint matching the Supabase Edge Function pattern
app.all('/api', async (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      status: 'online',
      service: 'Luminara Unified API Gateway (Local Server)',
      configured: {
        gemini: !!process.env.GEMINI_API_KEY,
        supabase: !!process.env.SUPABASE_URL
      },
      supportedActions: ['story', 'voice', 'health']
    });
  }

  const action = req.body?.action || req.query?.action;
  if (action === 'story' || action === 'manifest-story') {
    return await executeStoryGeneration(req, res);
  }
  if (action === 'voice' || action === 'manifest-voice') {
    return await executeVoiceSynthesis(req, res);
  }
  if (action === 'health' || action === 'ping') {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  }

  return res.status(400).json({
    error: `Unknown action: "${action}". Supported actions: "story", "voice", "health"`
  });
});

// Config Endpoint: Exposes client-safe environment variables (e.g. Supabase URL)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Legacy backward-compatible endpoints
app.post('/api/manifest-story', async (req, res) => {
  return await executeStoryGeneration(req, res);
});

app.post('/api/manifest-voice', async (req, res) => {
  return await executeVoiceSynthesis(req, res);
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Route fallback for known HTML pages or 404
app.get('/landing.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Generic catch-all for SPA paths without file extension
app.get('*', (req, res) => {
  if (!path.extname(req.path)) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Luminara running on http://0.0.0.0:${PORT}`);
});

