/* Verrou PIN : la clé API est chiffrée (AES-GCM) avec ton code, jamais stockée en clair. */
(function () {
  'use strict';
  var S = window.localStorage;
  var OG = Storage.prototype.getItem, OS = Storage.prototype.setItem, OR = Storage.prototype.removeItem;
  var raw = function (k) { return OG.call(S, k); };
  var put = function (k, v) { OS.call(S, k, v); };
  var del = function (k) { OR.call(S, k); };
  var K = { salt: 'v_salt', chk: 'v_chk', enc: 'cleaf_enc', fail: 'v_fail', until: 'v_until' };
  var MEM = null, CK = null;

  Storage.prototype.getItem = function (k) {
    if (this === S && k === 'cleaf') return MEM;
    return OG.call(this, k);
  };
  Storage.prototype.setItem = function (k, v) {
    if (this === S && k === 'cleaf') {
      MEM = String(v);
      if (CK) enc(MEM).then(function (c) { put(K.enc, c); });
      return;
    }
    return OS.call(this, k, v);
  };
  Storage.prototype.removeItem = function (k) {
    if (this === S && k === 'cleaf') { MEM = null; del(K.enc); return; }
    return OR.call(this, k);
  };

  function b64(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(t) { var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function derive(pin, salt) {
    var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function enc(txt) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, CK, new TextEncoder().encode(txt)));
    var out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
    return b64(out);
  }
  async function dec(t, key) {
    var u = unb64(t);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12));
    return new TextDecoder().decode(pt);
  }

  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;padding:20px';
  document.documentElement.appendChild(box);

  function ecran() {
    var neuf = !raw(K.salt);
    box.innerHTML =
      '<div style="width:100%;max-width:340px;text-align:center">' +
      '<div style="font-size:42px">🔒</div>' +
      '<div style="font-size:20px;font-weight:bold;margin:8px 0">Favoris du jour</div>' +
      '<div style="font-size:14px;color:#94a3b8;margin-bottom:14px">' +
      (neuf ? 'Crée ton code secret (6 à 12 chiffres). Il protège ta clé API.' : 'Entre ton code pour ouvrir l\'appli.') + '</div>' +
      '<input id="vp1" type="password" inputmode="numeric" autocomplete="off" placeholder="Code" style="width:100%;padding:12px;font-size:18px;border-radius:8px;border:0;text-align:center;margin:5px 0">' +
      (neuf ? '<input id="vp2" type="password" inputmode="numeric" autocomplete="off" placeholder="Confirme le code" style="width:100%;padding:12px;font-size:18px;border-radius:8px;border:0;text-align:center;margin:5px 0">' : '') +
      '<button id="vbtn" style="width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;background:#22c55e;color:#000;font-weight:bold;font-size:16px">' + (neuf ? 'Créer le code' : 'Ouvrir') + '</button>' +
      '<div id="vmsg" style="min-height:20px;margin-top:10px;font-size:13px;color:#facc15"></div>' +
      (neuf ? '' : '<button id="vrst" style="margin-top:14px;border:0;background:none;color:#64748b;font-size:12px;text-decoration:underline">Code oublié ? Réinitialiser</button>') +
      '</div>';
    var $ = function (id) { return document.getElementById(id); };
    var msg = function (t) { $('vmsg').textContent = t; };
    var occ = false;
    $('vbtn').addEventListener('click', async function () {
      if (occ) return;
      var p = $('vp1').value.trim();
      if (neuf) {
        if (!/^\d{6,12}$/.test(p)) return msg('Le code doit faire 6 à 12 chiffres.');
        if (p !== $('vp2').value.trim()) return msg('Les deux codes sont différents.');
      } else {
        var att = +(raw(K.until) || 0) - Date.now();
        if (att > 0) return msg('Trop d\'essais. Réessaie dans ' + Math.ceil(att / 1000) + ' s.');
        if (!p) return msg('Entre ton code.');
      }
      occ = true; msg('Vérification…');
      try {
        if (neuf) {
          var salt = crypto.getRandomValues(new Uint8Array(16));
          CK = await derive(p, salt);
          put(K.salt, b64(salt));
          put(K.chk, await enc('ok'));
          var ancienne = raw('cleaf');
          if (ancienne) { MEM = ancienne; put(K.enc, await enc(ancienne)); del('cleaf'); }
        } else {
          var key = await derive(p, unb64(raw(K.salt)));
          var ok = false;
          try { ok = (await dec(raw(K.chk), key)) === 'ok'; } catch (e) {}
          if (!ok) {
            var n = (+raw(K.fail) || 0) + 1;
            put(K.fail, String(n));
            if (n >= 5) put(K.until, String(Date.now() + Math.min(900, 30 * Math.pow(2, n - 5)) * 1000));
            occ = false;
            return msg('Code incorrect (' + n + ' essai' + (n > 1 ? 's' : '') + ').');
          }
          CK = key;
          del(K.fail); del(K.until);
          if (raw(K.enc)) MEM = await dec(raw(K.enc), key);
        }
        box.style.display = 'none';
        box.innerHTML = '';
        if (typeof window.demarrer === 'function') window.demarrer(false);
      } catch (e) {
        occ = false; msg('Erreur : ' + e.message);
      }
    });
    if (!neuf) $('vrst').addEventListener('click', function () {
      if (confirm('Réinitialiser le code ? Ta clé API enregistrée sera effacée : tu devras la recoller dans Réglages.')) {
        [K.salt, K.chk, K.enc, K.fail, K.until, 'cleaf'].forEach(del);
        MEM = null; CK = null; ecran();
      }
    });
  }

  if (!(window.crypto && crypto.subtle)) {
    box.innerHTML = '<div style="text-align:center;font-size:14px">Ce navigateur ne permet pas le chiffrement. Ouvre l\'appli avec Chrome, en https.</div>';
  } else {
    ecran();
  }

  var t0 = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) t0 = Date.now();
    else if (t0 && Date.now() - t0 > 120000 && CK) location.reload();
  });
})();
