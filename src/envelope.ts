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

/** 收掉 index.html 的載入畫面（#boot）：淡出後移除。載入畫面在樣式、字型、信封圖就緒前蓋住整頁 */
function hideBoot(): void {
  const boot = document.querySelector<HTMLElement>('#boot');
  if (!boot) return;
  boot.classList.add('is-done');
  window.setTimeout(() => boot.remove(), 800);
}

export function setupEnvelopeIntro(): void {
  const intro = document.querySelector<HTMLElement>('#envelope-intro');
  const stage = intro?.querySelector<HTMLElement>('.intro__stage');
  const seal = intro?.querySelector<HTMLButtonElement>('.intro__seal');
  const app = document.querySelector<HTMLElement>('#app');
  if (!intro || !stage || !seal) {
    hideBoot();
    startHeroAnimation();
    return;
  }

  // 開場期間網頁本體不可互動、不讓螢幕閱讀器讀到
  app?.setAttribute('inert', '');
  window.scrollTo(0, 0);

  // 信封圖＋字型都就緒才收掉載入畫面、淡入信封（字型最多等 2.5 秒，慢網路不要卡住）。
  // main.ts 先 import 了 style.css，跑到這裡時樣式一定已經套上
  const imgs = [...intro.querySelectorAll('img')];
  const imagesReady = Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
  const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), wait(2500)]);
  Promise.all([imagesReady, fontsReady]).then(() => {
    requestAnimationFrame(() => {
      intro.classList.add('is-ready');
      hideBoot();
    });
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
    // 換到油畫花卉那一幕：頁面底色與網址列顏色改回酒紅（信封蓋著時是墨綠，見 index.html 的 theme-color 與 html.intro-scene），
    // iPhone Safari 上下才不會露出墨綠（Haley 2026-10-23）
    document.documentElement.classList.add('intro-scene');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#47010b');
    // iOS 26 Safari 不看 theme-color，改從頁面底色與貼邊的 fixed 元素取色，而且顏色改了不會馬上重取，
    // 要等捲動／視窗大小改變才重新取色（Haley 2026-10-24 回報上下還是墨綠）。偷捲 1px 再捲回來逼它重取，畫面是 fixed 看不出來
    requestAnimationFrame(() => {
      window.scrollTo(0, 1);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    });
    await wait(SCREEN_MS);

    intro.classList.add('is-leaving');
    startHeroAnimation();
    app?.removeAttribute('inert');
    document.documentElement.classList.remove('intro-open', 'intro-scene');
    await wait(LEAVE_MS);
    intro.remove();
  };

  stage.addEventListener('click', open);
}
