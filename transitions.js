(() => {
  'use strict';

  const root = document.documentElement;
  const curtain = document.getElementById('page-transition');
  if (!curtain || typeof curtain.animate !== 'function') return;

  const panels = Array.from(curtain.querySelectorAll('.transition-panels span'));
  const caption = curtain.querySelector('.transition-caption');
  const label = document.getElementById('transition-label');
  const header = document.getElementById('site-header');
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const labels = { top: 'Ibtsam Khalid', work: 'Selected work', expertise: 'Expertise', about: 'About Ibtsam', contact: 'Let’s talk' };
  const navigationAnimations = new Set();
  const effectAnimations = new Set();
  const tiltTargets = Array.from(document.querySelectorAll('.project-image-button'));
  const ease = 'cubic-bezier(.76,0,.24,1)';
  let sequence = 0;
  let pending = null;

  const reduced = () => systemMotion.matches || root.classList.contains('reduce-motion');
  const cancelAnimations = group => {
    group.forEach(animation => animation.cancel());
    group.clear();
  };

  function effect(element, frames, options) {
    if (reduced() || typeof element.animate !== 'function') return null;
    const animation = element.animate(frames, options);
    effectAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => effectAnimations.delete(animation));
    return animation;
  }

  function curtainAnimation(element, frames, options) {
    const animation = element.animate(frames, { ...options, fill: 'both' });
    navigationAnimations.add(animation);
    return animation.finished.catch(() => {});
  }

  function clearCurtain() {
    curtain.hidden = true;
    cancelAnimations(navigationAnimations);
    if (root.classList.contains('is-navigating')) root.classList.remove('is-navigating');
    root.dataset.transitionState = 'idle';
  }

  function focusDestination(target) {
    const heading = target.querySelector('h1, h2') || target;
    const hadTabindex = heading.hasAttribute('tabindex');
    if (!hadTabindex) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    if (!hadTabindex) heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  }

  function land(navigation) {
    if (navigation.committed) return;
    navigation.committed = true;
    const { target, updateHistory } = navigation;
    const hash = `#${target.id}`;
    if (updateHistory && window.location.hash !== hash) {
      // Works on static hosting and local files, without introducing a router.
      try { window.history.pushState(window.history.state, '', hash); }
      catch (_) { window.location.hash = hash; }
    }
    const top = target.id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - (header?.getBoundingClientRect().bottom || 0) - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    focusDestination(target);
  }

  function enterSection(target) {
    if (reduced()) return;
    const candidates = target.querySelectorAll('.section-heading, .about-copy, .contact-heading');
    let index = 0;
    candidates.forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top > window.innerHeight || bounds.bottom < 0) return;
      element.classList.add('is-visible');
      effect(element, [
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 620, delay: 80 + index++ * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    });
  }

  async function navigate(target, updateHistory = true) {
    const token = ++sequence;
    cancelAnimations(effectAnimations);
    clearCurtain();
    const navigation = { target, updateHistory, committed: false };
    pending = navigation;
    root.classList.add('is-navigating');

    if (reduced()) {
      land(navigation);
      pending = null;
      clearCurtain();
      return;
    }

    label.textContent = labels[target.id];
    curtain.hidden = false;
    root.dataset.transitionState = 'covering';
    try {
      const covering = panels.map((panel, index) => curtainAnimation(panel, [
        { transform: 'translateY(101%)' }, { transform: 'translateY(0)' }
      ], { duration: 280, delay: index * 18, easing: ease }));
      covering.push(curtainAnimation(caption, [
        { opacity: 0, transform: 'translateY(15px)' }, { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 140, delay: 160, easing: 'ease-out' }));
      await Promise.all(covering);
      if (token !== sequence) return;

      land(navigation);
      enterSection(target);
      root.dataset.transitionState = 'revealing';
      const revealing = panels.map((panel, index) => curtainAnimation(panel, [
        { transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }
      ], { duration: 310, delay: index * 18, easing: ease }));
      revealing.push(curtainAnimation(caption, [
        { opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-15px)' }
      ], { duration: 140, easing: 'ease-in' }));
      await Promise.all(revealing);
    } finally {
      if (token === sequence) {
        // Cancellation and unsupported animation behavior must never block navigation.
        land(navigation);
        pending = null;
        clearCurtain();
      }
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const id = link.getAttribute('href').slice(1);
    if (!Object.hasOwn(labels, id)) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    void navigate(target).catch(() => {});
  });

  window.addEventListener('popstate', () => {
    ++sequence;
    pending = null;
    cancelAnimations(effectAnimations);
    clearCurtain();
    const id = window.location.hash.slice(1) || 'top';
    if (!Object.hasOwn(labels, id)) return;
    const target = document.getElementById(id);
    if (target) void navigate(target, false).catch(() => {});
  });

  // The covering layer must not pass clicks or swipes to obscured links.
  curtain.addEventListener('wheel', event => event.preventDefault(), { passive: false });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !pending) return;
    ++sequence;
    land(pending);
    pending = null;
    cancelAnimations(effectAnimations);
    clearCurtain();
  });

  function stopMotion() {
    if (!reduced()) return;
    ++sequence;
    if (pending) land(pending);
    pending = null;
    cancelAnimations(effectAnimations);
    clearCurtain();
    tiltTargets.forEach(element => {
      element.style.removeProperty('--card-rx');
      element.style.removeProperty('--card-ry');
    });
  }
  new MutationObserver(stopMotion).observe(root, { attributes: true, attributeFilter: ['class'] });
  systemMotion.addEventListener?.('change', stopMotion);
  window.addEventListener('pagehide', () => {
    ++sequence;
    pending = null;
    cancelAnimations(effectAnimations);
    clearCurtain();
  });

  // A brief press ripple gives immediate feedback before navigation starts.
  document.addEventListener('pointerdown', event => {
    const button = event.target.closest('.button, .nav-contact');
    if (!button || reduced() || event.button !== 0) return;
    const bounds = button.getBoundingClientRect();
    const size = Math.max(bounds.width, bounds.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'press-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${event.clientX - bounds.left - size / 2}px`, top: `${event.clientY - bounds.top - size / 2}px` });
    button.appendChild(ripple);
    const animation = effect(ripple, [{ transform: 'scale(0)', opacity: .25 }, { transform: 'scale(1)', opacity: 0 }], { duration: 620, easing: 'ease-out' });
    if (animation) animation.finished.catch(() => {}).finally(() => ripple.remove());
    else ripple.remove();
  }, { passive: true });

  tiltTargets.forEach(element => {
    let frame = 0;
    element.addEventListener('pointermove', event => {
      if (reduced() || !finePointer.matches || frame) return;
      const { clientX, clientY } = event;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (reduced() || !element.matches(':hover')) return;
        const bounds = element.getBoundingClientRect();
        element.style.setProperty('--card-rx', `${((.5 - (clientY - bounds.top) / bounds.height) * 5).toFixed(2)}deg`);
        element.style.setProperty('--card-ry', `${(((clientX - bounds.left) / bounds.width - .5) * 5).toFixed(2)}deg`);
      });
    }, { passive: true });
    const reset = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      element.style.removeProperty('--card-rx');
      element.style.removeProperty('--card-ry');
    };
    element.addEventListener('pointerleave', reset);
    element.addEventListener('pointercancel', reset);
  });
})();
