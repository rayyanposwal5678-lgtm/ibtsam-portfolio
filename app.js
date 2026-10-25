(() => {
  'use strict';

  const root = document.documentElement;
  const emailAddress = 'ibtsam.official591@gmail.com';
  const whatsappNumber = '923712298591';
  const motionPreferenceKey = 'ibtsam-reduced-motion';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const canObserve = 'IntersectionObserver' in window;
  const counterFrames = new Map();
  const completedCounters = new WeakSet();
  const activeAnimations = new Set();
  let storedMotionPreference = null;

  try {
    const stored = window.localStorage.getItem(motionPreferenceKey);
    if (stored === 'true' || stored === 'false') storedMotionPreference = stored === 'true';
  } catch (_) {
    // Storage may be unavailable for local files or in private browser sessions.
  }

  let reduceMotion = motionQuery.matches || storedMotionPreference === true;
  const motionToggle = document.getElementById('motion-toggle');
  const portrait = document.querySelector('.portrait-frame');
  const hero = document.querySelector('.hero');
  let heroInView = true;
  let portraitFrame = 0;

  function updateAmbientMotion() {
    hero?.classList.toggle('ambient-active', heroInView && !document.hidden && !reduceMotion);
  }

  function finishCounter(element) {
    const runningFrame = counterFrames.get(element);
    if (runningFrame) window.cancelAnimationFrame(runningFrame);
    counterFrames.delete(element);
    if (element.dataset.originalText !== undefined) {
      element.textContent = element.dataset.originalText;
    }
    completedCounters.add(element);
  }

  function resetPortrait() {
    if (!portrait) return;
    window.cancelAnimationFrame(portraitFrame);
    portraitFrame = 0;
    portrait.style.setProperty('--rotate-x', '0deg');
    portrait.style.setProperty('--rotate-y', '0deg');
    portrait.style.removeProperty('--light-x');
    portrait.style.removeProperty('--light-y');
  }

  function applyMotionPreference() {
    reduceMotion = motionQuery.matches || storedMotionPreference === true;
    root.classList.toggle('reduce-motion', reduceMotion);
    root.classList.toggle('motion-ready', canObserve && !reduceMotion);
    updateAmbientMotion();
    if (motionToggle) {
      motionToggle.setAttribute('aria-pressed', String(reduceMotion));
      motionToggle.setAttribute('aria-label', 'Reduce motion');
      motionToggle.disabled = motionQuery.matches;
      motionToggle.title = motionQuery.matches
        ? 'Reduced motion follows your device settings'
        : reduceMotion ? 'Enable animations' : 'Reduce animations';
    }
    if (reduceMotion) {
      document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
      document.querySelectorAll('.count-up').forEach(finishCounter);
      resetPortrait();
      activeAnimations.forEach(animation => animation.cancel());
      activeAnimations.clear();
    }
  }

  applyMotionPreference();

  // The only continuous effect stops outside the viewport or in a hidden tab.
  if (canObserve && hero) {
    const ambientObserver = new IntersectionObserver(entries => {
      heroInView = entries[0].isIntersecting;
      updateAmbientMotion();
    });
    ambientObserver.observe(hero);
  }
  document.addEventListener('visibilitychange', () => {
    updateAmbientMotion();
    if (document.hidden) resetPortrait();
  });

  motionToggle?.addEventListener('click', () => {
    if (motionQuery.matches) return;
    storedMotionPreference = !reduceMotion;
    try {
      window.localStorage.setItem(motionPreferenceKey, String(storedMotionPreference));
    } catch (_) {
      // The control still works when the preference cannot be persisted.
    }
    applyMotionPreference();
  });

  const onSystemMotionChange = () => applyMotionPreference();
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onSystemMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onSystemMotionChange);

  const header = document.getElementById('site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  function setMenuOpen(open, returnFocus = false) {
    if (!menuToggle || !mobileMenu) return;
    mobileMenu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (returnFocus) menuToggle.focus();
  }

  menuToggle?.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  mobileMenu?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('click', event => {
    if (!mobileMenu || mobileMenu.hidden) return;
    if (!mobileMenu.contains(event.target) && !menuToggle?.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileMenu && !mobileMenu.hidden) setMenuOpen(false, true);
  });
  window.addEventListener('resize', () => {
    if (menuToggle && window.getComputedStyle(menuToggle).display === 'none') setMenuOpen(false);
    resetPortrait();
  }, { passive: true });

  if (header) {
    let headerFrame = 0;
    const updateHeader = () => {
      headerFrame = 0;
      header.classList.toggle('is-scrolled', window.scrollY > 16);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      header.style.setProperty('--scroll-progress', progress.toFixed(4));
    };
    const scheduleHeader = () => {
      if (!headerFrame) headerFrame = window.requestAnimationFrame(updateHeader);
    };
    updateHeader();
    window.addEventListener('scroll', scheduleHeader, { passive: true });
    window.addEventListener('resize', scheduleHeader, { passive: true });
    window.addEventListener('load', scheduleHeader, { once: true });
  }

  const sectionLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
  const mainSections = Array.from(document.querySelectorAll('main section[id]'));

  function markCurrentSection(id) {
    sectionLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  if (canObserve && mainSections.length) {
    const visibleSections = new Set();
    const navigationObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      const current = mainSections.find(section => visibleSections.has(section));
      markCurrentSection(current ? current.id : '');
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    mainSections.forEach(section => navigationObserver.observe(section));
  }

  if (canObserve) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
  }

  function animateCounter(element) {
    if (completedCounters.has(element)) return;
    const value = Number(element.dataset.value);
    if (!Number.isFinite(value)) return;
    const decimals = Math.min(4, Math.max(0, Number(element.dataset.decimals) || 0));
    const suffix = element.dataset.suffix || '';
    element.dataset.originalText = element.textContent;
    if (reduceMotion) {
      finishCounter(element);
      return;
    }
    const duration = 1000;
    let startedAt;
    const tick = timestamp => {
      if (reduceMotion) {
        finishCounter(element);
        return;
      }
      if (startedAt === undefined) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = (value * eased).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + suffix;
      if (progress < 1) counterFrames.set(element, window.requestAnimationFrame(tick));
      else finishCounter(element);
    };
    counterFrames.set(element, window.requestAnimationFrame(tick));
  }

  if (canObserve && !reduceMotion) {
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.count-up[data-value]').forEach(element => counterObserver.observe(element));
  }

  portrait?.addEventListener('pointermove', event => {
    if (reduceMotion || !finePointerQuery.matches || portraitFrame) return;
    const { clientX, clientY } = event;
    portraitFrame = window.requestAnimationFrame(() => {
      portraitFrame = 0;
      if (reduceMotion || !portrait.matches(':hover')) return;
      const bounds = portrait.getBoundingClientRect();
      const x = (clientX - bounds.left) / bounds.width - 0.5;
      const y = (clientY - bounds.top) / bounds.height - 0.5;
      portrait.style.setProperty('--rotate-x', `${(-y * 4).toFixed(2)}deg`);
      portrait.style.setProperty('--rotate-y', `${(x * 4).toFixed(2)}deg`);
      portrait.style.setProperty('--light-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      portrait.style.setProperty('--light-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
  }, { passive: true });
  portrait?.addEventListener('pointerleave', resetPortrait);
  portrait?.addEventListener('pointercancel', resetPortrait);

  const evidence = {
    danvoke: {
      title: 'Danvoke — project evidence',
      images: [
        ['extracted_p1_img1.png', 'Campaign dashboard', 'The supplied campaign dashboard reports 5.84× purchase ROAS, Rs. 283,500 revenue and Rs. 48,500 ad spend for August 24–30, 2025.'],
        ['extracted_p2_img2.jpeg', 'E-commerce storefront', 'Danvoke storefront showing the homepage banner, shopping navigation and WhatsApp contact button.'],
        ['extracted_p3_img1.jpeg', 'Product collections', 'Product collection layout for T-shirts, polo shirts, cargo pants and trousers.'],
        ['extracted_p2_img1.png', 'Social media branding', 'Danvoke Facebook page showing its cover artwork and brand presentation.']
      ]
    },
    hafiz: {
      title: 'Hafiz Elevators — project evidence',
      images: [
        ['extracted_p4_img1.png', 'Lead generation dashboard', 'The supplied campaign dashboard reports 142 form leads, a reach of 118,654 and 243,317 impressions for August 24–30, 2025.'],
        ['extracted_p4_img2.jpeg', 'Social media branding', 'Hafiz Elevators Facebook page showing its visual identity and direct contact options.'],
        ['extracted_p5_img1.jpeg', 'Campaign creative', 'Promotional elevator creative shown within the supplied social media screenshot.'],
        ['extracted_p5_img2.jpeg', 'Product benefit creative', 'A product benefit creative with the headline “No bumps, no jerks,” shown in the supplied project materials.']
      ]
    }
  };

  const dialog = document.getElementById('evidence-dialog');
  const evidenceTitle = document.getElementById('evidence-title');
  const evidenceCaption = document.getElementById('evidence-caption');
  const evidenceImage = document.getElementById('evidence-image');
  const evidencePosition = document.getElementById('evidence-position');
  const evidenceClose = document.getElementById('evidence-close');
  // Animate only the loaded image, so slow requests never reveal an empty frame.
  evidenceImage?.addEventListener('load', () => {
    if (reduceMotion || !dialog?.open || typeof evidenceImage.animate !== 'function') return;
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
    const animation = evidenceImage.animate([
      { opacity: 0, transform: 'translateY(8px) scale(0.99)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    activeAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  });
  let currentProject = null;
  let evidenceIndex = 0;
  let evidenceTrigger = null;
  let previousBodyOverflow = '';

  function renderEvidence() {
    if (!currentProject || !evidenceImage) return;
    const [file, alt, caption] = currentProject.images[evidenceIndex];
    evidenceImage.src = `Projects%20I%20worked%20on/${file}`;
    evidenceImage.alt = alt;
    if (evidenceTitle) evidenceTitle.textContent = currentProject.title;
    if (evidenceCaption) evidenceCaption.textContent = caption;
    if (evidencePosition) evidencePosition.textContent = `${evidenceIndex + 1} / ${currentProject.images.length}`;
  }

  function advanceEvidence(direction) {
    if (!currentProject) return;
    evidenceIndex = (evidenceIndex + direction + currentProject.images.length) % currentProject.images.length;
    renderEvidence();
  }

  document.querySelectorAll('.evidence-open[data-project]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      const project = evidence[trigger.dataset.project];
      if (!project || !dialog || typeof dialog.showModal !== 'function' || !evidenceImage) return;
      event.preventDefault();
      currentProject = project;
      evidenceIndex = 0;
      evidenceTrigger = trigger;
      renderEvidence();
      previousBodyOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      evidenceClose?.focus();
    });
  });

  evidenceClose?.addEventListener('click', () => dialog?.close());
  document.getElementById('evidence-prev')?.addEventListener('click', () => advanceEvidence(-1));
  document.getElementById('evidence-next')?.addEventListener('click', () => advanceEvidence(1));
  dialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      advanceEvidence(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      dialog.close();
    }
  });
  dialog?.addEventListener('close', () => {
    document.body.style.overflow = previousBodyOverflow;
    if (evidenceTrigger?.isConnected) evidenceTrigger.focus();
  });

  const projectForm = document.getElementById('project-form');
  const draftActions = document.getElementById('draft-actions');
  const draftEmail = document.getElementById('draft-email');
  const draftWhatsapp = document.getElementById('draft-whatsapp');
  const formStatus = document.getElementById('form-status');

  function invalidateDraft() {
    if (draftActions) draftActions.hidden = true;
    draftEmail?.removeAttribute('href');
    draftWhatsapp?.removeAttribute('href');
    if (formStatus) formStatus.textContent = '';
  }

  projectForm?.addEventListener('input', invalidateDraft);
  projectForm?.addEventListener('change', invalidateDraft);
  projectForm?.addEventListener('reset', invalidateDraft);
  document.querySelectorAll('.service-action[data-service]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const serviceField = projectForm?.elements.namedItem('service');
      if (serviceField) {
        serviceField.value = link.dataset.service;
        invalidateDraft();
      }
    });
  });
  projectForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!projectForm.reportValidity()) return;
    const value = name => String(projectForm.elements.namedItem(name)?.value || '').trim();
    const name = value('name');
    const brand = value('brand');
    const serviceField = projectForm.elements.namedItem('service');
    const service = serviceField?.selectedOptions?.[0]?.textContent.trim() || value('service');
    const message = value('message');

    if (!name || !message) {
      if (formStatus) formStatus.textContent = 'Please add your name and a brief message to prepare your inquiry.';
      projectForm.elements.namedItem(!name ? 'name' : 'message')?.focus();
      return;
    }
    const body = [
      'Hi Ibtsam,',
      '',
      `My name is ${name}.`,
      brand ? `Brand / website: ${brand}` : '',
      value('service') ? `Interested in: ${service}` : '',
      '',
      message,
      '',
      `Thanks,\n${name}`
    ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n');
    const subject = brand ? `Project inquiry — ${brand}` : `Project inquiry from ${name}`;
    if (draftEmail) draftEmail.href = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (draftWhatsapp) draftWhatsapp.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(body)}`;
    if (draftActions) draftActions.hidden = false;
    if (formStatus) formStatus.textContent = 'Your draft is ready. Choose email or WhatsApp, then review and send it in that app.';
    draftEmail?.focus();
  });

  draftEmail?.addEventListener('click', () => {
    if (formStatus) formStatus.textContent = 'Review and send your draft in your email app. Your message has not been sent by this website.';
  });
  draftWhatsapp?.addEventListener('click', () => {
    if (formStatus) formStatus.textContent = 'Review and send your draft in WhatsApp. Your message has not been sent by this website.';
  });

  function copyWithFallback(text) {
    const previouslyFocused = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    }
    textarea.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    return copied;
  }

  document.getElementById('copy-email')?.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(emailAddress);
        copied = true;
      }
    } catch (_) {
      // The fallback also covers local-file browsers that deny Clipboard API access.
    }
    if (!copied) copied = copyWithFallback(emailAddress);
    if (status) status.textContent = copied ? 'Email address copied.' : `Copy this address: ${emailAddress}`;
  });

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
