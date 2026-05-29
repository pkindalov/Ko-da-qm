const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  availableIngredients: string[],
  existingRecipes: string[],
  blocked: string[],
  liked: string[],
  dietaryPrefs: string[],
  lang: string,
  scheduledNames: string[],
): string => {
  const isEn = lang === 'en';
  const ingredientsNote = availableIngredients.length > 0
    ? `Available ingredients: ${availableIngredients.join(', ')}.`
    : 'No specific ingredients provided — suggest common, easy-to-find recipes.';
  const existingNote = existingRecipes.length > 0
    ? `User's saved recipes (reuse these exact names when they fit well): ${existingRecipes.slice(0, 30).join(', ')}.`
    : '';
  const blockedNote = blocked.length > 0
    ? `IMPORTANT — do NOT suggest recipes containing any of these (allergies/dislikes): ${blocked.join(', ')}.`
    : '';
  const likedNote = liked.length > 0
    ? `User enjoys these foods — try to feature them where natural: ${liked.join(', ')}.`
    : '';
  const prefsNote = dietaryPrefs.length > 0
    ? `Dietary preferences: ${dietaryPrefs.join(', ')}.`
    : '';
  const scheduledNote = scheduledNames.length > 0
    ? `These recipes are already scheduled this week — avoid repeating them too much: ${scheduledNames.join(', ')}.`
    : '';

  return `You are a meal planner. Create a varied 7-day meal plan.
${ingredientsNote}
${existingNote}
${blockedNote}
${likedNote}
${prefsNote}
${scheduledNote}

Generate 6-10 unique recipes. Assign each of the 21 meal slots (days 0=Mon … 6=Sun) to one of those recipes.
Rules:
- Prefer breakfast-tagged recipes for breakfast slots, lunch for lunch, dinner for dinner.
- Vary the plan — avoid the same recipe in the same meal type on back-to-back days.
- Recipe names must be ${isEn ? 'in English' : 'in Bulgarian'}. Always include nameEn in English.
- If a saved recipe name fits, use that exact name so it gets matched.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "recipes": [
    {
      "name": "string",
      "nameEn": "string",
      "emoji": "string (one food emoji)",
      "tags": ["breakfast" or "lunch" or "dinner"],
      "ingredients": ["2 eggs", "..."],
      "requiredIngredients": ["eggs", "..."],
      "steps": ["step 1", "..."],
      "time": 20
    }
  ],
  "plan": {
    "0_breakfast": 0, "0_lunch": 1, "0_dinner": 2,
    "1_breakfast": 0, "1_lunch": 3, "1_dinner": 4,
    "2_breakfast": 1, "2_lunch": 2, "2_dinner": 5,
    "3_breakfast": 0, "3_lunch": 1, "3_dinner": 3,
    "4_breakfast": 2, "4_lunch": 4, "4_dinner": 5,
    "5_breakfast": 1, "5_lunch": 3, "5_dinner": 2,
    "6_breakfast": 0, "6_lunch": 4, "6_dinner": 5
  }
}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      availableIngredients = [],
      existingRecipes = [],
      blocked = [],
      liked = [],
      dietaryPrefs = [],
      lang = 'en',
      scheduledNames = [],
    } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(availableIngredients, existingRecipes, blocked, liked, dietaryPrefs, lang, scheduledNames) }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 3000 },
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

    const recipes = Array.isArray(raw.recipes) ? raw.recipes : [];
    const rawPlan = typeof raw.plan === 'object' && raw.plan !== null ? raw.plan : {};

    // Validate plan: keep only known slots with in-range integer indices
    const plan: Record<string, number> = {};
    for (const slot of SLOTS) {
      const val = rawPlan[slot];
      const idx = typeof val === 'number' ? val : Number(val);
      if (Number.isInteger(idx) && idx >= 0 && idx < recipes.length) {
        plan[slot] = idx;
      }
    }

    return new Response(JSON.stringify({ recipes, plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
