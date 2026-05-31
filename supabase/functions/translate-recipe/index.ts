import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reuses the GEMINI_API_KEY secret already configured for gemini-recipes.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

type Lang = 'en' | 'bg';

const languageName = (lang: Lang): string => (lang === 'en' ? 'English' : 'Bulgarian');

const buildPrompt = (
  recipe: { name: string; ingredients: string[]; steps: string[] },
  targetLang: Lang,
): string =>
  `You are a professional culinary translator. Translate the recipe below into ${languageName(targetLang)}.
Respond ONLY with a valid JSON object — no markdown, no explanation — with exactly these fields:
- name: string
- ingredients: string[] (same number of items and same order as the input)
- steps: string[] (same number of items and same order as the input)
Keep all measurements and numbers. Translate cooking terms naturally.

Recipe:
${JSON.stringify({ name: recipe.name, ingredients: recipe.ingredients, steps: recipe.steps })}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { recipeId, targetLang } = await req.json();
    if (typeof recipeId !== 'string' || (targetLang !== 'en' && targetLang !== 'bg')) {
      return json({ error: 'recipeId and targetLang ("en" | "bg") are required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Identify the caller so we can enforce recipe visibility below.
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // 1. Serve from the shared cache when present.
    const { data: cached } = await supabase
      .from('recipe_translations')
      .select('name, ingredients, steps')
      .eq('recipe_id', recipeId)
      .eq('lang', targetLang)
      .maybeSingle();
    if (cached) return json({ ...cached, cached: true });

    // 2. Load the source recipe and confirm the caller may see it.
    const { data: recipe } = await supabase
      .from('recipes')
      .select('name, ingredients, steps, is_public, user_id')
      .eq('id', recipeId)
      .maybeSingle();
    if (!recipe) return json({ error: 'Recipe not found' }, 404);
    if (!recipe.is_public && recipe.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

    // 3. Translate via Gemini.
    const geminiRes = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY') ?? ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(recipe, targetLang) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });
    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiRes.status, await geminiRes.text());
      return json({ error: 'Gemini API error', status: geminiRes.status }, 502);
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'Could not parse translation' }, 502);

    const parsed = JSON.parse(match[0]) as { name?: string; ingredients?: string[]; steps?: string[] };
    const translation = {
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : recipe.name,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : recipe.ingredients,
      steps: Array.isArray(parsed.steps) ? parsed.steps : recipe.steps,
    };

    // 4. Cache it for every future viewer (best-effort — a write failure still
    //    returns the translation; the invalidation trigger keeps it fresh).
    await supabase.from('recipe_translations').upsert({
      recipe_id: recipeId,
      lang: targetLang,
      name: translation.name,
      ingredients: translation.ingredients,
      steps: translation.steps,
    });

    return json({ ...translation, cached: false });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

// Keeps this file an ES module so its top-level names don't collide with the
// other edge functions in the shared global scope.
export {};
