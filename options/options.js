const OPTIONS_I18N_FALLBACK = {
  options_settings: 'Settings',
  options_gui_position: 'GUI position:',
  options_top_right: 'Top right',
  options_top_left: 'Top left',
  options_save: 'Save',
  options_settings_saved: 'Settings saved.',
  options_legal_load_failed: 'Failed to load the terms and privacy policy.',
  terms_privacy: 'Terms of Service & Privacy Policy'
};

function t(key, substitutions = []) {
  let localized = null;
  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
    try {
      const substitutionArg =
        substitutions.length === 0
          ? undefined
          : substitutions.length === 1
            ? substitutions[0]
            : substitutions;
      localized = chrome.i18n.getMessage(key, substitutionArg);
    } catch (error) {
      console.warn('[Options][i18n] getMessage failed:', key, error);
    }
  }

  if (localized) {
    return localized;
  }

  const fallback = OPTIONS_I18N_FALLBACK[key] || key;
  return substitutions.reduce(
    (result, value, index) => result.replace(new RegExp(`\\$${index + 1}`, 'g'), value ?? ''),
    fallback
  );
}

function applyLocalization() {
  document.title = `Ghost In The Chrome - ${t('options_settings')}`;
  
  const mainTitle = document.getElementById('options-title') || document.querySelector('h1');
  if (mainTitle) {
    mainTitle.textContent = t('options_settings');
  }
  
  const positionLabel = document.getElementById('options-position-label');
  if (positionLabel) {
    positionLabel.textContent = t('options_gui_position');
  }
  
  const rightOption = document.querySelector('option[value="right"]');
  const leftOption = document.querySelector('option[value="left"]');
  if (rightOption) rightOption.textContent = t('options_top_right');
  if (leftOption) leftOption.textContent = t('options_top_left');
  
  const saveBtn = document.getElementById('save');
  if (saveBtn) {
    saveBtn.textContent = t('options_save');
  }
  
  const legalSectionTitle = document.getElementById('legal-section-title');
  if (legalSectionTitle) {
    legalSectionTitle.textContent = t('terms_privacy');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyLocalization();
  
  chrome.storage.sync.get(['position'], (result) => {
    const select = document.getElementById('position');
    if (select) {
      select.value = result.position || 'right';
    }
  });
  
  const saveBtn = document.getElementById('save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const select = document.getElementById('position');
      const position = select ? select.value : 'right';
    
      chrome.storage.sync.set({ position }, () => {
      const status = document.getElementById('status');
        if (status) {
          status.textContent = t('options_settings_saved');
      status.className = 'success';
      
      setTimeout(() => {
        status.textContent = '';
        status.className = '';
      }, 2000);
        }
      });
    });
  }
  
  loadLegalContent();
});

async function loadLegalContent() {
  const legalText = document.getElementById('legal-text');
  if (!legalText) return;

  try {
    const response = await fetch(chrome.runtime.getURL('PRIVACY_POLICY.md'));
    const text = await response.text();
    legalText.innerHTML = convertMarkdownToHtml(text);
  } catch (error) {
    console.error('Failed to load terms and privacy policy:', error);
    legalText.textContent = t('options_legal_load_failed');
  }
}

function convertMarkdownToHtml(markdown) {
  let html = markdown;
  
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  
  html = html.replace(/^(\*|-) (.*$)/gim, '<li>$2</li>');
  
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  html = html.replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>');
  html = html.replace(/<ul>(<li>.*?<\/li>)<\/ul>(?!<li>)/gims, '<ul>$1</ul>');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br>');
  
  return html;
}