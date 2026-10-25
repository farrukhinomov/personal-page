import type { gsap as GsapInstance } from 'gsap';

type Gsap = typeof GsapInstance;

/**
 * The Experience trace draws itself like a request trace:
 * each span grows from its start time, top to bottom, when the trace scrolls into view.
 *
 * The collapsed start state comes from CSS under `html[data-motion]`, so a trace that is
 * already on screen never flashes full before collapsing. This animates to the final state.
 */
export function initTrace(gsap: Gsap): void {
  document.querySelectorAll<HTMLElement>('[data-trace]').forEach((trace) => {
    const bars = trace.querySelectorAll<HTMLElement>('[data-trace-bar]');
    const labels = trace.querySelectorAll<HTMLElement>('[data-trace-duration]');
    if (bars.length === 0) return;

    gsap
      .timeline({ scrollTrigger: { trigger: trace, start: 'top 80%', once: true } })
      .to(bars, { scaleX: 1, duration: 0.9, ease: 'expo.out', stagger: 0.12 })
      .to(labels, { opacity: 1, duration: 0.4, stagger: 0.12 }, 0.35);
  });
}
