// src/foil.ts
// 手機平板（≤1023px）燙金的「打凹」內陰影，用 canvas 照螢幕解析度畫（Haley 2026-10-24）。
// 為什麼不用 SVG 濾鏡：iPhone Safari 把 filter: url(#SVG濾鏡) 用 1 倍解析度算完再放大，怎麼調都糊（10-20～10-24 改了好幾輪）；
// CSS 的 drop-shadow 雖然銳利，但只能畫在字外面，做不出 Figma 那種「字裡面左上緣一道暗邊」。
// 做法：把元素裡的字（逐字照實際位置）、圖（日期數字、十字）、邊框（日期的線）畫成一張剪影，
// 剪影減掉「往右下錯開、模糊過的剪影」＝左上緣內側那一圈，塗深色疊在元素上面。桌機照舊用 index.html 的 #gold-foil。

const MQ = window.matchMedia('(max-width: 1023px)');
// 對應 Figma 燙金內陰影 #110F05（桌機 1, 2, 模糊 1.9）；手機字小，位移與模糊按比例縮
const INNER = { dx: 0.8, dy: 1.6, blur: 0.6, color: '#110f05', alpha: 0.85 };
const PAD = 4; // 字形可能超出元素框一點點，畫布四周多留

const TARGETS = '.hero__eyebrow, .hero-names, .hero-date__art, .hero-date__shine, .faith__ref, .intro__hint, .intro__hint-shine';

/** 元素自己的 canvas 與巢狀的反光層不算進剪影（反光層有自己的 canvas） */
function skip(node: Node, root: Element): boolean {
  for (let n: Node | null = node; n && n !== root; n = n.parentNode) {
    if (n instanceof HTMLCanvasElement) return true;
    if (n instanceof Element && n.classList.contains('gold-shine')) return true;
  }
  return false;
}

function drawSilhouette(ctx: CanvasRenderingContext2D, el: HTMLElement, ox: number, oy: number, scale: number): void {
  // 字：逐字取實際位置（字距、置中都照瀏覽器排好的結果），基線用一個 0 寬的 inline-block 量
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (skip(node, el) || !node.data.trim()) continue;
    const parent = node.parentElement!;
    const cs = getComputedStyle(parent);
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    parent.insertBefore(probe, node);
    const baseline = (probe.getBoundingClientRect().bottom - oy) / scale;
    probe.remove();
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const upper = cs.textTransform === 'uppercase';
    for (let i = 0; i < node.data.length; ) {
      const ch = String.fromCodePoint(node.data.codePointAt(i)!);
      range.setStart(node, i);
      range.setEnd(node, i + ch.length);
      i += ch.length;
      if (!ch.trim()) continue;
      const r = range.getClientRects()[0];
      if (r) ctx.fillText(upper ? ch.toUpperCase() : ch, (r.left - ox) / scale, baseline);
    }
  }
  // 圖（日期的 1、2，名字中間的十字）
  el.querySelectorAll('img').forEach((img) => {
    if (skip(img, el) || !img.complete || !img.naturalWidth) return;
    const r = img.getBoundingClientRect();
    ctx.drawImage(img, (r.left - ox) / scale, (r.top - oy) / scale, r.width / scale, r.height / scale);
  });
  // 邊框（日期的直線、上下雙線）
  el.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (skip(node, el) || node instanceof HTMLImageElement) return;
    const cs = getComputedStyle(node);
    const t = parseFloat(cs.borderTopWidth), b = parseFloat(cs.borderBottomWidth), l = parseFloat(cs.borderLeftWidth), rt = parseFloat(cs.borderRightWidth);
    if (!(t || b || l || rt)) return;
    const r = node.getBoundingClientRect();
    const x = (r.left - ox) / scale, y = (r.top - oy) / scale, w = r.width / scale, h = r.height / scale;
    if (t) ctx.fillRect(x, y, w, t);
    if (b) ctx.fillRect(x, y + h - b, w, b);
    if (l) ctx.fillRect(x, y, l, h);
    if (rt) ctx.fillRect(x + w - rt, y, rt, h);
  });
}

function paint(el: HTMLElement): void {
  let canvas = el.querySelector<HTMLCanvasElement>(':scope > canvas.foil-inner');
  if (!MQ.matches || !el.offsetWidth) {
    canvas?.remove();
    return;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'foil-inner';
    canvas.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.append(canvas);
  }
  const dpr = window.devicePixelRatio || 1;
  const w = el.offsetWidth + PAD * 2;
  const h = el.offsetHeight + PAD * 2;
  const rect = el.getBoundingClientRect();
  const scale = rect.width / el.offsetWidth || 1;
  const ox = rect.left - PAD * scale;
  const oy = rect.top - PAD * scale;

  canvas.style.cssText = `position:absolute;left:${-PAD}px;top:${-PAD}px;width:${w}px;height:${h}px;pointer-events:none;margin:0`;
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);

  // 1. 剪影
  const sil = document.createElement('canvas');
  sil.width = canvas.width;
  sil.height = canvas.height;
  const s = sil.getContext('2d')!;
  s.scale(dpr, dpr);
  s.fillStyle = '#000';
  drawSilhouette(s, el, ox, oy, scale);

  // 2. 剪影減掉「往右下錯開＋模糊」的剪影＝左上緣內側一圈。用陰影畫錯開的那份（shadowBlur 各瀏覽器都支援，ctx.filter 舊 Safari 沒有）
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sil, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  const far = canvas.width + 50;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = INNER.blur * 2 * dpr;
  ctx.shadowOffsetX = far + INNER.dx * dpr;
  ctx.shadowOffsetY = INNER.dy * dpr;
  ctx.drawImage(sil, -far, 0);
  ctx.shadowColor = 'transparent';
  // 3. 塗成內陰影的顏色與透明度
  ctx.globalCompositeOperation = 'source-in';
  ctx.globalAlpha = INNER.alpha;
  ctx.fillStyle = INNER.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function setupFoilInner(): void {
  const els = [...document.querySelectorAll<HTMLElement>(TARGETS)];
  if (!els.length) return;
  const pending = new Set<HTMLElement>();
  let frame = 0;
  const schedule = (el: HTMLElement) => {
    pending.add(el);
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        pending.forEach(paint);
        pending.clear();
      });
  };
  const all = () => els.forEach(schedule);
  // 字型、圖都到了才畫（字型沒到會畫成備用字型的形狀）
  const imgs = els.flatMap((el) => [...el.querySelectorAll('img')]);
  Promise.all([document.fonts.ready, ...imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined)))]).then(() => {
    all();
    const ro = new ResizeObserver((entries) => entries.forEach((e) => schedule(e.target as HTMLElement)));
    els.forEach((el) => ro.observe(el));
  });
  MQ.addEventListener('change', all);
}
