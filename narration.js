/**
 * Narração (TTS) — toca o mp3 pré-gerado da tela atual.
 *
 * Os áudios ficam em assets/audio/ (gerados por generate-audios.js).
 * Curso completo: abertura, menus e módulos 1 a 7.
 * Ver CONFIG.enabledPages (null = todas as telas).
 *
 * COMO GERAR ÁUDIOS (PowerShell, na pasta do projeto):
 *      $env:TTS_TOKEN = "seu-bearer-token"
 *      node generate-audios.js
 *
 * Não narra número de página. Não chama a API no navegador.
 */
(function (global) {
  'use strict';

  var CONFIG = {
    /* 'cached' = mp3 em assets/audio/ | 'live' = API em tempo real (só debug) */
    mode: 'cached',

    apiUrl: 'https://texttospeech.escolatecnocursos.cloud/api/tts',

    /* Token só para mode:'live'. Preferir localStorage/window — não commitar. */
    bearerToken: '',

    audioDir: 'assets/audio/',
    debounceMs: 300,

    /* null = todas as telas do curso */
    enabledPages: null
  };

  var T = global.NarrationText;

  var state = {
    getState: null,
    audio: null,
    objectUrl: null,
    playId: 0,
    timer: null,
    button: null,
    auto: false,
    lastText: ''
  };

  /* ── Config / token ─────────────────────────────────────────────────── */

  function getToken() {
    if (CONFIG.bearerToken) return String(CONFIG.bearerToken).trim();
    if (global.TTS_TOKEN) return String(global.TTS_TOKEN).trim();
    try {
      var t = localStorage.getItem('TTS_TOKEN');
      if (t) return String(t).trim();
    } catch (e) {}
    return '';
  }

  function readState() {
    return typeof state.getState === 'function' ? state.getState() : null;
  }

  function getPageKey() {
    var st = readState();
    if (!st) return '';
    if (st.mode === 'home') return T.HOME_KEY;
    if (st.mode === 'menu') return T.menuAudioKey(st.nextModule);
    if (st.showingResult && st.moduleId) {
      return T.resultAudioKey(st.moduleId, !!st.quizPassed);
    }
    return (st.screen && st.screen.id) || '';
  }

  function isEnabled() {
    var key = getPageKey();
    if (!key) return false;
    if (!CONFIG.enabledPages) return true;
    return CONFIG.enabledPages.indexOf(key) !== -1;
  }

  /* ── Texto a narrar ─────────────────────────────────────────────────── */

  /** Mantido por compatibilidade — não usamos mais no roteiro. */
  function getPageLabel() {
    return '';
  }

  function isElementVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    var style = global.getComputedStyle ? getComputedStyle(el) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
      return false;
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /** Descrições de imagens visíveis (alt / aria-label). */
  function getVisibleImageDescriptions(root) {
    if (!root) return [];
    var out = [];
    var imgs = root.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!isElementVisible(img)) continue;
      var alt = (img.getAttribute('alt') || img.getAttribute('aria-label') || '').trim();
      if (!alt) continue;
      out.push('Na imagem: ' + (T && T.clean ? T.clean(alt) : alt) + '.');
    }
    return out;
  }

  /**
   * Monta o roteiro da narração do estado atual (sem "Página X de Y").
   * No modo cached o áudio já foi gerado com esse mesmo texto.
   */
  function getCurrentNarrationText() {
    var st = readState();
    if (!st) return '';
    var parts = [];

    if (st.mode === 'home') {
      if (T && T.buildHomeText) parts.push(T.buildHomeText());
      return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }

    if (st.mode === 'menu' && T && T.buildMenuText) {
      parts.push(T.buildMenuText(global.QUESTION_SCREEN_SESSION, st.nextModule));
      return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }

    if (st.showingResult && T && T.buildResultText) {
      var mod = null;
      var session = global.QUESTION_SCREEN_SESSION;
      if (session && session.modules) {
        for (var i = 0; i < session.modules.length; i++) {
          if (session.modules[i].id === st.moduleId) { mod = session.modules[i]; break; }
        }
      }
      parts.push(T.buildResultText(mod || { id: st.moduleId }, !!st.quizPassed));
      return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }

    if (st.screen && T && T.buildScreenText) {
      parts.push(T.buildScreenText(st.screen));
      var shell = document.getElementById('shell');
      parts = parts.concat(getVisibleImageDescriptions(shell));
    }

    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  /* ── Áudio ──────────────────────────────────────────────────────────── */

  function setSpeaking(on) {
    if (state.button) state.button.classList.toggle('is-speaking', !!on);
  }

  function stopSpeech() {
    clearTimeout(state.timer);
    state.timer = null;
    state.playId++;
    if (state.audio) {
      try { state.audio.pause(); } catch (e) {}
      state.audio.src = '';
      state.audio = null;
    }
    if (state.objectUrl) {
      try { URL.revokeObjectURL(state.objectUrl); } catch (e) {}
      state.objectUrl = null;
    }
    setSpeaking(false);
  }

  function isPlaying() {
    return !!state.audio;
  }

  function isActive() {
    return !!state.audio || !!state.timer;
  }

  /**
   * Chama o endpoint TTS e toca o áudio (só se CONFIG.mode === 'live').
   */
  function speakWithElevenLabs(text) {
    var cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return Promise.resolve(false);

    var token = getToken();
    if (!token) {
      console.warn(
        '[narração] Sem token TTS. No console:\n' +
        '  localStorage.setItem("TTS_TOKEN", "seu-bearer-token");'
      );
      setSpeaking(false);
      return Promise.resolve(false);
    }

    var id = ++state.playId;
    setSpeaking(true);
    state.lastText = cleaned;

    return fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ text: cleaned })
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (detail) {
            throw new Error('HTTP ' + res.status + (detail ? ' — ' + detail.slice(0, 200) : ''));
          });
        }
        var type = (res.headers.get('content-type') || '').toLowerCase();
        if (type.indexOf('application/json') !== -1) {
          return res.json().then(function (data) {
            var src = data && (data.url || data.audioUrl || data.audio_url || data.audio || data.data);
            if (!src) throw new Error('JSON sem áudio');
            if (/^https?:/i.test(src)) return fetch(src).then(function (r) {
              if (!r.ok) throw new Error('falha ao baixar áudio: HTTP ' + r.status);
              return r.blob();
            });
            var b64 = String(src).replace(/^data:[^,]+,/, '');
            var bin = atob(b64);
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return new Blob([bytes], { type: 'audio/mpeg' });
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        if (id !== state.playId) return false;
        if (state.objectUrl) {
          try { URL.revokeObjectURL(state.objectUrl); } catch (e) {}
        }
        var url = URL.createObjectURL(blob);
        state.objectUrl = url;
        var audio = new Audio(url);
        state.audio = audio;
        audio.addEventListener('ended', function () {
          if (id === state.playId) stopSpeech();
        }, { once: true });
        return audio.play().then(function () { return true; });
      })
      .catch(function (err) {
        console.warn('[narração] falha no TTS:', err && err.message ? err.message : err);
        if (id === state.playId) stopSpeech();
        return false;
      });
  }

  /** Toca o mp3 pré-gerado em assets/audio/. */
  function playPageAudio(key) {
    var url = CONFIG.audioDir + T.audioFileName(key);
    var id = ++state.playId;
    setSpeaking(true);
    var audio = new Audio(url);
    state.audio = audio;
    audio.addEventListener('ended', function () {
      if (id === state.playId) stopSpeech();
    }, { once: true });
    audio.addEventListener('error', function () {
      console.warn('[narração] áudio não encontrado: ' + url);
      if (id === state.playId) stopSpeech();
    }, { once: true });
    return audio.play()
      .then(function () { return true; })
      .catch(function (err) {
        console.warn('[narração] não tocou ' + url + ':', err && err.message ? err.message : err);
        if (id === state.playId) stopSpeech();
        return false;
      });
  }

  function speakCurrent() {
    clearTimeout(state.timer);
    state.timer = null;
    if (!isEnabled()) return;
    setSpeaking(true);
    state.timer = setTimeout(function () {
      state.timer = null;
      if (CONFIG.mode === 'live') {
        speakWithElevenLabs(getCurrentNarrationText());
      } else {
        playPageAudio(getPageKey());
      }
    }, CONFIG.debounceMs);
  }

  function replay() {
    stopSpeech();
    speakCurrent();
  }

  function setAuto(on) {
    state.auto = !!on;
    if (state.button) {
      state.button.classList.toggle('is-on', state.auto);
      state.button.setAttribute('aria-pressed', state.auto ? 'true' : 'false');
    }
  }

  function isAuto() {
    return state.auto;
  }

  function toggleNarration() {
    if (state.auto) {
      setAuto(false);
      stopSpeech();
    } else {
      setAuto(true);
      replay();
    }
  }

  function pageChanged() {
    stopSpeech();
    if (state.auto) speakCurrent();
  }

  function bindNarrationEvents(opts) {
    opts = opts || {};
    if (typeof opts.getState === 'function') state.getState = opts.getState;
    if (opts.button) state.button = opts.button;
  }

  global.Narration = {
    config: CONFIG,
    bindNarrationEvents: bindNarrationEvents,
    getPageKey: getPageKey,
    getPageLabel: getPageLabel,
    getCurrentNarrationText: getCurrentNarrationText,
    speakWithElevenLabs: speakWithElevenLabs,
    speakCurrent: speakCurrent,
    replay: replay,
    stopSpeech: stopSpeech,
    toggleNarration: toggleNarration,
    pageChanged: pageChanged,
    setAuto: setAuto,
    isAuto: isAuto,
    isPlaying: isPlaying,
    isActive: isActive,
    isEnabled: isEnabled
  };
})(window);
