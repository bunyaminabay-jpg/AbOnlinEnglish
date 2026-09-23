/* AbOnlinEnglish — Google Analytics 4 + çerez onayı (KVKK / GDPR uyumlu, Consent Mode v2)
   KURULUM: Aşağıdaki GA_ID değerine kendi GA4 Ölçüm Kimliğinizi yazın (ör. 'G-ABC123XYZ9').
   Boş bırakılırsa hiçbir analiz kodu yüklenmez ve çerez bandı gösterilmez.
   Tüm sayfalarda </body> öncesine eklenir: <script src="/assets/ko/consent.js?v=2" defer></script>
   Ziyaretçi "Kabul et" demeden Google'a hiçbir istek gitmez. */
(function(){
  'use strict';
  var GA_ID = 'G-ZJK1HKG8FJ';      // GA4 Ölçüm Kimliği
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
  var CSS = '.ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:720px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 12px 40px rgba(15,30,60,.25);padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-family:"DM Sans",system-ui,-apple-system,sans-serif;box-sizing:border-box}' +
    '.ck[hidden]{display:none}.ck p{flex:1 1 300px;margin:0;font-size:13.5px;color:#334155;line-height:1.55}.ck p a{color:#1d4ed8;text-decoration:underline}' +
    '.ck-b{display:flex;gap:8px}.ck-b button{padding:9px 16px;border-radius:9px;font:800 13px/1.2 inherit;border:1px solid #e2e8f0;background:#fff;color:#0f1e3c;cursor:pointer}.ck-b .ck-ok{background:#0f1e3c;color:#fff;border-color:#0f1e3c}';
  function style(){ if (document.getElementById('ko-ck-css')) return; var st = document.createElement('style'); st.id = 'ko-ck-css'; st.textContent = CSS; document.head.appendChild(st); }
  var bar = null;
  function banner(){
    if (bar) { bar.hidden = false; return; }
    style();
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
