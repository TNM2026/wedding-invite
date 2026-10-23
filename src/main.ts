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

// 燙金日期的反光層：複製一份日期疊在原本上面，樣式與動畫見 style.css 的 .hero-date__shine
function setupGoldShine(): void {
  const art = document.querySelector<HTMLElement>('.hero-date__art');
  if (!art) return;
  const shine = art.cloneNode(true) as HTMLElement;
  shine.className = 'hero-date__shine';
  shine.removeAttribute('role');
  shine.removeAttribute('aria-label');
  shine.setAttribute('aria-hidden', 'true');
  art.after(shine);
}

setupGoldShine();
setupEnvelopeIntro();
setupScrollReveal();
