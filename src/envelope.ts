// src/envelope.ts
// 信封開場：每次進站都顯示（不記住、沒有跳過鈕），點信封任何地方才打開。
// 流程：點下 → 火漆章壓下 → 封蓋連火漆章翻起、露出油畫花卉 → Save THE Date 依序浮現 → 停幾秒 → 整個淡出露出首頁。
// 動畫本身寫在 style.css（#envelope-intro 區塊），這裡只負責照時間軸切換 class、鎖住／解鎖捲動。

const PRESS_MS = 160; // 火漆章壓下
const SCREEN_MS = 4300; // 花卉底圖＋Save THE Date 這一幕：封蓋翻起約 1.3 秒後 Save 開始淡入，從 Save 出現起算停 3 秒（Haley 2026-10-19 要求 3 秒）
const LEAVE_MS = 900; // 整個開場淡出

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** 通知 Save the Date 區塊開始播進場動畫（Loved to love 淡入、日期由中心擴散）。見 style.css 的 .hero-in */
function startHeroAnimation(): void {
  document.documentElement.classList.add('hero-in');
}

export function setupEnvelopeIntro(): void {
  const intro = document.querySelector<HTMLElement>('#envelope-intro');
  const stage = intro?.querySelector<HTMLElement>('.intro__stage');
  const seal = intro?.querySelector<HTMLButtonElement>('.intro__seal');
  const app = document.querySelector<HTMLElement>('#app');
  if (!intro || !stage || !seal) {
    startHeroAnimation();
    return;
  }

  // 開場期間網頁本體不可互動、不讓螢幕閱讀器讀到
  app?.setAttribute('inert', '');
  window.scrollTo(0, 0);

  // 等信封圖載入後再淡入，避免半張圖跳出來
  const imgs = [...intro.querySelectorAll('img')];
  Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined)))).then(() => {
    requestAnimationFrame(() => intro.classList.add('is-ready'));
    seal.focus({ preventScroll: true });
  });

  let opened = false;
  const open = async () => {
    if (opened) return;
    opened = true;

    // 不看系統的「減少動態效果」設定，每個人都播完整動畫（Haley 2026-10-19 決定）
    intro.classList.add('is-pressing');
    await wait(PRESS_MS);
    intro.classList.add('is-opening');
    await wait(SCREEN_MS);

    intro.classList.add('is-leaving');
    startHeroAnimation();
    app?.removeAttribute('inert');
    document.documentElement.classList.remove('intro-open');
    await wait(LEAVE_MS);
    intro.remove();
  };

  stage.addEventListener('click', open);
}
