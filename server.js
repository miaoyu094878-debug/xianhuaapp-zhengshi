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
          title: `心愿已成 · ${desire.slice(0, 10)}`,
          affirmation: `此时此刻，愿望已然成真。`,
          story: `深深吸气，此时此刻“${desire}”已在眼前真实展开，内心笃定而丰盈。`,
          sensoryAnchor: `轻轻把右手放在心口，感受平稳心跳。`,
          frequency: `528Hz`,
          mood: mood || `peaceful`
        });
      } else {
        return res.json({
          title: `Reality Realized`,
          affirmation: `I am fully living in my reality now.`,
          story: `Take a gentle breath. Right now, "${desire}" is already here with calm gratitude.`,
          sensoryAnchor: `Place your hand over your heart and smile.`,
          frequency: `528Hz`,
          mood: mood || `peaceful`
        });
      }
    }

    const isInputZh = /[\u4e00-\u9fa5]/.test(desire);
    const targetLang = language || (isInputZh ? 'Chinese (中文)' : 'English');

    const prompt = `User's Manifestation Goal / Dream: "${desire.trim()}"
User's Name: "${name ? name.trim() : 'Explorer'}"
Preferred Atmosphere / Mood: "${mood || 'peaceful'}"
Target Output Language: ${targetLang}

System Directive:
You are the master voice and immersive reality architect of Luminara & Stella.
Your goal is to guide the listener into a profound, hypnotic, sensory-rich, PRESENT-TENSE ("现在进行时") lived reality where their goal is ALREADY 100% manifested and being experienced RIGHT NOW.

STRICT WRITING RULES:
1. STRICT LANGUAGE MATCH: You MUST write the entire output in ${targetLang}. If the user's input is English, ALL titles, affirmations, stories, and anchors MUST be 100% in natural, fluent, evocative English (NO Chinese characters). If Chinese, output 100% in poetic Chinese.
2. STRICTLY PRESENT TENSE: Never say "you will", "one day", "in the future". ALWAYS write in the immediate present ("Right now you are...", "You feel...", "此时此刻...", "你正...").
3. MULTI-SENSORY DETAIL: Evoke sights, soft ambient sounds, textures, scents, and the calm physical certainty of being in this reality.
4. EMOTIONAL DEPTH: Evoke profound gratitude, relief, inner quietness, and deep fulfillment.
5. STRICT SINGLE PARAGRAPH (VOICE AUDITION MODE): The "story" MUST contain ONLY 1 single short paragraph. Absolutely NO extra paragraphs, NO line breaks (\\n).
6. ULTRA-SHORT & MINIMAL WORDS: Keep the story extremely brief — strictly 20 to 35 Chinese characters (or 15 to 25 English words). Exactly 1 or 2 short, evocative sentences so the user can test and audition voices with ultra-low latency and minimal token cost.

You MUST return a strictly valid JSON object with the following fields:
{
  "title": "A poetic 4-8 word title for this manifested scene (in ${targetLang})",
  "affirmation": "One definitive present-tense affirmation summarizing this reality (in ${targetLang})",
  "story": "The single short paragraph strictly between 20-35 characters for fast voice testing (in ${targetLang})",
  "sensoryAnchor": "A physical sensory anchor trigger (e.g. Place your hand gently over your heart...) (in ${targetLang})",
  "frequency": "528Hz" or "432Hz" or "639Hz",
  "mood": "calm" | "radiant" | "cosmic" | "ocean" | "forest"
}`;

    // 1. Try OpenRouter if key is available
    const openrouterKey = process.env.OPENROUTER_API_KEY || (process.env.GEMINI_API_KEY && (process.env.GEMINI_API_KEY.startsWith('sk-') || process.env.GEMINI_API_KEY.length > 30) ? process.env.GEMINI_API_KEY : null);
    if (openrouterKey) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are the reality manifestation architect. Always return valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          const rawText = orData.choices?.[0]?.message?.content || '';
          let parsed;
          try {
            parsed = JSON.parse(rawText);
          } catch (e) {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
          }
          if (parsed && parsed.story) {
            return res.json(parsed);
          }
        }
      } catch (e) {
        console.warn('OpenRouter story generation failed, attempting Gemini GenAI SDK:', e.message);
      }
    }

    // 2. Try Google GenAI SDK if available
    if (ai) {
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
    }
  } catch (err) {
    console.error('Error generating manifestation story:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate story' });
  }
}

// 2. Core Logic: High Quality Voice Synthesis (TTS) via Gemini Neural TTS & Cloned Voices
const voiceCache = new Map();
const voiceInFlight = new Map();

// Helper: Convert Raw 16-bit Mono PCM buffer to Standard WAV buffer
function pcmToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write('WAVE', 8);

  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

// Cached reference sample for gentle female voice cloning
let gentleFemaleReferenceCache = null;

async function getGentleFemaleReference(ai) {
  if (gentleFemaleReferenceCache) {
    return gentleFemaleReferenceCache;
  }
  try {
    const sampleText = '请深深地吸一口气，感受当下的平静与丰盛，让我们开启这段美好的显化旅程。';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: `请以极其自然温润、带有舒缓治愈语调的真人声音诵读：${sampleText}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          }
        }
      }
    });

    const pcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (pcmBase64) {
      const pcmBuffer = Buffer.from(pcmBase64, 'base64');
      const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1, 16);
      gentleFemaleReferenceCache = {
        audioBase64: wavBuffer.toString('base64'),
        text: sampleText
      };
      console.log('✨ [Fish Audio Clone] Successfully prepared gentle female voice reference sample.');
      return gentleFemaleReferenceCache;
    }
  } catch (err) {
    console.warn('Could not pre-synthesize gentle female voice reference:', err.message);
  }
  return null;
}

// Helper: convert 24kHz 16-bit mono PCM to WAV with 44-byte header
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // PCM = 1
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function executeVoiceSynthesis(req, res) {
  try {
    const { text, voiceName, voiceId, mood } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const cleanText = text.replace(/[\n\r]+/g, ' ').trim().slice(0, 1000);
    const targetVoiceId = voiceId || (voiceName && voiceName.length >= 15 ? voiceName : null);
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    const openrouterKey = req.headers['x-openrouter-key'] || req.body?.openrouterKey || process.env.OPENROUTER_API_KEY;
    const geminiEnvKey = process.env.GEMINI_API_KEY;
    // User stored OpenRouter API key inside GEMINI_API_KEY or OPENROUTER_API_KEY
    const effectiveOpenRouterKey = openrouterKey || geminiEnvKey;

    // Check in-memory cache
    const cacheKey = `${voiceName || voiceId || 'default'}:${mood || 'calm'}:${cleanText}`;
    if (voiceCache.has(cacheKey)) {
      return res.json(voiceCache.get(cacheKey));
    }
    if (voiceInFlight.has(cacheKey)) {
      try {
        const inFlightResult = await voiceInFlight.get(cacheKey);
        if (inFlightResult) return res.json(inFlightResult);
      } catch (e) {}
    }

    // 0. OpenRouter Qwen Audio 3.0 TTS Plus / Flash (Alibaba Tongyi Lab)
    const isQwenTTS = (typeof voiceName === 'string' && (voiceName.startsWith('qwen:') || voiceName.startsWith('qwen_tts:') || voiceName.includes('qwen-audio') || voiceName.startsWith('longan') || voiceName.startsWith('loong'))) ||
      (typeof voiceId === 'string' && (voiceId.startsWith('qwen:') || voiceId.startsWith('qwen_tts:') || voiceId.includes('qwen-audio') || voiceId.startsWith('longan') || voiceId.startsWith('loong')));

    if (isQwenTTS && effectiveOpenRouterKey) {
      if (voiceInFlight.has(cacheKey)) {
        try {
          const inFlightResult = await voiceInFlight.get(cacheKey);
          if (inFlightResult) return res.json(inFlightResult);
        } catch (e) {}
      }

      const qwenPromise = (async () => {
        try {
          const rawVoice = voiceName || voiceId || 'longanlingxin';
          let cleanVoice = rawVoice.replace(/^qwen(_tts)?:/, '').trim();

          // Suffix or alias mapping for all female voices
          if (cleanVoice === 'lingxin' || cleanVoice === 'Lingxin') cleanVoice = 'longanlingxin';
          if (cleanVoice === 'yuanfei' || cleanVoice === 'Yuanfei') cleanVoice = 'longanyuanfei';
          if (cleanVoice === 'lingxi' || cleanVoice === 'Lingxi') cleanVoice = 'longanlingxi';
          if (cleanVoice === 'xiaoxin' || cleanVoice === 'Xiaoxin') cleanVoice = 'longanxiaoxin';
          if (cleanVoice === 'fengyue' || cleanVoice === 'Fengyue') cleanVoice = 'longanfengyue';
          if (cleanVoice === 'huan' || cleanVoice === 'huanhuan') cleanVoice = 'longanhuan_v3.6';
          if (cleanVoice === 'jielidou' || cleanVoice === 'Jielidou') cleanVoice = 'longjielidou_v3.6';
          if (cleanVoice === 'eva' || cleanVoice === 'Eva') cleanVoice = 'loongeva_v3.6';
          // Legacy aliases fallback
          if (cleanVoice === 'lufeng' || cleanVoice === 'Lufeng') cleanVoice = 'longanlufeng';
          if (cleanVoice === 'john' || cleanVoice === 'John') cleanVoice = 'loongjohn';

          // Select model tier (Flash for fast/lightweight, Plus for ultra high fidelity)
          let targetModel = 'qwen/qwen-audio-3.0-tts-plus';
          if (cleanVoice === 'longanhuan_v3.6' || cleanVoice === 'longjielidou_v3.6' || cleanVoice === 'loongeva_v3.6' || cleanVoice === 'longanfengyue' || (typeof voiceName === 'string' && voiceName.includes('flash'))) {
            targetModel = 'qwen/qwen-audio-3.0-tts-flash';
          }

          console.log(`🎙️ [Qwen Audio 3.0] Calling OpenRouter model: ${targetModel}, voice: ${cleanVoice}`);

          let orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${effectiveOpenRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://luminara.ai',
              'X-Title': 'Luminara'
            },
            body: JSON.stringify({
              model: targetModel,
              input: cleanText,
              voice: cleanVoice,
              response_format: 'mp3'
            })
          });

          // If primary model tier failed, try alternate tier (plus <-> flash)
          if (!orRes.ok) {
            const altModel = targetModel === 'qwen/qwen-audio-3.0-tts-plus' ? 'qwen/qwen-audio-3.0-tts-flash' : 'qwen/qwen-audio-3.0-tts-plus';
            console.warn(`[Qwen TTS] ${targetModel} status: ${orRes.status}, trying fallback tier: ${altModel}`);
            const retryRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${effectiveOpenRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://luminara.ai',
                'X-Title': 'Luminara'
              },
              body: JSON.stringify({
                model: altModel,
                input: cleanText,
                voice: cleanVoice,
                response_format: 'mp3'
              })
            });
            if (retryRes.ok) {
              orRes = retryRes;
              targetModel = altModel;
            }
          }

          if (orRes.ok) {
            const arrayBuffer = await orRes.arrayBuffer();
            const buf = Buffer.from(arrayBuffer);
            let format = 'mp3';
            if (buf.length >= 4 && buf.slice(0, 4).toString('ascii') === 'RIFF') {
              format = 'wav';
            }
            const base64Audio = buf.toString('base64');
            const result = {
              audio: base64Audio,
              format: format,
              provider: 'openrouter-qwen-tts',
              model: targetModel,
              voice: cleanVoice
            };
            if (voiceCache.size > 100) {
              const firstKey = voiceCache.keys().next().value;
              voiceCache.delete(firstKey);
            }
            voiceCache.set(cacheKey, result);
            return result;
          } else {
            const errText = await orRes.text();
            console.warn('OpenRouter Qwen Audio 3.0 TTS returned status:', orRes.status, errText);
          }
        } catch (e) {
          console.warn('OpenRouter Qwen Audio 3.0 TTS fetch error:', e.message);
        }
        return null;
      })();

      voiceInFlight.set(cacheKey, qwenPromise);
      try {
        const qwenResult = await qwenPromise;
        if (qwenResult) return res.json(qwenResult);
      } finally {
        voiceInFlight.delete(cacheKey);
      }
    }

    // 1. OpenRouter Gemini 3.1 Flash TTS (Explicit openrouter: prefix)
    const isOpenRouterGeminiTTS = (typeof voiceName === 'string' && (voiceName.startsWith('openrouter:') || voiceName.startsWith('openrouter_tts:'))) ||
      (typeof voiceId === 'string' && (voiceId.startsWith('openrouter:') || voiceId.startsWith('openrouter_tts:')));

    if (isOpenRouterGeminiTTS && effectiveOpenRouterKey) {
      if (voiceInFlight.has(cacheKey)) {
        try {
          const inFlightResult = await voiceInFlight.get(cacheKey);
          if (inFlightResult) return res.json(inFlightResult);
        } catch (e) {}
      }

      const orPromise = (async () => {
        try {
          const rawVoice = voiceName || voiceId || 'Zephyr';
          const cleanVoice = rawVoice.replace(/^openrouter(_tts)?:/, '');
          const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${effectiveOpenRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://luminara.ai',
              'X-Title': 'Luminara'
            },
            body: JSON.stringify({
              model: 'google/gemini-3.1-flash-tts-preview',
              input: cleanText,
              voice: cleanVoice,
              response_format: 'pcm'
            })
          });

          if (orRes.ok) {
            const arrayBuffer = await orRes.arrayBuffer();
            const pcmBuf = Buffer.from(arrayBuffer);
            const wavBuf = pcmToWav(pcmBuf, 24000, 1, 16);
            const base64Audio = wavBuf.toString('base64');
            const result = {
              audio: base64Audio,
              format: 'wav',
              provider: 'openrouter-gemini-tts',
              model: 'google/gemini-3.1-flash-tts-preview',
              voice: cleanVoice
            };
            if (voiceCache.size > 100) {
              const firstKey = voiceCache.keys().next().value;
              voiceCache.delete(firstKey);
            }
            voiceCache.set(cacheKey, result);
            return result;
          } else {
            const errText = await orRes.text();
            console.warn('OpenRouter Gemini 3.1 Flash TTS returned status:', orRes.status, errText);
          }
        } catch (e) {
          console.warn('OpenRouter Gemini 3.1 Flash TTS fetch error:', e.message);
        }
        return null;
      })();

      voiceInFlight.set(cacheKey, orPromise);
      try {
        const orResult = await orPromise;
        if (orResult) return res.json(orResult);
      } finally {
        voiceInFlight.delete(cacheKey);
      }
    }

    // 2. Check if OpenRouter Kokoro 82M is requested
    const isKokoro = (typeof voiceName === 'string' && voiceName.includes('kokoro')) ||
      (typeof voiceId === 'string' && voiceId.includes('kokoro')) ||
      (typeof voiceName === 'string' && (voiceName.startsWith('af_') || voiceName.startsWith('bf_') || voiceName.startsWith('zf_') || voiceName.startsWith('am_') || voiceName.startsWith('bm_'))) ||
      (typeof voiceId === 'string' && (voiceId.startsWith('af_') || voiceId.startsWith('bf_') || voiceId.startsWith('zf_') || voiceId.startsWith('am_') || voiceId.startsWith('bm_')));

    if (isKokoro && effectiveOpenRouterKey) {
      try {
        let kokoroVoice = 'af_aoede'; // 默认精选灵动婉转清脆女声
        if (voiceName && (voiceName.startsWith('af_') || voiceName.startsWith('bf_') || voiceName.startsWith('zf_') || voiceName.startsWith('am_') || voiceName.startsWith('bm_'))) {
          kokoroVoice = voiceName;
        } else if (voiceId && (voiceId.startsWith('af_') || voiceId.startsWith('bf_') || voiceId.startsWith('zf_') || voiceId.startsWith('am_') || voiceId.startsWith('bm_'))) {
          kokoroVoice = voiceId;
        }

        const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveOpenRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          },
          body: JSON.stringify({
            model: 'hexgrad/kokoro-82m',
            input: cleanText,
            voice: kokoroVoice,
            response_format: 'mp3'
          })
        });

        if (orRes.ok) {
          const arrayBuffer = await orRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          const result = {
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-kokoro',
            model: 'hexgrad/kokoro-82m',
            voice: kokoroVoice
          };
          if (voiceCache.size > 100) {
            const firstKey = voiceCache.keys().next().value;
            voiceCache.delete(firstKey);
          }
          voiceCache.set(cacheKey, result);
          return res.json(result);
        } else {
          const errText = await orRes.text();
          console.warn('OpenRouter Kokoro TTS returned non-200:', orRes.status, errText);
        }
      } catch (e) {
        console.warn('OpenRouter Kokoro TTS error:', e);
      }
    }

    // 3. Check if OpenRouter Fish Audio is requested (Stateless Voice Cloning)
    const isFishAudio = voiceName === 'fish-audio/s2.1-pro-free:free' ||
      (typeof voiceName === 'string' && voiceName.toLowerCase().includes('fish-audio')) ||
      (typeof voiceId === 'string' && voiceId.toLowerCase().includes('fish-audio'));

    if (isFishAudio && effectiveOpenRouterKey) {
      try {
        const payload = {
          model: 'fish-audio/s2.1-pro-free:free',
          input: cleanText,
          response_format: 'mp3'
        };

        const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveOpenRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          },
          body: JSON.stringify(payload)
        });

        if (orRes.ok) {
          const arrayBuffer = await orRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          const result = {
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-fish-audio',
            model: 'fish-audio/s2.1-pro-free:free',
            voice: 'fish-audio/s2.1-pro-free:free'
          };
          if (voiceCache.size > 100) {
            const firstKey = voiceCache.keys().next().value;
            voiceCache.delete(firstKey);
          }
          voiceCache.set(cacheKey, result);
          return res.json(result);
        } else {
          const errText = await orRes.text();
          console.warn('OpenRouter Fish Audio returned non-200:', orRes.status, errText);
        }
      } catch (e) {
        console.warn('OpenRouter Fish Audio fetch error, falling back:', e.message);
      }
    }

    // 4. 原版配置：ElevenLabs 映射与自定义音色
    const voiceMap = {
      'QJksobp1edMNvmwcG5lm': 'QJksobp1edMNvmwcG5lm',
      'Custom1': 'QJksobp1edMNvmwcG5lm',
      'Kore': '21m00Tcm4TlvDq8ikWAM',   // Rachel (温润治愈女声)
      'Zephyr': 'EXAVITQu4vr4xnSDxMaL', // Bella (空灵清澈女声)
      'Aoede': 'EXAVITQu4vr4xnSDxMaL',  // Bella (灵动抒情女声)
      'Puck': 'pNInz6obpgDQGcFmaJgB',   // Adam (温暖从容男声)
      'Charon': 'ErXwobaYiN019PkySvjV', // Antoni (深邃沉静男声)
      'Fenrir': 'VR6AewLTigWG4xSOukaG'  // Arnold (笃定自信男声)
    };

    const mappedVoiceId = (!isOpenRouterGeminiTTS && !isKokoro && !isFishAudio)
      ? (voiceId || voiceMap[voiceName] || (voiceName && !voiceName.startsWith('openrouter:') && voiceName.length >= 15 ? voiceName : null))
      : null;

    if (elevenKey && mappedVoiceId) {
      try {
        const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${mappedVoiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenKey
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.55,
              similarity_boost: 0.85,
              style: 0.15,
              use_speaker_boost: true
            }
          })
        });

        if (elRes.ok) {
          const arrayBuffer = await elRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          const result = {
            audio: base64Audio,
            format: 'mp3',
            provider: 'elevenlabs',
            voice: mappedVoiceId
          };
          if (voiceCache.size > 100) {
            const firstKey = voiceCache.keys().next().value;
            voiceCache.delete(firstKey);
          }
          voiceCache.set(cacheKey, result);
          return res.json(result);
        } else {
          const errText = await elRes.text();
          console.warn('ElevenLabs API returned non-200:', elRes.status, errText);
        }
      } catch (e) {
        console.warn('ElevenLabs fetch error, falling back:', e.message);
      }
    }

    // 5. 原版配置：Google Gemini Native Neural TTS SDK
    const validVoices = ['Zephyr', 'Kore', 'Aoede', 'Puck', 'Charon', 'Fenrir'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : (validVoices.includes(voiceId) ? voiceId : 'Zephyr');

    // Attempt OpenRouter speech endpoint with google/gemini-3.1-flash-tts-preview
    if (effectiveOpenRouterKey) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveOpenRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-tts-preview',
            input: cleanText,
            voice: chosenVoice,
            response_format: 'mp3'
          })
        });

        if (orRes.ok) {
          const arrayBuffer = await orRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          const result = {
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-gemini-tts',
            model: 'google/gemini-3.1-flash-tts-preview',
            voice: chosenVoice
          };
          if (voiceCache.size > 100) {
            const firstKey = voiceCache.keys().next().value;
            voiceCache.delete(firstKey);
          }
          voiceCache.set(cacheKey, result);
          return res.json(result);
        } else {
          const errText = await orRes.text();
          console.warn('OpenRouter Gemini 3.1 Flash TTS returned status:', orRes.status, errText);
        }
      } catch (e) {
        console.warn('OpenRouter Gemini 3.1 Flash TTS fetch error:', e.message);
      }
    }

    // 5. Fallback Engine: Google Gemini Native TTS SDK if Google Key is provided
    let ai = null;
    try {
      if (geminiEnvKey && !geminiEnvKey.startsWith('sk-')) {
        ai = getAI();
      }
    } catch (e) {
      console.warn('Google GenAI client unavailable, checking fallbacks:', e.message);
    }
    
    // Expressive natural human narration prompt
    const isZh = /[\u4e00-\u9fa5]/.test(cleanText);
    const expressivePrompt = isZh
      ? `请以极其空灵清澈、温润轻柔、带有自然呼吸起伏与舒缓疗愈语调的真人声音诵读：${cleanText}`
      : `Please read in an ethereal, crystal-clear, deeply soothing and intimate human voice with gentle natural breathing: ${cleanText}`;

    // Try available Gemini TTS models in sequence
    const ttsCandidateModels = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];
    let base64Audio = null;
    let usedModel = '';

    for (const m of ttsCandidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
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
        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          usedModel = m;
          break;
        }
      } catch (err) {
        console.warn(`TTS attempt with ${m} failed:`, err.message);
      }
    }

    if (base64Audio) {
      const result = {
        audio: base64Audio,
        format: 'pcm',
        sampleRate: 24000,
        voice: chosenVoice,
        model: usedModel,
        provider: 'gemini-neural-tts'
      };
      
      // Cache up to 100 entries
      if (voiceCache.size > 100) {
        const firstKey = voiceCache.keys().next().value;
        voiceCache.delete(firstKey);
      }
      voiceCache.set(cacheKey, result);

      return res.json(result);
    } else {
      return res.status(503).json({ error: 'TTS quota reached or model unavailable, using client audio engine' });
    }
  } catch (err) {
    console.warn('Server Neural TTS not available or error:', err.message);
    return res.status(503).json({ error: err.message || 'TTS unavailable' });
  }
}

/* ═══════════════ AI Vision: OpenRouter GPT Image 2 & MiniMax H3 Max ═══════════════ */

const SUPABASE_GATEWAY_URL = process.env.SUPABASE_URL 
  ? (process.env.SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/xianhuaapp')
  : 'https://bnxjwnvsmiqofbjiknwf.supabase.co/functions/v1/xianhuaapp';

function getValidOpenRouterKey(req, customKey) {
  const k = req.headers['x-openrouter-key'] || customKey || process.env.OPENROUTER_API_KEY;
  if (typeof k === 'string' && k.trim() && (k.startsWith('sk-or-') || k.startsWith('sk-ant-') || (k.startsWith('sk-') && !k.startsWith('AIza')))) {
    return k.trim();
  }
  return null;
}

async function executeVisionPhoto(req, res) {
  try {
    const { prompt, image, openrouterKey: customKey, aspect_ratio, quality, quality_mode } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please describe the vision or future scene you want to manifest.' });
    }

    const cleanPrompt = prompt.trim();
    const openrouterKey = getValidOpenRouterKey(req, customKey);

    const rawQuality = (quality || '').toLowerCase();
    let normalizedQuality = 'medium';
    if (rawQuality === 'high' || rawQuality === 'hd' || rawQuality === 'pro') {
      normalizedQuality = 'high';
    } else if (rawQuality === 'low' || rawQuality === 'standard' || rawQuality === 'iphone7') {
      normalizedQuality = 'low';
    } else if (rawQuality === 'medium' || rawQuality === 'auto') {
      normalizedQuality = rawQuality;
    }

    // If no direct OpenRouter key is provided, proxy to Supabase Edge Function (holds user's configured OPENROUTER_API_KEY)
    if (!openrouterKey) {
      console.log('[Vision Photo] No local OpenRouter key; proxying to Supabase Edge Function...');
      try {
        const supaRes = await fetch(SUPABASE_GATEWAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vision-photo',
            prompt: cleanPrompt,
            image: image || undefined,
            aspect_ratio: aspect_ratio || '1:1',
            quality: normalizedQuality,
            quality_mode: quality_mode || undefined
          })
        });
        const data = await supaRes.json();
        return res.status(supaRes.status).json(data);
      } catch (supaErr) {
        console.error('[Vision Photo] Supabase gateway failed:', supaErr.message);
        return res.status(502).json({ error: `Supabase gateway connection failed: ${supaErr.message}` });
      }
    }
    const reqBody = {
      model: 'openai/gpt-image-2',
      prompt: cleanPrompt,
      aspect_ratio: aspect_ratio || '1:1',
      quality: normalizedQuality
    };

    if (image && typeof image === 'string') {
      const formattedUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
      reqBody.input_references = [
        {
          type: 'image_url',
          image_url: { url: formattedUrl }
        }
      ];
    }

    console.log('[Vision Photo] Calling OpenRouter openai/gpt-image-2...');
    let orRes = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://luminara.ai',
        'X-Title': 'Luminara'
      },
      body: JSON.stringify(reqBody)
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.warn('[Vision Photo] /api/v1/images status:', orRes.status, errText);

      // Attempt standard OpenAI endpoint fallback
      const altBody = {
        model: 'openai/gpt-image-2',
        prompt: cleanPrompt,
        size: '1024x1024',
        quality: normalizedQuality
      };
      const retryRes = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.ai',
          'X-Title': 'Luminara'
        },
        body: JSON.stringify(altBody)
      });

      if (retryRes.ok) {
        orRes = retryRes;
      } else {
        return res.status(orRes.status || 500).json({
          error: `OpenRouter GPT Image 2 generation failed (${orRes.status}): ${errText}`
        });
      }
    }

    const data = await orRes.json();
    let imageUrl = null;

    if (data.data && Array.isArray(data.data) && data.data[0]) {
      const item = data.data[0];
      if (item.b64_json) {
        imageUrl = `data:${item.media_type || 'image/png'};base64,${item.b64_json}`;
      } else if (item.url) {
        imageUrl = item.url;
      }
    } else if (data.url) {
      imageUrl = data.url;
    } else if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      if (Array.isArray(content)) {
        const imgItem = content.find(c => c.type === 'image_url' || c.image_url);
        if (imgItem?.image_url?.url) imageUrl = imgItem.image_url.url;
      }
    }

    if (!imageUrl) {
      return res.status(502).json({ error: 'Could not extract generated image data from response.', raw: data });
    }

    return res.json({
      success: true,
      url: imageUrl,
      model: 'openai/gpt-image-2',
      prompt: cleanPrompt
    });
  } catch (err) {
    console.error('[Vision Photo] Error:', err);
    return res.status(500).json({ error: err.message || 'Error occurred while generating photo' });
  }
}

// ══════════════════════════════════════════════════════════
// AI Video Prompt Director: LLM Chain to enrich & clarify user intent
// Priority: 1. minimax/minimax-m3 -> 2. google/gemma-4-26b-a4b-it:free -> 3. openrouter/free
// ══════════════════════════════════════════════════════════
const FREE_VIDEO_DIRECTOR_LLMS = [
  'minimax/minimax-m3',
  'google/gemma-4-26b-a4b-it:free',
  'liquid/lfm-2.5-2.6b:free',
  'openrouter/free'
];

function extractCleanPromptContent(data) {
  if (!data) return '';
  const choice = data.choices?.[0];
  if (!choice) return '';
  const msg = choice.message || {};
  let content = (typeof msg.content === 'string' ? msg.content : '') || '';
  if (!content.trim() && (msg.reasoning || msg.reasoning_content)) {
    content = (typeof msg.reasoning === 'string' ? msg.reasoning : msg.reasoning_content) || '';
  }
  // Strip <think>...</think> blocks from reasoning models (e.g. Nex-N2.5, Dots3)
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  content = content.replace(/^["'`]|["'`]$/g, '').replace(/^(prompt|video prompt|cinematic prompt):\s*/i, '').trim();
  return content;
}

async function optimizeVideoPromptWithLLM({ rawPrompt, hasImage, qualityMode, cameraQuality, openrouterKey }) {
  if (!openrouterKey || !rawPrompt || !rawPrompt.trim()) {
    return { optimizedPrompt: null, modelUsed: null };
  }

  const cleanInput = rawPrompt.trim();
  const systemInstruction = `You are an elite cinematic AI Video Director and prompt engineer specializing in realistic video generation (specifically MiniMax Hailuo-3).
Your mission is to understand the user's authentic intent, resolve vague, metaphorical or colloquial phrasing, and transform it into a vivid, cinematic English video prompt.

CRITICAL DIRECTIVES:
1. SCENE DIRECTION, NEVER SPOKEN WORDS:
   - The user's input is a visual scene description, NEVER dialogue or singing lyrics.
   - NEVER direct the subject to mouth words, talk, or sing the user's prompt!
   - Explicitly instruct: lips relaxed or gentle closed smile, no singing, no spoken dialogue, no lip-sync, ambient environmental soundscape only.
2. TRANSLATE VACATION & LIFE INTENT INTO REAL VISUAL ENVIRONMENTS:
   - When the user asks for travel ("让她去旅行", "去旅游", "度假", "travel", "vacation"), place the subject into a breathtaking outdoor travel destination: e.g., walking leisurely along a sunlit Mediterranean seaside promenade with turquoise ocean views, or strolling along a picturesque European cobblestone avenue, holding a travel beverage, gentle sea breeze swaying her dark hair, confident serene smile, holiday travel atmosphere.
   - If the input is phrased as a command like "让她..." ("make her..."), direct what she is visibly doing in the cinematic scene.
3. NATURAL TEMPORAL MOTION (5-10 seconds):
   - Direct a realistic, smooth sequence of motion: start with a subtle action, transition into a gentle authentic reaction, natural eye contact or glance, gentle blinking, and realistic breathing motion. Avoid abrupt or impossible morphing.
4. CAMERA WORK & LIGHTING:
   - Detail cinematic cinematography: subtle handheld camera breathing or slow steady push-in (dolly in), soft natural lighting, flattering skin tones, shallow depth of field.
5. FIRST-FRAME CONTINUITY:
   ${hasImage ? '- A reference portrait image is provided as the first frame: seamlessly continue with the exact same person from the reference portrait, keeping 100% facial and character consistency while naturally placing them in the active scenic travel environment.' : '- Feature a believable, photorealistic human subject with lifelike presence.'}
6. FORMAT RULE:
   - Return ONLY the final cinematic English prompt text (between 45 and 90 words).
   - Do NOT output conversational filler, JSON, explanations, or quotes.`;

  for (const model of FREE_VIDEO_DIRECTOR_LLMS) {
    try {
      console.log(`🎬 [Video Prompt Director] Querying ${model} to understand and enrich user intent...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.ai',
          'X-Title': 'Luminara'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `User's video scene request: "${cleanInput}". Camera style preference: ${cameraQuality || qualityMode || 'natural mobile realism'}. ${hasImage ? 'First-frame reference portrait is attached.' : 'Pure text-to-video.'}` }
          ],
          temperature: 0.7,
          max_tokens: 450,
          include_reasoning: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = extractCleanPromptContent(data);
        if (content && content.length > 20) {
          console.log(`✨ [Video Prompt Director] Succeeded with ${model}: "${content.slice(0, 90)}..."`);
          return { optimizedPrompt: content, modelUsed: model };
        } else {
          console.warn(`⚠️ [Video Prompt Director] ${model} returned empty or unparseable content`);
        }
      } else {
        const errText = await response.text();
        console.warn(`⚠️ [Video Prompt Director] ${model} returned ${response.status}: ${errText.slice(0, 120)}`);
      }
    } catch (err) {
      console.warn(`⚠️ [Video Prompt Director] ${model} attempt failed:`, err.message);
    }
  }

  console.log('ℹ️ [Video Prompt Director] All director models busy or unavailable, proceeding with rule-based enhanced prompt.');
  return { optimizedPrompt: null, modelUsed: null };
}

async function executeOptimizeVideoPrompt(req, res) {
  try {
    const { prompt, image, openrouterKey: customKey, quality_mode, camera_quality } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const openrouterKey = getValidOpenRouterKey(req, customKey);
    if (!openrouterKey) {
      try {
        const supaRes = await fetch(SUPABASE_GATEWAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'optimize-video-prompt',
            prompt: prompt.trim(),
            image: image || undefined,
            quality_mode,
            camera_quality
          })
        });
        const data = await supaRes.json();
        return res.status(supaRes.status).json(data);
      } catch (supaErr) {
        return res.status(502).json({ error: `Supabase gateway failed: ${supaErr.message}` });
      }
    }

    const opt = await optimizeVideoPromptWithLLM({
      rawPrompt: prompt.trim(),
      hasImage: Boolean(image),
      qualityMode: quality_mode,
      cameraQuality: camera_quality,
      openrouterKey
    });

    if (opt.optimizedPrompt) {
      return res.json({
        success: true,
        optimizedPrompt: opt.optimizedPrompt,
        model: opt.modelUsed
      });
    } else {
      return res.status(503).json({
        success: false,
        error: 'AI 导演模型暂时繁忙或响应超时，您可稍后再试，或直接点击下方「Generate Motion Video」生成视频。'
      });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Optimization failed' });
  }
}

async function executeVisionVideo(req, res) {
  try {
    const { prompt, raw_prompt, image, openrouterKey: customKey, duration, aspect_ratio } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please describe the motion scene or video you want to generate.' });
    }

    const cleanPrompt = prompt.trim();
    const rawUserInput = (raw_prompt || prompt).trim();
    const openrouterKey = getValidOpenRouterKey(req, customKey);
    const targetDuration = Math.min(15, Math.max(5, parseInt(duration, 10) || 5));

    const targetResolution = (req.body?.resolution === '768p' || req.body?.resolution === '720p') ? '768p' : '480p';

    // If no direct OpenRouter key provided, proxy to Supabase Edge Function
    if (!openrouterKey) {
      console.log('[Vision Video] No local OpenRouter key; proxying to Supabase Edge Function...');
      try {
        const supaRes = await fetch(SUPABASE_GATEWAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vision-video',
            prompt: cleanPrompt,
            raw_prompt: rawUserInput,
            quality_mode: req.body?.quality_mode,
            camera_quality: req.body?.camera_quality,
            image: image || undefined,
            duration: targetDuration,
            resolution: targetResolution,
            aspect_ratio: aspect_ratio || '9:16'
          })
        });
        const data = await supaRes.json();
        return res.status(supaRes.status).json(data);
      } catch (supaErr) {
        console.error('[Vision Video] Supabase gateway failed:', supaErr.message);
        return res.status(502).json({ error: `Supabase gateway connection failed: ${supaErr.message}` });
      }
    }

    // Step 1: Attempt LLM-based prompt optimization to resolve user intent
    let finalPrompt = cleanPrompt;
    let directorModel = null;
    let optimizedPromptText = null;

    const optimization = await optimizeVideoPromptWithLLM({
      rawPrompt: rawUserInput,
      hasImage: Boolean(image),
      qualityMode: req.body?.quality_mode,
      cameraQuality: req.body?.camera_quality,
      openrouterKey
    });

    if (optimization.optimizedPrompt) {
      directorModel = optimization.modelUsed;
      optimizedPromptText = optimization.optimizedPrompt;
      const audioDirective = 'lips naturally relaxed or gentle closed smile, no singing, no spoken dialogue, no lip-sync, ambient environmental soundscape only';
      if (image) {
        finalPrompt = `Starting seamlessly from the reference portrait in the first frame, the exact same person naturally: ${optimizedPromptText}. Seamless character and facial consistency with reference image, natural eye blinks and subtle realistic breathing, smooth organic motion, ${audioDirective}.`;
      } else {
        finalPrompt = `${optimizedPromptText}, natural realistic character motion and lifelike presence, ${audioDirective}.`;
      }
      console.log(`🎬 [Vision Video] Prompt enriched by ${directorModel}: "${finalPrompt.slice(0, 100)}..."`);
    }

    const reqBody = {
      model: 'minimax/hailuo-3-max',
      prompt: finalPrompt,
      duration: targetDuration,
      resolution: targetResolution,
      aspect_ratio: aspect_ratio || '9:16'
    };

    if (image && typeof image === 'string') {
      const formattedUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
      reqBody.frame_images = [
        {
          type: 'image_url',
          frame_type: 'first_frame',
          image_url: { url: formattedUrl }
        }
      ];
    }

    console.log('[Vision Video] Requesting OpenRouter minimax/hailuo-3-max (' + targetDuration + 's)...');
    let orRes = await fetch('https://openrouter.ai/api/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://luminara.ai',
        'X-Title': 'Luminara'
      },
      body: JSON.stringify(reqBody)
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.warn('[Vision Video] /api/v1/videos error status:', orRes.status, errText);

      // If frame_images caused an issue, attempt input_references preserving the same portrait
      if (reqBody.frame_images && image) {
        const formattedUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
        console.log('[Vision Video] frame_images failed, retrying with input_references preserving portrait (' + targetDuration + 's)...');
        const retryRes = await fetch('https://openrouter.ai/api/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          },
          body: JSON.stringify({
            model: 'minimax/hailuo-3-max',
            prompt: finalPrompt,
            duration: targetDuration,
            resolution: targetResolution,
            aspect_ratio: aspect_ratio || '9:16',
            input_references: [
              {
                type: 'image_url',
                image_url: { url: formattedUrl }
              }
            ]
          })
        });
        if (retryRes.ok) {
          orRes = retryRes;
        } else {
          const retryErr = await retryRes.text();
          return res.status(orRes.status).json({
            error: `OpenRouter MiniMax H3 Max video submission rejected (${orRes.status}): ${errText} / ${retryErr}`
          });
        }
      } else {
        return res.status(orRes.status).json({
          error: `OpenRouter MiniMax H3 Max video submission failed (${orRes.status}): ${errText}`
        });
      }
    }

    const data = await orRes.json();
    const jobId = data.id || data.job_id || data.generation_id || (data.data && data.data.id);
    const pollingUrl = data.polling_url || (jobId ? `https://openrouter.ai/api/v1/videos/${jobId}` : null);

    return res.json({
      success: true,
      jobId: jobId,
      pollingUrl: pollingUrl,
      status: data.status || 'submitted',
      model: 'minimax/hailuo-3-max',
      prompt: finalPrompt,
      rawPrompt: rawUserInput,
      optimizedPrompt: optimizedPromptText,
      directorModel: directorModel
    });
  } catch (err) {
    console.error('[Vision Video] Error:', err);
    return res.status(500).json({ error: err.message || 'Video generation submission encountered an error' });
  }
}

async function executeVisionVideoStatus(req, res, targetJobId) {
  try {
    const jobId = targetJobId || req.params?.jobId || req.query?.jobId || req.body?.jobId;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const openrouterKey = getValidOpenRouterKey(req, req.query?.openrouterKey || req.body?.openrouterKey);

    // If no direct OpenRouter key, query Supabase Edge Gateway
    if (!openrouterKey) {
      try {
        const supaRes = await fetch(SUPABASE_GATEWAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vision-video-status',
            jobId: jobId
          })
        });
        const data = await supaRes.json();
        return res.status(supaRes.status).json(data);
      } catch (supaErr) {
        return res.status(502).json({ error: `Supabase status gateway error: ${supaErr.message}` });
      }
    }

    const orRes = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://luminara.ai',
        'X-Title': 'Luminara'
      }
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      return res.status(orRes.status).json({ error: `Status query failed (${orRes.status}): ${errText}` });
    }

    const data = await orRes.json();
    const status = data.status || (data.data && data.data.status) || 'processing';
    let rawUrl = 
      (data.unsigned_urls && data.unsigned_urls[0]) ||
      (data.data && data.data.unsigned_urls && data.data.unsigned_urls[0]) ||
      data.url || data.video_url ||
      (data.video && data.video.url) ||
      (data.result && data.result.url) ||
      (data.fastrouter_assets && data.fastrouter_assets.urls && data.fastrouter_assets.urls[0]) ||
      (data.data && (data.data.url || data.data.video_url));

    let finalVideoUrl = rawUrl;

    if (status === 'completed' || status === 'succeed') {
      try {
        const dlTarget = rawUrl || `https://openrouter.ai/api/v1/videos/${jobId}/content`;
        const vidFetch = await fetch(dlTarget, {
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          }
        });
        if (vidFetch.ok) {
          const contentType = vidFetch.headers.get('content-type') || 'video/mp4';
          const arrayBuf = await vidFetch.arrayBuffer();
          finalVideoUrl = `data:${contentType};base64,${Buffer.from(arrayBuf).toString('base64')}`;
        }
      } catch (dlErr) {
        console.warn('[Vision Video Status] Local base64 prefetch failed:', dlErr.message);
      }

      if (!finalVideoUrl) {
        finalVideoUrl = `/api/ai/vision/video/content/${jobId}`;
      }
    }

    return res.json({
      jobId: jobId,
      status: status,
      url: finalVideoUrl || null,
      raw_url: rawUrl || null,
      error: data.error || (data.data && data.data.error) || null,
      raw: data
    });
  } catch (err) {
    console.error('[Vision Video Status] Error:', err);
    return res.status(500).json({ error: err.message || 'Error occurred while querying video status' });
  }
}

async function executeVisionVideoContent(req, res, targetJobId) {
  const jobId = targetJobId || req.params?.jobId || req.query?.jobId || req.body?.jobId;
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  const userCustomKey = req.query?.key || req.headers['x-openrouter-key'] || req.body?.openrouterKey;
  const openrouterKey = getValidOpenRouterKey(req, userCustomKey);

  // 1. If direct OpenRouter key is available, fetch directly from OpenRouter
  if (openrouterKey) {
    try {
      const videoRes = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}/content`, {
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://luminara.ai',
          'X-Title': 'Luminara'
        }
      });
      if (videoRes.ok) {
        res.setHeader('Content-Type', videoRes.headers.get('content-type') || 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        const arrayBuf = await videoRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }
    } catch (e) {
      console.warn('[Vision Video Content] Direct OpenRouter fetch error:', e.message);
    }
  }

  // 2. If no direct local key or direct fetch failed, proxy through Supabase Edge Function
  try {
    const supaRes = await fetch(SUPABASE_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vision-video-content',
        jobId: jobId
      })
    });
    if (supaRes.ok) {
      res.setHeader('Content-Type', supaRes.headers.get('content-type') || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      const arrayBuf = await supaRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    }

    // 3. Fallback: Query Supabase status to see if completed with base64 Data URL or public link
    const statusRes = await fetch(SUPABASE_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vision-video-status',
        jobId: jobId
      })
    });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.url && statusData.url.startsWith('data:')) {
        const parts = statusData.url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'video/mp4';
        const buffer = Buffer.from(parts[1], 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Accept-Ranges', 'bytes');
        return res.send(buffer);
      } else if (statusData.url && statusData.url.startsWith('http')) {
        return res.redirect(statusData.url);
      }
    }
  } catch (supaErr) {
    console.error('[Vision Video Content] Supabase proxy failed:', supaErr.message);
  }

  return res.status(404).send('Video content not ready or unavailable');
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
        openrouter: !!(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY),
        supabase: !!process.env.SUPABASE_URL
      },
      models: {
        visionPhoto: 'openai/gpt-image-2',
        visionVideo: 'minimax/hailuo-3-max'
      },
      supportedActions: ['story', 'voice', 'vision-photo', 'vision-video', 'vision-video-status', 'vision-video-content', 'health']
    });
  }

  const action = req.body?.action || req.query?.action;
  if (action === 'story' || action === 'manifest-story') {
    return await executeStoryGeneration(req, res);
  }
  if (action === 'voice' || action === 'manifest-voice') {
    return await executeVoiceSynthesis(req, res);
  }
  if (action === 'vision-photo' || action === 'photo') {
    return await executeVisionPhoto(req, res);
  }
  if (action === 'vision-video' || action === 'video') {
    return await executeVisionVideo(req, res);
  }
  if (action === 'optimize-video-prompt' || action === 'optimize-prompt') {
    return await executeOptimizeVideoPrompt(req, res);
  }
  if (action === 'vision-video-status' || action === 'video-status') {
    return await executeVisionVideoStatus(req, res);
  }
  if (action === 'vision-video-content' || action === 'video-content') {
    return await executeVisionVideoContent(req, res);
  }
  if (action === 'health' || action === 'ping') {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  }

  return res.status(400).json({
    error: `Unknown action: "${action}". Supported actions: "story", "voice", "vision-photo", "vision-video", "optimize-video-prompt", "vision-video-status", "vision-video-content", "health"`
  });
});

// Dedicated REST Endpoints for AI Vision
app.post('/api/ai/vision/photo', async (req, res) => {
  return await executeVisionPhoto(req, res);
});

app.post('/api/ai/vision/video', async (req, res) => {
  return await executeVisionVideo(req, res);
});

app.post('/api/ai/vision/optimize-prompt', async (req, res) => {
  return await executeOptimizeVideoPrompt(req, res);
});

app.get('/api/ai/vision/video/status/:jobId', async (req, res) => {
  return await executeVisionVideoStatus(req, res, req.params.jobId);
});

app.get('/api/ai/vision/video/content/:jobId', async (req, res) => {
  return await executeVisionVideoContent(req, res, req.params.jobId);
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
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
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
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
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

