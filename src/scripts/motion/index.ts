/**
 * Scroll-driven motion, loaded only when it can help:
 * never for reduced motion, and only after the page has loaded and gone idle,
 * so GSAP never competes with the fonts and images of the first screen.
 */

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function afterLoad(callback: () => void): void {
  if (document.readyState === 'complete') {
    callback();
  } else {
    window.addEventListener('load', callback, { once: true });
  }
}

function whenIdle(callback: () => void): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 1500 });
  } else {
    setTimeout(callback, 200);
  }
}

async function start(): Promise<void> {
  const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/SplitText'),
  ]);
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const { initReveals } = await import('./reveals');
  const { initTrace } = await import('./trace');
  initReveals(gsap, SplitText);
  initTrace(gsap);
}

/** Drops the CSS start states (see `html[data-motion]`), showing everything in its final state. */
function disableMotion(): void {
  delete document.documentElement.dataset.motion;
}

if (window.matchMedia(REDUCED_MOTION).matches) {
  disableMotion();
} else {
  afterLoad(() =>
    whenIdle(() => {
      start().catch((error: unknown) => {
        // Motion is an enhancement: the page is complete without it.
        console.warn('Motion disabled:', error);
        disableMotion();
      });
    }),
  );
}
