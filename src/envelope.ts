// src/envelope.ts
// 信封開場：每次進站都顯示（不記住、沒有跳過鈕），點火漆章或信封任何地方才打開。
// 動畫本身寫在 style.css（#envelope-intro 區塊），這裡只負責照時間軸切換 class、鎖住／解鎖捲動。

const PRESS_MS = 160; // 火漆章壓下
const FLAP_MS = 1250; // 火漆章脫落 → 封蓋翻起 → 打開的封蓋立起（對應 CSS 的 delay＋duration）
const LETTER_MS = 1100; // 信紙抽出
const LEAVE_MS = 900; // 整個開場淡出

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function setupEnvelopeIntro(): void {
  const intro = document.querySelector<HTMLElement>('#envelope-intro');
  const stage = intro?.querySelector<HTMLElement>('.intro__stage');
  const seal = intro?.querySelector<HTMLButtonElement>('.intro__seal');
  const app = document.querySelector<HTMLElement>('#app');
  if (!intro || !stage || !seal) return;

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
    await wait(FLAP_MS);
    intro.classList.add('is-letter');
    await wait(LETTER_MS);

    intro.classList.add('is-leaving');
    app?.removeAttribute('inert');
    document.documentElement.classList.remove('intro-open');
    await wait(LEAVE_MS);
    intro.remove();
  };

  stage.addEventListener('click', open);
}
