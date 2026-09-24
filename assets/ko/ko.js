/* AbOnlinEnglish — Kendin Öğren ünite etkileşimleri.
   İlerleme, eski sayfa (ab_v7) ve kendin-ogren (abonline_progress_v1) ile ortaktır.
   Güvenlik: kullanıcı/veri içeriği yalnızca textContent ile yazılır (innerHTML kullanılmaz). */
(function(){
  'use strict';
  var SK='ab_v7', SK2='abonline_progress_v1';
  function load(k,d){try{var v=JSON.parse(localStorage.getItem(k));return (v&&typeof v==='object')?v:d;}catch(e){return d;}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  var P=load(SK,{}); ['scores','completed','tabs'].forEach(function(k){if(!P[k]||typeof P[k]!=='object')P[k]={};});
  if(!P.streak||typeof P.streak!=='object')P.streak={n:0,d:''}; if(typeof P.xp!=='number'||!isFinite(P.xp))P.xp=0;
  function sp(){save(SK,P);}
  function $(s,r){return (r||document).querySelector(s);} function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
  function track(name,params){try{if(typeof window.gtag==='function')window.gtag('event',name,params||{});}catch(e){}}
  var body=document.body, KEY=body.getAttribute('data-key');

  function toast(msg){var t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('on');},2600);}
  function navXP(){var e=$('#ko-xp');if(e)e.textContent='⚡ '+(P.xp||0).toLocaleString('tr-TR')+' XP';}
  function streak(){var today=new Date().toISOString().slice(0,10),s=P.streak;if(s.d===today)return;var y=new Date(Date.now()-864e5).toISOString().slice(0,10);s.n=(s.d===y)?s.n+1:1;s.d=today;sp();}
  function mirror(done){ // kendin-ogren sayfasındaki ilerleme çubuklarını da besle
    var p=load(SK2,{completed:{},streak:{count:0,lastDate:''},xp:0});
    if(!p.completed||typeof p.completed!=='object')p.completed={};
    if(done)p.completed[KEY]=true;
    p.xp=P.xp; p.lastUnit={label:body.getAttribute('data-label'),href:location.pathname};
    save(SK2,p);
  }

  /* ── Sesli okuma (tarayıcı destekliyorsa) ── */
  var TTS=('speechSynthesis' in window)&&('SpeechSynthesisUtterance' in window);
  function voice(){var v=speechSynthesis.getVoices()||[];return v.filter(function(x){return /^en[-_]GB/i.test(x.lang);})[0]||v.filter(function(x){return /^en/i.test(x.lang);})[0]||null;}
  function say(text,rate,onend){
    if(!TTS)return;speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=rate||.9;var v=voice();if(v)u.voice=v;
    if(onend){u.onend=onend;u.onerror=onend;}
    speechSynthesis.speak(u);
  }
  if(TTS){
    $$('.say').forEach(function(b){b.hidden=false;b.addEventListener('click',function(){say(b.getAttribute('data-say').replace(/\s*\/\s*/g,', '),.85);});});
    var sa=$('.say-all');
    if(sa){sa.hidden=false;var on=false;
      sa.addEventListener('click',function(){
        if(on){speechSynthesis.cancel();return;}
        var t=$('.rtext');if(!t)return;on=true;sa.textContent='⏹ Durdur';
        say(t.textContent.replace(/\s+/g,' ').trim(),.9,function(){on=false;sa.textContent='🔊 Metni dinle';});
        track('listen_reading',{unit:KEY});
      });
    }
  }

  /* ── İndirme takibi (analitik açıksa) ── */
  $$('a[download]').forEach(function(a){a.addEventListener('click',function(){track('file_download',{file_name:a.getAttribute('href'),unit:KEY||'level'});});});

  /* ── Level page: progress on cards ── */
  if(!KEY){
    $$('.uc[data-key]').forEach(function(c){
      var k=c.getAttribute('data-key'),sc=P.scores[k],pct=(sc&&+sc.pct)||0;
      if(P.completed[k]){c.classList.add('done');pct=100;}
      var b=$('.ubar i',c);if(b)b.style.width=Math.min(100,Math.max(0,pct))+'%';
    });
    navXP();return;
  }

  /* ── Tabs (WAI-ARIA tabs pattern: ok tuşları, Home/End) ── */
  var TABS=['vocab','grammar','reading','ex','write'];
  var tabBtns=$$('.tab');
  function show(t,push,focus){
    tabBtns.forEach(function(b){var on=b.getAttribute('data-t')===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;if(on&&focus)b.focus();});
    $$('.panel').forEach(function(p){p.classList.toggle('on',p.id==='p-'+t);});
    if(t==='vocab'||t==='grammar')mark(t,true);
    if(push&&history.replaceState)history.replaceState(null,'','#'+t);
  }
  tabBtns.forEach(function(b,i){
    b.addEventListener('click',function(){show(b.getAttribute('data-t'),true);var tb=$('.tabs');if(tb&&window.scrollY>tb.offsetTop)window.scrollTo({top:tb.offsetTop-58,behavior:'smooth'});});
    b.addEventListener('keydown',function(e){
      var j=null;if(e.key==='ArrowRight')j=(i+1)%tabBtns.length;else if(e.key==='ArrowLeft')j=(i-1+tabBtns.length)%tabBtns.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=tabBtns.length-1;
      if(j!==null){e.preventDefault();show(tabBtns[j].getAttribute('data-t'),true,true);}
    });
  });
  /* "Sonraki bölüm" butonları */
  $$('[data-go]').forEach(function(b){b.addEventListener('click',function(){show(b.getAttribute('data-go'),true);var tb=$('.tabs');if(tb)window.scrollTo({top:tb.offsetTop-58,behavior:'smooth'});});});

  function paintDone(){
    var t=P.tabs[KEY]||{},n=0;
    TABS.forEach(function(x){
      var on=!!t[x];if(on)n++;
      var b=$('.tab[data-t='+x+']');if(b)b.classList.toggle('done',on);
      var s=$('.ustrip [data-t='+x+']');if(s)s.classList.toggle('done',on);
    });
    var un=$('#up-n'),ub=$('#up-bar');if(un)un.textContent=n+'/5';if(ub)ub.style.width=(n*20)+'%';
    if(t.reading){var r=$('#done-reading');if(r){r.classList.add('done');r.textContent='✅ Okuma tamamlandı';}}
    if(t.write){var w=$('#done-write');if(w){w.classList.add('done');w.textContent='✅ Yazma görevleri tamamlandı';}}
  }
  function mark(t,silent){
    if(!P.tabs[KEY])P.tabs[KEY]={};
    if(P.tabs[KEY][t])return;
    P.tabs[KEY][t]=true;sp();paintDone();
    var all=TABS.every(function(x){return P.tabs[KEY][x];});
    if(all&&!P.completed[KEY]){P.completed[KEY]=true;P.xp+=25;sp();streak();mirror(true);navXP();track('unit_complete',{unit:KEY});if(!silent)setTimeout(finish,350);}
  }
  function finish(){
    var nx=$('.pn .nx');
    var ov=el('div','cov'),card=el('div','ccard');ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Ünite tamamlandı');
    card.appendChild(el('div','e','🎓'));card.appendChild(el('h3',null,'Ünite tamamlandı!'));
    var p=el('p',null,'Tüm bölümleri bitirdin. ');p.appendChild(el('b',null,'+25 XP'));p.appendChild(document.createTextNode(' bonus kazandın.'));card.appendChild(p);
    var bt=el('div','cbtns'),close=el('button',null,'Kapat');close.type='button';bt.appendChild(close);
    if(nx){var a=el('a',null,'Sonraki ünite →');a.href=nx.getAttribute('href');bt.appendChild(a);}
    card.appendChild(bt);ov.appendChild(card);
    function done(){ov.remove();document.removeEventListener('keydown',esc);}
    function esc(e){if(e.key==='Escape')done();}
    ov.addEventListener('click',function(e){if(e.target===ov||e.target===close)done();});
    document.addEventListener('keydown',esc);
    document.body.appendChild(ov);close.focus();
  }
  var rd=$('#done-reading');if(rd)rd.addEventListener('click',function(){mark('reading');});
  var wd=$('#done-write');if(wd)wd.addEventListener('click',function(){mark('write');});

  /* ── Reveal buttons (comprehension) ── */
  $$('.reveal').forEach(function(b){b.addEventListener('click',function(){var a=b.nextElementSibling;if(a)a.classList.add('show');b.remove();});});
  /* ── Grammar practice answers ── */
  $$('.g-answer').forEach(function(a){var v=a.textContent;a.setAttribute('data-a',v);a.textContent='Göster';a.classList.add('hid');a.setAttribute('role','button');a.setAttribute('tabindex','0');a.setAttribute('aria-label','Cevabı göster');
    function rv(){a.textContent=a.getAttribute('data-a');a.classList.remove('hid');a.removeAttribute('aria-label');}
    a.addEventListener('click',rv);a.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();rv();}});});
  /* ── Writing ── */
  $$('.wt textarea').forEach(function(ta){
    var k='ko_w_'+KEY+'_'+ta.getAttribute('data-i');
    try{ta.value=localStorage.getItem(k)||'';}catch(e){}
    function wc(){var n=ta.value.trim().split(/\s+/).filter(Boolean).length;ta.nextElementSibling.textContent=n+' kelime';try{localStorage.setItem(k,ta.value);}catch(e){}}
    ta.addEventListener('input',wc);wc();
  });
  $$('.smp-b').forEach(function(b){b.setAttribute('aria-expanded','false');b.addEventListener('click',function(){var s=b.nextElementSibling,on=s.classList.toggle('show');b.setAttribute('aria-expanded',on?'true':'false');b.textContent=on?'🔼 Örnek cevabı gizle':'💡 Örnek cevabı göster';});});

  /* ── Exercises ── */
  var ans={}, wrong=[], retryMode=false, qEls=$$('.q');
  qEls.forEach(function(q,i){
    $$('.opt',q).forEach(function(o){o.setAttribute('aria-pressed','false');o.addEventListener('click',function(){
      if(q.getAttribute('data-lock'))return;
      $$('.opt',q).forEach(function(x){x.classList.remove('sel');x.setAttribute('aria-pressed','false');});o.classList.add('sel');o.setAttribute('aria-pressed','true');ans[i]=o.getAttribute('data-v');
      var left=qEls.length-Object.keys(ans).length,c=$('#b-check');if(c&&!retryMode)c.setAttribute('data-left',left);
    });});
  });
  function feedback(fb,good,ch,right,exp){
    while(fb.firstChild)fb.removeChild(fb.firstChild);
    if(good){fb.appendChild(el('span','g','✅ Doğru!'));}
    else{fb.appendChild(el('span','r','❌ '+(ch?'Senin cevabın: '+ch:'Boş bıraktın')));fb.appendChild(document.createTextNode(' · '));fb.appendChild(el('span','g','Doğrusu: '+right));}
    if(exp)fb.appendChild(el('span','e',exp));
  }
  function grade(indices){
    var ok=0,bad=[];
    indices.forEach(function(i){
      var q=qEls[i],right=q.getAttribute('data-ans'),exp=q.getAttribute('data-exp')||'',ch=ans[i],good=ch===right;
      q.setAttribute('data-lock','1');q.classList.remove('retry','ok','bad');q.classList.add(good?'ok':'bad');
      $$('.opt',q).forEach(function(o){o.disabled=true;var v=o.getAttribute('data-v');if(v===right)o.classList.add('good');else if(v===ch)o.classList.add('wrong');});
      var fb=$('.fb',q);fb.classList.add('on');feedback(fb,good,ch,right,exp);
      if(good)ok++;else bad.push(i);
    });
    return {ok:ok,bad:bad};
  }
  function setScore(){
    var total=qEls.length,ok=$$('.q.ok').length,bad=total-ok,pct=Math.round(ok/total*100);
    $('#s-ok').textContent=ok;$('#s-bad').textContent=bad;$('#s-pct').textContent=pct+'%';$('#s-bar').style.width=pct+'%';
    return pct;
  }
  var bC=$('#b-check'),bR=$('#b-retry'),bZ=$('#b-reset'),sessionXP=0;
  if(bC)bC.addEventListener('click',function(){
    var idx=retryMode?wrong.slice():qEls.map(function(_,i){return i;});
    var wasRetry=retryMode,r=grade(idx),xp;
    if(retryMode){xp=r.ok*3;retryMode=false;bC.textContent='✓ Kontrol et';}
    else{var pct0=Math.round(r.ok/idx.length*100);xp=r.ok*5+(pct0>=80?50:pct0>=60?25:0);}
    wrong=r.bad;bR.classList.toggle('on',wrong.length>0);bR.textContent='🔄 Yanlışları tekrar et ('+wrong.length+')';
    var pct=setScore(),prev=P.scores[KEY]||{},best=Math.max(+prev.best||+prev.pct||0,pct);
    /* XP yalnızca en iyi skor ilk kez aşıldığında tam verilir (sıfırla-tekrar çöz ile XP kasılmasın) */
    var prevBest=+prev.best||+prev.pct||0,earned=(!wasRetry&&prev.pct!=null&&pct<=prevBest)?0:xp;
    P.xp+=earned;P.scores[KEY]={ok:$$('.q.ok').length,bad:$$('.q.bad').length,total:qEls.length,pct:pct,best:best};
    sessionXP+=earned;$('#s-xp').textContent=sessionXP;sp();navXP();streak();mirror(false);
    toast(earned>0?'+'+earned+' XP kazandın!':'Kontrol edildi');
    track('exercise_check',{unit:KEY,score:pct});
    if(pct>=60)mark('ex');
  });
  if(bR)bR.addEventListener('click',function(){
    retryMode=true;wrong.forEach(function(i){var q=qEls[i];q.removeAttribute('data-lock');q.classList.remove('bad');q.classList.add('retry');delete ans[i];
      $$('.opt',q).forEach(function(o){o.disabled=false;o.classList.remove('sel','good','wrong');o.setAttribute('aria-pressed','false');});$('.fb',q).classList.remove('on');});
    bR.classList.remove('on');bC.textContent='✓ Tekrarı kontrol et';
    var f=qEls[wrong[0]];if(f)f.scrollIntoView({behavior:'smooth',block:'center'});
  });
  if(bZ)bZ.addEventListener('click',function(){
    ans={};wrong=[];retryMode=false;bC.textContent='✓ Kontrol et';bR.classList.remove('on');
    qEls.forEach(function(q){q.removeAttribute('data-lock');q.classList.remove('ok','bad','retry');$$('.opt',q).forEach(function(o){o.disabled=false;o.classList.remove('sel','good','wrong');o.setAttribute('aria-pressed','false');});$('.fb',q).classList.remove('on');});
    setScore();
  });


  /* ── Init ── */
  paintDone();navXP();mirror(false);
  var h=(location.hash||'').slice(1);show(TABS.indexOf(h)>-1?h:'vocab',false);
})();
