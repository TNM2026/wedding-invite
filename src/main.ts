// src/main.ts
// 入口檔：載入樣式、掛上 RSVP 表單邏輯、加一點捲動進場的輕動效。
import './style.css';
import './rsvp.ts';
import { setupEnvelopeIntro } from './envelope.ts';

// iPhone／iPad：輸入框字級 15px（小於 16px），一聚焦 Safari 就自動放大約 1.07 倍且不會縮回，
// 整頁看起來往右偏、右邊被切（Haley 2026-10-24 真機回報）。只在 iOS 加 maximum-scale=1 擋掉自動放大，
// 字級維持設計稿；iOS 會忽略這個值對手指縮放的限制，客人仍可雙指放大。Android 不會自動放大，不加（加了會擋手指縮放）
function preventIosInputZoom(): void {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (isIos && meta) meta.content += ', maximum-scale=1';
}
preventIosInputZoom();

// 捲動進場：卡片/段落淡入 + 輕微上移，尊重「減少動態」偏好設定，不做 window scroll 事件監聽
function setupScrollReveal(): void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll<HTMLElement>(
    '#hero .hero__faith, #couple > *, #details .details__venue, #rsvp .section-inner > *'
  );

  if (prefersReducedMotion || targets.length === 0 || !('IntersectionObserver' in window)) {
    return;
  }

  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

// 燙金反光層：把燙金元素複製一份疊在原本上面，樣式與動畫見 style.css 的 .gold-shine
function makeShine(source: Element): HTMLElement {
  const shine = source.cloneNode(true) as HTMLElement;
  shine.classList.add('gold-shine');
  shine.removeAttribute('role');
  shine.removeAttribute('aria-label');
  shine.setAttribute('aria-hidden', 'true');
  // 疊放用 inline style 寫死：複製層帶著原元素的 class，若 CSS 的 position 被同權重規則蓋掉，
  // 複製層會跑進排版、在原本旁邊多一份殘影（Haley 2026-10-23 回報）
  shine.style.position = 'absolute';
  shine.style.inset = '0';
  shine.style.margin = '0';
  // 花飾、十字的 SVG 自己內建外陰影：複製層換成沒有外陰影的 -shine 版，反光掃過時陰影才不會疊兩層、一下濃一下淡（Haley 2026-10-24 第二十輪）
  shine.querySelectorAll('img, source').forEach((el) => {
    const attr = el instanceof HTMLImageElement ? 'src' : 'srcset';
    const url = el.getAttribute(attr);
    if (url && SHADOWED_ART.test(url)) el.setAttribute(attr, url.replace(/\.svg$/, '-shine.svg'));
  });
  return shine;
}

const SHADOWED_ART = /\/art\/(cross-top|cross-names-gold|ornament-(left|right)(-flip)?)(-sm)?\.svg$/;

function setupGoldShine(): void {
  // 日期：換掉 class（不要 .hero-date__art 的進場遮罩），放在旁邊，由 .hero-date 當定位框
  const date = document.querySelector('.hero-date__art');
  if (date) {
    const shine = makeShine(date);
    shine.className = 'gold-shine hero-date__shine';
    date.after(shine);
  }
  // 頂部列（花飾、十字、英文字）、新人名字與我們結婚了：保留原 class 讓版面一致，放在元素自己裡面
  // 經文出處「約翰一書」不加反光，只留燙金打凹（Haley 2026-10-25 第二十九輪）；我們結婚了也掛 .faith__ref，所以只挑 .hero__married
  document.querySelectorAll('.hero__topbar, .hero__bottombar, .hero-names, .faith__ref.hero__married').forEach((el) => el.append(makeShine(el)));
  // 信封上的引導文字：換掉 class（不要 .intro__hint 的定位與淡入），放在自己裡面
  const hint = document.querySelector('.intro__hint');
  if (hint) {
    const shine = makeShine(hint);
    shine.className = 'gold-shine intro__hint-shine';
    hint.append(shine);
  }

  // 什麼時候開始掃：hero 的等進場動畫（日期擴散約 3.7 秒）跑完，信封字等信封淡入
  const heroShines = [...document.querySelectorAll<HTMLElement>('.gold-shine:not(.intro__hint-shine)')];
  whenClass(document.documentElement, 'hero-in', () => heroShines.forEach((el) => runShine(el, rand(2000, 5000))));
  const intro = document.querySelector<HTMLElement>('#envelope-intro');
  const hintShine = document.querySelector<HTMLElement>('.intro__hint-shine');
  if (intro && hintShine) whenClass(intro, 'is-ready', () => runShine(hintShine, 1800));
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// 反光掃光（Haley 2026-10-24 第十五輪）：每個燙金元素各自隨機，不要由上往下依序掃（太機械化）。
// 一次約 5 秒（4.6–6 秒隨機；第二十一輪 Haley 要頻率調高，原 6–10 秒），其中掃過 3.4–4.6 秒、其餘停著；遮罩從 100% 移到 0%，兩端亮帶都在元素外，跳回去看不出來。
// 信封開完會整個移除，元素不在頁面上就停
function runShine(el: HTMLElement, delay: number): void {
  window.setTimeout(() => {
    if (!el.isConnected) return;
    el.animate(
      [
        { maskPosition: '100% 0', webkitMaskPosition: '100% 0' },
        { maskPosition: '0% 0', webkitMaskPosition: '0% 0' },
      ],
      { duration: rand(3400, 4600), easing: 'ease-in-out' }
    );
    runShine(el, rand(4600, 6000));
  }, delay);
}

// 元素一有某個 class 就執行一次（已經有就馬上執行）
function whenClass(target: HTMLElement, name: string, fn: () => void): void {
  if (target.classList.contains(name)) return fn();
  const observer = new MutationObserver(() => {
    if (!target.classList.contains(name)) return;
    observer.disconnect();
    fn();
  });
  observer.observe(target, { attributes: true, attributeFilter: ['class'] });
}

setupGoldShine();
setupEnvelopeIntro();
setupScrollReveal();
