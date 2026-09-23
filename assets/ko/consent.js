/* AbOnlinEnglish — Google Analytics 4 + çerez onayı (KVKK / GDPR uyumlu, Consent Mode v2)
   KURULUM: Aşağıdaki GA_ID değerine kendi GA4 Ölçüm Kimliğinizi yazın (ör. 'G-ABC123XYZ9').
   Boş bırakılırsa hiçbir analiz kodu yüklenmez ve çerez bandı gösterilmez.
   Ziyaretçi "Kabul et" demeden Google'a hiçbir istek gitmez. */
(function(){
  'use strict';
  var GA_ID = '';                 // ← GA4 Ölçüm Kimliği
  var KEY = 'ko_consent_v1';      // 'granted' | 'denied'
  var btns = document.querySelectorAll('[data-ck-open]');
  if (!/^G-[A-Z0-9]{4,20}$/.test(GA_ID)) { for (var i = 0; i < btns.length; i++) btns[i].hidden = true; return; }

  function get(){ try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function loadGA(){
    if (loaded) return; loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function el(t, c, txt){ var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  var bar = null;
  function banner(){
    if (bar) { bar.hidden = false; return; }
    bar = el('div', 'ck'); bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-live', 'polite'); bar.setAttribute('aria-label', 'Çerez tercihi');
    var p = el('p', null, '🍪 Sitemizi geliştirmek için, izin verirseniz anonim ziyaret istatistikleri (Google Analytics) topluyoruz. Reklam çerezi kullanılmaz. ');
    var a = el('a', null, 'Gizlilik'); a.href = '/gizlilik'; p.appendChild(a);
    var b = el('div', 'ck-b');
    var no = el('button', 'ck-no', 'Reddet'); no.type = 'button';
    var ok = el('button', 'ck-ok', 'Kabul et'); ok.type = 'button';
    no.addEventListener('click', function(){ set('denied'); bar.hidden = true; if (loaded) location.reload(); });
    ok.addEventListener('click', function(){ set('granted'); bar.hidden = true; loadGA(); });
    b.appendChild(no); b.appendChild(ok); bar.appendChild(p); bar.appendChild(b);
    document.body.appendChild(bar);
  }
  for (var j = 0; j < btns.length; j++) btns[j].addEventListener('click', banner);

  var c = get();
  if (c === 'granted') loadGA(); else if (c !== 'denied') banner();
})();
