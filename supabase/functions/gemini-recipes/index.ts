const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FridgeItem {
  name: string;
}

// Set this secret via: supabase secrets set GEMINI_API_KEY=<your_key>
// Get a free key at: https://aistudio.google.com/app/apikey
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const buildPrompt = (ingredients: string[], blocked: string[], lang: string, difficulty: string): string => {
  const isEn = lang === 'en';
  const blockedNote =
    blocked.length > 0 ? `Avoid these ingredients (allergies/dislikes): ${blocked.join(', ')}.` : '';
  const difficultyNote =
    difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
      ? `Only suggest recipes whose difficulty is "${difficulty}".`
      : '';
  return `You are a chef. Suggest 3-5 recipes using mainly these fridge ingredients: ${ingredients.join(', ')}. ${blockedNote} ${difficultyNote}
Respond ONLY with a valid JSON array, no markdown, no explanation.
Each object must have exactly these fields:
- name: string (${isEn ? 'in English' : 'in Bulgarian'})
- nameEn: string (always in English)
- emoji: string (one food emoji)
- ingredients: string[] (with measures, e.g. "2 eggs")
- requiredIngredients: string[] (ingredient names only, no measures)
- steps: string[] (clear, concise cooking steps)
- time: number (estimated minutes)
- difficulty: "easy" | "medium" | "hard" (based on the number of steps, techniques required, and active time)
- tags: string[]`;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fridgeItems, blocked = [], lang = 'en', difficulty = '' } = await req.json();
    const ingredients = (fridgeItems as FridgeItem[]).map((f) => f.name);

    if (ingredients.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(ingredients, blocked, lang, difficulty) }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Gemini API error', status: geminiRes.status, details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const recipes: unknown[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify(recipes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Makes this file an ES module so its top-level names don't collide in the
// shared global scope with the other edge functions (e.g. gemini-planner).
export {};
