(function(){
  var BASE=window.PERFS_DATA;
  var KEY='perfs-salle-v2';
  var extras=[];
  try{extras=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){extras=[]}
  if(!Array.isArray(extras))extras=[];
  function saveExtras(){try{localStorage.setItem(KEY,JSON.stringify(extras))}catch(e){}}

  var reduceMq=window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced(){return reduceMq.matches}
  var state={group:'Pectoraux',q:'',anim:true,rig:null,first:true};
  var hero=document.getElementById('hero');
  function slug(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function $(id){return document.getElementById(id)||document.createElement('div')}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function fmtD(d){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d);return m?m[3]+'/'+m[2]:d}
  function fmtDY(d){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d);return m?m[3]+'/'+m[2]+'/'+m[1]:d}
  function num(n){return String(Math.round(n*100)/100).replace('.',',')}
  var GC={};
  var GCX=['#FF6B6B','#4DD0E1','#FFCA28','#66BB6A','#FF7043','#29B6F6'];
  function gc(g){return '#F2F2F2'}

  /* --- modèle --- */
  function build(){
    var gs=JSON.parse(JSON.stringify(BASE.groups));
    function findEx(name){
      for(var i=0;i<gs.length;i++)for(var j=0;j<gs[i].ex.length;j++)if(gs[i].ex[j].n.toLowerCase()===name.toLowerCase())return gs[i].ex[j];
      return null;
    }
    extras.forEach(function(x){
      var e=findEx(x.n);
      if(!e){
        var g=null;gs.forEach(function(k){if(k.g===x.g)g=k});
        if(!g){g={g:x.g,ex:[]};gs.push(g)}
        e={n:x.n,ss:[]};g.ex.push(e);
      }
      var ses=null;e.ss.forEach(function(s){if(s.d===x.d)ses=s});
      if(!ses){ses={d:x.d,s:[]};e.ss.push(ses);e.ss.sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0})}
      ses.s.push([x.kg,x.r,x.ok?'n':'f']);
    });
    return gs;
  }
  function topOf(ses){
    var best=null;
    ses.s.forEach(function(a){
      if(a[2]==='w'||a[2]==='f'||a[1]<1)return;
      if(!best||a[0]>best[0]||(a[0]===best[0]&&a[1]>best[1]))best=a;
    });
    return best;
  }
  function analyse(e){
    var tops=[];
    e.ss.forEach(function(s){var t=topOf(s);if(t)tops.push({d:s.d,kg:t[0],r:t[1]})});
    var rec=null;
    tops.forEach(function(t){if(!rec||t.kg>rec.kg||(t.kg===rec.kg&&t.r>rec.r))rec=t});
    var isPR=false,prevBest=null;
    if(tops.length>=3){
      var last=tops[tops.length-1];
      var prior=tops.slice(0,-1);
      prevBest=Math.max.apply(null,prior.map(function(t){return t.kg}));
      isPR=last.kg>prevBest;
    }
    return {tops:tops,rec:rec,isPR:isPR,prevBest:prevBest};
  }

  /* --- type de montage 3D d'après le nom de l'exercice --- */
  function kindOf(n){
    var s=n.toLowerCase();
    if(/lest/.test(s))return 'plate';
    if(/haltère|goblet/.test(s)||/^(écarté|curl marteau|curl marteau assis|curl biceps|los curlos)$/.test(s))return 'dumbbell';
    if(/barre|smith/.test(s)||/^(squat complet|soulevé de terre)/.test(s))return 'barbell';
    return 'stack';
  }
  var LOAD_LABEL={barbell:'Charger la barre',dumbbell:'Voir l’haltère',plate:'Voir le lest',stack:'Placer la clavette'};

  /* --- rendu --- */
  function setHtml(a){
    var t=a[2],txt=num(a[0])+'×'+a[1];
    if(t==='w')return '<span class="w" title="Échauffement">('+txt+')</span>';
    if(t==='f')return '<span class="f">'+txt+' échec</span>';
    if(a[1]===0)return '<span class="f">'+num(a[0])+'×0</span>';
    if(t==='d')return '<span>'+txt+' <small class="w">drop</small></span>';
    return '<span>'+txt+'</span>';
  }
  function spark(tops,name){
    var pts=tops.slice(-24);
    if(pts.length<2)return '';
    var W=300,H=52,P=4,ks=pts.map(function(t){return t.kg});
    var lo=Math.min.apply(null,ks),hi=Math.max.apply(null,ks);
    if(hi===lo){hi+=1;lo-=1}
    function X(i){return P+i*(W-2*P)/(pts.length-1)}
    function Y(k){return H-P-(k-lo)*(H-2*P)/(hi-lo)}
    var line=pts.map(function(t,i){return X(i).toFixed(1)+','+Y(t.kg).toFixed(1)}).join(' ');
    var area=X(0).toFixed(1)+','+H+' '+line+' '+X(pts.length-1).toFixed(1)+','+H;
    var li=pts.length-1;
    var data=pts.map(function(t){return t.d+'|'+t.kg}).join(';');
    return '<div class="spark" data-pts="'+esc(data)+'" data-lo="'+lo+'" data-hi="'+hi+'"><span class="spark-dot"></span><span class="spark-read" aria-hidden="true"></span><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Évolution de la charge max, '+esc(name)+' : de '+num(ks[0])+' à '+num(ks[li])+' kg">'+
      '<polygon class="area" points="'+area+'"/>'+
      '<polyline class="line" pathLength="1" points="'+line+'" vector-effect="non-scaling-stroke"/>'+
      '</svg></div>';
  }
  function gainTxt(an){
    if(an.tops.length<2)return '';
    var f=an.tops[0],l=an.tops[an.tops.length-1],d=Math.round((l.kg-f.kg)*100)/100;
    if(d<=0)return '';
    return ' · <span class="gain">+'+num(d)+' kg depuis le '+fmtD(f.d)+'</span>';
  }
  function scrub(ev){
    var sp=ev.target.closest&&ev.target.closest('.spark');
    if(!sp)return;
    var pts=sp.getAttribute('data-pts').split(';').map(function(p){var a=p.split('|');return{d:a[0],kg:parseFloat(a[1])}});
    var lo=parseFloat(sp.getAttribute('data-lo')),hi=parseFloat(sp.getAttribute('data-hi'));
    var r=sp.getBoundingClientRect(),W=300,H=52,P=4;
    var fx=Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width));
    var i=Math.round(fx*(pts.length-1)),t=pts[i];
    var x=(P+i*(W-2*P)/(pts.length-1))/W*100;
    var y=(H-P-(t.kg-lo)*(H-2*P)/(hi-lo))/H*100;
    var dot=sp.querySelector('.spark-dot'),rd=sp.querySelector('.spark-read');
    dot.style.left=x+'%';dot.style.top=y+'%';
    rd.textContent=fmtD(t.d)+' · '+num(t.kg)+' kg';
    var w=rd.offsetWidth;rd.style.left=Math.min(Math.max(0,x/100*r.width-w/2),r.width-w)+'px';
    sp.classList.add('scrub');
  }
  document.addEventListener('pointermove',scrub);
  document.addEventListener('pointerdown',scrub);
  function endScrub(ev){
    Array.prototype.forEach.call(document.querySelectorAll('.spark.scrub'),function(s){
      if(!ev||!ev.target.closest||ev.target.closest('.spark')!==s)s.classList.remove('scrub');
    });
  }
  document.addEventListener('pointermove',endScrub);
  document.addEventListener('pointerup',function(){setTimeout(function(){endScrub(null)},1200)});
  function exHtml(e,grp){
    var an=analyse(e);
    var sessions=e.ss.slice();
    var last=sessions[sessions.length-1];
    var recTxt=an.rec?'<div class="rec"><b>'+num(an.rec.kg)+'<small>kg × '+an.rec.r+'</small></b><span>record · '+fmtD(an.rec.d)+'</span></div>':'<div class="rec"><span>pas de série valide</span></div>';
    var kind=kindOf(e.n);
    var h='<article class="ex'+(state.rig===e.n?' on':'')+'" style="--gc:'+gc(grp)+'"><div class="ex-top"><div><div class="ex-name">'+esc(e.n)+(an.isPR?'<span class="badge">RECORD</span>':'')+'</div>'+
      '<div class="ex-meta">'+sessions.length+' séance'+(sessions.length>1?'s':'')+gainTxt(an)+'</div></div>'+recTxt+'</div>';
    h+=spark(an.tops,e.n);
    if(last)h+='<div class="last"><span class="dt">'+fmtD(last.d)+'</span>'+last.s.map(setHtml).join(' · ')+'</div>';
    h+='<div class="row">';
    if(sessions.length>1){
      h+='<details class="hist"><summary>Historique ('+Math.min(sessions.length,10)+' dernières)</summary>';
      sessions.slice(-10).reverse().forEach(function(s){
        h+='<div class="sess"><span class="dt">'+fmtD(s.d)+'</span><span class="sets">'+s.s.map(setHtml).join('')+'</span></div>';
      });
      h+='</details>';
    }else h+='<span></span>';
    if(an.rec)h+='<button type="button" class="load" data-ex="'+esc(e.n)+'" aria-label="'+LOAD_LABEL[kind]+' : '+esc(e.n)+'">'+LOAD_LABEL[kind]+'</button>';
    return h+'</div></article>';
  }

  /* --- héros 3D --- */
  var shownKg=0,countRaf=0;
  function countTo(el,to,ms){
    cancelAnimationFrame(countRaf);
    var from=parseFloat(String(el.getAttribute('data-v')||'0'));
    el.setAttribute('data-v',to);
    if(reduced()||!ms||from===to){el.textContent=num(to);return}
    var t0=performance.now();
    (function step(now){
      var k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,3);
      var v=from+(to-from)*e;
      el.textContent=num(k<1?Math.round(v*2)/2:to);
      if(k<1)countRaf=requestAnimationFrame(step);
    })(t0);
  }
  var heroKg;
  function selectRig(e,an,animateNumber){
    if(!e||!an||!an.rec)return;
    state.rig=e.n;
    var L=lookup[e.n],grp=L?L.g:'';
    document.documentElement.style.setProperty('--gc',gc(grp));
    $('lift-tag').textContent=grp;
    var kind=kindOf(e.n);
    var spec={kind:kind,kg:an.rec.kg,label:e.n};
    window.__rig=spec;
    window.dispatchEvent(new CustomEvent('rig:set',{detail:spec}));
    $('lift-name').textContent=e.n;
    $('lift-meta').textContent='Record du '+fmtDY(an.rec.d)+' · '+an.rec.r+' rep'+(an.rec.r>1?'s':'');
    countTo(heroKg,an.rec.kg,animateNumber?900:0);
    $('rig').setAttribute('aria-label','Montage 3D : '+e.n+', '+num(an.rec.kg)+' kg. Glisse pour tourner.');
  }

  var lookup={};
  function render(){
    var gs=build();
    lookup={};
    gs.forEach(function(g){g.ex.forEach(function(e){lookup[e.n]={e:e,an:analyse(e),g:g.g}})});
    var days={},nsets=0,first=null,lastD=null;
    gs.forEach(function(g){g.ex.forEach(function(e){e.ss.forEach(function(s){
      var w=s.s.filter(function(a){return a[2]!=='w'});
      if(w.length){days[s.d]=1;nsets+=w.length}
      if(!first||s.d<first)first=s.d;if(!lastD||s.d>lastD)lastD=s.d;
    })})});
    $('tiles').innerHTML=
      '<div class="stat"><b data-count="'+Object.keys(days).length+'">'+Object.keys(days).length+'</b><span>jours d’entraînement</span></div>'+
      '<div class="stat"><b data-count="'+nsets+'">'+nsets+'</b><span>séries de travail</span></div>'+
      '<div class="stat"><b>'+fmtD(lastD)+'</b><span>dernière séance</span></div>';
    $('sub').textContent='Force par groupe musculaire, depuis le '+fmtDY(first)+'.';
    if(state.first&&!reduced()){
      Array.prototype.forEach.call($('tiles').querySelectorAll('[data-count]'),function(b,i){
        var to=parseInt(b.getAttribute('data-count'),10),t0=performance.now()+300+i*120;
        b.textContent='0';
        (function step(now){
          var k=Math.max(0,Math.min(1,(now-t0)/1100));
          b.textContent=String(Math.round(to*(1-Math.pow(1-k,3))));
          if(k<1)requestAnimationFrame(step);
        })(performance.now());
      });
    }

    /* records récents : 21 jours avant la dernière séance */
    var ref=new Date(lastD+'T12:00:00');ref.setDate(ref.getDate()-21);
    var cut=ref.toISOString().slice(0,10),prs=[];
    gs.forEach(function(g){g.ex.forEach(function(e){
      var an=analyse(e);
      if(an.tops.length<3)return;
      var run=an.tops[0].kg;
      for(var i=1;i<an.tops.length;i++){
        var t=an.tops[i];
        if(t.kg>run&&t.d>=cut)prs.push({n:e.n,d:t.d,kg:t.kg,r:t.r,from:run});
        if(t.kg>run)run=t.kg;
      }
    })});
    var seen={};prs=prs.sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:b.kg-a.kg}).filter(function(p){if(seen[p.n])return false;seen[p.n]=1;return true}).slice(0,6);
    $('prs').innerHTML=prs.length?prs.map(function(p){
      var pg=lookup[p.n]?lookup[p.n].g:'';
      return '<button type="button" class="pr" style="--gc:'+gc(pg)+'" data-ex="'+esc(p.n)+'" aria-label="'+esc(p.n)+', '+num(p.kg)+' kilos, record du '+fmtD(p.d)+'. Voir en 3D"><span class="n">'+esc(p.n)+'</span>'+
        '<span class="v">'+num(p.kg)+'<i>kg × '+p.r+'</i></span><span class="g">+'+num(p.kg-p.from)+' kg<span class="d">'+fmtD(p.d)+'</span></span></button>';
    }).join(''):'<p class="note">Aucun record dans les 3 dernières semaines.</p>';

    /* chips */
    var names=['Tous'].concat(gs.map(function(g){return g.g}));
    if(names.indexOf(state.group)<0)state.group='Tous';
    $('chips').innerHTML=names.map(function(n){
      return '<button type="button" class="chip" style="--gc:'+(n==='Tous'?'#E9EDF0':gc(n))+'" data-g="'+esc(n)+'" aria-pressed="'+(n===state.group)+'">'+esc(n)+'</button>';
    }).join('');

    /* liste */
    var q=state.q.trim().toLowerCase(),out='',count=0;
    gs.forEach(function(g){
      if(state.group!=='Tous'&&g.g!==state.group)return;
      var list=g.ex.filter(function(e){return !q||e.n.toLowerCase().indexOf(q)>-1});
      if(!list.length)return;
      if(state.group==='Tous')out+='<h2 style="--gc:'+gc(g.g)+'">'+esc(g.g)+'</h2>';
      list.forEach(function(e){out+=exHtml(e,g.g);count++});
    });
    $('list').className=state.anim?'anim':'';
    state.anim=false;
    $('list').innerHTML=count?out:'<p class="empty">Aucun exercice trouvé.</p>';

    /* formulaire */
    var all=[];gs.forEach(function(g){g.ex.forEach(function(e){all.push(e.n)})});
    $('ex-list').innerHTML=all.sort().map(function(n){return '<option value="'+esc(n)+'">'}).join('');
    var cur=$('g').value;
    $('g').innerHTML=gs.map(function(g){return '<option>'+esc(g.g)+'</option>'}).join('');
    if(cur)$('g').value=cur;

    /* mes ajouts */
    $('mine').innerHTML=extras.length?'<h2 style="margin-top:0;font-size:22px">Mes ajouts</h2>'+extras.map(function(x,i){
      return '<div class="r"><span>'+fmtD(x.d)+' · '+esc(x.n)+' · '+num(x.kg)+'×'+x.r+(x.ok?'':' (échec)')+'</span><button class="ghost" data-del="'+i+'" aria-label="Supprimer cet ajout">Suppr.</button></div>';
    }).join(''):'';

    /* héros : exercice par défaut = dernier record, sinon le plus suivi */
    if(!hero){}else if(!state.rig||!lookup[state.rig]){
      var pick=null;
      if(prs.length&&lookup[prs[0].n])pick=lookup[prs[0].n];
      else{var best=-1;Object.keys(lookup).forEach(function(k){var l=lookup[k];if(l.an.rec&&l.e.ss.length>best){best=l.e.ss.length;pick=l}})}
      if(pick)selectRig(pick.e,pick.an,true);
    }else{
      var cu=lookup[state.rig];
      if(cu.an.rec&&Math.abs(parseFloat(heroKg.getAttribute('data-v')||'0')-cu.an.rec.kg)>0.001)selectRig(cu.e,cu.an,true);
    }
    state.first=false;
  }

  function loadRig(name){
    if(!hero){location.href='./#'+slug(name);return}
    var l=lookup[name];if(!l)return;
    selectRig(l.e,l.an,true);
    Array.prototype.forEach.call(document.querySelectorAll('.ex'),function(el){
      var n=el.querySelector('.ex-name');el.classList.toggle('on',!!n&&n.firstChild&&n.firstChild.textContent===name);
    });
    hero.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
  }

  /* --- événements --- */
  $('chips').addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-g]');if(!b)return;
    var g=b.getAttribute('data-g');
    function go(){state.group=g;state.anim=true;document.documentElement.style.setProperty('--gc','#F2F2F2');render()}
    if(document.startViewTransition&&!reduced())document.startViewTransition(go);else go();
    var again=$('chips').querySelector('[aria-pressed="true"]');
    if(again)again.scrollIntoView({inline:'center',block:'nearest',behavior:reduced()?'auto':'smooth'});
  });
  $('q').addEventListener('input',function(){state.q=this.value;render()});
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-ex]');if(b)loadRig(b.getAttribute('data-ex'));
  });
  $('mine').addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-del]');if(!b)return;
    extras.splice(parseInt(b.getAttribute('data-del'),10),1);saveExtras();render();
  });
  $('f').addEventListener('submit',function(ev){
    ev.preventDefault();
    var kg=parseFloat($('kg').value),r=parseInt($('r').value,10),n=$('ex').value.trim();
    if(isNaN(kg)||isNaN(r)||!n)return;
    extras.push({n:n,g:$('g').value,d:$('d').value||new Date().toISOString().slice(0,10),kg:kg,r:r,ok:$('ok').value==='1'});
    saveExtras();
    $('kg').value='';$('r').value='';
    render();
  });
  $('rig').addEventListener('pointerdown',function(){hero.classList.add('dragged')});
  $('rig').addEventListener('keydown',function(){hero.classList.add('dragged')});
  $('d').value=new Date().toISOString().slice(0,10);

  heroKg=$('lift-kg');
  render();
  var hx=location.hash.slice(1),hk=Object.keys(lookup).filter(function(k){return slug(k)===hx})[0];
  if(hero&&hk)selectRig(lookup[hk].e,lookup[hk].an,false);
  /* un seul moment orchestré : l'entrée du héros */
  if(hero)requestAnimationFrame(function(){requestAnimationFrame(function(){hero.classList.add('go')})});
})();
