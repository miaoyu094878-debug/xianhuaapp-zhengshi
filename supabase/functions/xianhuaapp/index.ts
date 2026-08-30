// Supabase Edge Function: xianhuaapp (统一边缘函数网关)
// 运行环境: Deno (TypeScript)
// 作用: 集中管理所有需要第三方 API KEY 的安全业务逻辑：
//       - 故事与剧本 LLM: OpenRouter (minimax/minimax-m3:free) 或 Google Gemini
//       - 语音合成 TTS: ElevenLabs (eleven_multilingual_v2) 或 Google Gemini Neural Voice
//
// 部署命令 (CLI):
//   supabase functions deploy xianhuaapp --no-verify-jwt
//
// 密钥配置 (Supabase 后台 -> Project Settings -> Edge Functions -> Secrets):
//   OPENROUTER_API_KEY: OpenRouter API 密钥 (用于 minimax/minimax-m3:free 等大模型)
//   ELEVENLABS_API_KEY: ElevenLabs API 密钥 (用于拟真真人语音 TTS)
//   GEMINI_API_KEY: (可选) Google Gemini API 密钥

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

Deno.serve(async (req: Request) => {
  // 1. 处理浏览器的 OPTIONS 跨域预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 2. 健康检查 / 状态探测 (GET 请求)
  if (req.method === 'GET') {
    const hasOpenRouter = !!Deno.env.get('OPENROUTER_API_KEY');
    const hasElevenLabs = !!Deno.env.get('ELEVENLABS_API_KEY');
    const hasGemini = !!Deno.env.get('GEMINI_API_KEY');

    return new Response(
      JSON.stringify({
        status: 'online',
        service: 'Luminara Unified API Gateway',
        configuredSecrets: {
          OPENROUTER_API_KEY: hasOpenRouter,
          ELEVENLABS_API_KEY: hasElevenLabs,
          GEMINI_API_KEY: hasGemini
        },
        models: {
          llm: hasOpenRouter ? 'openrouter:minimax/minimax-m3:free' : (hasGemini ? 'gemini-2.5-flash' : 'none'),
          tts: hasElevenLabs ? 'elevenlabs:eleven_multilingual_v2' : (hasGemini ? 'gemini-3.1-flash-tts' : 'none')
        },
        supportedActions: ['story', 'voice', 'health']
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. POST 请求处理
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST or GET.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || url.searchParams.get('action') || url.pathname.split('/').pop() || '';

    switch (action) {
      // ══════════════════════════════════════════════════════════
      // 模块 1: 生成第一人称沉浸式显化剧本 (OpenRouter minimax-m3 / Gemini)
      // ══════════════════════════════════════════════════════════
      case 'story':
      case 'manifest-story':
        return await handleStory(body);

      // ══════════════════════════════════════════════════════════
      // 模块 2: 拟真真人语音合成 TTS (ElevenLabs / Gemini Neural Voice)
      // ══════════════════════════════════════════════════════════
      case 'voice':
      case 'manifest-voice':
        return await handleVoice(body);

      // ══════════════════════════════════════════════════════════
      // 模块 3: 网关连通性与密钥诊断
      // ══════════════════════════════════════════════════════════
      case 'health':
      case 'ping':
        return new Response(
          JSON.stringify({
            status: 'ok',
            time: new Date().toISOString(),
            secrets: {
              openrouter: !!Deno.env.get('OPENROUTER_API_KEY'),
              elevenlabs: !!Deno.env.get('ELEVENLABS_API_KEY'),
              gemini: !!Deno.env.get('GEMINI_API_KEY')
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown action: "${action}". Supported actions: "story", "voice", "health".`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err: any) {
    console.error('[API Gateway Error]:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 子业务逻辑 1: 显化剧本生成处理函数
// 优先使用 OpenRouter (minimax/minimax-m3:free)，次选 Gemini
// ─────────────────────────────────────────────────────────────
async function handleStory(body: any): Promise<Response> {
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');

  if (!openrouterKey && !geminiKey) {
    return new Response(
      JSON.stringify({
        error: 'Please configure OPENROUTER_API_KEY or GEMINI_API_KEY in Supabase Secrets'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { desire, name, mood, language } = body;
  if (!desire || typeof desire !== 'string' || !desire.trim()) {
    return new Response(
      JSON.stringify({ error: 'Desire / goal description is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

You MUST return ONLY a strictly valid JSON object (no markdown quotes, no wrapping text outside JSON):
{
  "title": "A poetic 4-8 word title for this manifested scene",
  "affirmation": "One definitive present-tense I AM / 我已经... affirmation summarizing this reality",
  "story": "The complete present-tense sensory immersion story with paragraphs separated by newlines",
  "sensoryAnchor": "A physical sensory anchor trigger (e.g. 轻轻将手放在心口，感受温热心跳与深长呼吸)",
  "frequency": "528Hz",
  "mood": "calm"
}`;

  // 方案 A: 优先使用 OpenRouter + minimax/minimax-m3:free
  if (openrouterKey) {
    try {
      const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.app',
          'X-Title': 'Luminara Manifestation'
        },
        body: JSON.stringify({
          model: 'minimax/minimax-m3:free',
          messages: [
            {
              role: 'system',
              content: 'You are the reality manifestation architect. Always output strictly valid JSON format matching the schema provided.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      if (openrouterRes.ok) {
        const orData = await openrouterRes.json();
        const rawContent = orData.choices?.[0]?.message?.content || '{}';
        const parsed = parseJsonSafely(rawContent);
        if (parsed && parsed.story) {
          parsed.provider = 'openrouter:minimax/minimax-m3:free';
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        const errTxt = await openrouterRes.text();
        console.warn('OpenRouter API returned error, checking Gemini fallback:', openrouterRes.status, errTxt);
      }
    } catch (e) {
      console.warn('OpenRouter request failed:', e);
    }
  }

  // 方案 B: 备用使用 Gemini Flash
  if (geminiKey) {
    const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(modelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = parseJsonSafely(rawText);
      parsed.provider = 'gemini-2.5-flash';
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(
    JSON.stringify({ error: 'Failed to generate story from configured AI providers' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─────────────────────────────────────────────────────────────
// 子业务逻辑 2: 拟真真人 TTS 语音合成处理函数
// 优先使用 ElevenLabs (eleven_multilingual_v2)，次选 Gemini Neural Voice
// ─────────────────────────────────────────────────────────────
async function handleVoice(body: any): Promise<Response> {
  const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');

  if (!elevenLabsKey && !geminiKey) {
    return new Response(
      JSON.stringify({
        error: 'Please configure ELEVENLABS_API_KEY or GEMINI_API_KEY in Supabase Secrets'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { text, voiceName, mood, voiceId } = body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return new Response(
      JSON.stringify({ error: 'Text is required for TTS synthesis' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const cleanText = text.replace(/[\n\r]+/g, ' ').trim().slice(0, 1000);

  // 方案 A: 优先使用 ElevenLabs 顶级拟真 TTS
  if (elevenLabsKey) {
    try {
      // ElevenLabs 经典音色库映射 (支持中文多语言模型 eleven_multilingual_v2)
      const voiceMap: Record<string, string> = {
        'QJksobp1edMNvmwcG5lm': 'QJksobp1edMNvmwcG5lm',
        'Custom1': 'QJksobp1edMNvmwcG5lm',
        'Kore': '21m00Tcm4TlvDq8ikWAM',   // Rachel (温润治愈女声)
        'Zephyr': 'EXAVITQu4vr4xnSDxMaL', // Bella (空灵清澈女声)
        'Puck': 'pNInz6obpgDQGcFmaJgB',   // Adam (温暖从容男声)
        'Charon': 'ErXwobaYiN019PkySvjV', // Antoni (深邃沉静男声)
        'Fenrir': 'VR6AewLTigWG4xSOukaG'  // Arnold (笃定自信男声)
      };

      const targetVoiceId = voiceId || voiceMap[voiceName] || (voiceName && voiceName.length >= 15 ? voiceName : 'QJksobp1edMNvmwcG5lm');
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true
          }
        })
      });

      if (elRes.ok) {
        const arrayBuf = await elRes.arrayBuffer();
        const base64Audio = bufferToBase64(new Uint8Array(arrayBuf));
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'mp3',
            provider: 'elevenlabs',
            model: 'eleven_multilingual_v2',
            voiceId: targetVoiceId
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const elErr = await elRes.text();
        console.warn('ElevenLabs API error, falling back to Gemini TTS:', elRes.status, elErr);
      }
    } catch (e) {
      console.warn('ElevenLabs request failed:', e);
    }
  }

  // 方案 B: 备用使用 Gemini Neural Voice TTS
  if (geminiKey) {
    const validVoices = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';
    const isZh = /[\u4e00-\u9fa5]/.test(cleanText);
    const expressivePrompt = isZh
      ? `请以极其自然温润、充满临场沉浸感、带有轻柔呼吸起伏与舒缓治愈语调的真人声音诵读：${cleanText}`
      : `Please read in a deeply soothing, natural, intimate human voice with gentle pauses and warm emotional presence: ${cleanText}`;

    const ttsModelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(ttsModelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: expressivePrompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: chosenVoice
              }
            }
          }
        }
      })
    });

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const base64Audio = geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'pcm',
            sampleRate: 24000,
            voice: chosenVoice,
            provider: 'gemini-neural-tts'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return new Response(
    JSON.stringify({ error: 'TTS voice synthesis failed across configured providers' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─────────────────────────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────────────────────────
function parseJsonSafely(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return { story: raw, title: '现在进行时显化之境', affirmation: '我已安住于此现实' };
  }
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
