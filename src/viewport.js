// The page's viewport authority: how big the playfield is, and whether the
// phone is the right way up. Both live here because they are one event — the
// device being rotated — seen from two sides.
//
// ## Sizing
//
// Phaser's RESIZE mode follows its parent element, which sounds like it needs
// no help from us and has needed two fixes.
//
//  1. On some mobile browsers a `position: fixed` element keeps its old
//     portrait width across a rotation until something forces a reflow. Phaser
//     dutifully follows the stale #game. Sizing #game explicitly from
//     window.innerWidth / visualViewport (an explicit width wins over
//     `inset: 0`) is what stops that, and is why this is not simply CSS.
//
//  2. ScaleManager.updateScale() re-reads the parent bounds *after* it has
//     sized the canvas — "Update the parentSize in case the canvas / style
//     change modified it". When a rotation's reflow lands inside that gap, the
//     canvas is sized from the *old* bounds and parentSize is then quietly
//     updated to the new ones. ScaleManager.step() only refreshes when
//     parentSize disagrees with the element, and now it agrees, so nothing ever
//     corrects it: the canvas stays one orientation behind. That is the
//     portrait-wide strip of game on a landscape screen that turning fullscreen
//     off and on again used to clear — toggling it calls refresh() a second
//     time, with bounds that have stopped moving.
//
// So we do not trust the poll. We measure the viewport ourselves, push the
// answer into the Scale Manager, and keep checking for a short while
// afterwards, because a phone reports its post-rotation size in stages and the
// last one can land a few hundred milliseconds after the event that announced
// it. Every check is a no-op unless the canvas and the viewport actually
// disagree, so this settles rather than oscillates.
//
// ## Orientation
//
// A phone turned portrait mid-race cannot be played on, so the game pauses and
// asks for the phone back the other way up, rather than carrying on underneath
// a prompt the player cannot see past. Nothing here touches fullscreen: the
// browser keeps it across a rotation, and if it does not, the player is offered
// the single tap the Fullscreen API requires to put it back.
import Phaser from 'phaser';

// The same test the stylesheet uses for its pre-boot fallback, so the two can
// never disagree about which way up the phone is.
const PORTRAIT_QUERY = '(orientation: portrait) and (pointer: coarse)';

// How long to keep re-measuring after something changes the viewport.
const SETTLE_MS = 1500;
// ...and after a resize we were told about by the Scale Manager itself, which
// is only there to catch the stale-canvas case above.
const RESIZE_SETTLE_MS = 400;

export function installViewport(game, { guardOrientation = true } = {}) {
  const root = document.documentElement;
  const gameEl = document.getElementById('game');
  const rotateEl = document.getElementById('rotate');
  const titleEl = document.getElementById('rotate-title');
  const messageEl = document.getElementById('rotate-message');
  const resumeEl = document.getElementById('rotate-resume');
  const portraitQuery = window.matchMedia ? window.matchMedia(PORTRAIT_QUERY) : null;

  let ready = false;
  // Only RESIZE follows the viewport. The deterministic harness runs at a fixed
  // 1280x720 and must be left exactly as it is.
  let responsive = false;
  let applying = false;
  let appliedWidth = 0;
  let appliedHeight = 0;
  let settleUntil = 0;
  let settling = false;
  let blocked = false;
  let fullscreenWanted = false;

  const isPortrait = () => !!(portraitQuery && portraitQuery.matches);
  const isFullscreen = () =>
    !!(document.fullscreenElement || document.webkitFullscreenElement);

  function measure() {
    const vv = window.visualViewport;
    return {
      w: Math.round(vv && vv.width ? vv.width : window.innerWidth),
      h: Math.round(vv && vv.height ? vv.height : window.innerHeight),
    };
  }

  function applySize() {
    // Re-entrancy guard: setParentSize() emits a resize, which is one of the
    // things that brings us back here.
    if (applying) return;
    const { w, h } = measure();
    if (w <= 0 || h <= 0) return;
    applying = true;
    try {
      if (gameEl && (w !== appliedWidth || h !== appliedHeight)) {
        gameEl.style.width = `${w}px`;
        gameEl.style.height = `${h}px`;
        appliedWidth = w;
        appliedHeight = h;
      }
      if (!responsive) return;
      // A pixel of tolerance, because getBoundingClientRect answers in
      // fractions and our measurement is whole numbers. Without it the two
      // would disagree forever and trade resize events over half a pixel.
      const scale = game.scale;
      if (Math.abs(scale.width - w) >= 1 || Math.abs(scale.height - h) >= 1) {
        scale.setParentSize(w, h);
      }
    } finally {
      applying = false;
    }
  }

  function settle(duration = SETTLE_MS) {
    settleUntil = Math.max(settleUntil, performance.now() + duration);
    applySize();
    if (settling) return;
    settling = true;
    const tick = () => {
      applySize();
      if (performance.now() >= settleUntil) {
        settling = false;
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // --- The rotate prompt -----------------------------------------------------

  function raceUnderway() {
    const race = game.scene.getScene('Race');
    return !!(race && race.sys.isActive() && race.timing && !race.finished);
  }

  function showPrompt(needsTap) {
    root.classList.add('rotate-shown');
    root.classList.remove('rotate-hidden');
    if (!rotateEl) return;
    rotateEl.classList.toggle('needs-tap', needsTap);
    if (resumeEl) resumeEl.hidden = !needsTap;
    if (!titleEl || !messageEl) return;
    if (needsTap) {
      titleEl.textContent = 'Ready when you are';
      messageEl.textContent =
        'Your phone left fullscreen while it was turning. Tap to go back in.';
    } else {
      titleEl.textContent = 'Rotate your device';
      messageEl.textContent = raceUnderway()
        ? 'Your climb is paused. Turn your phone back to landscape to carry on.'
        : 'Beryl Racing plays best in landscape. Turn your phone sideways to start driving.';
    }
  }

  function hidePrompt() {
    root.classList.add('rotate-hidden');
    root.classList.remove('rotate-shown');
    if (resumeEl) resumeEl.hidden = true;
    if (rotateEl) rotateEl.classList.remove('needs-tap');
  }

  // --- Pausing ---------------------------------------------------------------

  function pauseGame() {
    if (game.isPaused) return;
    // Web Audio runs on its own clock and does not care that nothing is
    // stepping: left alone, a paused game sits there with the music playing.
    // (The engine synth is the race scene's to wind down — see RaceScene.)
    game.sound.pauseAll();
    game.pause();
  }

  function resumeGame() {
    if (!game.isPaused) return;
    game.resume();
    game.sound.resumeAll();
  }

  function block() {
    if (blocked) return;
    blocked = true;
    if (isFullscreen()) fullscreenWanted = true;
    showPrompt(false);
    pauseGame();
  }

  function unblock({ viaTap = false } = {}) {
    if (!blocked) return;
    // The phone is the right way up again. If the browser dropped fullscreen on
    // the way round, ask for the one tap the API insists on rather than quietly
    // demoting the player to a windowed game — which is the state they used to
    // have to fix by toggling the button twice.
    if (fullscreenWanted && !isFullscreen()) {
      if (!viaTap) {
        showPrompt(true);
        return;
      }
      game.scale.startFullscreen();
    }
    blocked = false;
    hidePrompt();
    // Size the canvas before letting anything draw into it, and keep watching:
    // the rotation's final viewport size may still be on its way.
    settle();
    resumeGame();
  }

  function evaluate() {
    // Nothing to pause, and no sound manager to pause it with, until the game
    // has booted.
    if (!ready) return;
    if (isPortrait()) block();
    else unblock();
  }

  // --- Wiring ----------------------------------------------------------------

  const onViewportChange = () => {
    settle();
    if (guardOrientation) evaluate();
  };

  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
  }
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', onViewportChange);
  }
  if (portraitQuery && portraitQuery.addEventListener) {
    portraitQuery.addEventListener('change', onViewportChange);
  }
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
    document.addEventListener(type, () => settle());
  }

  // Size the page box now; the Scale Manager half has to wait for boot.
  applySize();

  game.events.once(Phaser.Core.Events.READY, () => {
    ready = true;
    responsive = game.scale.scaleMode === Phaser.Scale.RESIZE;
    // Phaser sizing its own canvas is precisely when it can end up one
    // orientation behind, so check the result of every refresh it makes. Our
    // own corrections come back through here too and converge, because
    // applySize() does nothing unless the canvas and the viewport disagree.
    game.scale.on(Phaser.Scale.Events.RESIZE, () => settle(RESIZE_SETTLE_MS));
    game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => {
      fullscreenWanted = true;
    });
    game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, () => {
      // A rotation that drops fullscreen is not the player changing their mind.
      // Read the orientation live rather than trusting `blocked`: this can
      // arrive before the media query has caught up.
      if (!isPortrait()) fullscreenWanted = false;
    });
    settle();
    if (guardOrientation) evaluate();
  });

  if (resumeEl) resumeEl.addEventListener('click', () => unblock({ viaTap: true }));
}
