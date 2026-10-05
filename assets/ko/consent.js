/* AbOnlinEnglish — Google Analytics 4 + çerez onayı (KVKK / GDPR uyumlu, Consent Mode v2)
   KURULUM: Aşağıdaki GA_ID değerine kendi GA4 Ölçüm Kimliğinizi yazın (ör. 'G-ABC123XYZ9').
   Boş bırakılırsa hiçbir analiz kodu yüklenmez ve çerez bandı gösterilmez.
   Ziyaretçi "Kabul et" demeden Google'a hiçbir istek gitmez. */
(function(){
  'use strict';
  var GA_ID = 'G-ZJK1HKG8FJ';                 // ← GA4 Ölçüm Kimliği
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
    document.addEventListener('click', function(ev){
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a) return;
      var m = (a.getAttribute('href') || '').split('#')[0].split('?')[0].match(/\.(pdf|zip|docx?|pptx?|xlsx?|mp3|mp4|epub)$/i);
      if (!m) return;
      var f = decodeURIComponent(a.pathname.split('/').pop() || '');
      window.gtag('event', 'ab_download', { file_name: f, file_extension: m[1].toLowerCase(), link_url: a.href, page_path: location.pathname });
    }, true);
  }

  function el(t, c, txt){ var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  var bar = null;
  function css(){
    if (document.getElementById('abck-css')) return;
    var st = document.createElement('style'); st.id = 'abck-css';
    st.textContent = '.abck{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:720px;margin:0 auto;background:#fff;color:#1b2330;border:1px solid #d1dbe7;border-radius:14px;box-shadow:0 12px 40px rgba(15,30,60,.25);padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}.abck p{margin:0;flex:1 1 280px}.abck a{color:#0969da;font-weight:600}.abck-b{display:flex;gap:8px}.abck-b button{font:600 14px system-ui,sans-serif;padding:9px 18px;border-radius:10px;cursor:pointer;border:1.5px solid #d1dbe7;background:#fff;color:#1b2330}.abck-b .abck-ok{background:#0c1a30;color:#fff;border-color:#0c1a30}.abck[hidden]{display:none}';
    document.head.appendChild(st);
  }
  function banner(){
    css();
    if (bar) { bar.hidden = false; return; }
    bar = el('div', 'abck'); bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-live', 'polite'); bar.setAttribute('aria-label', 'Çerez tercihi');
    var p = el('p', null, '🍪 Sitemizi geliştirmek için, izin verirseniz anonim ziyaret istatistikleri (Google Analytics) topluyoruz. Reklam çerezi kullanılmaz. ');
    var a = el('a', null, 'Gizlilik'); a.href = '/gizlilik'; p.appendChild(a);
    var b = el('div', 'abck-b');
    var no = el('button', 'abck-no', 'Reddet'); no.type = 'button';
    var ok = el('button', 'abck-ok', 'Kabul et'); ok.type = 'button';
    no.addEventListener('click', function(){ set('denied'); bar.hidden = true; if (loaded) location.reload(); });
    ok.addEventListener('click', function(){ set('granted'); bar.hidden = true; loadGA(); });
    b.appendChild(no); b.appendChild(ok); bar.appendChild(p); bar.appendChild(b);
    document.body.appendChild(bar);
  }
  for (var j = 0; j < btns.length; j++) btns[j].addEventListener('click', banner);

  var c = get();
  if (c === 'granted') loadGA(); else if (c !== 'denied') banner();
})();
