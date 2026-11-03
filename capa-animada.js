/* Capa animada — NR 17 Ergonomia no check out (ver o comentário no capa-animada.css).
   A tela branca do monitor do cliente registra os cinco módulos, um bip por item, e fecha com "Corpo protegido". */
(function () {
  var IW = 1672, IH = 941;
  var home = document.getElementById('home');
  var photo = document.querySelector('.qs-home-photo');
  var img = document.getElementById('homePhotoImg');
  if (!photo || !img || photo.querySelector('.qs-fx')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var layer = document.createElement('div');
  layer.className = 'qs-fx';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML =
    '<div class="qs-fx-tela">' +
      '<div class="qs-fx-top"><span>CHECK OUT</span><b>NR 17</b></div>' +
      '<div class="qs-fx-body"><div class="qs-fx-item"><span class="ck">✓</span><span class="tx"></span></div></div>' +
      '<div class="qs-fx-dots"><i></i><i></i><i></i><i></i><i></i></div>' +
    '</div>' +
    '<div class="qs-fx-bip"></div>' +
    '<div class="qs-fx-glow"></div>' +
    '<div class="qs-fx-maq"><span>✓</span></div>';
  photo.insertBefore(layer, photo.querySelector('.qs-home-veil'));

  var tela = layer.querySelector('.qs-fx-tela');
  var item = layer.querySelector('.qs-fx-item');
  var tx = layer.querySelector('.tx');
  var dots = layer.querySelectorAll('.qs-fx-dots i');
  var bip = layer.querySelector('.qs-fx-bip');
  var maq = layer.querySelector('.qs-fx-maq');

  /* a camada fica exatamente sobre a foto, no mesmo enquadramento do CSS dela (cover, alinhada à direita) */
  function place() {
    var w = photo.clientWidth, h = photo.clientHeight;
    if (!w || !h) return;
    var iw = img.naturalWidth || IW, ih = img.naturalHeight || IH;
    var s = Math.max(w / iw, h / ih);
    var rw = iw * s, rh = ih * s;
    layer.style.width = rw + 'px';
    layer.style.height = rh + 'px';
    layer.style.left = (w - rw) + 'px';
    layer.style.top = ((h - rh) / 2) + 'px';
    layer.style.setProperty('--u', (rh / IH) + 'px');
  }
  place();
  img.addEventListener('load', place);
  window.addEventListener('resize', place);
  if (window.ResizeObserver) new ResizeObserver(place).observe(photo);

  var ITENS = ['Postura neutra', 'Posto ajustado', 'Mercadorias', 'Alongamentos', 'Revisão e duelo'];
  var TOTAL = 'Corpo protegido';

  function setItem(text) {
    item.classList.remove('is-on');
    void item.offsetWidth;
    tx.textContent = text;
    item.classList.add('is-on');
  }
  function beep() {
    bip.classList.remove('is-on');
    void bip.offsetWidth;
    bip.classList.add('is-on');
  }
  /* confete: estoura do monitor quando aparece "Corpo protegido" */
  var CORES = ['#c8f31d', '#78be20', '#ffffff', '#2a1245', '#ffd23f'];
  function confete() {
    for (var n = 0; n < 30; n++) {
      var p = document.createElement('i');
      p.className = 'qs-fx-cf';
      var ang = (-100 + Math.random() * 200) * Math.PI / 180;       /* abre para cima e para os lados */
      var dist = 90 + Math.random() * 190;
      p.style.setProperty('--dx', (Math.sin(ang) * dist).toFixed(0));
      p.style.setProperty('--dy', (-Math.cos(ang) * dist * .9 + 40).toFixed(0));
      p.style.setProperty('--rot', ((Math.random() * 720) - 360).toFixed(0) + 'deg');
      p.style.background = CORES[n % CORES.length];
      p.style.animationDelay = (Math.random() * .12).toFixed(2) + 's';
      layer.appendChild(p);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1800); })(p);
    }
  }
  function reset() {
    tela.classList.remove('is-total');
    maq.classList.remove('is-ok');
    item.classList.remove('is-on');
    for (var k = 0; k < dots.length; k++) dots[k].classList.remove('on');
  }

  if (reduce) {
    tela.classList.add('is-total');
    maq.classList.add('is-ok');
    tx.textContent = TOTAL;
    item.classList.add('is-on');
    for (var k = 0; k < dots.length; k++) dots[k].classList.add('on');
    return;
  }

  var i = 0, timer = null;
  function visible() { return !home || !home.hidden; }
  function next() {
    clearTimeout(timer);
    if (!visible()) { timer = setTimeout(next, 1200); return; }
    if (i < ITENS.length) {
      setItem(ITENS[i]);
      dots[i].classList.add('on');
      beep();
      i++;
      timer = setTimeout(next, 1250);
    } else if (i === ITENS.length) {
      tela.classList.add('is-total');
      maq.classList.add('is-ok');
      setItem(TOTAL);
      beep();
      confete();
      i++;
      timer = setTimeout(next, 2600);
    } else {
      reset();
      i = 0;
      timer = setTimeout(next, 700);
    }
  }
  timer = setTimeout(next, 900);
})();
