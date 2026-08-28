const ready = (callback) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
  else callback();
};

ready(() => {
  const announcer = document.createElement('div');
  announcer.className = 'sr-only';
  Object.assign(announcer.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0'
  });
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  document.body.append(announcer);

  let announcementTimer;
  const announce = (message) => {
    window.clearTimeout(announcementTimer);
    announcer.textContent = '';
    announcementTimer = window.setTimeout(() => { announcer.textContent = message; }, 40);
  };

  const tablists = [...document.querySelectorAll('[role="tablist"]')];
  for (const tablist of tablists) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    if (!tabs.length) continue;

    const synchronize = (activeTab, focus = false) => {
      tabs.forEach((tab) => {
        const active = tab === activeTab;
        tab.tabIndex = active ? 0 : -1;
        tab.setAttribute('aria-selected', String(active));
      });
      if (focus) activeTab.focus();
    };

    const selected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0];
    synchronize(selected);

    tablist.addEventListener('keydown', (event) => {
      const current = document.activeElement;
      const index = tabs.indexOf(current);
      if (index < 0) return;
      let targetIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') targetIndex = 0;
      else if (event.key === 'End') targetIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      const target = tabs[targetIndex];
      synchronize(target, true);
      target.click();
    });

    tabs.forEach((tab) => tab.addEventListener('click', () => synchronize(tab)));
  }

  document.querySelectorAll('[role="alert"], .alert, .warning, [class*="warning"], [class*="error"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (!node.hasAttribute('role')) node.setAttribute('role', 'alert');
    node.setAttribute('aria-live', 'assertive');
  });

  document.querySelectorAll('[class*="result"], [class*="summary"], [class*="status"]').forEach((node) => {
    if (!(node instanceof HTMLElement) || node.closest('[role="alert"]')) return;
    if (!node.hasAttribute('aria-live')) node.setAttribute('aria-live', 'polite');
  });

  const actionMessages = [
    ['calculate', 'Loan repayment results updated.'],
    ['compare', 'Loan offer comparison updated.'],
    ['refinance', 'Refinance break-even results updated.'],
    ['export', 'Export prepared.'],
    ['download', 'Download prepared.'],
    ['copy', 'Result copied.'],
    ['print', 'Print view opened.'],
    ['share', 'Share link prepared.'],
    ['save', 'Scenario saved in this browser.'],
    ['delete', 'Saved scenario removed.'],
    ['clear', 'Saved values cleared.']
  ];

  document.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('button, a') : null;
    if (!control) return;
    const label = `${control.textContent ?? ''} ${control.getAttribute('aria-label') ?? ''}`.trim().toLowerCase();
    const match = actionMessages.find(([keyword]) => label.includes(keyword));
    if (match) announce(match[1]);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList' && mutation.type !== 'characterData') continue;
      const target = mutation.target instanceof HTMLElement ? mutation.target : mutation.target.parentElement;
      if (!target) continue;
      const text = target.textContent?.replace(/\s+/g, ' ').trim();
      if (!text || text.length > 260) continue;
      if (/(negative amortization|cannot be paid off|break-even|payment changed|remaining balance|invalid|required)/i.test(text)) {
        announce(text);
      }
    }
  });
  observer.observe(document.getElementById('app') ?? document.body, { childList: true, subtree: true, characterData: true });
});
