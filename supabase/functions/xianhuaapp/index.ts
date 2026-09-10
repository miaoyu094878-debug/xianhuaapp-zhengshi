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
      // 模块 3: AI 目标愿景写真 (OpenRouter: openai/gpt-image-2)
      // ══════════════════════════════════════════════════════════
      case 'vision-photo':
      case 'photo':
        return await handleVisionPhoto(body);

      // ══════════════════════════════════════════════════════════
      // 模块 4: AI 目标动态视频 (OpenRouter: minimax/hailuo-3-max)
      // ══════════════════════════════════════════════════════════
      case 'vision-video':
      case 'video':
        return await handleVisionVideo(body);

      case 'optimize-video-prompt':
      case 'optimize-prompt':
        return await handleOptimizeVideoPrompt(body);

      case 'vision-video-status':
      case 'video-status':
        return await handleVisionVideoStatus(body);

      case 'vision-video-content':
      case 'video-content':
        return await handleVisionVideoContent(body);

      // ══════════════════════════════════════════════════════════
      // 模块 5: 网关连通性与密钥诊断
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
            },
            models: {
              visionPhoto: 'openai/gpt-image-2',
              visionVideo: 'minimax/hailuo-3-max'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown action: "${action}". Supported actions: "story", "voice", "vision-photo", "vision-video", "vision-video-status", "health".`
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
5. STRICT SINGLE PARAGRAPH (VOICE AUDITION MODE): The "story" MUST contain ONLY 1 single short paragraph. Absolutely NO extra paragraphs, NO line breaks (\n).
6. ULTRA-SHORT & MINIMAL WORDS: Keep the story extremely brief — strictly 20 to 35 Chinese characters (or 15 to 25 English words). Exactly 1 or 2 short, evocative sentences so the user can test and audition voices with ultra-low latency and minimal token cost.

You MUST return ONLY a strictly valid JSON object (no markdown quotes, no wrapping text outside JSON):
{
  "title": "A poetic 4-8 word title for this manifested scene (in ${targetLang})",
  "affirmation": "One definitive present-tense affirmation summarizing this reality (in ${targetLang})",
  "story": "The single short paragraph strictly between 20-35 characters for fast voice testing (in ${targetLang})",
  "sensoryAnchor": "A physical sensory anchor trigger (e.g. Place your hand gently over your heart...) (in ${targetLang})",
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
// 优先使用 OpenRouter (google/gemini-3.1-flash-tts-preview)，次选 ElevenLabs / Gemini Neural Voice
// ─────────────────────────────────────────────────────────────
async function handleVoice(body: any): Promise<Response> {
  const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  // 用户将 OpenRouter API 密钥存储到了 GEMINI_API_KEY 或 OPENROUTER_API_KEY
  const effectiveOpenRouterKey = openrouterKey || geminiKey;

  if (!elevenLabsKey && !openrouterKey && !geminiKey) {
    return new Response(
      JSON.stringify({
        error: 'Please configure OPENROUTER_API_KEY, ELEVENLABS_API_KEY or GEMINI_API_KEY in Supabase Secrets'
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

  // 方案 A-Qwen: 检查是否请求 Qwen Audio 3.0 TTS Plus / Flash (阿里通义实验室)
  const isQwenTTS = (typeof voiceName === 'string' && (voiceName.startsWith('qwen:') || voiceName.startsWith('qwen_tts:') || voiceName.includes('qwen-audio') || voiceName.startsWith('longan') || voiceName.startsWith('loong'))) ||
    (typeof voiceId === 'string' && (voiceId.startsWith('qwen:') || voiceId.startsWith('qwen_tts:') || voiceId.includes('qwen-audio') || voiceId.startsWith('longan') || voiceId.startsWith('loong')));

  if (isQwenTTS && effectiveOpenRouterKey) {
    try {
      const rawVoice = voiceName || voiceId || 'longanlingxin';
      let cleanVoice = rawVoice.replace(/^qwen(_tts)?:/, '').trim();

      // Suffix or alias mapping
      if (cleanVoice === 'lingxin' || cleanVoice === 'Lingxin') cleanVoice = 'longanlingxin';
      if (cleanVoice === 'yuanfei' || cleanVoice === 'Yuanfei') cleanVoice = 'longanyuanfei';
      if (cleanVoice === 'lingxi' || cleanVoice === 'Lingxi') cleanVoice = 'longanlingxi';
      if (cleanVoice === 'xiaoxin' || cleanVoice === 'Xiaoxin') cleanVoice = 'longanxiaoxin';
      if (cleanVoice === 'fengyue' || cleanVoice === 'Fengyue') cleanVoice = 'longanfengyue';
      if (cleanVoice === 'huan' || cleanVoice === 'huanhuan') cleanVoice = 'longanhuan_v3.6';
      if (cleanVoice === 'jielidou' || cleanVoice === 'Jielidou') cleanVoice = 'longjielidou_v3.6';
      if (cleanVoice === 'eva' || cleanVoice === 'Eva') cleanVoice = 'loongeva_v3.6';
      if (cleanVoice === 'lufeng' || cleanVoice === 'Lufeng') cleanVoice = 'longanlufeng';
      if (cleanVoice === 'john' || cleanVoice === 'John') cleanVoice = 'loongjohn';

      let targetModel = 'qwen/qwen-audio-3.0-tts-plus';
      if (cleanVoice === 'longanhuan_v3.6' || cleanVoice === 'longjielidou_v3.6' || cleanVoice === 'loongeva_v3.6' || cleanVoice === 'longanfengyue' || (typeof voiceName === 'string' && voiceName.includes('flash'))) {
        targetModel = 'qwen/qwen-audio-3.0-tts-flash';
      }

      let orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveOpenRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.app',
          'X-Title': 'Luminara'
        },
        body: JSON.stringify({
          model: targetModel,
          input: cleanText,
          voice: cleanVoice,
          response_format: 'mp3'
        })
      });

      if (!orRes.ok) {
        const altModel = targetModel === 'qwen/qwen-audio-3.0-tts-plus' ? 'qwen/qwen-audio-3.0-tts-flash' : 'qwen/qwen-audio-3.0-tts-plus';
        const retryRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveOpenRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://luminara.app',
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
        const arrayBuf = await orRes.arrayBuffer();
        const base64Audio = bufferToBase64(new Uint8Array(arrayBuf));
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-qwen-tts',
            model: targetModel,
            voice: cleanVoice
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errText = await orRes.text();
        console.warn('OpenRouter Qwen Audio 3.0 TTS returned non-200 in Edge Function:', orRes.status, errText);
      }
    } catch (e) {
      console.warn('OpenRouter Qwen Audio 3.0 TTS error in edge function:', e);
    }
  }

  // 方案 A0: 检查是否显式请求 OpenRouter Gemini 3.1 Flash TTS (带 openrouter: 前缀)
  const isOpenRouterGeminiTTS = (typeof voiceName === 'string' && (voiceName.startsWith('openrouter:') || voiceName.startsWith('openrouter_tts:'))) ||
    (typeof voiceId === 'string' && (voiceId.startsWith('openrouter:') || voiceId.startsWith('openrouter_tts:')));

  if (isOpenRouterGeminiTTS && effectiveOpenRouterKey) {
    try {
      const rawVoice = voiceName || voiceId || 'Zephyr';
      const cleanVoice = rawVoice.replace(/^openrouter(_tts)?:/, '');
      const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveOpenRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.app',
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
        const arrayBuf = await orRes.arrayBuffer();
        const pcmBytes = new Uint8Array(arrayBuf);
        const wavBytes = pcmToWavUint8Array(pcmBytes, 24000, 1, 16);
        const base64Audio = bufferToBase64(wavBytes);
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'wav',
            provider: 'openrouter-gemini-tts',
            model: 'google/gemini-3.1-flash-tts-preview',
            voice: cleanVoice
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errText = await orRes.text();
        console.warn('OpenRouter Gemini 3.1 TTS returned status:', orRes.status, errText);
      }
    } catch (e) {
      console.warn('OpenRouter Gemini 3.1 TTS fetch error:', e);
    }
  }

  // 方案 A1: 检查是否指定 OpenRouter Kokoro 82M
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
          'HTTP-Referer': 'https://luminara.app',
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
        const arrayBuf = await orRes.arrayBuffer();
        const base64Audio = bufferToBase64(new Uint8Array(arrayBuf));
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-kokoro',
            model: 'hexgrad/kokoro-82m',
            voice: kokoroVoice
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errText = await orRes.text();
        console.warn('OpenRouter Kokoro TTS returned non-200 in Edge Function:', orRes.status, errText);
      }
    } catch (e) {
      console.warn('OpenRouter Kokoro TTS error in edge function:', e);
    }
  }

  // 方案 A2: 检查是否指定 OpenRouter Fish Audio (支持无状态声音克隆)
  const isFishAudio = voiceName === 'fish-audio/s2.1-pro-free:free' ||
    (typeof voiceName === 'string' && voiceName.toLowerCase().includes('fish-audio')) ||
    (typeof voiceId === 'string' && voiceId.toLowerCase().includes('fish-audio'));

  if (isFishAudio && effectiveOpenRouterKey) {
    try {
      const payload: any = {
        model: 'fish-audio/s2.1-pro-free:free',
        input: cleanText,
        response_format: 'mp3'
      };

      const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveOpenRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.app',
          'X-Title': 'Luminara'
        },
        body: JSON.stringify(payload)
      });

      if (orRes.ok) {
        const arrayBuf = await orRes.arrayBuffer();
        const base64Audio = bufferToBase64(new Uint8Array(arrayBuf));
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-fish-audio',
            model: 'fish-audio/s2.1-pro-free:free',
            voice: 'fish-audio/s2.1-pro-free:free'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.warn('OpenRouter Fish Audio error in edge function:', e);
    }
  }

  // 方案 B: 原版配置使用 ElevenLabs 顶级拟真 TTS
  const voiceMap: Record<string, string> = {
    'QJksobp1edMNvmwcG5lm': 'QJksobp1edMNvmwcG5lm',
    'Custom1': 'QJksobp1edMNvmwcG5lm',
    'Kore': '21m00Tcm4TlvDq8ikWAM',   // Rachel (温润治愈女声)
    'Zephyr': 'EXAVITQu4vr4xnSDxMaL', // Bella (空灵清澈女声)
    'Aoede': 'EXAVITQu4vr4xnSDxMaL',  // Bella (灵动抒情女声)
    'Puck': 'pNInz6obpgDQGcFmaJgB',   // Adam (温暖从容男声)
    'Charon': 'ErXwobaYiN019PkySvjV', // Antoni (深邃沉静男声)
    'Fenrir': 'VR6AewLTigWG4xSOukaG'  // Arnold (笃定自信男声)
  };

  const targetVoiceId = (!isOpenRouterGeminiTTS && !isKokoro && !isFishAudio)
    ? (voiceId || voiceMap[voiceName] || (voiceName && !voiceName.startsWith('openrouter:') && voiceName.length >= 15 ? voiceName : null))
    : null;

  if (elevenLabsKey && targetVoiceId) {
    try {
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
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.15,
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

  // 方案 C: 原版配置使用 Google 官方 Gemini Neural Voice TTS
  const validGeminiVoices = ['Zephyr', 'Kore', 'Aoede', 'Puck', 'Charon', 'Fenrir'];
  const chosenVoice = validGeminiVoices.includes(voiceName) ? voiceName : (validGeminiVoices.includes(voiceId) ? voiceId : 'Zephyr');

  if (effectiveOpenRouterKey) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveOpenRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.app',
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
        const arrayBuf = await orRes.arrayBuffer();
        const base64Audio = bufferToBase64(new Uint8Array(arrayBuf));
        return new Response(
          JSON.stringify({
            audio: base64Audio,
            format: 'mp3',
            provider: 'openrouter-gemini-tts',
            model: 'google/gemini-3.1-flash-tts-preview',
            voice: chosenVoice
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errText = await orRes.text();
        console.warn('OpenRouter Gemini 3.1 TTS returned status:', orRes.status, errText);
      }
    } catch (e) {
      console.warn('OpenRouter Gemini 3.1 TTS fetch error:', e);
    }
  }

  // 方案 B: 备用使用 ElevenLabs 顶级拟真 TTS
  if (elevenLabsKey && !isFishAudio && !isKokoro && voiceId && voiceId.length >= 15) {
    try {
      const targetVoiceId = voiceId;
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

  // 方案 C: 备用使用 Google 官方 Gemini Neural Voice TTS
  if (geminiKey && !geminiKey.startsWith('sk-')) {
    const isZh = /[\u4e00-\u9fa5]/.test(cleanText);
    const expressivePrompt = isZh
      ? `请以极其空灵清澈、温润轻柔、带有自然呼吸起伏与舒缓疗愈语调的真人声音诵读：${cleanText}`
      : `Please read in an ethereal, crystal-clear, deeply soothing and intimate human voice with gentle natural breathing: ${cleanText}`;

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

function pcmToWavUint8Array(pcm: Uint8Array, sampleRate = 24000, numChannels = 1, bitDepth = 16): Uint8Array {
  const header = new Uint8Array(44);
  const dataSize = pcm.length;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const view = new DataView(header.buffer);

  // "RIFF"
  header[0] = 0x52; header[1] = 0x49; header[2] = 0x46; header[3] = 0x46;
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  header[8] = 0x57; header[9] = 0x41; header[10] = 0x56; header[11] = 0x45;
  // "fmt "
  header[12] = 0x66; header[13] = 0x6d; header[14] = 0x74; header[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  // "data"
  header[36] = 0x64; header[37] = 0x61; header[38] = 0x74; header[39] = 0x61;
  view.setUint32(40, dataSize, true);

  const wav = new Uint8Array(44 + dataSize);
  wav.set(header, 0);
  wav.set(pcm, 44);
  return wav;
}

// ─────────────────────────────────────────────────────────────
// 子业务逻辑 3: AI Vision 照片生成 (OpenRouter: openai/gpt-image-2)
// ─────────────────────────────────────────────────────────────
async function handleVisionPhoto(body: any): Promise<Response> {
  const openrouterKey = body?.openrouterKey || Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!openrouterKey) {
    return new Response(
      JSON.stringify({ error: 'Please configure OPENROUTER_API_KEY in Supabase secrets or provide it in the request.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const prompt = (body?.prompt || '').trim();
  if (!prompt) {
    return new Response(
      JSON.stringify({ error: 'Please provide a vision prompt.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const rawQuality = (body?.quality || '').toLowerCase();
  let normalizedQuality = 'medium';
  if (rawQuality === 'high' || rawQuality === 'hd' || rawQuality === 'pro') {
    normalizedQuality = 'high';
  } else if (rawQuality === 'low' || rawQuality === 'standard' || rawQuality === 'iphone7') {
    normalizedQuality = 'low';
  } else if (rawQuality === 'medium' || rawQuality === 'auto') {
    normalizedQuality = rawQuality;
  }

  const reqBody: any = {
    model: 'openai/gpt-image-2',
    prompt: prompt,
    aspect_ratio: body?.aspect_ratio || '1:1',
    quality: normalizedQuality
  };

  if (body?.image && typeof body.image === 'string') {
    const formattedUrl = body.image.startsWith('data:') ? body.image : `data:image/jpeg;base64,${body.image}`;
    reqBody.input_references = [{ type: 'image_url', image_url: { url: formattedUrl } }];
  }

  try {
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
      // Try fallback to standard images endpoint
      const retryRes = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://luminara.ai',
          'X-Title': 'Luminara'
        },
        body: JSON.stringify({
          model: 'openai/gpt-image-2',
          prompt: prompt,
          size: '1024x1024',
          quality: normalizedQuality
        })
      });
      if (retryRes.ok) {
        orRes = retryRes;
      } else {
        return new Response(
          JSON.stringify({ error: `OpenRouter GPT Image 2 error (${orRes.status}): ${errText}` }),
          { status: orRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const data = await orRes.json();
    let imageUrl: string | null = null;
    if (data.data && Array.isArray(data.data) && data.data[0]) {
      const item = data.data[0];
      imageUrl = item.b64_json ? `data:${item.media_type || 'image/png'};base64,${item.b64_json}` : item.url;
    } else if (data.url) {
      imageUrl = data.url;
    }

    return new Response(
      JSON.stringify({ success: true, url: imageUrl, model: 'openai/gpt-image-2', prompt: prompt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error generating photo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// 子业务逻辑 4: AI Vision 视频生成与分镜导演优化
// LLM Fallback Sequence:
// 1. minimax/minimax-m3 -> 2. google/gemma-4-26b-a4b-it:free -> 3. openrouter/free
// ─────────────────────────────────────────────────────────────
const FREE_VIDEO_DIRECTOR_MODELS = [
  'minimax/minimax-m3',
  'google/gemma-4-26b-a4b-it:free',
  'liquid/lfm-2.5-2.6b:free',
  'openrouter/free'
];

function extractCleanPromptContent(data: any): string {
  if (!data) return '';
  const choice = data.choices?.[0];
  if (!choice) return '';
  const msg = choice.message || {};
  let content = (typeof msg.content === 'string' ? msg.content : '') || '';
  if (!content.trim() && (msg.reasoning || msg.reasoning_content)) {
    content = (typeof msg.reasoning === 'string' ? msg.reasoning : msg.reasoning_content) || '';
  }
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  content = content.replace(/^["'`]|["'`]$/g, '').replace(/^(prompt|video prompt|cinematic prompt):\s*/i, '').trim();
  return content;
}

async function optimizeVideoPromptWithLLM(params: {
  rawPrompt: string;
  hasImage: boolean;
  qualityMode?: string;
  cameraQuality?: string;
  openrouterKey: string;
}): Promise<{ optimizedPrompt: string | null; modelUsed: string | null }> {
  const { rawPrompt, hasImage, qualityMode, cameraQuality, openrouterKey } = params;
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

  for (const model of FREE_VIDEO_DIRECTOR_MODELS) {
    try {
      console.log(`🎬 [Edge Video Director] Querying ${model}...`);
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
          console.log(`✨ [Edge Video Director] Succeeded with ${model}: "${content.slice(0, 90)}..."`);
          return { optimizedPrompt: content, modelUsed: model };
        }
      } else {
        const errText = await response.text();
        console.warn(`⚠️ [Edge Video Director] ${model} returned ${response.status}: ${errText.slice(0, 120)}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ [Edge Video Director] ${model} attempt failed:`, err.message);
    }
  }

  return { optimizedPrompt: null, modelUsed: null };
}

async function handleOptimizeVideoPrompt(body: any): Promise<Response> {
  const openrouterKey = body?.openrouterKey || Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!openrouterKey) {
    return new Response(
      JSON.stringify({ error: 'Please configure OPENROUTER_API_KEY in Supabase secrets.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const prompt = (body?.prompt || '').trim();
  if (!prompt) {
    return new Response(
      JSON.stringify({ error: 'Prompt is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const opt = await optimizeVideoPromptWithLLM({
    rawPrompt: prompt,
    hasImage: Boolean(body?.image),
    qualityMode: body?.quality_mode,
    cameraQuality: body?.camera_quality,
    openrouterKey
  });

  return new Response(
    JSON.stringify({
      success: !!opt.optimizedPrompt,
      optimizedPrompt: opt.optimizedPrompt || prompt,
      model: opt.modelUsed
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleVisionVideo(body: any): Promise<Response> {
  const openrouterKey = body?.openrouterKey || Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!openrouterKey) {
    return new Response(
      JSON.stringify({ error: 'Please configure OPENROUTER_API_KEY in Supabase secrets or provide it in the request.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const prompt = (body?.prompt || '').trim();
  const rawUserInput = (body?.raw_prompt || prompt).trim();
  if (!prompt) {
    return new Response(
      JSON.stringify({ error: 'Please provide a vision prompt for the video.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const targetDuration = Math.min(15, Math.max(5, parseInt(body?.duration, 10) || 5));
  const targetResolution = (body?.resolution === '768p' || body?.resolution === '720p') ? '768p' : '480p';

  // Step 1: LLM optimization fallback chain
  let finalPrompt = prompt;
  let directorModel: string | null = null;
  let optimizedPromptText: string | null = null;

  const opt = await optimizeVideoPromptWithLLM({
    rawPrompt: rawUserInput,
    hasImage: Boolean(body?.image),
    qualityMode: body?.quality_mode,
    cameraQuality: body?.camera_quality,
    openrouterKey
  });

  if (opt.optimizedPrompt) {
    directorModel = opt.modelUsed;
    optimizedPromptText = opt.optimizedPrompt;
    const audioDirective = 'lips naturally relaxed or gentle closed smile, no singing, no spoken dialogue, no lip-sync, ambient environmental soundscape only';
    if (body?.image) {
      finalPrompt = `Starting seamlessly from the reference portrait in the first frame, the exact same person naturally: ${optimizedPromptText}. Seamless character and facial consistency with reference image, natural eye blinks and subtle realistic breathing, smooth organic motion, ${audioDirective}.`;
    } else {
      finalPrompt = `${optimizedPromptText}, natural realistic character motion and lifelike presence, ${audioDirective}.`;
    }
  }

  const reqBody: any = {
    model: 'minimax/hailuo-3-max',
    prompt: finalPrompt,
    duration: targetDuration,
    resolution: targetResolution,
    aspect_ratio: body?.aspect_ratio || '9:16'
  };

  if (body?.image && typeof body.image === 'string') {
    const formattedUrl = body.image.startsWith('data:') ? body.image : `data:image/jpeg;base64,${body.image}`;
    reqBody.frame_images = [
      {
        type: 'image_url',
        frame_type: 'first_frame',
        image_url: { url: formattedUrl }
      }
    ];
  }

  try {
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
      // If frame_images fails, try with input_references preserving the same portrait
      if (reqBody.frame_images && body?.image) {
        const formattedUrl = body.image.startsWith('data:') ? body.image : `data:image/jpeg;base64,${body.image}`;
        console.warn('[Vision Video] frame_images submission rejected, retrying with input_references...');
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
            aspect_ratio: body?.aspect_ratio || '9:16',
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
          return new Response(
            JSON.stringify({ error: `OpenRouter MiniMax H3 Max video rejected (${orRes.status}): ${errText} / ${retryErr}` }),
            { status: orRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: `MiniMax H3 Max error (${orRes.status}): ${errText}` }),
          { status: orRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const data = await orRes.json();
    const jobId = data.id || data.job_id || (data.data && data.data.id);
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        status: data.status || 'submitted',
        model: 'minimax/hailuo-3-max',
        prompt: finalPrompt,
        rawPrompt: rawUserInput,
        optimizedPrompt: optimizedPromptText,
        directorModel: directorModel
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error submitting video task' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleVisionVideoStatus(body: any): Promise<Response> {
  const openrouterKey = body?.openrouterKey || Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  const jobId = body?.jobId;
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const orRes = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://luminara.ai',
        'X-Title': 'Luminara'
      }
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      return new Response(JSON.stringify({ error: `Polling error: ${errText}` }), { status: orRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await orRes.json();
    const status = data.status || (data.data && data.data.status) || 'processing';

    // Comprehensive resolution of OpenRouter video URL across schemas
    let rawUrl = 
      (data.unsigned_urls && data.unsigned_urls[0]) ||
      (data.data && data.data.unsigned_urls && data.data.unsigned_urls[0]) ||
      data.url || data.video_url ||
      (data.video && data.video.url) ||
      (data.result && data.result.url) ||
      (data.fastrouter_assets && data.fastrouter_assets.urls && data.fastrouter_assets.urls[0]) ||
      (data.data && (data.data.url || data.data.video_url));

    let finalVideoUrl = rawUrl || null;

    // If completed and rawUrl requires OpenRouter Bearer authentication, download to base64 Data URL
    if (status === 'completed' || status === 'succeed') {
      try {
        const downloadTarget = rawUrl || `https://openrouter.ai/api/v1/videos/${jobId}/content`;
        const contentRes = await fetch(downloadTarget, {
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://luminara.ai',
            'X-Title': 'Luminara'
          }
        });

        if (contentRes.ok) {
          const contentType = contentRes.headers.get('content-type') || 'video/mp4';
          const arrayBuf = await contentRes.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuf);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < uint8.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)));
          }
          finalVideoUrl = `data:${contentType};base64,${btoa(binary)}`;
        }
      } catch (dlErr: any) {
        console.warn('[Vision Video Status] Pre-download to base64 failed, keeping raw URL:', dlErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        jobId: jobId,
        status: status,
        url: finalVideoUrl,
        raw_url: rawUrl || null,
        error: data.error || (data.data && data.data.error) || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function handleVisionVideoContent(body: any): Promise<Response> {
  const openrouterKey = body?.openrouterKey || Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  const jobId = body?.jobId;
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const videoRes = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}/content`, {
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://luminara.ai',
        'X-Title': 'Luminara'
      }
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      return new Response(JSON.stringify({ error: `Video content not ready (${videoRes.status}): ${errText}` }), {
        status: videoRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const arrayBuf = await videoRes.arrayBuffer();

    return new Response(arrayBuf, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': arrayBuf.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
