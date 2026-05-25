import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import type { Recipe, Language } from '../../../shared/types';
import { DEFAULT_SETTINGS } from '../utils/cookbookTypes';
import type { CookbookSettings } from '../utils/cookbookTypes';

const FONTS = '/fonts';

Font.register({
  family: 'Serif',
  fonts: [
    { src: `${FONTS}/PTSerif-Regular.ttf`,    fontWeight: 400, fontStyle: 'normal' },
    { src: `${FONTS}/PTSerif-Italic.ttf`,     fontWeight: 400, fontStyle: 'italic' },
    { src: `${FONTS}/PTSerif-Bold.ttf`,       fontWeight: 700, fontStyle: 'normal' },
    { src: `${FONTS}/PTSerif-BoldItalic.ttf`, fontWeight: 700, fontStyle: 'italic' },
  ],
});
Font.register({
  family: 'Sans',
  fonts: [
    { src: `${FONTS}/PTSans-Regular.ttf`, fontWeight: 400, fontStyle: 'normal' },
    { src: `${FONTS}/PTSans-Bold.ttf`,    fontWeight: 700, fontStyle: 'normal' },
  ],
});
Font.register({
  family: 'Mono',
  fonts: [
    { src: `${FONTS}/PTMono-Regular.ttf`, fontWeight: 400, fontStyle: 'normal' },
  ],
});

export type { CookbookSettings } from '../utils/cookbookTypes';

interface CookbookPDFProps {
  title: string;
  author: string;
  intro: string;
  recipes: Recipe[];
  lang: Language;
  settings?: CookbookSettings;
}

const C = {
  paper: '#F5F1EA',
  paper2: '#EFEAE0',
  ink: '#1C1815',
  ink2: '#5A4F46',
  ink3: '#8B8278',
  line: '#E4DED2',
  clayDeep: '#6B3F26',
} as const;

const st = StyleSheet.create({
  spacer:  { flex: 1 },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.ink3, marginBottom: 8 },

  brandMark:      { fontWeight: 700, fontStyle: 'italic', fontSize: 26, color: C.ink },
  brandSub:       { fontSize: 7, letterSpacing: 1.4, textTransform: 'uppercase', color: C.ink3, marginTop: 4 },
  coverTitle:     { fontWeight: 700, fontStyle: 'italic', fontSize: 60, color: C.clayDeep, lineHeight: 1.05, marginBottom: 14 },
  coverIntro:     { fontWeight: 400, fontStyle: 'italic', fontSize: 14, color: C.ink2, lineHeight: 1.4, marginBottom: 12 },
  coverMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 28 },
  coverMetaText:  { fontSize: 7.5, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink3 },
  coverBottom:    { flexDirection: 'row', justifyContent: 'space-between' },
  coverBottomText:{ fontSize: 7.5, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink3 },

  tocItem:  { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  tocNum:   { fontSize: 7.5, letterSpacing: 1, color: C.ink3, width: 24 },
  tocName:  { fontWeight: 400, fontStyle: 'italic', fontSize: 15, color: C.ink, flex: 1 },
  tocTime:  { fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: C.ink3 },
  tocFoot:  { marginTop: 28, fontWeight: 400, fontStyle: 'italic', fontSize: 13, color: C.ink2, lineHeight: 1.4 },

  rTag:        { fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: C.ink2, backgroundColor: C.paper2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  rTime:       { fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: C.ink3 },
  rBody:       { flexDirection: 'row', gap: 32 },
  rIngs:       { flex: 0.8 },
  rMethod:     { flex: 1.2 },
  sectionLabel:{ fontSize: 7.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.ink3, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 8 },
  ingItem:     { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line, color: C.ink },
  stepRow:     { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.line },
  stepNum:     { fontWeight: 700, fontStyle: 'italic', fontSize: 22, color: C.clayDeep, lineHeight: 1, width: 26 },
  stepBody:    { flex: 1, lineHeight: 1.5, color: C.ink, paddingTop: 2 },
  rFootLabel:  { fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: C.ink3 },
  rFootPage:   { fontWeight: 700, fontStyle: 'italic', fontSize: 14, color: C.ink },

  colophonAttrib:{ fontWeight: 400, fontStyle: 'italic', fontSize: 13, color: C.ink2, marginTop: 20 },
  colophonMark:  { fontWeight: 700, fontStyle: 'italic', fontSize: 38, color: C.clayDeep, textAlign: 'right' },
});

export const CookbookPDF = ({ title, author, intro, recipes, lang, settings = DEFAULT_SETTINGS }: CookbookPDFProps) => {
  const isEnglish = lang === 'en';
  const today = new Date().toLocaleDateString(isEnglish ? 'en-GB' : 'bg-BG', { month: 'long', year: 'numeric' });

  const serif = 'Serif';
  const sans  = 'Sans';
  const mono  = 'Mono';

  // Settings-derived values
  const bodyFamily   = settings.bodyFont === 'serif' ? serif : settings.bodyFont === 'mono' ? mono : sans;
  const bodySize     = settings.bodySize;
  const titleSize    = settings.titleSize;
  const stepPadding  = Math.max(3, Math.round(bodySize * 0.5));

  const pagePad      = `${settings.pageMarginV}pt ${settings.pageMarginH}pt`;
  const ruleMargin   = 20;
  const metaMargin   = 16;
  const titleMargin  = 5;
  const sepMargin    = settings.recipeGap;
  const sepPadding   = Math.max(4, Math.round(settings.recipeGap * 0.9));
  const footerBottom = Math.max(7, Math.round(settings.pageMarginV / 2));

  const pageStyle = { backgroundColor: C.paper, padding: pagePad, flexDirection: 'column' as const };

  const pageHeading = (normal: string, accent: string) => (
    <Text style={{ fontFamily: serif, fontWeight: 700, fontStyle: 'normal', fontSize: 38, color: C.ink, lineHeight: 1.1, marginBottom: 24 }}>
      {normal}<Text style={{ fontStyle: 'italic', color: C.clayDeep }}>{accent}</Text>
    </Text>
  );

  return (
    <Document title={title} author={author}>

      {/* ── Cover ── */}
      <Page size="A4" style={pageStyle}>
        <Text style={[st.brandMark, { fontFamily: serif }]}>Ко-да-ям</Text>
        <Text style={[st.brandSub,  { fontFamily: mono  }]}>
          {isEnglish ? 'A quiet cookbook for picky eaters' : 'Тиха готварска книга за капризни хора'}
        </Text>
        <View style={st.spacer} />
        <Text style={[st.coverTitle, { fontFamily: serif }]}>{title}</Text>
        {intro !== '' && <Text style={[st.coverIntro, { fontFamily: serif }]}>{intro}</Text>}
        <View style={st.coverMeta}>
          <Text style={[st.coverMetaText, { fontFamily: mono }]}>{author}</Text>
          <Text style={[st.coverMetaText, { fontFamily: mono }]}> · </Text>
          <Text style={[st.coverMetaText, { fontFamily: mono }]}>{recipes.length} {isEnglish ? (recipes.length === 1 ? 'recipe' : 'recipes') : (recipes.length === 1 ? 'рецепта' : 'рецепти')}</Text>
          <Text style={[st.coverMetaText, { fontFamily: mono }]}> · </Text>
          <Text style={[st.coverMetaText, { fontFamily: mono }]}>{today}</Text>
        </View>
        <View style={st.spacer} />
        <View style={st.coverBottom}>
          <Text style={[st.coverBottomText, { fontFamily: mono }]}>{isEnglish ? 'Volume I' : 'Том I'}</Text>
          <Text style={[st.coverBottomText, { fontFamily: mono }]}>{isEnglish ? 'First edition' : 'Първо издание'}</Text>
        </View>
      </Page>

      {/* ── Table of contents ── */}
      <Page size="A4" style={pageStyle}>
        <Text style={[st.eyebrow, { fontFamily: mono }]}>{isEnglish ? 'Contents' : 'Съдържание'}</Text>
        {pageHeading(isEnglish ? 'A short ' : 'Кратко ', isEnglish ? 'index' : 'съдържание')}
        {recipes.map((recipe, i) => (
          <View key={recipe.id} style={st.tocItem}>
            <Text style={[st.tocNum,  { fontFamily: mono  }]}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={[st.tocName, { fontFamily: serif }]}>{isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name}</Text>
            <Text style={[st.tocTime, { fontFamily: mono  }]}>{recipe.time} {isEnglish ? 'min' : 'мин'}</Text>
          </View>
        ))}
        <Text style={[st.tocFoot, { fontFamily: serif }]}>
          {isEnglish
            ? 'Cook them in any order. Most are quiet weeknight food.'
            : 'Готви ги в произволен ред. Повечето са тиха храна за делник.'}
        </Text>
      </Page>

      {/* ── Recipe pages (natural flow) ── */}
      <Page size="A4" style={pageStyle}>
        {/* Fixed footer on every recipe page */}
        <Text
          fixed
          style={[st.rFootLabel, { fontFamily: mono, position: 'absolute', bottom: footerBottom, left: 28 }]}
        >
          Ко-да-ям · {title}
        </Text>
        <Text
          fixed
          render={({ pageNumber }) => String(pageNumber)}
          style={[st.rFootPage, { fontFamily: serif, position: 'absolute', bottom: footerBottom - 3, right: 28 }]}
        />

        {recipes.map((recipe, i) => {
          const name = isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name;
          const ingredients = isEnglish && recipe.ingredientsTranslated?.length
            ? recipe.ingredientsTranslated
            : recipe.ingredients;
          const steps = isEnglish && recipe.stepsTranslated?.length
            ? recipe.stepsTranslated
            : recipe.steps;

          return (
            <View
              key={recipe.id}
              style={i > 0 ? { marginTop: sepMargin, paddingTop: sepPadding, borderTopWidth: 1, borderTopColor: C.line } : {}}
            >
              {/*
                Header kept together so the title is never stranded at the
                bottom of a page without any content following it.
              */}
              <View wrap={false}>
                <Text style={[st.eyebrow, { fontFamily: mono }]}>
                  {isEnglish ? 'Recipe' : 'Рецепта'} · {String(i + 1).padStart(2, '0')} / {String(recipes.length).padStart(2, '0')}
                </Text>
                <Text style={{ fontFamily: serif, fontWeight: 700, fontStyle: 'italic', fontSize: titleSize, color: C.ink, lineHeight: 1.05, marginVertical: titleMargin }}>
                  {name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: metaMargin }}>
                  {recipe.tags.slice(0, 2).map(tag => (
                    <Text key={tag} style={[st.rTag, { fontFamily: mono }]}>{tag}</Text>
                  ))}
                  <Text style={[st.rTime, { fontFamily: mono }]}>{recipe.time} {isEnglish ? 'min' : 'мин'}</Text>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: ruleMargin }} />
                {/* Section labels are part of the header so they're never separated from content */}
                <View style={st.rBody}>
                  <View style={st.rIngs}>
                    <Text style={[st.sectionLabel, { fontFamily: mono }]}>{isEnglish ? 'Ingredients' : 'Съставки'}</Text>
                    {ingredients[0] != null && (
                      <Text style={[st.ingItem, { fontFamily: bodyFamily, fontSize: bodySize }]}>{ingredients[0]}</Text>
                    )}
                  </View>
                  <View style={st.rMethod}>
                    <Text style={[st.sectionLabel, { fontFamily: mono }]}>{isEnglish ? 'Method' : 'Метод'}</Text>
                    {steps[0] != null && (
                      <View style={[st.stepRow, { paddingVertical: stepPadding }]}>
                        <Text style={[st.stepNum, { fontFamily: serif }]}>01</Text>
                        <Text style={[st.stepBody, { fontFamily: bodyFamily, fontSize: bodySize }]}>{steps[0]}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Remaining ingredients and steps can flow across pages naturally */}
              {(ingredients.length > 1 || steps.length > 1) && (
                <View style={st.rBody}>
                  <View style={st.rIngs}>
                    {ingredients.slice(1).map((ing, j) => (
                      <Text key={`ing-${j}`} style={[st.ingItem, { fontFamily: bodyFamily, fontSize: bodySize }]}>{ing}</Text>
                    ))}
                  </View>
                  <View style={st.rMethod}>
                    {steps.slice(1).map((step, j) => (
                      <View key={`step-${j}`} style={[st.stepRow, { paddingVertical: stepPadding }]}>
                        <Text style={[st.stepNum, { fontFamily: serif }]}>{String(j + 2).padStart(2, '0')}</Text>
                        <Text style={[st.stepBody, { fontFamily: bodyFamily, fontSize: bodySize }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </Page>

      {/* ── Colophon ── */}
      <Page size="A4" style={pageStyle}>
        <Text style={[st.colophonAttrib, { fontFamily: serif }]}>
          {isEnglish ? 'Compiled by' : 'Съставена от'} {author} · {today}
        </Text>
        <View style={st.spacer} />
        <Text style={[st.colophonMark, { fontFamily: serif }]}>Ко-да-ям</Text>
      </Page>

    </Document>
  );
};
