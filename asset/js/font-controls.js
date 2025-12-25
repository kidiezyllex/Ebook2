// file: font-controls.js
(function(){
  const STORAGE_KEY = 'ebook_settings_v2';
  const DEFAULTS = {
    bgColor: '#FFFFFF',
    textColor: '#111827',
    fontSize: '18px',
    fontFamily: "'Merriweather', Georgia, serif"
  };

  function getSettings(){
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return s ? Object.assign({}, DEFAULTS, s) : Object.assign({}, DEFAULTS);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveSettings(settings){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* ignore */ }
  }

  function applySettingsToIframe(settings){
    const iframe = document.getElementById('content-iframe');
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow && iframe.contentWindow.document;
      if (!doc) return;
      // Áp dụng cho cả <html> và <body> để an toàn với nhiều tài liệu
      if (doc.documentElement) {
        doc.documentElement.style.fontSize = settings.fontSize;
        doc.documentElement.style.fontFamily = settings.fontFamily;
      }
      if (doc.body) {
        doc.body.style.fontSize = settings.fontSize;
        doc.body.style.fontFamily = settings.fontFamily;
      }
    } catch (e) {
      // Có thể xảy ra nếu iframe là cross-origin — im lặng bỏ qua
    }
  }

  function updateControlsFromSettings(settings){
    const slider = document.getElementById('fontSizeSlider');
    const select = document.getElementById('fontFamilySelect');
    if (slider) {
      const n = parseInt(settings.fontSize, 10) || 18;
      slider.value = n;
    }
    if (select) {
      // Nếu value không match exact option, vẫn cố gắng gán (browsers sẽ bỏ qua nếu không có)
      try { select.value = settings.fontFamily; } catch (e) {}
    }
  }

  function init(){
    const slider = document.getElementById('fontSizeSlider');
    const select = document.getElementById('fontFamilySelect');

    let settings = getSettings();
    // ensure fontSize is "NNpx"
    if (!/px\s*$/.test(settings.fontSize)) {
      settings.fontSize = (parseInt(settings.fontSize,10) || 18) + 'px';
    }

    // Cập nhật UI controls (nếu có)
    updateControlsFromSettings(settings);

    // Áp dụng khi iframe load
    const iframe = document.getElementById('content-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        settings = getSettings(); // load lại (in case other code changed it)
        applySettingsToIframe(settings);
      });
      // Thử áp dụng ngay nếu iframe đã sẵn sàng
      applySettingsToIframe(settings);
    }

    // Sự kiện thay đổi cỡ chữ
    if (slider) {
      slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10) || 18;
        settings.fontSize = value + 'px';
        saveSettings(settings);
        applySettingsToIframe(settings);
      });
    }

    // Sự kiện thay đổi font
    if (select) {
      select.addEventListener('change', (e) => {
        settings.fontFamily = e.target.value;
        saveSettings(settings);
        applySettingsToIframe(settings);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
