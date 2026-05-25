import type { Language, Recipe } from '../../../shared/types';

interface CookbookHTMLOptions {
  title: string;
  author: string;
  intro: string;
  recipes: Recipe[];
  lang: Language;
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );

export const buildCookbookHTML = ({ title, author, intro, recipes, lang }: CookbookHTMLOptions): string => {
  const L = lang === 'en';
  const today = new Date().toLocaleDateString(L ? 'en-GB' : 'bg-BG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const cover = `
    <section class="cb-page cover">
      <div class="stripes"></div>
      <div class="cover-inner">
        <div class="brand-mark">Ко-да-ям</div>
        <div class="brand-sub">${L ? 'A quiet cookbook for picky eaters' : 'Тиха готварска книга за капризни хора'}</div>
        <h1 class="cover-title">${esc(title)}</h1>
        ${intro ? `<p class="cover-intro">${esc(intro)}</p>` : ''}
        <div class="cover-meta">
          <span>${esc(author)}</span>
          <span>${recipes.length} ${L ? 'recipes' : 'рецепти'}</span>
          <span>${today}</span>
        </div>
      </div>
      <div class="cover-bottom">
        <span>${L ? 'Volume' : 'Том'} I</span>
        <span>${L ? 'First edition' : 'Първо издание'}</span>
      </div>
    </section>`;

  const toc = `
    <section class="cb-page toc">
      <div class="page-eyebrow">${L ? 'Contents' : 'Съдържание'}</div>
      <h2 class="page-h">${L ? 'A short' : 'Кратко'} <em>${L ? 'index' : 'съдържание'}</em></h2>
      <ol class="toc-list">
        ${recipes.map((r, i) => `
          <li>
            <span class="toc-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="toc-name">${esc(L && r.nameEn ? r.nameEn : r.name)}</span>
            <span class="toc-dots"></span>
            <span class="toc-time">${r.time} ${L ? 'min' : 'мин'}</span>
          </li>`).join('')}
      </ol>
      <div class="toc-foot">${L
        ? 'Cook them in any order. Most are quiet weeknight food.'
        : 'Готви ги в произволен ред. Повечето са тиха храна за делник.'}</div>
    </section>`;

  const recipePages = recipes.map((r, i) => `
    <section class="cb-page recipe">
      <header class="r-head">
        <div class="page-eyebrow">${L ? 'Recipe' : 'Рецепта'} · ${String(i + 1).padStart(2, '0')} / ${String(recipes.length).padStart(2, '0')}</div>
        <h1 class="r-title">${esc(L && r.nameEn ? r.nameEn : r.name)}</h1>
        <div class="r-meta">
          ${(r.tags ?? []).slice(0, 2).map(t => `<span class="r-tag">${esc(t)}</span>`).join('')}
          <span class="r-time">${r.time} ${L ? 'minutes' : 'минути'}</span>
        </div>
      </header>
      <div class="r-hero">
        <div class="r-image">
          <div class="stripes"></div>
          <div class="r-emoji">${esc(r.emoji ?? '🍽')}</div>
          <div class="r-image-label">PHOTO · ${r.time}MIN</div>
        </div>
        <div class="r-lede">
          <p>${L
            ? 'A short, honest recipe — the kind you cook on Tuesday without thinking.'
            : 'Кратка, честна рецепта — от тези, които правиш във вторник без да мислиш.'}</p>
        </div>
      </div>
      <div class="r-body">
        <div class="r-ings">
          <div class="r-section-label">${L ? 'Ingredients' : 'Съставки'}</div>
          <ul>${(r.ingredients ?? []).map(ing => `<li>${esc(ing)}</li>`).join('')}</ul>
        </div>
        <div class="r-method">
          <div class="r-section-label">${L ? 'Method' : 'Метод'}</div>
          <ol>${(r.steps ?? []).map((s, j) => `
            <li><span class="step-num">${String(j + 1).padStart(2, '0')}</span><span class="step-body">${esc(s)}</span></li>
          `).join('')}</ol>
        </div>
      </div>
      <footer class="r-foot">
        <span>Ко-да-ям · ${esc(title)}</span>
        <span class="page-no">${i + 3}</span>
      </footer>
    </section>`).join('');

  const colophon = `
    <section class="cb-page colophon">
      <div class="page-eyebrow">${L ? 'Colophon' : 'Колофон'}</div>
      <h2 class="page-h">${L ? 'A note on the book' : 'Бележка за книгата'}</h2>
      <p>${L
        ? 'Set in <em>Instrument Serif</em>, <em>Geist</em> and <em>Geist Mono</em>. Printed quietly, at home, on whatever paper was handy.'
        : 'Шрифтове: <em>Instrument Serif</em>, <em>Geist</em> и <em>Geist Mono</em>. Отпечатана тихо, вкъщи, върху каквато хартия се намери.'}</p>
      <p class="colophon-attrib">${L ? 'Compiled by' : 'Съставена от'} <em>${esc(author)}</em> · ${today}</p>
      <div class="colophon-mark">Ко-да-ям</div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="${L ? 'en' : 'bg'}">
<head>
<meta charset="UTF-8">
<title>${esc(title)} — Ко-да-ям</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --paper:#F5F1EA;--paper-2:#EFEAE0;--surface:#FCFAF6;
  --ink:#1C1815;--ink-2:#5A4F46;--ink-3:#8B8278;
  --line:#E4DED2;--line-2:#D6CFC1;
  --clay:oklch(0.58 0.13 38);--clay-deep:oklch(0.42 0.13 38);
  --serif:"Instrument Serif",ui-serif,Georgia,serif;
  --sans:"Geist",ui-sans-serif,system-ui,sans-serif;
  --mono:"Geist Mono",ui-monospace,"SF Mono",Menlo,monospace;
}
html,body{background:#3B342C;color:var(--ink);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-feature-settings:"ss01","cv11"}
.toolbar{
  position:sticky;top:0;z-index:50;background:rgba(28,24,21,.92);color:#F5F1EA;
  padding:14px 24px;display:flex;align-items:center;gap:14px;
  font-family:var(--mono);font-size:11.5px;letter-spacing:1.2px;text-transform:uppercase;
  border-bottom:1px solid rgba(245,241,234,.08);
}
.toolbar .ttl{font-family:var(--serif);font-style:italic;font-size:18px;letter-spacing:-.3px;text-transform:none;color:#F5F1EA;flex:1}
.toolbar button{
  font-family:var(--sans);font-size:13px;font-weight:500;letter-spacing:-.1px;text-transform:none;
  padding:9px 16px;border-radius:999px;border:1px solid rgba(245,241,234,.16);
  background:rgba(245,241,234,.06);color:#F5F1EA;cursor:pointer;
}
.toolbar button.primary{background:#F5F1EA;color:var(--ink);border-color:#F5F1EA}
.toolbar button:hover{background:rgba(245,241,234,.16)}
.toolbar button.primary:hover{background:#fff}
.book{max-width:840px;margin:24px auto 64px;display:flex;flex-direction:column;gap:18px;padding:0 16px}
.cb-page{
  position:relative;background:var(--paper);
  width:100%;min-height:1120px;padding:80px 72px;
  box-shadow:0 8px 28px rgba(0,0,0,.35);
  display:flex;flex-direction:column;
}
.cb-page .stripes{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(135deg,transparent 0 18px,rgba(28,24,21,.025) 18px 19px)}
.cover{justify-content:space-between;text-align:center;padding:96px 72px 64px}
.cover-inner{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:18px;margin-top:80px}
.brand-mark{font-family:var(--serif);font-style:italic;font-size:44px;letter-spacing:-1.8px;color:var(--ink);line-height:1}
.brand-sub{font-family:var(--mono);font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink-3);margin-bottom:48px}
.cover-title{font-family:var(--serif);font-style:italic;font-size:84px;letter-spacing:-3px;line-height:1;color:var(--clay-deep);max-width:11ch}
.cover-intro{font-family:var(--serif);font-size:18px;color:var(--ink-2);max-width:36ch;line-height:1.4;margin-top:10px}
.cover-meta{font-family:var(--mono);font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-3);
  display:flex;align-items:center;gap:18px;margin-top:56px}
.cover-meta span+span::before{content:"·";margin-right:18px;color:var(--line-2)}
.cover-bottom{position:relative;display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3)}
.page-eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink-3);margin-bottom:18px}
.page-h{font-family:var(--serif);font-size:54px;letter-spacing:-1.6px;line-height:1;color:var(--ink);margin-bottom:48px}
.page-h em{color:var(--clay-deep);font-style:italic}
.toc-list{list-style:none;margin:0;padding:0}
.toc-list li{display:flex;align-items:baseline;gap:14px;padding:14px 0;border-top:1px solid var(--line);font-size:16px;color:var(--ink)}
.toc-list li:last-child{border-bottom:1px solid var(--line)}
.toc-num{font-family:var(--mono);font-size:11.5px;letter-spacing:1px;color:var(--ink-3);min-width:32px}
.toc-name{flex:0 0 auto;font-family:var(--serif);font-style:italic;font-size:22px;letter-spacing:-.4px;color:var(--ink)}
.toc-dots{flex:1;border-bottom:1px dotted var(--line-2);transform:translateY(-4px);margin:0 4px}
.toc-time{font-family:var(--mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3)}
.toc-foot{margin-top:auto;padding-top:36px;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--ink-2);max-width:42ch}
.r-head{margin-bottom:32px}
.r-title{font-family:var(--serif);font-style:italic;font-size:56px;letter-spacing:-1.6px;line-height:1;color:var(--ink);margin:6px 0 16px;max-width:14ch}
.r-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.r-tag{font-family:var(--mono);font-size:10.5px;letter-spacing:1px;text-transform:uppercase;
  background:var(--paper-2);color:var(--ink-2);padding:5px 11px;border-radius:999px}
.r-time{font-family:var(--mono);font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3);margin-left:6px}
.r-hero{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;margin-bottom:36px;align-items:end;padding-bottom:32px;border-bottom:1px solid var(--line)}
.r-image{aspect-ratio:1/1;background:var(--paper-2);border-radius:16px;position:relative;overflow:hidden;
  display:flex;align-items:center;justify-content:center}
.r-image .stripes{background:repeating-linear-gradient(135deg,transparent 0 16px,rgba(28,24,21,.04) 16px 17px)}
.r-emoji{font-size:120px;line-height:1}
.r-image-label{position:absolute;left:14px;bottom:12px;font-family:var(--mono);font-size:9.5px;letter-spacing:1px;color:var(--ink-3)}
.r-lede{font-family:var(--serif);font-size:20px;line-height:1.4;color:var(--ink-2);max-width:32ch}
.r-body{display:grid;grid-template-columns:.85fr 1.2fr;gap:48px;margin-bottom:auto}
.r-section-label{font-family:var(--mono);font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink-3);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.r-ings ul{list-style:none}
.r-ings li{font-size:15px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--ink)}
.r-ings li:last-child{border-bottom:none}
.r-method ol{list-style:none}
.r-method li{display:grid;grid-template-columns:54px 1fr;gap:14px;padding:14px 0;border-top:1px solid var(--line);font-size:15px;line-height:1.55;color:var(--ink)}
.r-method li:last-child{border-bottom:1px solid var(--line)}
.step-num{font-family:var(--serif);font-style:italic;font-size:36px;letter-spacing:-1px;line-height:.9;color:var(--clay-deep)}
.step-body{padding-top:6px}
.r-foot{margin-top:36px;padding-top:14px;border-top:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:center;
  font-family:var(--mono);font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3)}
.r-foot .page-no{font-family:var(--serif);font-style:italic;font-size:18px;letter-spacing:-.5px;text-transform:none;color:var(--ink)}
.colophon{justify-content:flex-start}
.colophon p{font-family:var(--serif);font-size:20px;line-height:1.5;color:var(--ink-2);max-width:42ch;margin-bottom:18px}
.colophon p em{font-style:italic;color:var(--ink)}
.colophon-attrib{margin-top:36px !important;font-size:16px !important}
.colophon-mark{margin-top:auto;font-family:var(--serif);font-style:italic;font-size:54px;letter-spacing:-2px;color:var(--clay-deep);align-self:flex-end}
@page{size:A4;margin:0}
@media print{
  html,body{background:var(--paper)}
  .toolbar{display:none}
  .book{margin:0;max-width:none;padding:0;gap:0}
  .cb-page{width:210mm;min-height:297mm;height:297mm;padding:24mm 22mm;box-shadow:none;page-break-after:always;break-after:page}
  .cb-page:last-child{page-break-after:auto}
  .cover-title{font-size:78px}
  .r-title{font-size:48px}
  .r-emoji{font-size:96px}
  .r-hero{margin-bottom:24px;padding-bottom:24px}
  .r-body{gap:32px}
}
</style>
</head>
<body>
  <div class="toolbar">
    <div class="ttl">${esc(title)} — Ко-да-ям</div>
    <button onclick="window.close()">${L ? 'Close' : 'Затвори'}</button>
    <button class="primary" onclick="window.print()">${L ? 'Save as PDF' : 'Запази като PDF'}</button>
  </div>
  <main class="book">
    ${cover}
    ${toc}
    ${recipePages}
    ${colophon}
  </main>
  <script>
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(() => window.print(), 350));
    } else {
      window.addEventListener('load', () => setTimeout(() => window.print(), 600));
    }
  </script>
</body>
</html>`;
};
