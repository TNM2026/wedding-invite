// src/main.ts
// 入口檔：載入樣式、掛上 RSVP 表單邏輯、加一點捲動進場的輕動效。
import './style.css';
import './rsvp.ts';
import { setupEnvelopeIntro } from './envelope.ts';

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
  return shine;
}

function setupGoldShine(): void {
  // 日期：換掉 class（不要 .hero-date__art 的進場遮罩），放在旁邊，由 .hero-date 當定位框
  const date = document.querySelector('.hero-date__art');
  if (date) {
    const shine = makeShine(date);
    shine.className = 'gold-shine hero-date__shine';
    date.after(shine);
  }
  // 頂部列（花飾、十字、英文字）、新人名字與經文出處：保留原 class 讓版面一致，放在元素自己裡面
  document.querySelectorAll('.hero__topbar, .hero__bottombar, .hero-names, .faith__ref').forEach((el) => el.append(makeShine(el)));
  // 信封上的引導文字：換掉 class（不要 .intro__hint 的定位與淡入），放在自己裡面
  const hint = document.querySelector('.intro__hint');
  if (hint) {
    const shine = makeShine(hint);
    shine.className = 'gold-shine intro__hint-shine';
    hint.append(shine);
  }
}

setupGoldShine();
setupEnvelopeIntro();
setupScrollReveal();
