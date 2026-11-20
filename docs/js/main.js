/* Crystal Dash — bucle principal, escalado responsivo y controles */
(function () {
  const K = CD.K, DB = CD.DB, A = CD.Audio, UI = CD.UI;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);

  let state = 'menu'; // 'menu' | 'play' | 'pause' | 'over'
  let run = null;
  let overTimeout = null;
  let lastT = performance.now();
  let clock = 0;

  /* Escalado responsivo manteniendo 16:9 */
  function resize() {
    const scale = Math.min(window.innerWidth / K.W, window.innerHeight / K.H);
    canvas.style.width = Math.floor(K.W * scale) + 'px';
    canvas.style.height = Math.floor(K.H * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  function startRun() {
    A.init();
    A.stopMusic();
    if (overTimeout) { clearTimeout(overTimeout); overTimeout = null; }
    run = new CD.Run(DB.progress.loadout);
    state = 'play';
    UI.show(null);
    A.startRandomGameMusic();
  }

  function finishRun() {
    if (!run || state !== 'play') return;
    A.stopMusic();
    state = 'over';
    const p = DB.progress;
    const score = run.score;
    const earned = Math.max(10, Math.round(score * 0.5));
    const isRecord = score > p.best;
    if (isRecord) p.best = score;
    p.credits += earned;
    p.runs++;
    DB.save();
    overTimeout = setTimeout(() => {
      overTimeout = null;
      UI.showOver(run, earned, isRecord);
    }, 650);
  }

  function togglePause() {
    if (state === 'play') {
      state = 'pause';
      A.stopMusic();
      UI.show('pause');
    } else if (state === 'pause') {
      state = 'play';
      UI.show(null);
      A.startRandomGameMusic();
      lastT = performance.now();
    }
  }

  function goMenu() {
    A.stopMusic();
    if (overTimeout) { clearTimeout(overTimeout); overTimeout = null; }
    state = 'menu';
    run = null;
    UI.show('menu');
    A.startMusic(DB.progress.selectedSoundtrack);
  }

  /* Botones de UI */
  $('btnPlay').onclick = startRun;
  $('btnRetry').onclick = startRun;
  $('btnLab').onclick = () => { A.init(); A.stopMusic(); UI.show('lab'); };
  $('labMaterialsTab').onclick = () => UI.setLabTab('materials');
  $('labSoundtrackTab').onclick = () => UI.setLabTab('soundtrack');
  $('btnOverLab').onclick = () => { A.init(); state = 'menu'; run = null; UI.show('lab'); };
  $('labBack').onclick = goMenu;
  $('btnGuide').onclick = () => { A.init(); A.stopMusic(); UI.show('guide'); A.startMusic('guide'); };
  $('guideBack').onclick = goMenu;
  $('btnSettings').onclick = () => { A.init(); UI.show('settings'); };
  $('settingsBack').onclick = () => UI.show('menu');
  for (const [id, type, outputId] of [['musicVolume', 'music', 'musicVolumeValue'], ['effectsVolume', 'effects', 'effectsVolumeValue']]) {
    const slider = $(id), output = $(outputId);
    slider.value = DB.progress[type === 'music' ? 'musicVolume' : 'effectsVolume'];
    output.value = `${slider.value}%`; output.textContent = output.value;
    slider.oninput = () => { A.setVolume(type, slider.value); output.value = `${slider.value}%`; output.textContent = output.value; };
  }
  $('btnOverMenu').onclick = goMenu;
  $('btnPauseMenu').onclick = goMenu;
  $('btnResume').onclick = togglePause;

  /* Controles de teclado */
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (state === 'play') {
        e.preventDefault();
        if (!e.repeat) run.pressJump();
      } else if (state === 'over' && !overTimeout && e.code === 'Space') {
        e.preventDefault();
        startRun();
      }
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE' || e.code === 'ArrowRight') {
      if (state === 'play' && !e.repeat) { e.preventDefault(); run.switchMat(1); }
    } else if (e.code === 'KeyQ' || e.code === 'ArrowLeft') {
      if (state === 'play' && !e.repeat) { e.preventDefault(); run.switchMat(-1); }
    } else if (e.code >= 'Digit1' && e.code <= 'Digit4') {
      if (state === 'play' && !e.repeat) run.switchMat(0, Number(e.code[5]) - 1);
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state === 'play' || state === 'pause') { e.preventDefault(); togglePause(); }
      else if (UI.activeOverlay === 'lab' || UI.activeOverlay === 'guide') goMenu();
      else if (UI.activeOverlay === 'settings') UI.show('menu');
    } else if (e.code === 'KeyM') {
      DB.progress.muted = !DB.progress.muted;
      DB.save();
      A.refreshVolumes();
      if (run) run.pop(DB.progress.muted ? 'SONIDO OFF' : 'SONIDO ON', '#cfe3f5');
    } else if (e.code === 'KeyR' && state === 'over' && !overTimeout) {
      startRun();
    }
  });

  window.addEventListener('keyup', e => {
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && state === 'play' && run) {
      run.releaseJump();
    }
  });

  /* Ratón y rueda en el canvas */
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousedown', e => {
    if (state !== 'play' || !run) return;
    A.init();
    // Clic directo sobre el carrusel del HUD inferior
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (K.W / rect.width);
    const cy = (e.clientY - rect.top) * (K.H / rect.height);
    const idx = CD.Render.slotAt(cx, cy, run.loadout.length);
    if (idx >= 0) { run.switchMat(0, idx); return; }
    if (e.button === 0) run.pressJump();
    else if (e.button === 2) run.switchMat(1);
  });

  window.addEventListener('mouseup', e => {
    if (e.button === 0 && state === 'play' && run) run.releaseJump();
  });

  canvas.addEventListener('wheel', e => {
    if (state !== 'play' || !run) return;
    e.preventDefault();
    run.switchMat(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  /* Controles táctiles: mitad izquierda = saltar, mitad derecha = rotar material */
  let jumpTouchId = null;
  canvas.addEventListener('touchstart', e => {
    if (state !== 'play' || !run) return;
    e.preventDefault();
    A.init();
    const rect = canvas.getBoundingClientRect();
    for (const touch of e.changedTouches) {
      const cx = (touch.clientX - rect.left) * (K.W / rect.width);
      const cy = (touch.clientY - rect.top) * (K.H / rect.height);
      const idx = CD.Render.slotAt(cx, cy, run.loadout.length);
      if (idx >= 0) { run.switchMat(0, idx); continue; }
      if (cx < K.W / 2) {
        jumpTouchId = touch.identifier;
        run.pressJump();
      } else {
        run.switchMat(1);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    if (state !== 'play' || !run) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === jumpTouchId) {
        jumpTouchId = null;
        run.releaseJump();
      }
    }
  });

  /* Pausa automática al cambiar de pestaña */
  document.addEventListener('pointerdown', () => {
    A.init();
    if (UI.activeOverlay === 'menu' && !A.musicPlaying()) A.startMusic(DB.progress.selectedSoundtrack);
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') togglePause();
  });

  /* Bucle principal */
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    clock += dt;

    if (state === 'play' && run) {
      run.update(dt);
      if (run.dead) finishRun();
    } else if (state === 'over' && run) {
      run.updateFx(dt);
    }

    CD.Render.frame(ctx, run, clock);
    UI.tickPreview(clock);

    requestAnimationFrame(loop);
  }

  UI.show('menu');
  A.init();
  A.startMusic(DB.progress.selectedSoundtrack);
  requestAnimationFrame(loop);
})();
