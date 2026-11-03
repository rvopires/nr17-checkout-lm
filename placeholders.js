/* Espaços de imagem: enquanto o arquivo da foto não existe, o espaço fica reservado com o tamanho certo
   e mostra o nome do arquivo e o formato que a imagem deve ter (ex.: 3:2 · 1536×1024).
   Quando você salvar a imagem em assets/fotos/ com esse nome, ela aparece no lugar, sem mexer em mais nada. */
(function () {
  var FORMATOS = [
    { n: '4:5', v: 4 / 5, px: '1024×1280' },
    { n: '1:1', v: 1, px: '1024×1024' },
    { n: '3:2', v: 3 / 2, px: '1536×1024' },
    { n: '16:9', v: 16 / 9, px: '1920×1080' },
    { n: '2:1', v: 2, px: '2048×1024' },
    { n: '3:1', v: 3, px: '2172×724' }
  ];
  function formato(w, h) {
    var r = w / h, best = FORMATOS[0], d = Infinity;
    FORMATOS.forEach(function (f) {
      var x = Math.abs(Math.log(r / f.v));
      if (x < d) { d = x; best = f; }
    });
    return best;
  }
  function svg(w, h, name, pos, fixo) {
    var s = Math.min(w, h);
    var fs = Math.max(10, Math.round(s * 0.07));
    var ic = Math.max(24, Math.round(s * 0.26));
    var cx = w / 2, cy = h * 0.34;
    if (pos === "cover") { ic = Math.round(ic * 0.55); cy = h * 0.8; fs = Math.round(fs * 0.8); }
    if (pos === "home") { cx = w * 0.76; cy = h * 0.46; }
    var x0 = cx - ic / 2, y0 = cy - ic * 0.4;
    var r = Math.max(6, Math.round(s * 0.04));
    var cube = Math.round(s * 0.16);
    var f = fixo || formato(w, h);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1245"/><stop offset="1" stop-color="#4a2a74"/></linearGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' +
      '<rect x="' + (w * 0.08) + '" y="' + (h * 0.12) + '" width="' + cube + '" height="' + cube + '" rx="' + r + '" fill="none" stroke="#C8F31D" stroke-opacity=".22" stroke-width="2"/>' +
      '<rect x="' + (w * 0.86 - cube) + '" y="' + (h * 0.72) + '" width="' + cube * 0.8 + '" height="' + cube * 0.8 + '" rx="' + r + '" fill="none" stroke="#C8F31D" stroke-opacity=".22" stroke-width="2"/>' +
      '<g fill="none" stroke="#C8F31D" stroke-opacity=".75" stroke-width="' + Math.max(2, Math.round(ic * 0.05)) + '" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="' + x0 + '" y="' + y0 + '" width="' + ic + '" height="' + ic * 0.8 + '" rx="' + ic * 0.08 + '"/>' +
      '<circle cx="' + (x0 + ic * 0.3) + '" cy="' + (y0 + ic * 0.28) + '" r="' + ic * 0.08 + '"/>' +
      '<polyline points="' + x0 + ',' + (y0 + ic * 0.7) + ' ' + (x0 + ic * 0.35) + ',' + (y0 + ic * 0.42) + ' ' + (x0 + ic * 0.6) + ',' + (y0 + ic * 0.62) + ' ' + (x0 + ic * 0.78) + ',' + (y0 + ic * 0.5) + ' ' + (x0 + ic) + ',' + (y0 + ic * 0.7) + '"/>' +
      '</g>' +
      '<text x="' + cx + '" y="' + (cy + ic * 0.82) + '" text-anchor="middle" font-family="Consolas,Menlo,monospace" font-weight="700" font-size="' + fs + '" fill="#C8F31D">' + name + '</text>' +
      '<text x="' + cx + '" y="' + (cy + ic * 0.82 + fs * 1.5) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + Math.round(fs * 0.72) + '" fill="#E2D6F2">formato ' + f.n + ' · ' + f.px + '</text>' +
      '</svg>';
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.ph) return;
    var src = t.getAttribute('src') || '';
    if (src.indexOf('assets/fotos/') < 0) return;
    e.stopPropagation(); /* impede o onerror antigo, que escondia a imagem */
    t.dataset.ph = '1';
    var name = decodeURIComponent(src.split('?')[0].split('/').pop());
    var w = Math.max(120, Math.round(t.clientWidth || 0)) || 1600;
    var h = Math.max(80, Math.round(t.clientHeight || 0)) || 900;
    if (!t.clientWidth) { w = 1600; h = 900; }
    t.hidden = false;
    t.classList.add('is-ph');
    t.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(w, h, esc(name), t.id === "homePhotoImg" ? "home" : (t.closest(".is-cover") ? "cover" : ""), t.closest(".is-question") ? FORMATOS[4] : null));
    if (t.id === 'homePhotoImg') document.body.classList.add('capa-sem-foto');
  }, true);
})();
