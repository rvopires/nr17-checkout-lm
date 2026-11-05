/**
 * QuestionScreen — componente reutilizável (vanilla JS)
 *
 * Tipos (JSON) — tudo DENTRO do cartão:
 *  - cover:    { type, title, subtitle?, image? }
 *  - content:  { type, kicker?, title, body?, bullets?, image?, cards?, stats?, items?, rules?, quote?, note?, compare? }
 *  - video:    { type, title, kicker?, duration?, scene?, brief?, video?, youtube?, image?/poster? }
 *  - image:    { type, title, kicker?, body?, bullets?, image, imageFit? }
 *  - quiz-intro: { type, title, body?, count?, minCorrect?, image? }
 *  - quiz-result: { type, passed, score, total, minCorrect, title?, titleUnlock? }
 *  - finale:   { type, title?, body?, eyebrow?, chips?, image?, kicker? }
 *  - reflect:  { type, prompt, answer, choices?[{icon,text,correct?}] }
 *  - compare:  { type, compare:[{ok,label,text}] }
 *  - order:    { type, items:[{key,text,rank}], time? }
 *  - match:    { type, pairs:[{ex,body}] }
 *  - question: { type, question, alternatives[2..4], explanation?, image?, opinion? }
 *
 * video: se tiver `video` (mp4) ou `youtube` (id/url), toca o player;
 *        senão mostra o placeholder "Vídeo a gravar" (como no treinamento).
 */
(function (global) {
  'use strict';

  /* Vídeo: não pode pular nada e o avanço libera faltando 8s */
  var VIDEO_UNLOCK_MARGIN = 8;
  var VIDEO_SEEK_TOLERANCE = 0.15;
  var VIDEO_TICK_TOLERANCE = 0.55;

  // "0:45", "1:20:05" ou "até 1:30" -> segundos (fallback se o player não informar a duração)
  function parseClock(txt) {
    var m = String(txt || '').match(/(?:(\d+):)?(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    if (m[1] != null) return (Number(m[1]) * 3600) + (Number(m[2]) * 60) + Number(m[3]);
    return (Number(m[2]) * 60) + Number(m[3]);
  }

  function unlockThreshold(duration) {
    if (!(duration > 0)) return Infinity;
    return duration > VIDEO_UNLOCK_MARGIN ? duration - VIDEO_UNLOCK_MARGIN : duration * 0.85;
  }

  /* Telas de regras/atividades interativas: a seta só libera depois de concluir. */
  function isInteractContent(data) {
    if (!data || data.type !== 'content') return false;
    if (data.steps || data.skin === 'ficha') return true;
    var layout = data.layout;
    if (layout === 'lista-foto' || layout === 'acordeao' || layout === 'mural') return true;
    if (layout === 'quickcards' && (data.qcStyle === 'checklist' || data.qcStyle === 'deck')) return true;
    return false;
  }

  var sfxCtx = null;
  function ensureSfx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!sfxCtx) sfxCtx = new AC();
    if (sfxCtx.state === 'suspended') {
      try { sfxCtx.resume(); } catch (e) {}
    }
    return sfxCtx;
  }

  var quizCorrectAudio = null;
  var quizWrongAudio = null;
  var QUIZ_CORRECT_SFX = encodeURI('assets/efeitos sonoros/correct-answer.mp3');
  var QUIZ_WRONG_SFX = encodeURI('assets/efeitos sonoros/OBJMisc-wrong_answer-Elevenlabs.mp3');

  function playQuizMp3(kind) {
    var isOk = kind === 'ok' || kind === 'correct';
    var src = isOk ? QUIZ_CORRECT_SFX : QUIZ_WRONG_SFX;
    try {
      ensureSfx();
      var audio = isOk ? quizCorrectAudio : quizWrongAudio;
      if (!audio) {
        audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 0.45;
        if (isOk) quizCorrectAudio = audio;
        else quizWrongAudio = audio;
      }
      try {
        if (quizCorrectAudio && quizCorrectAudio !== audio) {
          quizCorrectAudio.pause();
          quizCorrectAudio.currentTime = 0;
        }
        if (quizWrongAudio && quizWrongAudio !== audio) {
          quizWrongAudio.pause();
          quizWrongAudio.currentTime = 0;
        }
      } catch (e) {}
      try {
        if (audio.readyState >= 1) audio.currentTime = 0;
      } catch (e2) {
        try { audio.load(); } catch (e3) {}
      }
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.catch(function () { playBeepSynth(isOk ? 'ok' : 'nok'); });
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function playBeepSynth(type) {
    var ctx = ensureSfx();
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      function beepNote(freq, t, dur, vol, wave, slideTo) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = wave || 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + t + dur);
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + dur + 0.02);
      }
      if (type === 'click' || type === 'flip') {
        beepNote(type === 'flip' ? 520 : 880, 0, 0.07, 0.08, 'sine', type === 'flip' ? 680 : 1240);
      } else if (type === 'ok' || type === 'correct') {
        beepNote(523.25, 0, 0.12, 0.16, 'sine');
        beepNote(659.25, 0.08, 0.12, 0.16, 'sine');
        beepNote(783.99, 0.16, 0.22, 0.16, 'sine');
      } else if (type === 'nok') {
        beepNote(320, 0, 0.28, 0.16, 'triangle', 140);
      } else if (type === 'pensar') {
        beepNote(392, 0, 0.18, 0.1, 'sine');      // reflexão: dois toques suaves e graves, sem cara de "acertou"
        beepNote(494, 0.14, 0.34, 0.1, 'sine');
      } else if (type === 'seg') {
        beepNote(620, 0, 0.045, 0.06, 'sine');    // relógio dos exercícios: tique suave a cada segundo
      } else if (type === 'tick') {
        beepNote(1000, 0, 0.035, 0.11, 'sine');   // guia do ritmo: estalo curto, mais grave que o "click"
      } else if (type === 'end') {
        beepNote(523.25, 0, 0.16, 0.18, 'triangle');
        beepNote(659.25, 0.1, 0.16, 0.18, 'triangle');
        beepNote(783.99, 0.2, 0.18, 0.18, 'triangle');
        beepNote(1046.5, 0.34, 0.4, 0.2, 'triangle');
      } else {
        beepNote(800, 0, 0.07, 0.08, 'sine', 1200);
      }
    } catch (e) {}
  }

  function playBeep(type) {
    if (type === 'ok' || type === 'correct' || type === 'nok') {
      if (playQuizMp3(type === 'correct' ? 'ok' : type)) return;
    }
    playBeepSynth(type);
  }
  global.playBeep = playBeep;
  if (typeof document !== 'undefined') {
    var unlockSfx = function () {
      ensureSfx();
      document.removeEventListener('pointerdown', unlockSfx, true);
      document.removeEventListener('keydown', unlockSfx, true);
    };
    document.addEventListener('pointerdown', unlockSfx, true);
    document.addEventListener('keydown', unlockSfx, true);
  }

  function beep(type) {
    try { playBeep(type); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function youtubeId(raw) {
    if (!raw) return '';
    var s = String(raw);
    if (/^[\w-]{11}$/.test(s)) return s;
    var m = s.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  var ZOOM_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5L21 21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function zoomWrap(src, imgHtml) {
    if (!src) return imgHtml;
    return `<div class="qs-zoom-wrap">
      ${imgHtml}
      <button type="button" class="qs-zoom-btn" data-qs-zoom="${esc(src)}" aria-label="Ampliar imagem">${ZOOM_ICON}</button>
    </div>`;
  }

  function ensureLightbox() {
    if (document.getElementById('qs-lightbox')) return;
    var box = document.createElement('div');
    box.id = 'qs-lightbox';
    box.className = 'qs-lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Imagem ampliada');
    box.innerHTML = `<button type="button" class="qs-lightbox-close" data-qs-lightbox-close aria-label="Fechar">×</button>
      <img class="qs-lightbox-img" alt="">`;
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('[data-qs-lightbox-close]')) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  function openLightbox(src, alt) {
    if (!src) return;
    ensureLightbox();
    var box = document.getElementById('qs-lightbox');
    var img = box.querySelector('.qs-lightbox-img');
    img.src = src;
    img.alt = alt || '';
    box.hidden = false;
    document.documentElement.classList.add('qs-lightbox-open');
  }

  function closeLightbox() {
    var box = document.getElementById('qs-lightbox');
    if (!box || box.hidden) return;
    box.hidden = true;
    var img = box.querySelector('.qs-lightbox-img');
    if (img) img.removeAttribute('src');
    document.documentElement.classList.remove('qs-lightbox-open');
  }

  function mediaHTML(data, opts) {
    opts = opts || {};
    var fit = data.imageFit === 'contain' || opts.contain ? 'contain' : 'cover';
    if (data.image) {
      var pos = data.imagePosition || data.objectPosition || '';
      var posAttr = pos ? ` style="object-position:${esc(pos)}"` : '';
      var onErr = opts.noZoom
        ? `this.classList.add('is-broken');this.nextElementSibling&&this.nextElementSibling.classList.add('show');`
        : `this.classList.add('is-broken');var f=this.parentNode&&this.parentNode.querySelector('.qs-img-fallback');f&&f.classList.add('show');`;
      var img = `<img class="qs-img qs-img-${fit}" src="${esc(data.image)}" alt="${esc(data.imageAlt || data.title || '')}" loading="eager" decoding="async" fetchpriority="high"${posAttr} onerror="${onErr}">` +
        `<div class="qs-media-fallback qs-img-fallback" aria-hidden="true">${esc(data.icon || '🖼️')}</div>`;
      return opts.noZoom ? img : zoomWrap(data.image, img);
    }
    return `<div class="qs-media-fallback" aria-hidden="true">${esc(data.icon || '📘')}</div>`;
  }

  function pandaSrc(src) {
    var out = String(src || '');
    if (!out) return out;
    var sep = out.indexOf('?') === -1 ? '?' : '&';
    if (out.indexOf('saveProgress=') === -1) { out += sep + 'saveProgress=false'; sep = '&'; }
    if (out.indexOf('disableForward=') === -1) out += sep + 'disableForward=true';
    return out;
  }

  function playerHTML(data) {
    if (data.embed || data.panda) {
      var src = pandaSrc(data.embed || data.panda);
      var id = data.playerId || ('panda-' + Math.random().toString(36).slice(2, 10));
      return `<iframe id="${esc(id)}" class="qs-player qs-embed" data-qs-panda="1" src="${esc(src)}" title="${esc(data.title || 'Vídeo')}" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowfullscreen fetchpriority="high"></iframe>`;
    }
    if (data.video) {
      return `<video class="qs-player" controls playsinline preload="metadata" controlsList="nodownload noplaybackrate" disablepictureinpicture poster="${esc(data.poster || data.image || '')}" src="${esc(data.video)}"></video>`;
    }
    var yt = youtubeId(data.youtube);
    if (yt) {
      return `<iframe class="qs-player qs-yt" src="https://www.youtube.com/embed/${esc(yt)}?rel=0" title="${esc(data.title || 'Vídeo')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    return '';
  }

  function videoHTML(data) {
    var live = playerHTML(data);
    var badge = data.duration ? `Vídeo a gravar · ${esc(data.duration)}` : 'Vídeo a gravar';
    if (data.video || data.youtube || data.embed || data.panda) {
      badge = data.duration ? `Vídeo · ${esc(data.duration)}` : 'Vídeo';
    }

    var stage = live
      ? `<div class="qs-video-stage">${live}</div>`
      : `<div class="qs-video-ph">
          <span class="qs-vbadge">${badge}</span>
          <div class="qs-vicon" aria-hidden="true">▶</div>
          <strong>${esc(data.scene || 'Cena a filmar')}</strong>
          <p>${esc(data.brief || data.body || '')}</p>
        </div>`;

    return `
      <article class="qs-screen is-video has-player" data-qs-root data-type="video">
        <header class="qs-video-head">
          <span class="qs-video-pill">${esc(data.kicker || '🎥 Vídeo')}</span>
          <h2 class="qs-video-title">${esc(data.title || '')}</h2>
        </header>
        <div class="qs-media qs-media-video">
          ${stage}
        </div>
      </article>`;
  }

  /* Foto inteira em destaque + avisos embaixo (data.layout === 'destaque') */
  function destaqueHTML(data) {
    var notes = Array.isArray(data.notes) ? data.notes : [];
    var notesHtml = notes.length
      ? '<div class="qs-dst-notes count-' + notes.length + '">' + notes.map(function (n, i) {
          return '<div class="qs-dst-note ' + (n.tone ? 'tone-' + esc(n.tone) : (i === 0 ? 'tone-info' : 'tone-rule')) + '">' +
            '<span class="qs-dst-ico" aria-hidden="true">' + esc(n.icon || '') + '</span>' +
            '<div class="qs-dst-txt">' + (n.label ? '<b>' + esc(n.label) + '</b>' : '') + '<p>' + esc(n.text || '') + '</p></div>' +
          '</div>';
        }).join('') + '</div>'
      : '';
    return '' +
      '<article class="qs-screen is-image is-destaque" data-qs-root data-type="image">' +
        '<div class="qs-panel qs-panel-destaque">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<div class="qs-dst-wrap">' +
            '<figure class="qs-dst-frame">' + mediaHTML(data, { contain: true }) + '</figure>' +
            notesHtml +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* Documentos lado a lado (data.layout === 'docs'): formulários, carteirinha etc. Cada imagem aparece inteira, com legenda e lupa. */
  function docsHTML(data) {
    var imgs = Array.isArray(data.images) ? data.images : [];
    var figs = imgs.map(function (im, i) {
      var src = typeof im === 'string' ? im : (im.src || im.image || '');
      var alt = typeof im === 'string' ? (data.title || '') : (im.alt || im.label || data.title || '');
      var label = typeof im === 'string' ? '' : (im.label || '');
      return '<figure class="qs-docs-fig">' +
        '<div class="qs-docs-frame"><img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="eager" decoding="async">' +
          '<span class="qs-zoom-btn qs-zoom-mini" role="button" tabindex="0" data-qs-zoom="' + esc(src) + '" aria-label="Ampliar imagem">' + ZOOM_ICON + '</span></div>' +
        (label ? '<figcaption>' + esc(label) + '</figcaption>' : '') +
      '</figure>';
    }).join('');
    var note = data.body ? '<p class="qs-docs-note"><span aria-hidden="true">⚠️</span><span>' + esc(data.body) + '</span></p>' : '';
    return '' +
      '<article class="qs-screen is-image is-docs" data-qs-root data-type="image">' +
        '<div class="qs-panel qs-panel-docs">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<div class="qs-docs count-' + imgs.length + '">' + figs + '</div>' +
          note +
        '</div>' +
      '</article>';
  }

  function imageHTML(data) {
    if (data.layout === 'destaque') return destaqueHTML(data);
    if (data.layout === 'docs') return docsHTML(data);
    var bullets = Array.isArray(data.bullets) && data.bullets.length
      ? `<ul class="qs-bullets">${data.bullets.map(function (b) {
          return `<li>${esc(b)}</li>`;
        }).join('')}</ul>`
      : '';
    var body = data.body ? `<p class="qs-body">${esc(data.body)}</p>` : '';
    var stack = data.layout === 'stack';
    var media;
    if (Array.isArray(data.images) && data.images.length) {
      media = `<div class="qs-media qs-media-gallery count-${data.images.length}${stack ? ' qs-media-wide' : ' qs-media-split'}">${data.images.map(function (img) {
        var src = typeof img === 'string' ? img : (img.src || img.image || '');
        var alt = typeof img === 'string' ? (data.title || '') : (img.alt || img.imageAlt || data.title || '');
        var fit = (data.imageFit === 'contain') ? 'contain' : 'cover';
        var inner = `<img class="qs-img qs-img-${fit}" src="${esc(src)}" alt="${esc(alt)}" loading="eager" decoding="async">`;
        return zoomWrap(src, inner);
      }).join('')}</div>`;
    } else {
      media = `<div class="qs-media${stack ? ' qs-media-wide' : ' qs-media-split'}">${mediaHTML(data, { contain: data.imageFit === 'contain' })}</div>`;
    }
    if (stack) {
      return `
      <article class="qs-screen is-image is-stack" data-qs-root data-type="image">
        <div class="qs-panel qs-panel-stack">
          <h2 class="qs-title">${esc(data.title || '')}</h2>
          ${body}
          ${bullets}
        </div>
        ${media}
      </article>`;
    }
    return `
      <article class="qs-screen is-image has-split" data-qs-root data-type="image">
        ${media}
        <div class="qs-panel qs-panel-split">
          <h2 class="qs-title">${esc(data.title || '')}</h2>
          ${body}
          ${bullets}
        </div>
      </article>`;
  }

  function coverHTML(data) {
    return `
      <article class="qs-screen is-cover" data-qs-root data-type="cover">
        <div class="qs-media">
          ${mediaHTML(data, { noZoom: true })}
          <div class="qs-cover-labels">
            <h1>${esc(data.title || '')}</h1>
            ${data.subtitle ? `<p>${esc(data.subtitle)}</p>` : ''}
          </div>
        </div>
      </article>`;
  }

  function finaleHTML(data) {
    var chips = Array.isArray(data.chips) ? data.chips : [];
    var photo = data.image
      ? `<img class="qs-finale-photo" src="${esc(data.image)}" alt="" aria-hidden="true">`
      : '';
    var chipHtml = chips.map(function (c) {
      return `<span class="qs-finale-chip">${esc(c)}</span>`;
    }).join('');
    var quote = data.quote || data.motto || '';
    return `
      <article class="qs-screen is-finale" data-qs-root data-type="finale">
        ${photo}
        <div class="qs-finale-veil" aria-hidden="true"></div>
        <div class="qs-finale-glow" aria-hidden="true"></div>
        <div class="qs-finale-inner">
          ${data.kicker ? `<div class="qs-finale-kicker">${esc(data.kicker)}</div>` : ''}
          <div class="qs-finale-card medal-${esc(data.medalRank || 'none')}">
            <div class="qs-finale-shine" aria-hidden="true"></div>
            <div class="qs-finale-eyebrow">${esc(data.eyebrow || 'Certificado de conclusão')}</div>
            <div class="qs-finale-trophy" aria-hidden="true">${esc(data.medal || '🏆')}</div>
            ${data.medalName ? `<div class="qs-finale-medal-name">${esc(data.medalName)}</div>` : ''}
            <h2 class="qs-finale-title">${esc(data.title || 'Parabéns')}<span>!</span></h2>
            <div class="qs-finale-line" aria-hidden="true"></div>
            ${data.points != null ? `<div class="qs-finale-score">${esc(data.points)}<small> / ${esc(data.maxPoints != null ? data.maxPoints : '')} pts</small></div>` : ''}
            ${data.hits != null ? `<p class="qs-finale-hits">${esc(data.hits)} acertos em ${esc(data.questions != null ? data.questions : '')} questões</p>` : ''}
            <p class="qs-finale-body">${esc(data.body || data.subtitle || '')}</p>
            ${quote ? `<blockquote class="qs-finale-quote"><span aria-hidden="true">“</span>${esc(quote)}<span aria-hidden="true">”</span></blockquote>` : ''}
            ${chipHtml ? `<div class="qs-finale-chips">${chipHtml}</div>` : ''}
          </div>
        </div>
      </article>`;
  }

  function contentBlocks(data) {
    var html = '';
    if (data.body) html += `<p class="qs-body">${esc(data.body)}</p>`;
    if (data.banner) html += `<div class="qs-banner"><img src="${esc(data.banner)}" alt="${esc(data.bannerAlt || '')}" loading="eager" decoding="async"></div>`;
    if (Array.isArray(data.stats) && data.stats.length) {
      html += `<div class="qs-stats">${data.stats.map(function (s) {
        var tone = s.tone ? ' tone-' + esc(s.tone) : '';
        return `<div class="qs-stat${tone}">
          ${s.icon ? `<span class="qs-stat-ico" aria-hidden="true">${esc(s.icon)}</span>` : ''}
          <div class="qs-stat-lbl">${esc(s.label || '')}</div>
          <div class="qs-stat-num">${esc(s.num || '')}</div>
        </div>`;
      }).join('')}</div>`;
    }
    if (Array.isArray(data.cards) && data.cards.length) {
      var aspectClass = (data.cardAspect === 'landscape' || data.cardAspect === 'horizontal')
        ? ' is-landscape'
        : (data.cardAspect === 'square' || data.cardAspect === '1x1' ? ' is-square' : '');
      var skinClass = data.skin === 'actions' ? ' is-actions'
        : (data.skin === 'agents' ? ' is-agents'
        : (data.skin === 'principles' ? ' is-principles' : ''));
      if (data.layout === 'list') skinClass += ' is-list';
      if (data.layout === 'photos') skinClass += ' is-photos';
      if (data.layout === 'gallery') skinClass += ' is-gallery';
      html += `<div class="qs-cards count-${data.cards.length}${aspectClass}${skinClass}">${data.cards.map(function (c) {
        var imgOnly = !!(c.image && !c.title && !c.body && !c.icon && !(c.points && c.points.length));
        var img = c.image
          ? `<div class="qs-card-media">${zoomWrap(c.image, `<img class="qs-card-img" src="${esc(c.image)}" alt="${esc(c.imageAlt || c.title || '')}" loading="eager" decoding="async">`)}</div>`
          : '';
        var points = Array.isArray(c.points) && c.points.length
          ? `<ul class="qs-card-points">${c.points.map(function (p, pi) {
              var txt = typeof p === 'string' ? p : (p.text || p.label || '');
              var pico = typeof p === 'string' ? '' : (p.icon || '');
              return `<li>
                <span class="qs-point-num" aria-hidden="true">${pi + 1}</span>
                ${pico ? `<span class="qs-point-ico" aria-hidden="true">${esc(pico)}</span>` : ''}
                <span class="qs-point-txt">${esc(txt)}</span>
              </li>`;
            }).join('')}</ul>`
          : '';
        var tone = c.tone ? ' tone-' + esc(c.tone) : '';
        return `<article class="qs-card${c.image ? ' has-img' : ''}${imgOnly ? ' is-img-only' : ''}${points ? ' has-points' : ''}${Array.isArray(c.thumbs) && c.thumbs.length ? ' has-thumbs' : ''}${tone}">
          ${img}
          <div class="qs-card-top">
            ${Array.isArray(c.thumbs) && c.thumbs.length ? `<div class="qs-card-thumbs">${c.thumbs.map(function (t) {
              var thumbImg = `<span class="qs-thumb-ph">${esc(c.icon || '')}</span><img src="${esc(t)}" alt="${esc(c.title || '')}" loading="eager" decoding="async" onerror="this.remove()">`;
              return `<span class="qs-thumb">${zoomWrap(t, thumbImg)}</span>`;
            }).join('')}</div>` : ''}
            ${c.icon && !c.image ? `<div class="qs-card-ico" aria-hidden="true">${esc(c.icon)}</div>` : ''}
            <div class="qs-card-head">
              ${c.title ? `<h3>${esc(c.title)}</h3>` : ''}
              ${c.lead ? `<span class="qs-card-lead">${esc(c.lead)}</span>` : ''}
            </div>
          </div>
          ${c.body ? `<p>${esc(c.body)}</p>` : ''}
          ${points}
        </article>`;
      }).join('')}</div>`;
    }
    if (Array.isArray(data.items) && data.items.length) {
      html += `<div class="qs-items">${data.items.map(function (it) {
        var raw = it.text || it.body || '';

        /* Item numerado é passo de uma sequência, e nele a dose vem depois
           do travessão: "puxar palma para fora — 20 s cada lado, 3×". Em
           etiquetas, o tempo e as repetições saltam aos olhos sem obrigar
           a ler a frase inteira. Listas com ícone seguem como estavam:
           ali o travessão é pontuação, não separador de dose. */
        if (it.n != null) {
          var d = splitDose(raw);
          var doses = (d ? d.tags : []).map(function (t) {
            var rep = t.indexOf('×') !== -1;   // "3×" é repetição; "20 s" é tempo
            return `<span class="qs-dose ${rep ? 'is-rep' : 'is-time'}">${esc(t)}</span>`;
          }).join('');
          var thumb = it.image
            ? `<div class="qs-item-thumb">${zoomWrap(it.image, `<img src="${esc(it.image)}" alt="${esc(it.imageAlt || it.title || '')}" loading="eager" decoding="async">`)}</div>`
            : `<span class="qs-item-num">${esc(it.n)}</span>`;
          return `<div class="qs-item is-step${it.image ? ' has-thumb' : ''}">
            ${thumb}
            <div class="qs-item-txt">
              <div class="qs-item-head">
                <span class="qs-item-label">${it.n != null ? `<span class="qs-item-n">${esc(it.n)}</span>` : ''}${it.title ? `<b>${esc(it.title)}</b>` : ''}</span>
                ${doses ? `<span class="qs-doses">${doses}</span>` : ''}
              </div>
              <p>${esc(d ? d.move : raw)}</p>
              ${d && d.caveat ? `<span class="qs-item-warn">${esc(d.caveat)}</span>` : ''}
            </div>
          </div>`;
        }

        var mark = it.icon ? `<span class="qs-item-ico" aria-hidden="true">${esc(it.icon)}</span>` : '';
        var warn = it.warn ? `<span class="qs-item-warn">${esc(it.warn)}</span>` : '';
        if (it.title) {
          var tipThumb = it.image
            ? `<div class="qs-item-thumb">${zoomWrap(it.image, `<img src="${esc(it.image)}" alt="${esc(it.imageAlt || it.title || '')}" loading="eager" decoding="async">`)}</div>`
            : mark;
          return `<div class="qs-item has-title${it.icon ? ' has-ico' : ''}${it.image ? ' has-thumb' : ''}">
            ${tipThumb}
            <div class="qs-item-txt">
              <b class="qs-item-title">${esc(String(it.title).replace(/:\s*$/, ''))}</b>
              <p>${esc(raw)}</p>
              ${warn}
            </div>
          </div>`;
        }
        return `<div class="qs-item">${mark}<p>${esc(raw)}</p>${warn}</div>`;
      }).join('')}</div>`;
    }
    if (Array.isArray(data.compare) && data.compare.length) {
      html += `<div class="qs-compare">${data.compare.map(function (c) {
        var ok = !!c.ok;
        return `<article class="qs-compare-col ${ok ? 'is-ok' : 'is-bad'}">
          <div class="qs-compare-lbl">${esc(c.label || (ok ? '✓ Correto' : '✕ Evitar'))}</div>
          <p>${esc(c.text || c.body || '')}</p>
        </article>`;
      }).join('')}</div>`;
    }
    if (Array.isArray(data.bullets) && data.bullets.length) {
      html += `<ul class="qs-bullets">${data.bullets.map(function (b) {
        return `<li>${esc(b)}</li>`;
      }).join('')}</ul>`;
    }
    if (Array.isArray(data.rules) && data.rules.length) {
      html += `<div class="qs-rules">${data.rules.map(function (r) {
        return `<article class="qs-rule"><p>${esc(r.text || r.body || '')}</p></article>`;
      }).join('')}</div>`;
    }
    if (data.quote) html += `<blockquote class="qs-quote">${esc(data.quote)}</blockquote>`;
    if (data.note) {
      if (typeof data.note === 'object' && data.note) {
        html += `<aside class="qs-note qs-note-card">
          ${data.note.label ? `<strong class="qs-note-label">${esc(data.note.label)}</strong>` : ''}
          <span class="qs-note-text">${esc(data.note.text || data.note.body || '')}</span>
        </aside>`;
      } else {
        html += `<p class="qs-note">${esc(data.note)}</p>`;
      }
    }
    return html;
  }

  /* Separa o movimento da dose num passo de sequência. Devolve null quando
     não há travessão, e aí o texto segue inteiro — nada se perde se o
     conteúdo mudar de formato depois. Um aviso entre parênteses no fim sai
     da dose e vira linha própria, para não virar etiqueta. */
  function splitDose(text) {
    var i = String(text).indexOf('—');
    if (i < 0) return null;
    var move = text.slice(0, i).trim();
    var rest = text.slice(i + 1).trim();
    var caveat = '';
    var par = rest.match(/\(([^)]*)\)\s*$/);
    if (par) {
      caveat = par[1].trim();
      rest = rest.slice(0, par.index).trim();
    }
    var tags = rest.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!move || !tags.length) return null;
    return { move: move, tags: tags, caveat: caveat };
  }

  function contentHTML(data) {
    var hasImg = !!data.image;
    var rulesCount = Array.isArray(data.rules) ? data.rules.length : 0;
    var normCompact = !!(data.compact || (hasImg && rulesCount > 0));

    /* Sequência com foto: um exercício por vez, em vez da lista densa.
       A ficha de alongamento usa isso — a foto grande ensina o movimento. */
    if (data.steps && Array.isArray(data.items) && data.items.length) {
      return stepsHTML(data);
    }
    if (data.skin === 'ficha' && Array.isArray(data.items) && data.items.length) {
      return fichaHTML(data);
    }
    /* Vantagens SCI: grade 2×2 — as 4 de uma vez (diferente das sequências 80/82). */
    if (data.layout === 'benefits-grid' && Array.isArray(data.items) && data.items.length) {
      return benefitsGridHTML(data);
    }
    /* Ficha rápida / princípios: cartões que viram ao tocar. */
    if (data.layout === 'quickcards' && Array.isArray(data.items) && data.items.length) {
      return quickCardsHTML(data);
    }
    if (data.layout === 'fatores' && Array.isArray(data.cards) && data.cards.length) {
      return fatoresHTML(data);
    }
    if (data.layout === 'mural' && Array.isArray(data.items) && data.items.length) {
      return muralHTML(data);
    }
    if (data.layout === 'caminho' && Array.isArray(data.items) && data.items.length) {
      return caminhoHTML(data);
    }
    if (data.layout === 'acordeao' && Array.isArray(data.groups) && data.groups.length) {
      return acordeaoHTML(data);
    }
    if (data.layout === 'lista-foto' && Array.isArray(data.groups) && data.groups.length) {
      return listaFotoHTML(data);
    }
    if ((data.layout === 'zonas' || data.layout === 'flipz' || data.layout === 'zigzag') && Array.isArray(data.groups) && data.groups.length) {
      return zonasHTML(data);
    }

    var head = `<h2 class="qs-title">${esc(data.title || '')}</h2>
          ${contentBlocks(data)}`;
    if (hasImg && data.layout === 'stack') {
      /* Infográfico / foto protagonista: só o título em cima; a imagem fala sozinha.
         body/items ficam nos dados para a narração, sem poluir o layout. */
      return `
      <article class="qs-screen is-content is-stack" data-qs-root data-type="content">
        <div class="qs-panel qs-panel-stack">
          <h2 class="qs-title">${esc(data.title || '')}</h2>
        </div>
        <div class="qs-media qs-media-wide">
          ${mediaHTML(data, { contain: data.imageFit === 'contain' })}
        </div>
      </article>`;
    }
    if (hasImg) {
      var extra = '';
      if (normCompact) extra += ' is-norm-compact';
      if (rulesCount >= 4) extra += ' is-norm-rules';
      if (Array.isArray(data.stats) && data.stats.length) extra += ' is-norm-stats';
      return `
      <article class="qs-screen is-content has-split${extra}" data-qs-root data-type="content">
        <div class="qs-media qs-media-split">
          ${mediaHTML(data)}
        </div>
        <div class="qs-panel qs-panel-split">
          ${head}
        </div>
      </article>`;
    }
    var dense = (data.items && data.items.length > 6) || (data.cards && data.cards.length > 3);
    var skin = data.skin === 'actions' ? ' is-actions'
      : (data.skin === 'agents' ? ' is-agents'
      : (data.skin === 'principles' ? ' is-principles' : ''));
    return `
      <article class="qs-screen is-content is-text${dense ? ' is-dense' : ''}${skin}${data.layout === 'resp' || data.layout === 'resp-risk' ? ' is-resp' : ''}${data.layout === 'resp-risk' ? ' is-resp-risk' : ''}${data.layout === 'duo' ? ' is-duo' : ''}${data.look ? ' look-' + esc(data.look) : ''}" data-qs-root data-type="content">
        <div class="qs-panel qs-panel-text">
          ${head}
        </div>
      </article>`;
  }

  function benefitsGridHTML(data) {
    var items = data.items || [];
    var tiles = items.map(function (it, i) {
      var title = esc(String(it.title || '').replace(/:\s*$/, ''));
      var text = esc(it.text || it.body || '');
      var ico = it.icon ? ('<span class="qs-ben-tile-ico" aria-hidden="true">' + esc(it.icon) + '</span>') : '';
      return '' +
        '<article class="qs-ben-tile" data-tone="' + (i % 4) + '">' +
          '<span class="qs-ben-tile-num">' + (i + 1) + '</span>' +
          ico +
          '<h3 class="qs-ben-tile-title">' + title + '</h3>' +
          '<p class="qs-ben-tile-text">' + text + '</p>' +
        '</article>';
    }).join('');
    return '' +
      '<article class="qs-screen is-content is-text is-benefits-grid" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          (data.body ? ('<p class="qs-ben-lead">' + esc(data.body) + '</p>') : '') +
          '<div class="qs-ben-grid count-' + items.length + '">' + tiles + '</div>' +
        '</div>' +
      '</article>';
  }

  /* Cartão grande que vira (data.qcStyle === 'deck'): um cartão de cada vez, em tamanho grande,
     com a lista das regras ao lado para escolher qual ver. */
  function deckHTML(data) {
    var items = data.items || [];
    if (data.qcStyle === 'checklist') return checklistHTML(data);
    var cards = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      var text = esc(it.text || it.body || '');
      var photo = it.image
        ? '<img class="qs-qc-photo" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-ico-fallback&quot;)">'
        : '';
      return '' +
        '<button type="button" class="qs-qc qs-deck-card has-img' + (i === 0 ? ' is-current' : '') + '" data-deck-i="' + i + '" data-tone="' + (i % 7) + '" aria-pressed="false" aria-label="' + title + '. Toque para ver a conduta">' +
          '<span class="qs-qc-inner">' +
            '<span class="qs-qc-face qs-qc-front has-photo">' +
              photo +
              '<span class="qs-qc-fallback-ico" aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
              '<span class="qs-qc-caption">' +
                '<b class="qs-qc-title">' + title + '</b>' +
                '<span class="qs-qc-hint">Toque para ver a conduta</span>' +
              '</span>' +
            '</span>' +
            '<span class="qs-qc-face qs-qc-back">' +
              '<span class="qs-deck-num">' + (i + 1) + ' de ' + items.length + '</span>' +
              '<b class="qs-qc-title">' + title + '</b>' +
              '<p class="qs-qc-text">' + text + '</p>' +
            '</span>' +
          '</span>' +
        '</button>';
    }).join('');
    var tabs = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      return '' +
        '<button type="button" class="qs-deck-tab' + (i === 0 ? ' is-current' : '') + '" data-qs-deck="' + i + '" aria-label="' + title + '">' +
          '<span class="qs-deck-thumb"><span class="qs-deck-thumb-ico" aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
            (it.image ? '<img src="' + esc(it.image) + '" alt="" loading="eager" decoding="async" onerror="this.hidden=true">' : '') +
          '</span>' +
          '<span class="qs-deck-name">' + title + '</span>' +
          '<span class="qs-deck-check" aria-hidden="true">✓</span>' +
        '</button>';
    }).join('');
    return '' +
      '<article class="qs-screen is-content is-text is-quickcards is-qc-photos is-qc-deck" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<p class="qs-qc-hintbar">🔄 Toque no cartão para virar e escolha a regra na lista</p>' +
          '<div class="qs-deck" data-qs-deckroot>' +
            '<div class="qs-deck-stage">' +
              '<button type="button" class="qs-deck-arrow is-prev" data-qs-deck-step="-1" aria-label="Regra anterior">‹</button>' +
              '<div class="qs-deck-cards">' + cards + '</div>' +
              '<button type="button" class="qs-deck-arrow is-next" data-qs-deck-step="1" aria-label="Próxima regra">›</button>' +
            '</div>' +
            '<div class="qs-deck-rail">' + tabs + '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* Checklist ilustrado (data.qcStyle === 'checklist'): cada regra já aparece com a foto e o texto;
     a pessoa vai marcando "Entendi" e a foto de cada regra aparece na lista. */
  function checklistHTML(data) {
    var items = data.items || [];
    var n = items.length;
    var cards = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      var text = esc(it.text || it.body || '');
      var photo = it.image
        ? '<img class="qs-qc-photo" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-ico-fallback&quot;)">'
        : '';
      return '' +
        '<div class="qs-deck-card qs-deck-slide has-img' + (i === 0 ? ' is-current' : '') + '" data-deck-i="' + i + '">' +
          '<span class="qs-qc-face qs-qc-front has-photo">' +
            photo +
            '<span class="qs-qc-fallback-ico" aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
            '<span class="qs-deck-dot" aria-hidden="true"><b>' + (i + 1) + '</b><i>✓</i></span>' +
            (it.image ? '<span class="qs-zoom-btn qs-zoom-mini" role="button" tabindex="0" data-qs-zoom="' + esc(it.image) + '" aria-label="Ampliar imagem">' + ZOOM_ICON + '</span>' : '') +
            '<span class="qs-qc-caption">' +
              '<b class="qs-qc-title">' + title + '</b>' +
              '<span class="qs-deck-rule">' + text + '</span>' +
            '</span>' +
          '</span>' +
        '</div>';
    }).join('');
    var tabs = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      return '' +
        '<button type="button" class="qs-deck-tab' + (i === 0 ? ' is-current' : ' is-locked') + '" data-qs-deck="' + i + '" aria-label="' + title + '">' +
          '<span class="qs-deck-box" aria-hidden="true">✓</span>' +
          '<span class="qs-deck-name">' + title + '</span>' +
          '<span class="qs-deck-thumb"><span class="qs-deck-thumb-ico" aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
            (it.image ? '<img src="' + esc(it.image) + '" alt="" loading="eager" decoding="async" onerror="this.hidden=true">' : '') +
          '</span>' +
        '</button>';
    }).join('');
    return '' +
      '<article class="qs-screen is-content is-text is-quickcards is-qc-photos is-qc-deck is-qc-check" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<p class="qs-qc-hintbar">✅ Leia cada regra e marque como entendida, como num checklist</p>' +
          '<div class="qs-deck" data-qs-deckroot data-total="' + n + '">' +
            '<div class="qs-deck-stage">' +
              '<div class="qs-deck-cards">' + cards + '</div>' +
              '<button type="button" class="qs-deck-cta" data-qs-check>✓ Entendi, próxima regra</button>' +
            '</div>' +
            '<div class="qs-deck-rail">' + tabs + '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function deckCheck(root) {
    var cards = root.querySelectorAll('.qs-deck-card');
    var tabs = root.querySelectorAll('.qs-deck-tab');
    var cta = root.querySelector('[data-qs-check]');
    var n = cards.length, cur = 0, i;
    for (i = 0; i < n; i++) if (cards[i].classList.contains('is-current')) cur = i;
    tabs[cur].classList.add('is-done');
    tabs[cur].classList.remove('is-locked');
    cards[cur].classList.add('is-done');
    var next = -1;
    for (i = 1; i <= n; i++) {
      var j = (cur + i) % n;
      if (!tabs[j].classList.contains('is-done')) { next = j; break; }
    }
    if (next < 0) {
      root.classList.add('is-complete');
      if (cta) { cta.textContent = '✓ Checklist completo'; cta.disabled = true; }
      return true;
    }
    tabs[next].classList.remove('is-locked');
    deckShow(root, next);
    if (cta) cta.textContent = (next === n - 1 || root.querySelectorAll('.qs-deck-tab.is-done').length === n - 1) ? '✓ Entendi, concluir checklist' : '✓ Entendi, próxima regra';
  }

  function deckShow(root, idx) {
    var cards = root.querySelectorAll('.qs-deck-card');
    var tabs = root.querySelectorAll('.qs-deck-tab');
    var n = cards.length;
    if (!n) return;
    idx = ((idx % n) + n) % n;
    cards.forEach(function (c, i) { c.classList.toggle('is-current', i === idx); });
    tabs.forEach(function (t, i) { t.classList.toggle('is-current', i === idx); });
  }

  /* Abas com cartões grandes de foto (data.layout === 'zonas'): cada aba é um grupo de regras. */
  /* Lista numerada à esquerda (texto sempre visível) + foto grande e inteira à direita (data.layout === 'lista-foto') */
  function lfSelect(root, idx) {
    var rows = root.querySelectorAll('[data-qs-lf]');
    var slides = root.querySelectorAll('[data-lf-slide]');
    var photo = root.querySelector('.qs-lf-photo');
    var btn = root.querySelector('[data-qs-lfnext]');
    if (idx < 0 || idx >= rows.length) return;
    rows.forEach(function (r, i) {
      var on = i === idx;
      r.classList.toggle('is-on', on);
      r.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) r.classList.add('is-seen');
    });
    slides.forEach(function (sl, i) {
      var on = i === idx;
      sl.classList.toggle('is-on', on);
      if (on) photo.className = 'qs-lf-photo ' + ((sl.className.match(/tone-\w+/) || [''])[0]);
    });
    if (btn && !root.classList.contains('is-complete')) {
      btn.innerHTML = idx === rows.length - 1 ? '✓ Concluir' : 'Próxima regra <span aria-hidden="true">›</span>';
    }
  }

  /* Sanfonado horizontal (data.layout === 'acordeao'): cada tópico é uma faixa colorida em pé; o aberto mostra a imagem inteira e o texto */
  function acSelect(root, idx) {
    var items = root.querySelectorAll('[data-qs-ac]');
    var btn = root.querySelector('[data-qs-acnext]');
    if (idx < 0 || idx >= items.length) return;
    items.forEach(function (it, i) {
      var on = i === idx;
      it.classList.toggle('is-on', on);
      it.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) it.classList.add('is-seen');
    });
    if (btn && !root.classList.contains('is-complete')) {
      var lbl = btn.getAttribute('data-label') || 'Próxima regra';
      btn.innerHTML = idx === items.length - 1 ? '✓ Concluir' : esc(lbl) + ' <span aria-hidden="true">›</span>';
    }
  }

  function acordeaoHTML(data) {
    var g = (data.groups || [])[0] || { items: [] };
    var items = g.items || [];
    var startAt = +data.startAt || 1;
    var total = items.length;
    var label = data.nextLabel || 'Próxima regra';
    var cols = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      var img = it.image
        ? '<img class="qs-ac-img" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-fallback&quot;)">'
        : '';
      return '<section class="qs-ac-item' + (i === 0 ? ' is-on is-seen' : '') + (it.tone ? ' tone-' + esc(it.tone) : '') + '" data-qs-ac="' + i + '" role="button" tabindex="0" aria-expanded="' + (i === 0 ? 'true' : 'false') + '" aria-label="' + title + '">' +
        '<span class="qs-ac-strip"><span class="qs-ac-n" aria-hidden="true"><i>' + (startAt + i) + '</i><em>✓</em></span><span class="qs-ac-vt">' + title + '</span></span>' +
        '<span class="qs-ac-body">' +
          '<span class="qs-ac-photo' + (it.image ? '' : ' is-fallback') + '">' + img + '<span class="qs-ac-fb" aria-hidden="true">' + esc(it.icon || '•') + '</span>' + (it.image ? '<span class="qs-zoom-btn qs-zoom-mini" role="button" tabindex="0" data-qs-zoom="' + esc(it.image) + '" aria-label="Ampliar imagem">' + ZOOM_ICON + '</span>' : '') + '</span>' +
          '<span class="qs-ac-txt"><span class="qs-ac-count">' + (i + 1) + ' de ' + total + '</span><b>' + title + '</b><span class="qs-ac-rule">' + esc(it.text || it.body || '') + '</span></span>' +
        '</span>' +
      '</section>';
    }).join('');
    var head = '<p class="qs-zn-part"><span class="qs-zn-part-ico" aria-hidden="true">' + esc(g.icon || '') + '</span>' + (data.part ? '<span class="qs-zn-part-n">' + esc(data.part) + '</span>' : '') + '<span>' + esc(g.label || '') + '</span></p>';
    return '' +
      '<article class="qs-screen is-content is-text is-zonas is-single is-ac" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text" data-qs-acroot>' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          head +
          '<div class="qs-zn-panel is-on">' +
            '<p class="qs-lf-help"><span class="qs-lf-help-ico" aria-hidden="true">👉</span><span>' + esc(data.help || 'Toque numa faixa colorida, ou clique em Próxima, para abrir cada tópico. Na última, clique em Concluir.') + '</span></p>' +
            '<div class="qs-ac" style="--n:' + total + '">' + cols + '</div>' +
            '<button type="button" class="qs-lf-next qs-ac-next" data-qs-acnext data-label="' + esc(label) + '">' + esc(label) + ' <span aria-hidden="true">›</span></button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* Fatores de risco (data.layout === 'fatores'): três cartões altos, cada um com faixa colorida, ícone, nome e definição */
  function fatoresHTML(data) {
    var cards = (data.cards || []).map(function (c, i) {
      return '<article class="qs-ft-card' + (c.image ? ' has-photo' : '') + ' tone-' + esc(c.tone || 'orange') + '" style="--i:' + i + '">' +
        '<div class="qs-ft-band"><span class="qs-ft-ico" aria-hidden="true">' + esc(c.icon || '') + '</span></div>' +
        (c.image ? '<div class="qs-ft-photo"><img src="' + esc(c.image) + '" alt="' + esc(c.imageAlt || c.title || '') + '" loading="eager" decoding="async"></div>' : '') +
        '<div class="qs-ft-body">' +
          '<h3>' + esc(c.title || '') + '</h3>' +
          '<span class="qs-ft-tag">' + esc(data.tag || 'Definição') + '</span>' +
          '<p>' + esc(c.body || '') + '</p>' +
        '</div>' +
      '</article>';
    }).join('');
    return '' +
      '<article class="qs-screen is-content is-text is-fatores" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<div class="qs-ft count-' + (data.cards || []).length + '">' + cards + '</div>' +
        '</div>' +
      '</article>';
  }

  /* Mural (data.layout === 'mural'): cartões com foto inteira sempre visíveis; o botão passa o destaque de um para o outro */
  function muSelect(root, idx) {
    var cards = root.querySelectorAll('[data-qs-mu]');
    var btn = root.querySelector('[data-qs-munext]');    if (idx < 0 || idx >= cards.length) return;
    cards.forEach(function (c, i) {
      var on = i === idx;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) c.classList.add('is-seen');
    });
    if (btn && !root.classList.contains('is-complete')) {
      btn.innerHTML = idx === cards.length - 1 ? '✓ Concluir' : esc(btn.getAttribute('data-label') || 'Próxima dica') + ' <span aria-hidden="true">›</span>';
    }
  }

  function muralHTML(data) {
    var items = data.items || [];
    var cards = items.map(function (it, i) {
      var title = esc(it.title || '');
      var img = it.image
        ? '<img class="qs-mu-img" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || it.title || '') + '" loading="eager" decoding="async">'
        : '';
      return '<button type="button" class="qs-mu-card tone-' + esc(it.tone || 'green') + (i === 0 ? ' is-on is-seen' : '') + '" data-qs-mu="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' +
        '<span class="qs-mu-ph">' + img + (it.image ? '<span class="qs-zoom-btn qs-zoom-mini" role="button" tabindex="0" data-qs-zoom="' + esc(it.image) + '" aria-label="Ampliar imagem">' + ZOOM_ICON + '</span>' : '') + '<span class="qs-mu-n" aria-hidden="true"><i>' + (i + 1) + '</i><em>✓</em></span></span>' +
        '<span class="qs-mu-txt"><b>' + title + '</b> ' + esc(it.text || '') + '</span>' +
      '</button>';
    }).join('');
    var hero = data.hero
      ? '<span class="qs-mu-hero"><img src="' + esc(data.hero) + '" alt="' + esc(data.heroAlt || 'Doca de carga') + '" loading="eager" decoding="async"><button type="button" class="qs-zoom-btn" data-qs-zoom="' + esc(data.hero) + '" aria-label="Ampliar a foto da doca">' + ZOOM_ICON + '</button></span>'
      : '<span class="qs-lf-help-ico" aria-hidden="true">👉</span>';
    return '' +
      '<article class="qs-screen is-content is-text is-zonas is-single is-mu" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text" data-qs-muroot>' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<p class="qs-zn-part"><span class="qs-zn-part-ico" aria-hidden="true">' + esc(data.chipIcon || '🚚') + '</span><span>' + esc(data.chip || 'Doca de carga') + '</span></p>' +
          '<div class="qs-zn-panel is-on">' +
            '<p class="qs-lf-help qs-mu-help">' + hero + '<span>' + esc(data.help || 'Leia as 6 dicas. Clique em Próxima dica para destacar cada uma e, na última, em Concluir.') + '</span></p>' +
            '<div class="qs-mu">' + cards + '</div>' +
            '<button type="button" class="qs-lf-next qs-ac-next" data-qs-munext data-label="' + esc(data.nextLabel || 'Próxima dica') + '">' + esc(data.nextLabel || 'Próxima dica') + ' <span aria-hidden="true">›</span></button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* Caminho (data.layout === 'caminho'): trilha de paradas que acendem uma a uma + cartões de texto sempre visíveis + copiar e-mail */
  function cmSelect(root, idx) {
    var stops = root.querySelectorAll('[data-qs-cm]');
    var btn = root.querySelector('[data-qs-cmnext]');
    if (idx < 0 || idx >= stops.length) return;
    stops.forEach(function (st, i) {
      st.classList.toggle('is-on', i === idx);
      if (i <= idx) st.classList.add('is-seen');
    });
    root.classList.toggle('is-arrived', idx === stops.length - 1);
    if (btn && !root.classList.contains('is-complete')) {
      btn.innerHTML = idx === stops.length - 1 ? '✓ Concluir' : 'Próximo passo <span aria-hidden="true">›</span>';
    }
  }

  function caminhoHTML(data) {
    var path = data.path || [];
    var items = data.items || [];
    var stops = path.map(function (p, i) {
      return (i ? '<span class="qs-cm-arrow" aria-hidden="true">›</span>' : '') +
        '<span class="qs-cm-stop' + (i === 0 ? ' is-on is-seen' : '') + '" data-qs-cm="' + i + '">' +
          '<span class="qs-cm-sico" aria-hidden="true"><i>' + esc(p.icon || '') + '</i><em>✓</em></span>' +
          '<span class="qs-cm-slbl">' + esc(p.label || '') + '</span>' +
        '</span>';
    }).join('');
    var cards = items.map(function (it, i) {
      var title = esc(it.title || '');
      var text = esc(it.text || '');
      var isMail = /@/.test(it.text || '');
      if (it.link) title = esc((it.title || '').replace(/:s*$/, ''));
      var body = '<span class="qs-cm-cico" aria-hidden="true">' + esc(it.icon || '') + '</span>' +
        '<span class="qs-cm-ctxt"><b>' + title + '</b> ' + (isMail ? '<strong class="qs-cm-mail">' + text + '</strong>' : text) + '</span>' +
        (it.link ? '<a class="qs-cm-open" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer">Abrir manual <span aria-hidden="true">↗</span></a>' : '');
      var copy = isMail ? '<button type="button" class="qs-cm-copy" data-qs-copy="' + esc(it.text) + '">Copiar e-mail</button>' : '';
      return '<div class="qs-cm-card ' + (isMail ? 'is-mail ' : 'is-manual ') + 'tone-' + esc(it.tone || 'green') + '">' + body + copy + '</div>';
    }).join('');
    var manuals = '<div class="qs-cm-manuals">' + cards.split('<div class="qs-cm-card is-mail').shift() + '</div>';
    var mailPart = cards.indexOf('<div class="qs-cm-card is-mail') >= 0 ? cards.slice(cards.indexOf('<div class="qs-cm-card is-mail')) : '';
    return '' +
      '<article class="qs-screen is-content is-text is-zonas is-single is-cm" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text" data-qs-cmroot>' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          '<div class="qs-zn-panel is-on">' +
            (data.intro ? '<p class="qs-cm-intro">' + esc(data.intro) + '</p>' : '') +
            '<div class="qs-cm">' + manuals + mailPart + '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function listaFotoHTML(data) {
    var g = (data.groups || [])[0] || { items: [] };
    var items = g.items || [];
    var startAt = +data.startAt || 1;
    var rows = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      return '<button type="button" class="qs-lf-row' + (i === 0 ? ' is-on' : '') + (it.tone ? ' tone-' + esc(it.tone) : '') + '" data-qs-lf="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' +
        '<span class="qs-lf-n" aria-hidden="true"><i>' + (startAt + i) + '</i><em>✓</em></span>' +
        '<span class="qs-lf-copy"><b>' + title + '</b><span>' + esc(it.text || it.body || '') + '</span></span>' +
        '<span class="qs-lf-arrow" aria-hidden="true">▶</span>' +
      '</button>';
    }).join('');
    var imgs = items.map(function (it, i) {
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      var img = it.image
        ? '<img class="qs-lf-img" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-fallback&quot;)">'
        : '';
      return '<div class="qs-lf-slide' + (i === 0 ? ' is-on' : '') + (it.tone ? ' tone-' + esc(it.tone) : '') + '" data-lf-slide="' + i + '">' + img + '<span class="qs-lf-fb" aria-hidden="true">' + esc(it.icon || '•') + '</span>' + (it.image ? '<span class="qs-zoom-btn qs-zoom-mini" role="button" tabindex="0" data-qs-zoom="' + esc(it.image) + '" aria-label="Ampliar imagem">' + ZOOM_ICON + '</span>' : '') + '</div>';
    }).join('');
    var head = '<p class="qs-zn-part"><span class="qs-zn-part-ico" aria-hidden="true">' + esc(g.icon || '') + '</span>' + (data.part ? '<span class="qs-zn-part-n">' + esc(data.part) + '</span>' : '') + '<span>' + esc(g.label || '') + '</span></p>';
    return '' +
      '<article class="qs-screen is-content is-text is-zonas is-single is-lf" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text" data-qs-lfroot>' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          head +
          '<div class="qs-zn-panel is-on">' +
          '<p class="qs-lf-help"><span class="qs-lf-help-ico" aria-hidden="true">👉</span><span>' + esc(data.help || 'Leia a regra e clique em Próxima regra para ver a foto de cada uma. Ao chegar na última, clique em Concluir.') + '</span></p>' +
          '<div class="qs-lf">' +
            '<div class="qs-lf-left"><div class="qs-lf-list">' + rows + '</div>' +
            '<button type="button" class="qs-lf-next" data-qs-lfnext data-total="' + items.length + '">Próxima regra <span aria-hidden="true">›</span></button></div>' +
            '<div class="qs-lf-photo tone-' + esc((items[0] && items[0].tone) || 'green') + '">' + imgs + '</div>' +
          '</div></div>' +
        '</div>' +
      '</article>';
  }

  function zonasHTML(data) {
    var groups = data.groups || [];
    var flipz = data.layout === 'flipz';
    var zig = data.layout === 'zigzag';
    var startAt = +data.startAt || 1;
    var tabs = groups.map(function (g, i) {
      return '<button type="button" class="qs-zn-tab' + (i === 0 ? ' is-on' : '') + '" data-qs-zona="' + i + '" role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '">' +
        '<span class="qs-zn-ico" aria-hidden="true">' + esc(g.icon || '') + '</span>' +
        '<span class="qs-zn-lbl">' + esc(g.label) + '</span>' +
        '<span class="qs-zn-count" aria-hidden="true">' + g.items.length + '</span>' +
      '</button>';
    }).join('');
    var panels = groups.map(function (g, gi) {
      var cards = g.items.map(function (it, ii) {
        var title = esc((it.title || '').replace(/:\s*$/, ''));
        if (zig) {
          var zimg = it.image
            ? '<img class="qs-zz-img" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-fallback&quot;)">'
            : '';
          return '<article class="qs-zz ' + (ii % 2 === 0 ? 'is-down' : 'is-up') + (it.tone ? ' tone-' + esc(it.tone) : '') + '">' +
            '<div class="qs-zz-text"><span class="qs-zz-n" aria-hidden="true">' + (startAt + ii) + '</span><div class="qs-zz-copy"><h3>' + title + '</h3><p>' + esc(it.text || it.body || '') + '</p></div></div>' +
            '<div class="qs-zz-photo' + (it.image ? '' : ' is-fallback') + '">' + zimg + '<span class="qs-zz-fb" aria-hidden="true">' + esc(it.icon || '•') + '</span></div>' +
          '</article>';
        }
        if (flipz) {
          var fimg = it.image
            ? '<img class="qs-fz-img" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-fallback&quot;)">'
            : '';
          return '<button type="button" class="qs-fz' + (it.tone ? ' tone-' + esc(it.tone) : '') + '" aria-pressed="false" aria-label="' + title + '. Toque para ver a regra">' +
            '<span class="qs-fz-inner">' +
              '<span class="qs-fz-face qs-fz-front">' +
                '<span class="qs-fz-photo' + (it.image ? '' : ' is-fallback') + '">' + fimg + '<span class="qs-fz-fb" aria-hidden="true">' + esc(it.icon || '•') + '</span></span>' +
                '<span class="qs-fz-cap"><b>' + title + '</b><span class="qs-fz-hint">↻ Toque para ver a regra</span></span>' +
              '</span>' +
              '<span class="qs-fz-face qs-fz-back">' +
                '<span class="qs-fz-ico" aria-hidden="true">' + esc(it.icon || '') + '</span>' +
                '<b class="qs-fz-t">' + title + '</b>' +
                '<span class="qs-fz-rule">' + esc(it.text || it.body || '') + '</span>' +
                '<span class="qs-fz-hint">↻ Toque para voltar</span>' +
              '</span>' +
            '</span>' +
            '<span class="qs-fz-seen" aria-hidden="true">✓</span>' +
          '</button>';
        }
        var img = it.image
          ? '<img class="qs-zn-img" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt || title) + '" loading="eager" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(&quot;is-fallback&quot;)">'
          : '';
        return '<article class="qs-zn-card' + (it.tone ? ' tone-' + esc(it.tone) : '') + '">' +
          '<div class="qs-zn-photo' + (it.image ? '' : ' is-fallback') + '">' + img +
            '<span class="qs-zn-fb" aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
            (it.tag ? '<span class="qs-zn-tag">' + esc(it.tag) + '</span>' : '') +
            (it.image ? '<span class="qs-zoom-btn qs-zoom-mini" role="button" tabindex="0" data-qs-zoom="' + esc(it.image) + '" aria-label="Ampliar imagem">' + ZOOM_ICON + '</span>' : '') +
          '</div>' +
          '<div class="qs-zn-info"><span class="qs-zn-seal" aria-hidden="true">' + esc(it.icon || '') + '</span><h3>' + title + '</h3><p>' + esc(it.text || it.body || '') + '</p></div>' +
        '</article>';
      }).join('');
      return '<div class="qs-zn-panel' + (gi === 0 ? ' is-on' : '') + '" data-zona-panel="' + gi + '" role="tabpanel"' + (gi === 0 ? '' : ' hidden') + '><div class="qs-zn-grid count-' + g.items.length + '">' + cards + '</div></div>';
    }).join('');
    var single = groups.length === 1;
    var head = single
      ? '<p class="qs-zn-part"><span class="qs-zn-part-ico" aria-hidden="true">' + esc(groups[0].icon || '') + '</span>' + (data.part ? '<span class="qs-zn-part-n">' + esc(data.part) + '</span>' : '') + '<span>' + esc(groups[0].label) + '</span></p>'
      : '<div class="qs-zn-tabs" role="tablist">' + tabs + '</div>';
    return '' +
      '<article class="qs-screen is-content is-text is-zonas' + (flipz ? ' is-flipz' : '') + (zig ? ' is-zigzag' : '') + (single ? ' is-single zn-cols-' + groups[0].items.length : '') + '" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text" data-qs-zonasroot>' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          (data.help && !single ? '<p class="qs-lf-help qs-zn-help"><span class="qs-lf-help-ico" aria-hidden="true">👉</span><span>' + esc(data.help) + '</span></p>' : '') +
          head +
          panels +
        '</div>' +
      '</article>';
  }

  function quickCardsHTML(data) {
    var items = data.items || [];
    if (data.qcStyle === 'deck' || data.qcStyle === 'checklist') return deckHTML(data);
    var hasPhotos = items.some(function (it) { return !!it.image; });
    var cards = items.map(function (it, i) {
      var tone = i % 7;
      var title = esc((it.title || '').replace(/:\s*$/, ''));
      var text = esc(it.text || it.body || '');
      var icoHtml = it.icon ? ('<span class="qs-qc-ico" aria-hidden="true">' + esc(it.icon) + '</span>') : '';
      var frontInner;
      if (it.image) {
        var alt = esc(it.imageAlt || (it.title || '').replace(/:\s*$/, '') || '');
        frontInner =
          '<img class="qs-qc-photo" src="' + esc(it.image) + '" alt="' + alt + '" loading="' + (i < 4 ? 'eager' : 'lazy') + '" decoding="async" onerror="this.hidden=true;var f=this.nextElementSibling;if(f){f.hidden=false;}this.parentNode.classList.add(\'is-ico-fallback\')">' +
          '<span class="qs-qc-ico qs-qc-fallback" hidden aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
          '<span class="qs-qc-caption">' +
            '<b class="qs-qc-title">' + title + '</b>' +
            '<span class="qs-qc-hint">Toque para ver a conduta</span>' +
          '</span>';
      } else {
        frontInner =
          icoHtml +
          '<b class="qs-qc-title">' + title + '</b>' +
          '<span class="qs-qc-hint">Toque para ver a conduta</span>';
      }
      return '' +
        '<button type="button" class="qs-qc' + (it.image ? ' has-img' : '') + '" data-tone="' + tone + '" aria-pressed="false" aria-label="' + title + '. Toque para ver a conduta">' +
          '<span class="qs-qc-inner">' +
            '<span class="qs-qc-face qs-qc-front' + (it.image ? ' has-photo' : '') + '">' +
              frontInner +
            '</span>' +
            '<span class="qs-qc-face qs-qc-back">' +
              '<b class="qs-qc-title">' + title + '</b>' +
              '<p class="qs-qc-text">' + text + '</p>' +
            '</span>' +
          '</span>' +
        '</button>';
    }).join('');
    return '' +
      '<article class="qs-screen is-content is-text is-quickcards' + (hasPhotos ? ' is-qc-photos' : '') + '" data-qs-root data-type="content">' +
        '<div class="qs-panel qs-panel-text">' +
          '<h2 class="qs-title">' + esc(data.title || '') + '</h2>' +
          (data.body ? ('<p class="qs-body">' + esc(data.body) + '</p>') : '') +
          '<p class="qs-qc-hintbar">🔄 Toque em cada cartão para ver o que fazer</p>' +
          '<div class="qs-qc-grid' + (hasPhotos ? ' is-photos count-' + items.length : '') + '">' + cards + '</div>' +
        '</div>' +
      '</article>';
  }

  function fichaHTML(data) {
    var items = Array.isArray(data.items) ? data.items : [];
    var list = items.map(function (it, i) {
      var title = String(it.title || '').replace(/:\s*$/, '');
      var text = it.text || it.body || '';
      var warn = it.warn
        ? `<span class="qs-ficha-warn">${esc(it.warn)}</span>`
        : '';
      return `<article class="qs-ficha-item" data-qs-ficha="${i}">
        <span class="qs-ficha-ico" aria-hidden="true">${esc(it.icon || '•')}</span>
        <div class="qs-ficha-body">
          <b class="qs-ficha-title">${esc(title)}</b>
          <p class="qs-ficha-text">${esc(text)}</p>
          ${warn}
        </div>
      </article>`;
    }).join('');
    return `
      <article class="qs-screen is-content is-text is-ficha" data-qs-root data-type="content" data-ficha="1">
        <div class="qs-panel qs-panel-text">
          <h2 class="qs-title">${esc(data.title || '')}</h2>
          <div class="qs-ficha-list">${list}</div>
        </div>
      </article>`;
  }

  function stepsHTML(data) {
    var items = data.items || [];
    var unit = data.stepUnit || 'Exercício';
    var nextLbl = data.stepNext || 'Próximo exercício';
    var photoOnly = items.every(function (it) {
      return !!(it.image && !(it.title || it.text || it.body));
    });
    var textOnly = items.every(function (it) { return !it.image; });
    /* Ficha com texto + foto (ex.: emergências): mantém o layout compacto
       da text-steps, em vez da grade larga feita pras sequências com ilustração. */
    var textLayout = !photoOnly && items.every(function (it) {
      return !!(it.title || it.text || it.body);
    });
    var isFuncoes = data.stepSkin === 'funcoes';
    var isVantagens = data.stepSkin === 'vantagens';
    var isEquip = data.stepSkin === 'equip';
    var isRisk = data.stepSkin === 'risk';
    var customSteps = isFuncoes || isVantagens || isEquip || isRisk;
    var slides = items.map(function (it, i) {
      var raw = it.text || it.body || '';
      var d = splitDose(raw);
      var doses = (d ? d.tags : []).map(function (t) {
        var rep = t.indexOf('×') !== -1;
        return `<span class="qs-dose ${rep ? 'is-rep' : 'is-time'}">${esc(t)}</span>`;
      }).join('');
      var num = it.n != null ? it.n : (i + 1);
      var warn = it.warn || (d && d.caveat) || '';
      if (isFuncoes) {
        var titleF = it.title ? esc(it.title) : '';
        var textF = esc(d ? d.move : raw);
        var icoF = it.icon ? esc(it.icon) : esc(String(num));
        return `<div class="qs-step is-funcoes-card${i === 0 ? ' is-on' : ''}" data-qs-step="${i}"${i === 0 ? '' : ' hidden'}>
          <article class="qs-func-card">
            <header class="qs-func-head">
              <span class="qs-func-num">${esc(num)}</span>
              <span class="qs-func-label">Papel do brigadista no SCI</span>
            </header>
            <div class="qs-func-body">
              <div class="qs-func-ico" aria-hidden="true">${icoF}</div>
              <div class="qs-func-copy">
                ${titleF ? `<b class="qs-func-title">${titleF}</b>` : ''}
                <p class="qs-func-text">${textF}</p>
              </div>
            </div>
          </article>
        </div>`;
      }
      if (isVantagens) {
        var titleV = it.title ? esc(String(it.title).replace(/:\s*$/, '')) : '';
        var textV = esc(d ? d.move : raw);
        var icoV = it.icon ? esc(it.icon) : esc(String(num));
        var toneV = i % 4;
        return `<div class="qs-step is-vantagens-card${i === 0 ? ' is-on' : ''}" data-qs-step="${i}" data-ben-tone="${toneV}"${i === 0 ? '' : ' hidden'}>
          <article class="qs-ben-card">
            <span class="qs-ben-tag">Benefício do SCI</span>
            <div class="qs-ben-ico-wrap" aria-hidden="true"><span class="qs-ben-ico">${icoV}</span></div>
            ${titleV ? `<h3 class="qs-ben-title">${titleV}</h3>` : ''}
            <p class="qs-ben-text">${textV}</p>
          </article>
        </div>`;
      }
      var hasInfo = !!(it.title || raw);
      var info = hasInfo
        ? `<div class="qs-step-info">
          <div class="qs-step-head">
            <span class="qs-step-num">${esc(num)}</span>
            ${it.title ? `<b class="qs-step-title">${esc(it.title)}</b>` : ''}
            ${doses ? `<span class="qs-doses">${doses}</span>` : ''}
          </div>
          <p class="qs-step-move">${esc(d ? d.move : raw)}</p>
          ${warn ? `<span class="qs-item-warn">${esc(warn)}</span>` : ''}
        </div>`
        : '';
      var mediaInner;
      if (it.image) {
        var stepImg = `<img class="qs-step-img" src="${esc(it.image)}" alt="${esc(it.imageAlt || it.title || '')}" loading="eager" decoding="async"${it.icon ? ' onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.hidden=false"' : ''}>${it.icon ? `<div class="qs-step-fallback is-icon" hidden><span aria-hidden="true">${esc(it.icon)}</span></div>` : ''}`;
        mediaInner = zoomWrap(it.image, stepImg);
      } else if (it.icon) {
        mediaInner = `<div class="qs-step-fallback is-icon"><span aria-hidden="true">${esc(it.icon)}</span></div>`;
      } else {
        mediaInner = `<div class="qs-step-fallback">${esc(num)}</div>`;
      }
      var tone = it.tone || (textLayout ? ('e' + ((i % 7) + 1)) : '');
      var toneClass = tone ? ' tone-' + esc(tone) : '';
      var slideBadge = (isEquip || isRisk)
        ? `<span class="qs-steps-count">${esc(unit)} ${i + 1} de ${items.length}</span>`
        : '';
      return `<div class="qs-step${i === 0 ? ' is-on' : ''}${photoOnly ? ' is-photo' : ''}${textLayout ? ' is-text' : ''}${it.image ? ' has-photo' : ''}${toneClass}" data-qs-step="${i}"${i === 0 ? '' : ' hidden'}>
        <div class="qs-step-media">${mediaInner}${slideBadge}</div>
        ${info}
      </div>`;
    }).join('');

    return `
      <article class="qs-screen is-content is-steps${photoOnly ? ' is-photo-steps' : ''}${textLayout && !customSteps ? ' is-text-steps' : ''}${data.stepSkin === 'principles' ? ' is-principles-steps' : ''}${isFuncoes ? ' is-funcoes-steps' : ''}${isVantagens ? ' is-vantagens-steps' : ''}${isEquip ? ' is-equip-steps' : ''}${isEquip && data.stepLayout === 'lado' ? ' is-side-steps' : ''}${isRisk ? ' is-risk-steps' : ''}"${isEquip && data.stepLayout === 'lado' ? ' style="--side-r:' + (+data.stepRatio || 1) + '"' : ''} data-qs-root data-type="content">
        <div class="qs-steps" data-qs-steps data-step-unit="${esc(unit)}" data-step-next="${esc(nextLbl)}" data-step-finish="${esc(data.stepFinish || 'Concluir sequência')}">
          <header class="qs-steps-top">
            <h2 class="qs-title">${esc(data.title || '')}</h2>
            ${isEquip || isRisk ? '' : `<span class="qs-steps-count" data-qs-step-count>${esc(unit)} 1 de ${items.length}</span>`}
          </header>
          <div class="qs-steps-track">${slides}</div>
          <div class="qs-steps-actions">
            <button type="button" class="qs-step-back" data-qs-step-prev hidden>Ver anterior</button>
            <button type="button" class="qs-step-cta" data-qs-step-next>
              ${esc(nextLbl)}
            </button>
          </div>
        </div>
      </article>`;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function reflectHTML(data) {
    var choices = Array.isArray(data.choices) ? data.choices : [];
    var choiceHtml = choices.length
      ? `<div class="qs-reflect-choices">${choices.map(function (c, i) {
          return `<button type="button" class="qs-reflect-choice" data-qs-choice="${i}">${c.icon ? `<span aria-hidden="true">${esc(c.icon)}</span>` : ''}${esc(c.text || c.label || '')}</button>`;
        }).join('')}</div>`
      : `<button type="button" class="qs-reflect-tap" data-qs-reveal>Toque para pensar</button>`;
    var prompt = esc(data.prompt || data.body || '');
    if (data.promptAccent) {
      prompt = esc(data.prompt || '') + (data.prompt ? '<br>' : '') +
        '<span>' + esc(data.promptAccent) + '</span>';
    }
    return `
      <article class="qs-screen is-content is-text is-reflect" data-qs-root data-type="reflect">
        <div class="qs-panel qs-panel-text qs-panel-reflect">
          <header class="qs-reflect-head">
            <h2 class="qs-title">${esc(data.title || '')}</h2>
          </header>
          <div class="qs-reflect">
            <p class="qs-reflect-prompt">${prompt}</p>
            <div class="qs-reflect-mark" aria-hidden="true">?</div>
            ${choiceHtml}
            <p class="qs-reflect-answer" data-qs-answer hidden>${esc(data.answer || data.quote || '')}</p>
          </div>
        </div>
      </article>`;
  }

  function compareHTML(data) {
    var sides = Array.isArray(data.compare) ? data.compare : [];
    var hasPhotos = sides.some(function (c) { return !!c.image; });
    var open = !!data.open;
    return `
      <article class="qs-screen is-content is-text is-compare${hasPhotos ? ' has-photos' : ''}${open ? ' is-open' : ''}" data-qs-root data-type="compare">
        <div class="qs-panel qs-panel-text">
          <h2 class="qs-title">${esc(data.title || '')}</h2>
          ${data.body && !open ? `<p class="qs-compare-guide">${esc(data.body)}</p>` : ''}
          <div class="qs-compare">${sides.map(function (c, i) {
            var ok = !!c.ok;
            var imgInner = c.image
              ? `<img class="qs-compare-img" src="${esc(c.image)}" alt="${esc(c.imageAlt || c.label || '')}" loading="eager" decoding="async">`
              : '';
            var img = c.image
              ? `<div class="qs-compare-media">${hasPhotos && !open ? zoomWrap(c.image, imgInner) : imgInner}</div>`
              : '';
            return `<button type="button" class="qs-compare-col ${ok ? 'is-ok' : 'is-bad'}${c.image ? ' has-img' : ''}${open ? ' is-open' : ''}" data-qs-compare="${i}"${open ? ' disabled' : ''}>
              <div class="qs-compare-lbl">${esc(c.label || (ok ? '✓ Correto' : '✕ Evitar'))}</div>
              ${img}
              ${open ? '' : '<p class="qs-compare-hint">Toque para ver</p>'}
              <p class="qs-compare-reveal"${open ? '' : ' hidden'}>${esc(c.text || c.body || '')}</p>
            </button>`;
          }).join('')}</div>
        </div>
      </article>`;
  }

  function orderHTML(data) {
    var items = Array.isArray(data.items) ? data.items : [];
    var cards = shuffle(items).map(function (it) {
      return `<button type="button" class="qs-seq-card" data-qs-seq="${esc(it.key)}">
        <span class="qs-seq-badge" aria-hidden="true"></span>
        <span>${esc(it.text)}</span>
      </button>`;
    }).join('');
    return `
      <article class="qs-screen is-content is-text is-order is-timed" data-qs-root data-type="order">
        <div class="qs-qbar-wrap"><div class="qs-qbar"><i data-qs-timer></i></div></div>
        <div class="qs-panel qs-panel-text">
          <h2 class="qs-title">${esc(data.title || 'Ordene a rotina')}</h2>
          <p class="qs-body">${esc(data.body || 'Toque nos cuidados na ordem que você seguiria.')}</p>
          <p class="qs-seq-progress" data-qs-seq-progress>0 de ${items.length} selecionados</p>
          <div class="qs-seq-wrap">${cards}</div>
          <div class="qs-seq-foot">
            <p class="qs-seq-fb" data-qs-seq-fb hidden></p>
            <button type="button" class="qs-seq-retry" data-qs-seq-retry hidden>Tentar de novo</button>
          </div>
        </div>
      </article>`;
  }

  function matchHTML(data) {
    var pairs = Array.isArray(data.pairs) ? data.pairs : [];
    return `
      <article class="qs-screen is-content is-text is-match is-dense" data-qs-root data-type="match">
        <div class="qs-panel qs-panel-text">
          <h2 class="qs-title">${esc(data.title || 'Associe os pares')}</h2>
          ${data.body ? `<p class="qs-body">${esc(data.body)}</p>` : ''}
          <div class="qs-match-hud">
            <span data-qs-match-time>⏱️ 0s</span>
            <span data-qs-match-progress>0 de ${pairs.length} pares</span>
          </div>
          <div class="qs-match">
            <div class="qs-match-side is-ex">
              <div class="qs-match-col-title">${esc(data.leftTitle || 'Exercício')}</div>
              <div data-qs-match-ex></div>
            </div>
            <div class="qs-match-side is-body">
              <div class="qs-match-col-title">${esc(data.rightTitle || 'Região do corpo')}</div>
              <div data-qs-match-body></div>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* Ritmo: o aluno toca no compasso (ex.: compressões da RCP, 100–120 por minuto).
     Campos: title, body, bpmMin, bpmMax, guideBpm, taps, tries, scaleMin, scaleMax. */
  function rhythmHTML(data) {
    var min = Number(data.bpmMin) || 100;
    var max = Number(data.bpmMax) || 120;
    var taps = Math.max(6, Number(data.taps) || 12);
    var sMin = Number(data.scaleMin) || 60;
    var sMax = Number(data.scaleMax) || 160;
    function pct(v) { return Math.max(0, Math.min(100, ((v - sMin) / (sMax - sMin)) * 100)); }
    return `
      <article class="qs-screen is-content is-text is-rhythm" data-qs-root data-type="rhythm">
        <div class="qs-panel qs-panel-text">
          <header class="qs-rhythm-head">
            <h2 class="qs-title">${esc(data.title || 'Ritmo')}</h2>
            ${data.body ? `<p class="qs-body">${esc(data.body)}</p>` : ''}
          </header>
          <div class="qs-rhythm" data-qs-r-phase="guide">
            <p class="qs-rhythm-status" data-qs-r-status role="status" aria-live="polite"></p>
            <div class="qs-rhythm-stage">
              <span class="qs-rhythm-ring" data-qs-r-ring aria-hidden="true"></span>
              <button type="button" class="qs-rhythm-btn" data-qs-r-btn aria-label="Comprimir: toque no ritmo">
                <span class="qs-rhythm-ico" aria-hidden="true">🫀</span>
                <span class="qs-rhythm-btn-txt">Comprimir</span>
              </button>
            </div>
            <div class="qs-rhythm-meter">
              <div class="qs-rhythm-gauge" aria-hidden="true">
                <span class="qs-rhythm-zone" style="left:${pct(min)}%;width:${pct(max) - pct(min)}%"></span>
                <span class="qs-rhythm-marker" data-qs-r-marker hidden></span>
              </div>
              <div class="qs-rhythm-scale" aria-hidden="true">
                <span style="left:${pct(min)}%">${min}</span>
                <span style="left:${pct(max)}%">${max}</span>
              </div>
              <div class="qs-rhythm-hud">
                <span data-qs-r-bpm>— por minuto</span>
                <span data-qs-r-count>0 de ${taps} toques</span>
              </div>
            </div>
            <div class="qs-rhythm-actions">
              <button type="button" class="qs-rhythm-act" data-qs-r-go>Já peguei o ritmo</button>
              <button type="button" class="qs-rhythm-act" data-qs-r-retry hidden>Tentar de novo</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* Complete a frase (type 'fill'): text com lacunas {{resposta}}; extra = palavras que não servem */
  function fillHTML(data) {
    var parts = String(data.text || '').split(/\{\{(.*?)\}\}/);
    var n = 0;
    var sentence = parts.map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      return '<button type="button" class="qs-fill-slot" data-qs-slot="' + (n++) + '" aria-label="Lacuna ' + n + '"></button>';
    }).join('');
    return `
      <article class="qs-screen is-content is-text is-fill" data-qs-root data-type="fill">
        <div class="qs-panel qs-panel-text">
          <h2 class="qs-title">${esc(data.title || 'Complete a frase')}</h2>
          ${data.body ? `<p class="qs-body">${esc(data.body)}</p>` : ''}
          <p class="qs-fill-text">${sentence}</p>
          <div class="qs-fill-bank" data-qs-fill-bank></div>
          <p class="qs-fill-fb" data-qs-fill-fb hidden></p>
        </div>
      </article>`;
  }

  /* Classificar (type 'sort'): um cartão por vez vai para o grupo da esquerda ou da direita */
  function sortHTML(data) {
    var items = Array.isArray(data.items) ? data.items : [];
    return `
      <article class="qs-screen is-content is-text is-sort" data-qs-root data-type="sort">
        <div class="qs-panel qs-panel-text">
          <h2 class="qs-title">${esc(data.title || 'Classifique')}</h2>
          ${data.body ? `<p class="qs-body">${esc(data.body)}</p>` : ''}
          <p class="qs-sort-progress" data-qs-sort-progress>0 de ${items.length}</p>
          <div class="qs-sort-stage"><div class="qs-sort-card" data-qs-sort-card></div></div>
          <div class="qs-sort-buckets">
            <button type="button" class="qs-sort-bucket is-left" data-qs-sort-side="left">${esc(data.leftLabel || 'Sim')}</button>
            <button type="button" class="qs-sort-bucket is-right" data-qs-sort-side="right">${esc(data.rightLabel || 'Não')}</button>
          </div>
          <p class="qs-sort-fb" data-qs-sort-fb aria-live="polite"></p>
        </div>
      </article>`;
  }

  function quizIntroHTML(data) {
    var count = data.count != null ? Number(data.count) : null;
    var min = data.minCorrect != null ? Number(data.minCorrect) : null;
    var desc = data.body || '';
    if (!desc && count) {
      desc = 'Responda <strong>' + count + '</strong> perguntas de múltipla escolha.';
      if (min) desc += ' Você precisa acertar no mínimo <strong>' + min + '</strong> para avançar.';
      desc += ' Cada acerto vale <strong>50 pontos</strong>.';
    }
    return `
      <article class="qs-screen is-quiz-intro" data-qs-root data-type="quiz-intro">
        <div class="qs-quiz-intro">
          <div class="qs-quiz-intro-icon" aria-hidden="true">${esc(data.icon || '🎮')}</div>
          <h2 class="qs-quiz-intro-title">${esc(data.title || 'Desafio do módulo')}</h2>
          <p class="qs-quiz-intro-desc">${desc}</p>
          <button type="button" class="qs-quiz-intro-btn" data-qs-start>Iniciar desafio</button>
        </div>
      </article>`;
  }

  /* cupom do check out: os temas do módulo "bipados" um a um, com o total de pontos */
  function cupomHTML(unlock, points) {
    var itens = Array.isArray(unlock.itens) ? unlock.itens : [];
    if (!itens.length) return '';
    var linhas = itens.map(function (t, k) {
      return '<li style="--i:' + k + '"><span class="qs-cupom-nome">' + esc(t) + '</span><span class="qs-cupom-ok" aria-hidden="true">✓</span></li>';
    }).join('');
    return '<div class="qs-cupom" style="--n:' + itens.length + '" role="group" aria-label="Cupom do módulo">' +
      '<div class="qs-cupom-top"><b>CHECK OUT</b><span>NR 17</span></div>' +
      '<ul class="qs-cupom-lista">' + linhas + '</ul>' +
      '<div class="qs-cupom-total" style="--i:' + itens.length + '"><span>' + esc(unlock.cupomTotal || 'Módulo concluído') + '</span><b>' + (points ? points + ' pts ✓' : '✓') + '</b></div>' +
      '</div>';
  }

  function quizResultHTML(data) {
    var passed = !!data.passed;
    var hits = data.score != null ? data.score : 0;
    var total = data.total != null ? data.total : 0;
    var min = data.minCorrect != null ? data.minCorrect : 0;
    var points = data.points != null ? data.points : 0;
    var streak = data.streak != null ? data.streak : 0;
    var medal = data.medal || data.icon || (passed ? '🥇' : '📚');
    var medalName = data.medalName || '';
    var rank = data.medalRank || (passed ? 'gold' : 'none');
    var title = data.title || (passed ? 'Desafio concluído!' : 'Desafio não concluído');
    var unlock = data.titleUnlock || null;
    var hasTitle = !!(passed && unlock && unlock.title);
    var desc = data.body || (passed
      ? ('Você acertou <strong>' + hits + '</strong> de <strong>' + total + '</strong> questões.')
      : ('Você acertou <strong>' + hits + '</strong> de <strong>' + total + '</strong>. É necessário acertar pelo menos <strong>' + min + '</strong>. Estude e tente novamente.'));
    var actions = passed
      ? ''
      : `<button type="button" class="qs-quiz-intro-btn" data-qs-retry>Jogar novamente</button>`;
    var actionsBlock = actions
      ? `<div class="qs-quiz-result-actions">${actions}</div>`
      : '';

    // reprovado: mostra os temas das questões erradas (sem entregar as respostas)
    var topics = (!passed && Array.isArray(data.review)) ? data.review.filter(Boolean) : [];
    var reviewBlock = topics.length
      ? `<section class="qs-review">
          <p class="qs-review-head">O que revisar antes de tentar de novo</p>
          <ul class="qs-review-list">
            ${topics.map(function (t) {
              return `<li class="qs-review-item"><span class="qs-review-dot" aria-hidden="true"></span><span>${esc(t)}</span></li>`;
            }).join('')}
          </ul>
        </section>`
      : '';
    var scoreBar = `<div class="qs-result-scorebar" aria-label="Placar">
        <span><b>${points}</b> pts</span>
        <span class="qs-result-scorebar-dot" aria-hidden="true"></span>
        <span><b>${hits}/${total}</b> acertos</span>
        ${streak ? `<span class="qs-result-scorebar-dot" aria-hidden="true"></span><span>seq. <b>${streak}</b></span>` : ''}
      </div>`;

    if (hasTitle) {
      return `
      <article class="qs-screen is-quiz-result" data-qs-root data-type="quiz-result">
        <div class="qs-quiz-result is-pass is-title-focus medal-${esc(rank)}">
          <p class="qs-result-eyebrow">${esc(unlock.moduleLabel || 'Módulo concluído')}</p>
          <div class="qs-medal" aria-hidden="true">
            <span class="qs-medal-face">${esc(medal)}</span>
          </div>
          <p class="qs-title-earned-kicker">Título conquistado</p>
          <h2 class="qs-title-earned-name">${esc(unlock.title)}</h2>
          ${unlock.body ? `<p class="qs-title-earned-body">${esc(unlock.body)}</p>` : ''}
          ${scoreBar}
          ${cupomHTML(unlock, points)}
          ${actionsBlock}
        </div>
      </article>`;
    }

    return `
      <article class="qs-screen is-quiz-result" data-qs-root data-type="quiz-result">
        <div class="qs-quiz-result ${passed ? 'is-pass' : 'is-fail'}${topics.length ? ' has-review' : ''} medal-${esc(rank)}">
          <div class="qs-medal" aria-hidden="true">
            <span class="qs-medal-face">${esc(medal)}</span>
          </div>
          ${medalName ? `<div class="qs-medal-name">${esc(medalName)}</div>` : ''}
          <h2 class="qs-quiz-result-title">${esc(title)}</h2>
          ${scoreBar}
          <p class="qs-quiz-result-desc">${desc}</p>
          ${reviewBlock}
          ${actionsBlock}
        </div>
      </article>`;
  }

  function questionHTML(data) {
    var alts = Array.isArray(data.alternatives) ? data.alternatives.slice(0, 4) : [];
    var count = Math.max(1, alts.length);
    var hasPhoto = !!data.image;
    /* Sem foto: layout de lista (não exige imagem). Com foto: variant do data ou padrão. */
    var variant = data.variant || (hasPhoto ? '' : 'lista');
    var opts = alts.map(function (a, i) {
      return `
        <button type="button" class="qs-opt" data-tone="${i % 4}" data-id="${esc(a.id != null ? a.id : i)}" data-index="${i}">
          <span class="qs-num">${variant === 'lista' || variant === 'balanca' ? String.fromCharCode(65 + i) : i + 1}</span>
          <span class="qs-txt">${esc(a.text)}</span>
          <span class="qs-mark" aria-hidden="true"></span>
        </button>`;
    }).join('');

    var resultBanner = `
          <div class="qs-result-banner" data-qs-result role="status" aria-live="polite" hidden>
            <span data-qs-result-text></span>
          </div>`;

    var mediaBlock = hasPhoto
      ? `<div class="qs-media qs-media-hero">
          ${mediaHTML(data, { noZoom: true })}
          ${resultBanner}
        </div>`
      : `<div class="qs-q-head">
          <span class="qs-q-ico" aria-hidden="true">${esc(data.icon || '🧭')}</span>
          ${resultBanner}
        </div>`;

    return `
      <article class="qs-screen is-question${hasPhoto ? '' : ' no-photo'}" data-qs-root data-type="question"${variant ? ` data-variant="${esc(variant)}"` : ''}>
        <div class="qs-timer" aria-hidden="true"><i data-qs-timer></i></div>
        ${mediaBlock}
        <div class="qs-qbar-wrap">
          <div class="qs-qbar">${esc(data.question || '')}</div>
        </div>
        <div class="qs-opts count-${count}" data-qs-opts>
          ${opts}
        </div>
        <div class="qs-foot qs-foot-quiz">
          ${(variant === 'confirmar' || data.confirm) ? '<button type="button" class="qs-confirm" data-qs-confirm disabled>' + (variant === 'confirmar' ? 'Escolha uma ação' : 'Escolha uma resposta') + '</button>' : ''}
          <div class="qs-explain" data-qs-explain></div>
        </div>
      </article>`;
  }

  function QuestionScreen(container, data, options) {
    this.el = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = options || {};
    this.state = { answered: false, selectedIndex: null, correct: false };
    this.data = null;
    this._onClick = this._onClick.bind(this);
    this.update(data || {});
  }

  QuestionScreen.mount = function (container, data, options) {
    return new QuestionScreen(container, data, options);
  };

  QuestionScreen.prototype.update = function (data) {
    this._stopTimer();
    this.data = data || {};
    this.state.answered = false;
    this._pending = null;
    this.state.selectedIndex = null;
    this.state.correct = false;

    var type = this.data.type || 'question';
    var html = questionHTML(this.data);
    if (type === 'cover') html = coverHTML(this.data);
    else if (type === 'finale') html = finaleHTML(this.data);
    else if (type === 'content') html = contentHTML(this.data);
    else if (type === 'video') html = videoHTML(this.data);
    else if (type === 'image') html = imageHTML(this.data);
    else if (type === 'reflect') html = reflectHTML(this.data);
    else if (type === 'compare') html = compareHTML(this.data);
    else if (type === 'order') html = orderHTML(this.data);
    else if (type === 'match') html = matchHTML(this.data);
    else if (type === 'fill') html = fillHTML(this.data);
    else if (type === 'sort') html = sortHTML(this.data);
    else if (type === 'rhythm') html = rhythmHTML(this.data);
    else if (type === 'quiz-intro') html = quizIntroHTML(this.data);
    else if (type === 'quiz-result') html = quizResultHTML(this.data);

    this.el.innerHTML = html;
    this.root = this.el.querySelector('[data-qs-root]');
    this.el.removeEventListener('click', this._onClick);
    this.el.addEventListener('click', this._onClick);
    ensureLightbox();

    var lockedVideo = type === 'video' && !!(this.data.embed || this.data.panda || this.data.video);
    var interactGate = isInteractContent(this.data);
    var gated = type === 'question' || type === 'order' || type === 'match' || type === 'fill' || type === 'sort' || type === 'rhythm' || type === 'reflect' || type === 'compare' || lockedVideo || interactGate;
    if (!gated) this.state.answered = true;

    if (type === 'video' && (this.data.embed || this.data.panda || this.data.youtube || this.data.video)) {
      this._bindVideoTags();
    }
    if (type === 'reflect') this._bindReflect();
    if (type === 'compare') this._bindCompare();
    if (type === 'order') this._bindOrder();
    if (type === 'match') this._bindMatch();
    if (type === 'fill') this._bindFill();
    if (type === 'sort') this._bindSort();
    if (type === 'rhythm') this._bindRhythm();
    if (type === 'content' && this.data && this.data.steps) this._bindSteps();
    if (type === 'content' && this.data && this.data.skin === 'ficha') this._bindFicha();

    if ((type === 'question' || type === 'order') && this.options.quizScoring) {
      if (this.root) this.root.classList.add('is-timed');
      this._startTimer();
    }

    if (typeof this.options.onRender === 'function') {
      this.options.onRender(this.data, this);
    }
  };

  QuestionScreen.prototype._stopTimer = function () {
    if (this._tick) {
      clearInterval(this._tick);
      this._tick = null;
    }
  };

  QuestionScreen.prototype._startTimer = function () {
    this._stopTimer();
    var self = this;
    var total = Number(this.options.time || this.data.time || 40);
    this._tTot = total;
    this._tLeft = total;
    var bar = this.el.querySelector('[data-qs-timer]');
    if (bar) bar.style.width = '100%';
    this._tick = setInterval(function () {
      if (self.state.answered) {
        self._stopTimer();
        return;
      }
      self._tLeft -= 0.1;
      if (bar) bar.style.width = (Math.max(0, self._tLeft / self._tTot) * 100) + '%';
      if (self._tLeft <= 0) {
        self._stopTimer();
        self.timesUp();
      }
    }, 100);
  };

  QuestionScreen.prototype._quizPoints = function (correct) {
    if (!correct) return 0;
    /* Pontuação fixa por acerto: sem bônus de rapidez. */
    var max = this.options.maxPoints != null ? Number(this.options.maxPoints) : 50;
    return max;
  };

  QuestionScreen.prototype._setVideoPlaying = function (on) {
    var root = this.el.querySelector('[data-qs-root]') || this.root;
    if (root) root.classList.toggle('is-playing', !!on);
  };

  QuestionScreen.prototype._unlockVideo = function () {
    if (this._videoUnlocked) return;
    this._videoUnlocked = true;
    this._complete({ kind: 'video' });
  };

  QuestionScreen.prototype._bindVideoTags = function () {
    var self = this;
    var root = this.el;
    var native = root.querySelector('video.qs-player');
    var iframe = root.querySelector('iframe[data-qs-panda]');

    function expand() { self._setVideoPlaying(true); }
    function collapse() { self._setVideoPlaying(false); }

    var guard = {
      maxWatched: 0,
      duration: parseClock(this.data.duration),
      lockUntil: 0,
      lastWall: 0,
      lastSnapAt: 0,
      snapTimer: null,
      wasPlaying: false
    };
    this._videoGuard = guard;
    this._videoUnlocked = false;

    function isLocked() {
      return Date.now() < guard.lockUntil;
    }

    function applyTime(target) {
      try {
        if (self._pandaPlayer && self._pandaPlayer.setCurrentTime) self._pandaPlayer.setCurrentTime(target);
      } catch (e) {}
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'currentTime', parameter: target }, '*');
        }
      } catch (e) {}
      if (native) { try { native.currentTime = target; } catch (e) {} }
    }

    function resumePlay() {
      try {
        if (self._pandaPlayer && typeof self._pandaPlayer.play === 'function') self._pandaPlayer.play();
      } catch (e) {}
      if (native) {
        try {
          var p = native.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) {}
      }
      expand();
    }

    function snapBack() {
      if (self._videoUnlocked) return;
      var now = Date.now();
      var target = Math.max(0, guard.maxWatched);
      /* Trava curta: vários cliques pra frente não rearmam loop infinito. */
      guard.lockUntil = Math.max(guard.lockUntil, now + 1000);
      if (now - guard.lastSnapAt > 180) {
        guard.lastSnapAt = now;
        applyTime(target);
      }
      clearTimeout(guard.snapTimer);
      guard.snapTimer = setTimeout(function () {
        guard.lockUntil = 0;
        guard.lastWall = Date.now();
        applyTime(Math.max(0, guard.maxWatched));
        if (guard.wasPlaying) resumePlay();
      }, 1000);
    }

    function handleSeek(t) {
      if (self._videoUnlocked || isLocked()) return;
      if (typeof t === 'number' && !isNaN(t) && t > guard.maxWatched + VIDEO_SEEK_TOLERANCE) {
        snapBack();
      }
    }

    function handleTime(t, dur) {
      if (typeof dur === 'number' && dur > 0) guard.duration = dur;
      if (typeof t !== 'number' || isNaN(t)) return;
      if (self._videoUnlocked) return;
      if (isLocked()) {
        if (t > guard.maxWatched + VIDEO_SEEK_TOLERANCE && Date.now() - guard.lastSnapAt > 220) {
          guard.lastSnapAt = Date.now();
          applyTime(Math.max(0, guard.maxWatched));
        }
        return;
      }
      var now = Date.now();
      var wallDt = guard.lastWall ? Math.max(0, (now - guard.lastWall) / 1000) : 0.25;
      guard.lastWall = now;
      // só cresce no ritmo real de reprodução: seek disfarçado estoura a folga
      var allowed = guard.maxWatched + Math.min(VIDEO_TICK_TOLERANCE, wallDt * 1.4 + 0.12);
      if (t > allowed) { snapBack(); return; }
      if (t > guard.maxWatched) guard.maxWatched = t;
      if (guard.maxWatched >= unlockThreshold(guard.duration)) self._unlockVideo();
    }

    this._videoOnTime = handleTime;
    this._videoOnSeek = handleSeek;

    if (native) {
      native.addEventListener('play', function () { guard.wasPlaying = true; expand(); });
      native.addEventListener('pause', function () {
        if (!isLocked()) guard.wasPlaying = false;
        collapse();
      });
      native.addEventListener('ended', function () { collapse(); self._unlockVideo(); });
      native.addEventListener('loadedmetadata', function () { handleTime(0, native.duration); });
      native.addEventListener('seeking', function () { handleSeek(native.currentTime); });
      native.addEventListener('seeked', function () { handleSeek(native.currentTime); });
      native.addEventListener('timeupdate', function () { handleTime(native.currentTime, native.duration); });
    }

    var videoId = (String(this.data.embed || this.data.panda || '').match(/[?&]v=([0-9a-f-]{36})/i) || [])[1] || '';

    this._onVideoMsg = function (ev) {
      var data = ev && ev.data;
      if (data == null) return;
      var msg = '';
      var payload = null;
      if (typeof data === 'object') {
        payload = data;
        msg = data.message || data.event || data.type || '';
      } else if (typeof data === 'string') {
        msg = data;
        try {
          var parsed = JSON.parse(data);
          payload = parsed;
          msg = parsed.message || parsed.event || parsed.type || data;
        } catch (e) {}
      }
      msg = String(msg).toLowerCase();
      if (payload && payload.video && videoId && String(payload.video) !== videoId) return;

      var t = payload && typeof payload.currentTime === 'number' ? payload.currentTime : null;
      var dur = payload && typeof payload.duration === 'number' ? payload.duration : null;

      if (msg.indexOf('panda_play') !== -1) {
        guard.wasPlaying = true;
        expand();
        guard.lastWall = Date.now();
      }
      if (msg.indexOf('panda_pause') !== -1) {
        if (!isLocked()) guard.wasPlaying = false;
        collapse();
      }
      if (msg.indexOf('panda_ended') !== -1 || msg.indexOf('panda_complete') !== -1) {
        collapse();
        self._unlockVideo();
        return;
      }
      if (msg.indexOf('panda_seeking') !== -1 || msg.indexOf('panda_seeked') !== -1) {
        handleSeek(t);
        return;
      }
      if (msg.indexOf('panda_timeupdate') !== -1) handleTime(t, dur);
    };
    window.addEventListener('message', this._onVideoMsg);

    if (iframe && iframe.id) {
      this._ensurePandaApi(iframe.id, function (player) {
        self._pandaPlayer = player;
        try {
          var d = player.getDuration && player.getDuration();
          if (typeof d === 'number' && d > 0) guard.duration = d;
        } catch (e) {}
        guard.lastWall = Date.now();
        try {
          player.onEvent(function (e) {
            var msg = e && e.message;
            var t = e && typeof e.currentTime === 'number' ? e.currentTime : null;
            if (msg === 'panda_play') {
              guard.wasPlaying = true;
              expand();
              guard.lastWall = Date.now();
            }
            if (msg === 'panda_pause') {
              if (!isLocked()) guard.wasPlaying = false;
              collapse();
            }
            if (msg === 'panda_ended') { collapse(); self._unlockVideo(); return; }
            if (msg === 'panda_seeking' || msg === 'panda_seeked') { handleSeek(t); return; }
            if (msg === 'panda_timeupdate') {
              var dd = 0;
              try { dd = player.getDuration && player.getDuration(); } catch (err) {}
              handleTime(t, dd);
            }
          });
        } catch (err) {}
      });
    }
  };

  QuestionScreen.prototype._ensurePandaApi = function (iframeId, onReady) {
    var API = 'https://player.pandavideo.com.br/api.v2.js';
    function bind() {
      try {
        if (typeof PandaPlayer === 'undefined') return;
        var player = new PandaPlayer(iframeId, {
          onReady: function () { onReady(player); }
        });
      } catch (err) {}
    }
    window.pandascripttag = window.pandascripttag || [];
    window.pandascripttag.push(bind);
    if (!document.querySelector('script[src="' + API + '"]')) {
      var s = document.createElement('script');
      s.src = API;
      s.async = true;
      document.head.appendChild(s);
    } else if (typeof PandaPlayer !== 'undefined') {
      bind();
    }
  };

  QuestionScreen.prototype._onClick = function (e) {
    var zoomBtn = e.target.closest('[data-qs-zoom]');
    if (zoomBtn) {
      e.preventDefault();
      e.stopPropagation();
      var zImg = zoomBtn.parentNode && zoomBtn.parentNode.querySelector('img');
      openLightbox(zoomBtn.getAttribute('data-qs-zoom'), zImg ? zImg.alt : '');
      return;
    }
    var cmCopy = e.target.closest('[data-qs-copy]');
    if (cmCopy) {
      var mail = cmCopy.getAttribute('data-qs-copy');
      var okCopy = function () {
        beep('ok');
        cmCopy.classList.add('is-copied');
        cmCopy.textContent = '✓ Copiado!';
        setTimeout(function () { cmCopy.classList.remove('is-copied'); cmCopy.textContent = 'Copiar e-mail'; }, 2200);
      };
      var fallbackCopy = function () {
        var ta = document.createElement('textarea');
        ta.value = mail; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta);
        okCopy();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(okCopy, fallbackCopy); else fallbackCopy();
      return;
    }
    var cmNext = e.target.closest('[data-qs-cmnext]');
    if (cmNext) {
      var cRoot = cmNext.closest('[data-qs-cmroot]');
      if (cRoot.classList.contains('is-complete')) return;
      var cStops = cRoot.querySelectorAll('[data-qs-cm]');
      var cCur = 0;
      cStops.forEach(function (r, i) { if (r.classList.contains('is-on')) cCur = i; });
      if (cCur < cStops.length - 1) {
        beep('click');
        cmSelect(cRoot, cCur + 1);
      } else {
        beep('end');
        cRoot.classList.add('is-complete');
        var cDone = document.createElement('div');
        cDone.className = 'qs-ac-done';
        cDone.setAttribute('role', 'status');
        cDone.innerHTML = '<span class="qs-ac-done-ico" aria-hidden="true">✓</span><span class="qs-ac-done-txt"><b>Concluído!</b> Você já sabe onde achar os manuais. Siga para a próxima página.</span>';
        cmNext.replaceWith(cDone);
        this._complete({ kind: 'caminho' });
      }
      return;
    }
    var muNext = e.target.closest('[data-qs-munext]');
    if (muNext) {
      var mRoot = muNext.closest('[data-qs-muroot]');
      if (mRoot.classList.contains('is-complete')) return;
      var mCards = mRoot.querySelectorAll('[data-qs-mu]');
      var mCur = 0;
      mCards.forEach(function (r, i) { if (r.classList.contains('is-on')) mCur = i; });
      if (mCur < mCards.length - 1) {
        beep('click');
        muSelect(mRoot, mCur + 1);
      } else {
        beep('end');
        mRoot.classList.add('is-complete');
        mCards.forEach(function (r) { r.classList.add('is-seen'); });
        var mDone = document.createElement('div');
        mDone.className = 'qs-ac-done';
        mDone.setAttribute('role', 'status');
        mDone.innerHTML = '<span class="qs-ac-done-ico" aria-hidden="true">✓</span><span class="qs-ac-done-txt"><b>Concluído!</b> Você viu todas as dicas. Siga para a próxima página.</span>';
        muNext.replaceWith(mDone);
        this._complete({ kind: 'mural' });
      }
      return;
    }
    var muCard = e.target.closest('[data-qs-mu]');
    if (muCard) {
      var mRoot2 = muCard.closest('[data-qs-muroot]');
      if (!muCard.classList.contains('is-on') && !mRoot2.classList.contains('is-complete')) {
        beep('click');
        muSelect(mRoot2, +muCard.getAttribute('data-qs-mu'));
      }
      return;
    }
    var acNext = e.target.closest('[data-qs-acnext]');
    if (acNext) {
      var aRoot = acNext.closest('[data-qs-acroot]');
      if (aRoot.classList.contains('is-complete')) return;
      var aItems = aRoot.querySelectorAll('[data-qs-ac]');
      var aCur = 0;
      aItems.forEach(function (r, i) { if (r.classList.contains('is-on')) aCur = i; });
      if (aCur < aItems.length - 1) {
        beep('click');
        acSelect(aRoot, aCur + 1);
      } else {
        beep('end');
        aRoot.classList.add('is-complete');
        aItems.forEach(function (r) { r.classList.add('is-seen'); });
        var aDone = document.createElement('div');
        aDone.className = 'qs-ac-done';
        aDone.setAttribute('role', 'status');
        aDone.innerHTML = '<span class="qs-ac-done-ico" aria-hidden="true">✓</span><span class="qs-ac-done-txt"><b>Concluído!</b> Siga para a próxima página.</span>';
        acNext.replaceWith(aDone);
        this._complete({ kind: 'acordeao' });
      }
      return;
    }
    var acItem = e.target.closest('[data-qs-ac]');
    if (acItem) {
      var aRoot2 = acItem.closest('[data-qs-acroot]');
      if (!acItem.classList.contains('is-on')) {
        beep('click');
        acSelect(aRoot2, +acItem.getAttribute('data-qs-ac'));
      }
      return;
    }
    var lfNext = e.target.closest('[data-qs-lfnext]');
    if (lfNext) {
      var nRoot = lfNext.closest('[data-qs-lfroot]');
      if (nRoot.classList.contains('is-complete')) return;
      var rowsAll = nRoot.querySelectorAll('[data-qs-lf]');
      var cur = 0;
      rowsAll.forEach(function (r, i) { if (r.classList.contains('is-on')) cur = i; });
      if (cur < rowsAll.length - 1) {
        beep('click');
        lfSelect(nRoot, cur + 1);
      } else {
        beep('end');
        nRoot.classList.add('is-complete');
        rowsAll.forEach(function (r) { r.classList.add('is-seen'); });
        lfNext.disabled = true;
        lfNext.innerHTML = '✓ Concluído';
        var nHelp = nRoot.querySelector('.qs-lf-help span:last-child');
        if (nHelp) nHelp.textContent = 'Muito bem! Você viu todas as regras desta parte. Use a seta para seguir para a próxima página.';
        this._complete({ kind: 'lista-foto' });
      }
      return;
    }
    var lfRow = e.target.closest('[data-qs-lf]');
    if (lfRow) {
      var lfRoot = lfRow.closest('[data-qs-lfroot]');
      var lfIdx = +lfRow.getAttribute('data-qs-lf');
      if (!lfRow.classList.contains('is-on')) {
        beep('click');
        lfSelect(lfRoot, lfIdx);
      }
      return;
    }
    var fz = e.target.closest('.qs-fz');
    if (fz) {
      beep('flip');
      var fzOn = fz.classList.toggle('is-flip');
      fz.setAttribute('aria-pressed', fzOn ? 'true' : 'false');
      if (fzOn) fz.classList.add('is-seen');
      return;
    }
    var znTab = e.target.closest('[data-qs-zona]');
    if (znTab) {
      var znRoot = znTab.closest('[data-qs-zonasroot]');
      var znIdx = znTab.getAttribute('data-qs-zona');
      if (!znTab.classList.contains('is-on')) {
        beep('click');
        znRoot.querySelectorAll('[data-qs-zona]').forEach(function (t) {
          var on = t === znTab;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        znRoot.querySelectorAll('[data-zona-panel]').forEach(function (p) {
          var on = p.getAttribute('data-zona-panel') === znIdx;
          p.classList.toggle('is-on', on);
          p.hidden = !on;
        });
      }
      return;
    }
    var deckChk = e.target.closest('[data-qs-check]');
    if (deckChk) {
      if (!deckChk.disabled) {
        var checkDone = deckCheck(deckChk.closest('[data-qs-deckroot]'));
        beep(checkDone ? 'end' : 'click');
        if (checkDone) this._complete({ kind: 'checklist' });
      }
      return;
    }
    var deckTab = e.target.closest('[data-qs-deck]');
    var deckStep = e.target.closest('[data-qs-deck-step]');
    if (deckTab && deckTab.classList.contains('is-locked')) return;
    if (deckTab || deckStep) {
      beep('click');
      var dRoot = (deckTab || deckStep).closest('[data-qs-deckroot]');
      var cur = 0;
      dRoot.querySelectorAll('.qs-deck-card').forEach(function (c, i) { if (c.classList.contains('is-current')) cur = i; });
      deckShow(dRoot, deckTab ? +deckTab.getAttribute('data-qs-deck') : cur + (+deckStep.getAttribute('data-qs-deck-step')));
      return;
    }
    var qc = e.target.closest('.qs-qc');
    if (qc) {
      beep('click');
      var flip = qc.classList.toggle('is-flip');
      qc.setAttribute('aria-pressed', flip ? 'true' : 'false');
      if (flip) {
        qc.classList.add('is-seen');
        var dIdx = qc.getAttribute('data-deck-i');
        if (dIdx != null) {
          var dTab = this.el.querySelector('.qs-deck-tab[data-qs-deck="' + dIdx + '"]');
          if (dTab) dTab.classList.add('is-seen');
        }
      }
      return;
    }
    var opt = e.target.closest('.qs-opt');
    var start = e.target.closest('[data-qs-start]');
    var retry = e.target.closest('[data-qs-retry]');
    var finish = e.target.closest('[data-qs-finish]');
    var conf = e.target.closest('[data-qs-confirm]');
    if (conf) {
      if (!this.state.answered && this._pending != null) {
        beep('click');
        var pend = this._pending;
        this._pending = null;
        this.select(pend);
      }
      return;
    }
    /* variante 'confirmar': o 1º toque escolhe, o botão de baixo confirma (dá para trocar de ideia) */
    if (opt && !this.state.answered && (this.data.variant === 'confirmar' || this.data.confirm)) {
      beep('click');
      this._pending = +opt.dataset.index;
      this.el.querySelectorAll('.qs-opt').forEach(function (b) { b.classList.toggle('is-selected', b === opt); });
      var cb = this.el.querySelector('[data-qs-confirm]');
      if (cb) { cb.disabled = false; cb.textContent = this.data.variant === 'confirmar' ? 'Confirmar esta decisão' : 'Confirmar resposta'; }
      return;
    }
    if (opt && !this.state.answered) {
      beep('click');
      this.select(+opt.dataset.index);
      return;
    }
    if (start || retry || finish) {
      beep('click');
      if (typeof this.options.onContinue === 'function') {
        this.options.onContinue({
          data: this.data,
          action: start ? 'start' : (retry ? 'retry' : 'finish')
        });
      }
    }
  };

  QuestionScreen.prototype.timesUp = function () {
    if (this.state.answered) return;
    if (this.data.type === 'order') {
      this._finishOrder(true);
      return;
    }
    this.select(-1, { timedOut: true });
  };

  QuestionScreen.prototype._complete = function (info) {
    if (this.state.answered && this.data.type !== 'match') return;
    this.state.answered = true;
    this._stopTimer();
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(Object.assign({
        correct: true,
        points: 0,
        timedOut: false,
        data: this.data
      }, info || {}));
    }
  };

  QuestionScreen.prototype._bindReflect = function () {
    var self = this;
    var root = this.el;
    var card = root.querySelector('.qs-reflect');
    var answer = root.querySelector('[data-qs-answer]');
    var choices = Array.isArray(this.data.choices) ? this.data.choices : [];
    var hasCorrect = choices.some(function (c) { return !!c.correct; });

    function reveal(btn, ok) {
      if (btn) {
        btn.classList.add(ok ? 'is-correct' : 'is-wrong');
        btn.classList.add('is-chosen');
      }
      if (ok) {
        if (card) card.classList.add('is-revealed');
        if (answer) {
          answer.hidden = false;
          answer.classList.add('show');
        }
        var tap = root.querySelector('[data-qs-reveal]');
        if (tap) tap.hidden = true;
        root.querySelectorAll('[data-qs-choice]').forEach(function (b) {
          b.disabled = true;
          var idx = Number(b.getAttribute('data-qs-choice'));
          if (choices[idx] && choices[idx].correct) b.classList.add('is-correct');
        });
        if (!self.state.answered) {
          beep(hasCorrect ? 'ok' : 'pensar');
          self._complete({ kind: 'reflect', correct: true });
        }
      } else {
        beep('nok');
        window.setTimeout(function () {
          if (btn) {
            btn.classList.remove('is-wrong', 'is-chosen');
            btn.disabled = false;
          }
        }, 700);
      }
    }

    root.querySelectorAll('[data-qs-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (self.state.answered || btn.disabled) return;
        var idx = Number(btn.getAttribute('data-qs-choice'));
        var ok = hasCorrect ? !!(choices[idx] && choices[idx].correct) : true;
        if (hasCorrect) beep('click');
        reveal(btn, ok);
      });
    });
    var tap = root.querySelector('[data-qs-reveal]');
    if (tap) {
      tap.addEventListener('click', function () {
        if (self.state.answered) return;
        reveal(tap, true);
      });
    }
  };

  QuestionScreen.prototype._bindCompare = function () {
    var self = this;
    if (this.data && this.data.open) {
      self._complete({ kind: 'compare' });
      return;
    }
    var opened = {};
    var cols = this.el.querySelectorAll('[data-qs-compare]');
    cols.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (e.target.closest('[data-qs-zoom]')) return;
        if (btn.classList.contains('is-open')) return;
        btn.classList.add('is-open');
        beep('click');
        var hint = btn.querySelector('.qs-compare-hint');
        var reveal = btn.querySelector('.qs-compare-reveal');
        if (hint) hint.hidden = true;
        if (reveal) reveal.hidden = false;
        opened[btn.getAttribute('data-qs-compare')] = true;
        if (Object.keys(opened).length >= cols.length) {
          beep('ok');
          self._complete({ kind: 'compare' });
        }
      });
    });
  };

  QuestionScreen.prototype._bindFicha = function () {
    this._complete({ kind: 'ficha' });
  };

  QuestionScreen.prototype._bindSteps = function () {
    var self = this;
    var root = this.el.querySelector('[data-qs-steps]');
    if (!root) return;
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-qs-step]'));
    var count = root.querySelector('[data-qs-step-count]');
    var prev = root.querySelector('[data-qs-step-prev]');
    var next = root.querySelector('[data-qs-step-next]');
    var unit = root.getAttribute('data-step-unit') || 'Exercício';
    var nextLbl = root.getAttribute('data-step-next') || 'Próximo exercício';
    var finishLbl = root.getAttribute('data-step-finish') || 'Concluir sequência';
    var i = 0;
    var total = slides.length;
    var farthest = 0; // só avança em ordem; não dá para pular exercício

    /* Exercícios com tempo e repetições: botão "Fazer agora" com anel de contagem. Não trava o avanço. */
    var exStops = [];
    function exAttach(slide) {
      var info = slide.querySelector('.qs-step-info');
      if (!info) return;
      var secs = 0, reps = 0, lado = false;
      slide.querySelectorAll('.qs-dose').forEach(function (d) {
        var t = d.textContent;
        var m1 = t.match(/^(\d+)\s*s$/i);
        var m2 = t.match(/×\s*(\d+)/);
        if (m1) secs = +m1[1];
        if (m2) reps = +m2[1];
      });
      if (/cada/i.test(info.textContent)) lado = true;
      if (!secs && !reps) return;
      var wrap = document.createElement('div');
      wrap.className = 'qs-ex';
      var R = 17, C = 2 * Math.PI * R;
      wrap.innerHTML = '<button type="button" class="qs-ex-btn"><svg class="qs-ex-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="bg" cx="20" cy="20" r="' + R + '"/><circle class="fg" cx="20" cy="20" r="' + R + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '"/></svg><span class="qs-ex-lbl"></span></button><span class="qs-ex-dots"></span>';
      info.appendChild(wrap);
      var btn = wrap.querySelector('.qs-ex-btn');
      var lbl = wrap.querySelector('.qs-ex-lbl');
      var fg = wrap.querySelector('.fg');
      var dotsEl = wrap.querySelector('.qs-ex-dots');
      var rounds = reps || 1;
      for (var q = 0; q < rounds && rounds > 1; q++) dotsEl.appendChild(document.createElement('i'));
      var iv = 0, count = 0, running = false, t0 = 0, round = 0, pausa = false, pausaMsg = '', lastSec = -1;

      /* contador grande sobre a foto: anel + segundos rolando + aviso (Prepare-se, Troque de lado, Feito) */
      var media = slide.querySelector('.qs-step-media') || info;
      var big = document.createElement('div');
      big.className = 'qs-ex-big';
      big.setAttribute('aria-hidden', 'true');
      big.innerHTML = '<span class="dial"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="' + R + '"/><circle class="fg" cx="20" cy="20" r="' + R + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '"/></svg><b class="n"></b></span><span class="m"></span>';
      wrap.appendChild(big);   /* fica no painel de texto, abaixo do botão — não cobre a foto */
      big.addEventListener('click', function () { btn.click(); });   /* durante a contagem o cartão roxo é o botão */
      var bigFg = big.querySelector('.fg'), bigN = big.querySelector('.n'), bigM = big.querySelector('.m');
      function bigShow(n, msg, ring) {
        bigN.textContent = n; bigM.textContent = msg;
        bigFg.style.strokeDashoffset = (C * (1 - ring)).toFixed(2);
      }

      function setRing(p) { fg.style.strokeDashoffset = (C * (1 - p)).toFixed(2); }
      function stop() { if (iv) { clearInterval(iv); iv = 0; } }
      function idle() {
        running = false; pausa = false; pausaMsg = ''; lastSec = -1; stop(); count = 0; round = 0;
        wrap.classList.remove('is-run', 'is-done');
        slide.classList.remove('is-breathing', 'is-counting');
        big.classList.remove('is-lead', 'is-last', 'is-ok');
        setRing(0);
        dotsEl.querySelectorAll('i').forEach(function (d) { d.classList.remove('on'); });
        lbl.textContent = secs ? 'Fazer agora · ' + secs + ' s' + (rounds > 1 ? ' × ' + rounds : '') : 'Contar repetições · 0 de ' + rounds;
      }
      function done() {
        running = false; stop();
        wrap.classList.remove('is-run'); wrap.classList.add('is-done');
        slide.classList.remove('is-breathing');
        setRing(1); lbl.textContent = '✓ Feito!';
        big.classList.remove('is-lead', 'is-last'); big.classList.add('is-ok');
        bigShow('✓', 'Feito! · toque para repetir', 1);
        beep('ok');
      }
      /* relógio por setInterval (não depende de requestAnimationFrame, que para em aba oculta) */
      function tick() {
        if (!running) return;
        var now = performance.now();
        if (pausa) {
          if (now < t0) {
            var left = Math.ceil((t0 - now) / 1000);
            if (pausaMsg === 'lead') {
              bigShow(left, 'Prepare-se', 1 - (t0 - now) / 3000);
              if (left !== lastSec) { lastSec = left; beep('tick'); }
            }
            return;
          }
          pausa = false;
          big.classList.remove('is-lead');
          if (pausaMsg === 'lead') beep('click');
          pausaMsg = ''; lastSec = -1;
        }
        var p = Math.min(1, (now - t0) / (secs * 1000));
        setRing(p);
        var faltam = Math.max(0, Math.ceil(secs - (now - t0) / 1000));
        lbl.textContent = 'Faltam ' + faltam + ' s' + (rounds > 1 ? ' · ' + (round + 1) + ' de ' + rounds : '');
        bigShow(faltam, (rounds > 1 ? 'Repetição ' + (round + 1) + ' de ' + rounds : 'Segure') + ' · ' + secs + ' s', p);
        big.classList.toggle('is-last', faltam <= 3 && faltam > 0);
        if (faltam > 0 && faltam !== lastSec) { lastSec = faltam; beep(faltam <= 3 ? 'tick' : 'seg'); }
        if (p >= 1) {
          var d = dotsEl.querySelectorAll('i')[round]; if (d) d.classList.add('on');
          round++;
          if (round >= rounds) { done(); return; }
          beep('click');
          pausa = true; pausaMsg = 'troca'; lastSec = -1;
          t0 = now + 1200; /* pausa curta entre as repetições */
          setRing(0);
          lbl.textContent = lado ? 'Troque de lado' : 'Mais uma vez';
          big.classList.remove('is-last');
          bigShow(lado ? '⇄' : '↻', lbl.textContent, 0);
        }
      }
      btn.addEventListener('click', function () {
        if (wrap.classList.contains('is-done')) { idle(); return; }
        if (secs) {
          if (running) { idle(); return; }
          beep('click');
          running = true; round = 0; wrap.classList.add('is-run'); slide.classList.add('is-breathing', 'is-counting');
          /* 3 segundos de preparo antes de começar a contar */
          pausa = true; pausaMsg = 'lead'; lastSec = -1; big.classList.add('is-lead');
          lbl.textContent = 'Prepare-se';
          t0 = performance.now() + 3000; stop(); iv = setInterval(tick, 100); tick();
          /* no celular o cartão pode ficar abaixo da dobra: rola até ele */
          setTimeout(function () { if (big.scrollIntoView) big.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, 80);
        } else {
          beep('click');
          count++;
          setRing(count / rounds);
          var dd = dotsEl.querySelectorAll('i')[count - 1]; if (dd) dd.classList.add('on');
          lbl.textContent = 'Contar repetições · ' + count + ' de ' + rounds;
          slide.classList.add('is-counting');
          bigShow(count, 'de ' + rounds + ' repetições · toque a cada uma', count / rounds);
          if (count === 1) setTimeout(function () { if (big.scrollIntoView) big.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, 80);
          if (count >= rounds) done();
        }
      });
      idle();
      exStops.push(idle);
    }
    slides.forEach(exAttach);

    function paint() {
      slides.forEach(function (s, k) {
        var on = k === i;
        s.classList.toggle('is-on', on);
        s.hidden = !on;
      });
      exStops.forEach(function (f) { f(); });
      if (count) count.textContent = unit + ' ' + (i + 1) + ' de ' + total;
      if (prev) prev.hidden = i <= 0;

      if (!next) return;
      /* Depois de concluir, ainda dá para folhear; só some o botão
         de concluir no último slide (já foi). No 1º slide o Próximo
         precisa continuar visível — senão some junto com o Anterior. */
      if (i < total - 1) {
        next.hidden = false;
        next.textContent = nextLbl;
        next.classList.remove('is-finish');
        return;
      }
      if (self.state.answered) {
        next.hidden = true;
        return;
      }
      next.hidden = false;
      next.textContent = finishLbl;
      next.classList.add('is-finish');
    }

    function goTo(n) {
      if (n < 0 || n >= total) return;
      /* Só permite voltar ou avançar um a um até onde já chegou —
         assim a seta da página não libera sem ver tudo. */
      if (n > farthest + 1) return;
      i = n;
      farthest = Math.max(farthest, i);
      paint();
    }

    if (prev) {
      prev.addEventListener('click', function () {
        beep('click');
        goTo(i - 1);
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        beep('click');
        if (i < total - 1) {
          goTo(i + 1);
          return;
        }
        if (!self.state.answered) {
          beep('ok');
          root.classList.add('is-done');
          self._complete({ kind: 'steps' });
          paint();
        }
      });
    }
    paint();
  };

  QuestionScreen.prototype._bindOrder = function () {
    var self = this;
    this._seqTapped = [];
    this._seqTries = 0;
    var maxTries = Math.max(1, Number(this.data.tries) || 5);
    var retryBtn = this.el.querySelector('[data-qs-seq-retry]');

    function resetRound() {
      self._seqTapped = [];
      self.state.answered = false;
      var root = self.el.querySelector('[data-qs-root]') || self.root;
      if (root) root.classList.remove('is-feedback');
      var fb = self.el.querySelector('[data-qs-seq-fb]');
      if (fb) { fb.hidden = true; fb.textContent = ''; fb.className = 'qs-seq-fb'; }
      if (retryBtn) retryBtn.hidden = true;
      var prog = self.el.querySelector('[data-qs-seq-progress]');
      var total = (self.data.items || []).length;
      if (prog) prog.textContent = '0 de ' + total + ' selecionados';
      self.el.querySelectorAll('[data-qs-seq]').forEach(function (btn) {
        btn.classList.remove('is-picked');
        btn.style.pointerEvents = '';
        var badge = btn.querySelector('.qs-seq-badge');
        if (badge) badge.textContent = '';
      });
      if (self.options.quizScoring) self._startTimer();
    }

    this.el.querySelectorAll('[data-qs-seq]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (self.state.answered || btn.classList.contains('is-picked')) return;
        beep('click');
        var key = btn.getAttribute('data-qs-seq');
        self._seqTapped.push(key);
        btn.classList.add('is-picked');
        var badge = btn.querySelector('.qs-seq-badge');
        if (badge) badge.textContent = String(self._seqTapped.length);
        var prog = self.el.querySelector('[data-qs-seq-progress]');
        var total = (self.data.items || []).length;
        if (prog) prog.textContent = self._seqTapped.length + ' de ' + total + ' selecionados';
        if (self._seqTapped.length >= total) self._finishOrder(false);
      });
    });

    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        beep('click');
        resetRound();
      });
    }
    this._orderMaxTries = maxTries;
  };

  QuestionScreen.prototype._finishOrder = function (timedOut) {
    if (this.state.answered) return;
    this._stopTimer();
    var items = this.data.items || [];
    var expected = items.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (it) { return it.key; });
    var tapped = this._seqTapped || [];
    var correct = !timedOut && tapped.length === expected.length;
    if (correct) {
      for (var i = 0; i < expected.length; i++) {
        if (tapped[i] !== expected[i]) { correct = false; break; }
      }
    }
    this.el.querySelectorAll('[data-qs-seq]').forEach(function (c) {
      c.classList.add('is-picked');
      c.style.pointerEvents = 'none';
    });
    var fb = this.el.querySelector('[data-qs-seq-fb]');
    var retryBtn = this.el.querySelector('[data-qs-seq-retry]');
    var root = this.el.querySelector('[data-qs-root]') || this.root;
    if (root) root.classList.add('is-feedback');

    function shortLabel(it) {
      var t = String(it.text || '');
      var cut = t.split('—')[0].split('–')[0].split(' - ')[0].trim();
      return cut.length > 48 ? cut.slice(0, 46) + '…' : cut;
    }
    var listHtml = items.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (it) {
      return '<li>' + esc(shortLabel(it)) + '</li>';
    }).join('');

    if (correct) {
      if (fb) {
        fb.hidden = false;
        fb.className = 'qs-seq-fb is-ok';
        fb.innerHTML = 'Ordem certa!';
      }
      if (retryBtn) retryBtn.hidden = true;
      var pts = this.options.quizScoring ? this._quizPoints(true) : 0;
      beep('ok');
      this._complete({ kind: 'order', correct: true, points: pts, timedOut: false });
      return;
    }

    this._seqTries = (this._seqTries || 0) + 1;
    var maxTries = this._orderMaxTries || 5;
    var prefix = timedOut ? 'Tempo esgotado.' : 'Ordem incorreta.';
    var triesTxt = this._seqTries < maxTries
      ? ' Tentativa ' + this._seqTries + ' de ' + maxTries + '.'
      : '';
    if (fb) {
      fb.hidden = false;
      fb.className = 'qs-seq-fb is-nok';
      fb.innerHTML = esc(prefix) + triesTxt +
        '<ol class="qs-seq-fb-list" aria-label="Ordem correta">' + listHtml + '</ol>';
    }
    beep('nok');

    if (this._seqTries < maxTries) {
      if (retryBtn) retryBtn.hidden = false;
      return;
    }
    if (retryBtn) retryBtn.hidden = true;
    var pts0 = 0;
    this._complete({ kind: 'order', correct: false, points: pts0, timedOut: !!timedOut });
  };

  QuestionScreen.prototype._bindFill = function () {
    var self = this;
    var text = String(this.data.text || '');
    var answers = [];
    text.replace(/\{\{(.*?)\}\}/g, function (_, a) { answers.push(a); return ''; });
    var words = answers.concat(Array.isArray(this.data.extra) ? this.data.extra : []);
    var bank = shuffle(words.map(function (w, i) { return { id: i, label: w }; }));
    var filled = answers.map(function () { return null; });   // id da palavra em cada lacuna
    var locked = answers.map(function () { return false; });
    var slots = this.el.querySelectorAll('[data-qs-slot]');
    var bankEl = this.el.querySelector('[data-qs-fill-bank]');
    var fb = this.el.querySelector('[data-qs-fill-fb]');
    var done = false;
    var busy = false;

    function labelOf(id) { for (var i = 0; i < bank.length; i++) if (bank[i].id === id) return bank[i].label; return ''; }
    function render() {
      slots.forEach(function (s, i) {
        var id = filled[i];
        s.textContent = id == null ? '' : labelOf(id);
        s.classList.toggle('is-filled', id != null);
        s.classList.toggle('is-locked', !!locked[i]);
      });
      bankEl.innerHTML = '';
      bank.forEach(function (w) {
        var used = filled.indexOf(w.id) >= 0;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'qs-fill-chip' + (used ? ' is-used' : '');
        b.textContent = w.label;
        b.disabled = used || done;
        b.addEventListener('click', function () { place(w.id); });
        bankEl.appendChild(b);
      });
    }
    function place(id) {
      if (done || busy) return;
      var at = filled.indexOf(null);
      if (at < 0) return;
      filled[at] = id;
      render();
      /* confere na hora: acerto trava verde, erro fica vermelho e a palavra volta para o banco */
      if (labelOf(id) === answers[at]) {
        locked[at] = true;
        beep('ok');
        render();
        if (fb) { fb.hidden = true; }
        if (locked.every(Boolean)) {
          done = true;
          render();
          if (fb) { fb.hidden = false; fb.className = 'qs-fill-fb is-ok'; fb.textContent = 'Frase completa!'; }
          var max = self.options.maxPoints != null ? Number(self.options.maxPoints) : 50;
          setTimeout(function () { beep('end'); self._complete({ kind: 'fill', correct: true, points: max }); }, 350);
        }
      } else {
        busy = true;
        beep('nok');
        slots[at].classList.add('is-wrong');
        if (fb) { fb.hidden = false; fb.className = 'qs-fill-fb is-nok'; fb.textContent = '“' + labelOf(id) + '” não é a palavra desta lacuna. Tente outra.'; }
        setTimeout(function () {
          filled[at] = null;
          slots[at].classList.remove('is-wrong');
          busy = false;
          render();
        }, 1100);
      }
    }
    slots.forEach(function (s, i) {
      s.addEventListener('click', function () {
        if (done || locked[i] || filled[i] == null) return;
        filled[i] = null;
        beep('click');
        render();
      });
    });
    render();
  };

  QuestionScreen.prototype._bindSort = function () {
    var self = this;
    var items = shuffle((this.data.items || []).slice());
    var idx = 0;
    var tries = 0;
    var busy = false;
    var cardEl = this.el.querySelector('[data-qs-sort-card]');
    var prog = this.el.querySelector('[data-qs-sort-progress]');
    var fb = this.el.querySelector('[data-qs-sort-fb]');
    var buckets = this.el.querySelectorAll('[data-qs-sort-side]');
    var leftLabel = this.data.leftLabel || '';
    var rightLabel = this.data.rightLabel || '';

    function clearFb() {
      if (!fb) return;
      fb.className = 'qs-sort-fb';
      fb.textContent = '';
    }
    function setBuckets(disabled) {
      buckets.forEach(function (b) { b.disabled = !!disabled; });
    }
    /* tempo pra ler o “why”; sem why, só o ✓ Faça/Evite */
    function readDelay(it) {
      var why = it && it.why ? String(it.why) : '';
      if (!why) return 1200;
      return Math.min(2800, Math.max(1600, 900 + why.length * 28));
    }
    function show() {
      if (idx >= items.length) return;
      busy = false;
      clearFb();
      setBuckets(false);
      cardEl.textContent = items[idx].text;
      cardEl.classList.remove('is-out', 'is-shake', 'to-left', 'to-right');
      void cardEl.offsetWidth;
      cardEl.classList.add('is-in');
      if (prog) prog.textContent = (idx + 1) + ' de ' + items.length;
    }
    function answer(side) {
      if (busy || self.state.answered || idx >= items.length) return;
      var it = items[idx];
      if (it.side === side) {
        busy = true;
        setBuckets(true);
        beep('ok');
        cardEl.classList.remove('is-in');
        cardEl.classList.add('is-out', side === 'left' ? 'to-left' : 'to-right');
        if (fb) {
          fb.className = 'qs-sort-fb is-ok';
          fb.textContent = '✓ ' + (side === 'left' ? leftLabel : rightLabel) + (it.why ? ': ' + it.why : '');
        }
        idx++;
        var delay = readDelay(it);
        if (idx >= items.length) {
          if (prog) prog.textContent = items.length + ' de ' + items.length;
          var max = self.options.maxPoints != null ? Number(self.options.maxPoints) : 50;
          setTimeout(function () {
            clearFb();
            beep('end');
            self._complete({ kind: 'sort', correct: true, points: max, tries: tries });
          }, delay);
        } else {
          setTimeout(show, delay);
        }
      } else {
        tries++;
        beep('nok');
        cardEl.classList.remove('is-shake');
        void cardEl.offsetWidth;
        cardEl.classList.add('is-shake');
        if (fb) {
          fb.className = 'qs-sort-fb is-nok';
          fb.textContent = 'Ainda não. Pense de novo e escolha o outro grupo.';
        }
      }
    }
    buckets.forEach(function (b) {
      b.addEventListener('click', function () { answer(b.getAttribute('data-qs-sort-side')); });
    });
    show();
  };

  QuestionScreen.prototype._bindMatch = function () {
    var self = this;
    var pairs = this.data.pairs || [];
    var exOrder = pairs.map(function (_, i) { return i; });
    var bodyOrder = shuffle(exOrder);
    var matched = {};
    var matchedCount = 0;
    var selectedEx = null;
    var selectedBody = null;
    var elapsed = 0;
    this._matchTick = setInterval(function () {
      elapsed += 1;
      var el = self.el.querySelector('[data-qs-match-time]');
      if (el) el.textContent = '⏱️ ' + elapsed + 's';
    }, 1000);

    function render() {
      var exCol = self.el.querySelector('[data-qs-match-ex]');
      var bodyCol = self.el.querySelector('[data-qs-match-body]');
      if (!exCol || !bodyCol) return;
      exCol.innerHTML = '';
      bodyCol.innerHTML = '';
      exOrder.forEach(function (id) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qs-match-item' + (matched[id] ? ' is-matched' : '');
        btn.textContent = pairs[id].ex;
        if (matched[id]) btn.disabled = true;
        btn.addEventListener('click', function () { pick('ex', id, btn); });
        exCol.appendChild(btn);
      });
      bodyOrder.forEach(function (id) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qs-match-item' + (matched[id] ? ' is-matched' : '');
        btn.textContent = pairs[id].body;
        if (matched[id]) btn.disabled = true;
        btn.addEventListener('click', function () { pick('body', id, btn); });
        bodyCol.appendChild(btn);
      });
      var prog = self.el.querySelector('[data-qs-match-progress]');
      if (prog) prog.textContent = matchedCount + ' de ' + pairs.length + ' pares';
    }

    function clearSel() {
      self.el.querySelectorAll('.qs-match-item').forEach(function (el) { el.classList.remove('is-selected'); });
      selectedEx = null;
      selectedBody = null;
    }

    function pick(side, id, btn) {
      if (matched[id] || self.state.answered) return;
      beep('click');
      var sel = side === 'ex' ? '[data-qs-match-ex] .qs-match-item' : '[data-qs-match-body] .qs-match-item';
      self.el.querySelectorAll(sel).forEach(function (el) { el.classList.remove('is-selected'); });
      btn.classList.add('is-selected');
      if (side === 'ex') selectedEx = id;
      else selectedBody = id;
      if (selectedEx == null || selectedBody == null) return;
      if (selectedEx === selectedBody) {
        matched[selectedEx] = true;
        matchedCount += 1;
        clearSel();
        render();
        if (matchedCount >= pairs.length) {
          if (self._matchTick) { clearInterval(self._matchTick); self._matchTick = null; }
          var max = self.options.maxPoints != null ? Number(self.options.maxPoints) : 50;
          var pts = max;
          beep('end');
          self._complete({ kind: 'match', correct: true, points: pts, elapsed: elapsed });
        } else {
          beep('ok');
        }
      } else {
        beep('nok');
        var a = self.el.querySelector('[data-qs-match-ex] .is-selected');
        var b = self.el.querySelector('[data-qs-match-body] .is-selected');
        [a, b].forEach(function (el) {
          if (!el) return;
          el.classList.add('is-wrong');
          setTimeout(function () { el.classList.remove('is-wrong'); }, 400);
        });
        setTimeout(clearSel, 420);
      }
    }

    render();
  };

  QuestionScreen.prototype._bindRhythm = function () {
    var self = this;
    var d = this.data;
    var min = Number(d.bpmMin) || 100;
    var max = Number(d.bpmMax) || 120;
    var guide = Number(d.guideBpm) || Math.round((min + max) / 2);
    var need = Math.max(5, Number(d.taps) || 8);
    var maxTries = Math.max(1, Number(d.tries) || 5);
    var tol = d.tolerance != null ? Number(d.tolerance) : 10;   /* folga: aceita um pouco antes/depois da faixa */
    var sMin = Number(d.scaleMin) || 60;
    var sMax = Number(d.scaleMax) || 160;
    var el = this.el;
    var wrap = el.querySelector('.qs-rhythm');
    var status = el.querySelector('[data-qs-r-status]');
    var ring = el.querySelector('[data-qs-r-ring]');
    var btn = el.querySelector('[data-qs-r-btn]');
    var marker = el.querySelector('[data-qs-r-marker]');
    var bpmEl = el.querySelector('[data-qs-r-bpm]');
    var cntEl = el.querySelector('[data-qs-r-count]');
    var goBtn = el.querySelector('[data-qs-r-go]');
    var retryBtn = el.querySelector('[data-qs-r-retry]');
    if (!wrap || !btn) return;
    var phase = 'guide';
    var stamps = [];
    var tries = 0;
    var lastBpm = 0;

    function setStatus(t) { if (status) status.textContent = t; }
    function pulse() {
      if (!ring) return;
      ring.classList.remove('is-pulse');
      void ring.offsetWidth;
      ring.classList.add('is-pulse');
    }
    function bpmOf(list) {
      if (list.length < 3) return 0;
      var iv = [];
      for (var i = 1; i < list.length; i++) iv.push(list[i] - list[i - 1]);
      iv.sort(function (a, b) { return a - b; });
      var cut = Math.floor(iv.length * 0.15);
      var core = iv.slice(cut, iv.length - cut);
      if (!core.length) core = iv;
      var avg = core.reduce(function (s, v) { return s + v; }, 0) / core.length;
      return 60000 / avg;
    }
    function show(bpm) {
      if (bpmEl) bpmEl.textContent = bpm ? Math.round(bpm) + ' por minuto' : '— por minuto';
      if (cntEl) cntEl.textContent = stamps.length + ' de ' + need + ' toques';
      if (marker) {
        if (!bpm) { marker.hidden = true; return; }
        marker.hidden = false;
        var p = Math.max(0, Math.min(100, ((bpm - sMin) / (sMax - sMin)) * 100));
        marker.style.left = p + '%';
      }
    }
    function setPhase(p) { phase = p; wrap.setAttribute('data-qs-r-phase', p); }
    /* orientação ao vivo enquanto a pessoa toca */
    function coach(bpm) {
      if (!bpm || stamps.length < 3) return;
      if (bpm < min - tol) setStatus('Um pouco mais rápido! Acompanhe a pulsação.');
      else if (bpm > max + tol) setStatus('Mais devagar! Espere a pulsação para tocar.');
      else setStatus('Isso! Continue assim, nesse ritmo.');
    }

    function startGuide() {
      setPhase('guide');
      stamps = [];
      show(0);
      if (goBtn) goBtn.hidden = false;
      if (retryBtn) retryBtn.hidden = true;
      setStatus('Passo 1: toque no botão junto com a pulsação. Quando se sentir seguro, clique em "Já peguei o ritmo".');
      self._rGuide = setInterval(function () { pulse(); beep('tick'); }, 60000 / guide);
      pulse(); beep('tick');
    }
    function stopGuide() {
      if (self._rGuide) { clearInterval(self._rGuide); self._rGuide = null; }
    }
    function startTest() {
      stopGuide();
      setPhase('test');
      stamps = [];
      show(0);
      if (goBtn) goBtn.hidden = true;
      if (retryBtn) retryBtn.hidden = true;
      setStatus('Passo 2: continue tocando, ' + need + ' vezes. A pulsação segue como apoio, sem som.');
      self._rGuide = setInterval(pulse, 60000 / guide);   /* apoio visual, sem "tic" */
    }
    function finish() {
      var bpm = bpmOf(stamps);
      lastBpm = bpm;
      show(bpm);
      tries += 1;
      var ok = bpm >= min - tol && bpm <= max + tol;
      setPhase('result');
      if (ok) {
        setStatus('Ritmo certo! ' + Math.round(bpm) + ' por minuto. O ideal na RCP é de ' + min + ' a ' + max + '.');
        beep('end');
        var pts = self.options.quizScoring ? self._quizPoints(true) : 0;
        self._complete({ kind: 'rhythm', correct: true, points: pts, bpm: Math.round(bpm) });
        return;
      }
      var msg = bpm < min ? 'Ainda lento' : 'Ainda rápido';
      msg += ': ' + Math.round(bpm) + ' por minuto. Tente de novo, o ideal é de ' + min + ' a ' + max + '.';
      beep('nok');
      if (tries >= maxTries) {
        setStatus(msg + ' Depois revise o ritmo com o guia.');
        var pts0 = 0;
        self._complete({ kind: 'rhythm', correct: false, points: pts0, bpm: Math.round(bpm) });
      } else {
        setStatus(msg + ' Tentativa ' + tries + ' de ' + maxTries + '.');
        if (retryBtn) retryBtn.hidden = false;
      }
    }
    function tap(ev) {
      if (self.state.answered && phase === 'result') return;
      if (phase === 'result') return;
      if (ev && ev.preventDefault) ev.preventDefault();
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      btn.classList.add('is-down');
      setTimeout(function () { btn.classList.remove('is-down'); }, 90);
      pulse();
      beep('tick');
      if (stamps.length && now - stamps[stamps.length - 1] > 2000) stamps = [];
      stamps.push(now);
      if (phase === 'guide') {
        if (stamps.length > 6) stamps.shift();
        show(bpmOf(stamps));
        coach(bpmOf(stamps));
        return;
      }
      show(bpmOf(stamps));
      coach(bpmOf(stamps));
      if (stamps.length >= need) finish();
    }

    btn.addEventListener('pointerdown', tap);
    btn.addEventListener('keydown', function (ev) {
      if (ev.repeat) return;
      if (ev.key === ' ' || ev.key === 'Enter') tap(ev);
    });
    /* clique sintético/teclado já tratado; evita duplo disparo */
    btn.addEventListener('click', function (ev) { ev.preventDefault(); });
    if (goBtn) goBtn.addEventListener('click', startTest);
    if (retryBtn) retryBtn.addEventListener('click', startGuide);

    this._rhythmStop = stopGuide;
    startGuide();
  };

  QuestionScreen.prototype.select = function (index, extra) {
    if (this.state.answered) return;
    extra = extra || {};
    var alts = this.data.alternatives || [];
    var timedOut = !!extra.timedOut || index < 0;
    if (!timedOut && (index < 0 || index >= alts.length)) return;

    this._stopTimer();
    this.state.answered = true;
    var cfBtn = this.el.querySelector('[data-qs-confirm]');
    if (cfBtn) cfBtn.hidden = true;
    this.state.selectedIndex = timedOut ? null : index;
    var opinion = !!this.data.opinion;
    var chosen = timedOut ? null : alts[index];
    var correctIndex = alts.findIndex(function (a) { return !!a.correct; });
    var isCorrect = timedOut ? false : (opinion ? true : !!(chosen && chosen.correct));
    this.state.correct = isCorrect;
    var pts = this.options.quizScoring ? this._quizPoints(isCorrect) : 0;
    this.state.points = pts;

    var buttons = this.el.querySelectorAll('.qs-opt');
    buttons.forEach(function (btn, i) {
      btn.disabled = true;
      btn.classList.add('is-revealed');
      if (!timedOut && i === index) btn.classList.add('is-selected');
      if (opinion) {
        if (i === index) {
          btn.classList.add('is-correct');
          btn.querySelector('.qs-mark').textContent = '✓';
        } else {
          btn.classList.add('is-dim');
        }
        return;
      }
      if (isCorrect && i === correctIndex) {
        btn.classList.add('is-correct');
        btn.querySelector('.qs-mark').textContent = '✓';
      } else if (!timedOut && i === index) {
        btn.classList.add('is-wrong');
        btn.querySelector('.qs-mark').textContent = '✕';
      } else {
        btn.classList.add('is-dim');
      }
    });

    var media = this.el.querySelector('.qs-media');
    if (media) {
      media.classList.remove('is-ok', 'is-nok');
      media.classList.add('is-answered', isCorrect ? 'is-ok' : 'is-nok');
    }

    var result = this.el.querySelector('[data-qs-result]');
    if (result) {
      result.hidden = false;
      var resultText = result.querySelector('[data-qs-result-text]');
      var label = 'Não foi dessa vez';
      if (opinion) label = 'Registrado';
      else if (timedOut) label = 'Tempo esgotado';
      else if (isCorrect) label = pts ? ('Acertou · +' + pts) : 'Acertou';
      if (resultText) resultText.textContent = label;
    }

    var explain = this.el.querySelector('[data-qs-explain]');
    if (explain) {
      var explainText = this.data.explanation || '';
      if (explainText) {
        explain.textContent = explainText;
        explain.classList.add('show', isCorrect ? 'is-ok' : 'is-nok');
      }
    }

    beep(isCorrect ? 'ok' : 'nok');

    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect({
        correct: isCorrect,
        selectedIndex: this.state.selectedIndex,
        points: pts,
        timedOut: timedOut,
        data: this.data
      });
    }
  };

  QuestionScreen.prototype.destroy = function () {
    this._stopTimer();
    if (this._rhythmStop) { this._rhythmStop(); this._rhythmStop = null; }
    if (this._matchTick) {
      clearInterval(this._matchTick);
      this._matchTick = null;
    }
    var vid = this.el.querySelector('video');
    if (vid) { try { vid.pause(); } catch (e) {} }
    if (this._videoGuard) {
      clearTimeout(this._videoGuard.snapTimer);
      clearTimeout(this._videoGuard.seekTimer);
      clearTimeout(this._videoGuard.backTimer);
      this._videoGuard = null;
    }
    this._pandaPlayer = null;
    if (this._onVideoMsg) {
      window.removeEventListener('message', this._onVideoMsg);
      this._onVideoMsg = null;
    }
    this.el.removeEventListener('click', this._onClick);
    this.el.innerHTML = '';
  };

  global.QuestionScreen = QuestionScreen;
})(typeof window !== 'undefined' ? window : globalThis);
