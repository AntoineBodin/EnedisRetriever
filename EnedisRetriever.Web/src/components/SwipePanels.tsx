import { useEffect, useRef, type ReactNode } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

type Panel = {
  id: string;
  label: string;
  content: ReactNode;
};

type Props = {
  panels: [Panel, Panel];
  active: number;
  onActive: (index: number) => void;
  label: string;
};

/**
 * Two cards side by side in a horizontal scroll-snap track: swipe (touch or
 * trackpad), the tabs or the edge arrow switch between them. The inactive card
 * peeks at the edge, so it is clear there is another one.
 */
function SwipePanels({ panels, active, onActive, label }: Props) {
  const track = useRef<HTMLDivElement>(null);
  // Set while a tab click scrolls the track, so the scroll events don't fight it.
  const programmatic = useRef(false);

  function scrollTo(index: number, smooth = true) {
    const element = track.current;
    const slide = element?.children[index] as HTMLElement | undefined;

    if (!element || !slide) {
      return;
    }

    programmatic.current = true;
    element.scrollTo({
      left: index === 0 ? 0 : element.scrollWidth - element.clientWidth,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  // Restore the remembered panel without animation.
  useEffect(() => {
    scrollTo(active, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const element = track.current;

    if (!element) {
      return;
    }

    const max = element.scrollWidth - element.clientWidth;
    const index = max > 0 && element.scrollLeft > max / 2 ? 1 : 0;

    if (programmatic.current) {
      // Wait for the animation to reach its target before listening again.
      if ((index === 1 ? max : 0) === Math.round(element.scrollLeft)) {
        programmatic.current = false;
      }

      return;
    }

    if (index !== active) {
      onActive(index);
    }
  }

  function select(index: number) {
    onActive(index);
    scrollTo(index);
  }

  return (
    <section className="swipe" aria-label={label}>
      <div className="swipe-tabs" role="tablist" aria-label={label}>
        {panels.map((panel, index) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            id={`tab-${panel.id}`}
            aria-selected={active === index}
            aria-controls={`panel-${panel.id}`}
            onClick={() => select(index)}
          >
            {panel.label}
          </button>
        ))}
        <span className="swipe-hint" aria-hidden="true">
          Glissez pour changer de vue
        </span>
      </div>

      <div className="swipe-frame">
        <div className="swipe-track" ref={track} onScroll={handleScroll}>
          {panels.map((panel, index) => (
            <div
              key={panel.id}
              id={`panel-${panel.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${panel.id}`}
              className="swipe-slide"
              data-active={active === index}
              // The card that only peeks is not interactive: a click brings it in.
              inert={active !== index}
            >
              {panel.content}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="swipe-edge"
          data-side={active === 0 ? 'right' : 'left'}
          onClick={() => select(active === 0 ? 1 : 0)}
          aria-label={`Afficher ${panels[active === 0 ? 1 : 0].label.toLowerCase()}`}
        >
          {active === 0 ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>
    </section>
  );
}

export default SwipePanels;
