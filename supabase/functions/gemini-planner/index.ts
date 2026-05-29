const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecipeHint {
  name: string;
  nameEn?: string;
  tags: string[];
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const SLOTS = [
  '0_breakfast', '0_lunch', '0_dinner',
  '1_breakfast', '1_lunch', '1_dinner',
  '2_breakfast', '2_lunch', '2_dinner',
  '3_breakfast', '3_lunch', '3_dinner',
  '4_breakfast', '4_lunch', '4_dinner',
  '5_breakfast', '5_lunch', '5_dinner',
  '6_breakfast', '6_lunch', '6_dinner',
];

const buildPrompt = (
  recipes: RecipeHint[],
  blocked: string[],
  dietaryPrefs: string[],
  lang: string,
): string => {
  const isEn = lang === 'en';
  const recipeList = recipes
    .map((r, i) => `${i}: ${isEn ? (r.nameEn ?? r.name) : r.name} [${r.tags.slice(0, 3).join(', ')}]`)
    .join('\n');

  const blockedNote = blocked.length > 0
    ? `Do NOT pick recipes that contain these ingredients: ${blocked.join(', ')}.`
    : '';
  const prefsNote = dietaryPrefs.length > 0
    ? `Dietary preferences to favour: ${dietaryPrefs.join(', ')}.`
    : '';

  return `You are a meal planner. Assign one recipe to each meal slot for a 7-day week (day 0 = Monday … day 6 = Sunday).
Available recipes (index: name [tags]):
${recipeList}

${blockedNote} ${prefsNote}
Rules:
- Prefer breakfast-tagged recipes for breakfast slots, lunch-tagged for lunch, dinner-tagged for dinner.
- Vary the plan — repeat the same index at most twice per week.
- Use only integer indices from 0 to ${recipes.length - 1}.

Respond ONLY with a JSON object (no markdown, no explanation):
{"0_breakfast":index,"0_lunch":index,"0_dinner":index,"1_breakfast":index,"1_lunch":index,"1_dinner":index,"2_breakfast":index,"2_lunch":index,"2_dinner":index,"3_breakfast":index,"3_lunch":index,"3_dinner":index,"4_breakfast":index,"4_lunch":index,"4_dinner":index,"5_breakfast":index,"5_lunch":index,"5_dinner":index,"6_breakfast":index,"6_lunch":index,"6_dinner":index}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipes, blocked = [], dietaryPrefs = [], lang = 'en' } = await req.json();

    if (!Array.isArray(recipes) || recipes.length === 0) {
      return new Response(JSON.stringify({}), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(recipes as RecipeHint[], blocked, dietaryPrefs, lang) }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Gemini API error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Validate: keep only known slot keys with in-range integer indices
    const validated: Record<string, number> = {};
    for (const slot of SLOTS) {
      const val = raw[slot];
      const idx = typeof val === 'number' ? val : Number(val);
      if (Number.isInteger(idx) && idx >= 0 && idx < (recipes as RecipeHint[]).length) {
        validated[slot] = idx;
      }
    }

    return new Response(JSON.stringify(validated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
