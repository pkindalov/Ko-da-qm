import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import type { Recipe, Language } from '../../../shared/types';

// Full PT fonts (Latin + Cyrillic) bundled in /public/fonts/.
// Complete TTF files — not subset WOFF — so react-pdf's PDFKit can embed
// all glyphs correctly for both Latin and Cyrillic content.
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

interface CookbookPDFProps {
  title: string;
  author: string;
  intro: string;
  recipes: Recipe[];
  lang: Language;
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

// fontFamily is intentionally omitted from styles — it is applied per-element
// as an inline override using the language-derived family names below.
const st = StyleSheet.create({
  page:    { backgroundColor: C.paper, padding: '54pt 48pt', flexDirection: 'column' },
  spacer:  { flex: 1 },
  rule:    { borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 20 },

  eyebrow: { fontSize: 7.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.ink3, marginBottom: 12 },

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

  recipeTitle: { fontWeight: 700, fontStyle: 'italic', fontSize: 42, color: C.ink, lineHeight: 1.05, marginVertical: 6 },
  rMetaRow:    { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 },
  rTag:        { fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: C.ink2, backgroundColor: C.paper2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  rTime:       { fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: C.ink3 },
  rBody:       { flexDirection: 'row', gap: 32, flex: 1 },
  rIngs:       { flex: 0.8 },
  rMethod:     { flex: 1.2 },
  sectionLabel:{ fontSize: 7.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.ink3, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 8 },
  ingItem:     { fontSize: 11, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line, color: C.ink },
  stepRow:     { flexDirection: 'row', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  stepNum:     { fontWeight: 700, fontStyle: 'italic', fontSize: 24, color: C.clayDeep, lineHeight: 1, width: 26 },
  stepBody:    { flex: 1, fontSize: 11, lineHeight: 1.5, color: C.ink, paddingTop: 2 },
  rFoot:       { paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  rFootLabel:  { fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: C.ink3 },
  rFootPage:   { fontWeight: 700, fontStyle: 'italic', fontSize: 14, color: C.ink },

  colophonText:  { fontWeight: 400, fontStyle: 'italic', fontSize: 15, color: C.ink2, lineHeight: 1.5, marginBottom: 14 },
  colophonAttrib:{ fontWeight: 400, fontStyle: 'italic', fontSize: 13, color: C.ink2, marginTop: 20 },
  colophonMark:  { fontWeight: 700, fontStyle: 'italic', fontSize: 38, color: C.clayDeep, textAlign: 'right' },
});

export const CookbookPDF = ({ title, author, intro, recipes, lang }: CookbookPDFProps) => {
  const isEnglish = lang === 'en';
  const today = new Date().toLocaleDateString(isEnglish ? 'en-GB' : 'bg-BG', { month: 'long', year: 'numeric' });

  const serif = 'Serif';
  const sans  = 'Sans';
  const mono  = 'Mono';

  const pageHeading = (normal: string, accent: string) => (
    <Text style={{ fontFamily: serif, fontWeight: 700, fontStyle: 'normal', fontSize: 38, color: C.ink, lineHeight: 1.1, marginBottom: 28 }}>
      {normal}<Text style={{ fontStyle: 'italic', color: C.clayDeep }}>{accent}</Text>
    </Text>
  );

  return (
    <Document title={title} author={author}>

      {/* ── Cover ── */}
      <Page size="A4" style={st.page}>
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
          <Text style={[st.coverMetaText, { fontFamily: mono }]}>{recipes.length} {isEnglish ? 'recipes' : 'рецепти'}</Text>
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
      <Page size="A4" style={st.page}>
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

      {/* ── Recipe pages ── */}
      {recipes.map((recipe, i) => {
        const name = isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name;
        const ingredients = isEnglish && recipe.ingredientsTranslated?.length
          ? recipe.ingredientsTranslated
          : recipe.ingredients;
        const steps = isEnglish && recipe.stepsTranslated?.length
          ? recipe.stepsTranslated
          : recipe.steps;

        return (
          <Page key={recipe.id} size="A4" style={st.page}>
            <Text style={[st.eyebrow, { fontFamily: mono }]}>
              {isEnglish ? 'Recipe' : 'Рецепта'} · {String(i + 1).padStart(2, '0')} / {String(recipes.length).padStart(2, '0')}
            </Text>
            <Text style={[st.recipeTitle, { fontFamily: serif }]}>{name}</Text>
            <View style={st.rMetaRow}>
              {recipe.tags.slice(0, 2).map((tag) => (
                <Text key={tag} style={[st.rTag, { fontFamily: mono }]}>{tag}</Text>
              ))}
              <Text style={[st.rTime, { fontFamily: mono }]}>{recipe.time} {isEnglish ? 'minutes' : 'минути'}</Text>
            </View>
            <View style={st.rule} />

            <View style={st.rBody}>
              <View style={st.rIngs}>
                <Text style={[st.sectionLabel, { fontFamily: mono }]}>{isEnglish ? 'Ingredients' : 'Съставки'}</Text>
                {ingredients.map((ing, j) => (
                  <Text key={`ing-${j}`} style={[st.ingItem, { fontFamily: sans }]}>{ing}</Text>
                ))}
              </View>
              <View style={st.rMethod}>
                <Text style={[st.sectionLabel, { fontFamily: mono }]}>{isEnglish ? 'Method' : 'Метод'}</Text>
                {steps.map((step, j) => (
                  <View key={`step-${j}`} style={st.stepRow}>
                    <Text style={[st.stepNum,  { fontFamily: serif }]}>{String(j + 1).padStart(2, '0')}</Text>
                    <Text style={[st.stepBody, { fontFamily: sans  }]}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={st.rFoot}>
              <Text style={[st.rFootLabel, { fontFamily: mono  }]}>Ко-да-ям · {title}</Text>
              <Text style={[st.rFootPage,  { fontFamily: serif }]}>{i + 3}</Text>
            </View>
          </Page>
        );
      })}

      {/* ── Colophon ── */}
      <Page size="A4" style={st.page}>
        <Text style={[st.colophonAttrib, { fontFamily: serif }]}>
          {isEnglish ? 'Compiled by' : 'Съставена от'} {author} · {today}
        </Text>
        <View style={st.spacer} />
        <Text style={[st.colophonMark, { fontFamily: serif }]}>Ко-да-ям</Text>
      </Page>

    </Document>
  );
};
