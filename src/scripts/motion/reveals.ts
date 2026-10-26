import type { gsap as GsapInstance } from 'gsap';
import type { SplitText as SplitTextClass } from 'gsap/SplitText';

type Gsap = typeof GsapInstance;
type SplitTextType = typeof SplitTextClass;

/** Where on screen an element's top has to arrive before it reveals. */
const START = 'top 85%';

/** Elements already on screen at load are left alone, so nothing visible ever disappears. */
function isBelowFold(element: Element): boolean {
  return element.getBoundingClientRect().top > window.innerHeight;
}

/**
 * `data-reveal="lines"`: headings rise line by line behind a mask.
 * `data-reveal="fade"`: blocks fade up once.
 */
export function initReveals(gsap: Gsap, SplitText: SplitTextType): void {
  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((heading) => {
    if (!isBelowFold(heading)) return;
    SplitText.create(heading, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      // Keeps the heading's text as one accessible string instead of fragments.
      aria: 'auto',
      onSplit: (split) =>
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: heading, start: START, once: true },
        }),
    });
  });

  gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]').forEach((block) => {
    if (!isBelowFold(block)) return;
    gsap.from(block, {
      autoAlpha: 0,
      y: 28,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: block, start: START, once: true },
    });
  });
}
