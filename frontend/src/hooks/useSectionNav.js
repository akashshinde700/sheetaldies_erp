import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * useSectionNav — scroll-spy for long forms that use an in-page section
 * rail instead of tabs/steps.
 *
 *   const sections = [
 *     { id: 'basic',   label: 'Basic information' },
 *     { id: 'party',   label: 'Party' },
 *     { id: 'items',   label: 'Items' },
 *   ];
 *   const { activeId, jumpTo, registerRef } = useSectionNav(sections);
 *   ...
 *   <section ref={registerRef('basic')} id="basic"> … </section>
 *
 * `scrollRoot` defaults to the nearest scrollable ancestor of the first
 * registered section; pass one explicitly if the form scrolls inside a
 * custom container.
 */
export function useSectionNav(sections, { scrollRoot = null, topOffset = 96 } = {}) {
  const refs = useRef({});
  const [activeId, setActiveId] = useState(sections[0]?.id ?? null);

  const registerRef = useCallback((id) => (el) => {
    if (el) refs.current[id] = el;
    else delete refs.current[id];
  }, []);

  const jumpTo = useCallback((id) => {
    const el = refs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    // move focus to the section for keyboard users
    const focusable = el.querySelector('h2, h3, [tabindex], input, select, textarea, button');
    setTimeout(() => focusable?.focus?.({ preventScroll: true }), 300);
  }, []);

  useEffect(() => {
    const root =
      scrollRoot ||
      (refs.current[sections[0]?.id]?.closest('main')) ||
      null;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { root, rootMargin: `-${topOffset}px 0px -55% 0px`, threshold: 0.01 }
    );

    Object.values(refs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [sections, scrollRoot, topOffset]);

  return { activeId, jumpTo, registerRef };
}
