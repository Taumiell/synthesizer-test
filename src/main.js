import './style.css';
import { SoundWorld } from './audio/engine.js';
import { trackDefinitions } from './music/composition.js';
import { initialParameters } from './music/controls.js';
import { createTrack } from './components/track.js';

let world;
let busy = false;
let animation;
const events = new AbortController();
const settings = Object.fromEntries(trackDefinitions.map((track) => [track.id, { level: track.level, muted: false, parameters: initialParameters(track.id) }]));
const play = document.querySelector('#play');
const stop = document.querySelector('#stop');
const tracksContainer = document.querySelector('#tracks');
tracksContainer.replaceChildren();
const cards = trackDefinitions.map((definition) => {
  const card = createTrack(definition, (id, level) => {
    settings[id].level = level;
    world?.setLevel(id, level);
  }, (id, muted) => {
    settings[id].muted = muted;
    world?.setMuted(id, muted);
  }, (id, key, value) => {
    settings[id].parameters[key] = value;
    world?.setParameter(id, key, value);
  });
  tracksContainer.append(card.element);
  return { ...card, id: definition.id };
});

play.addEventListener('click', async () => {
  if (busy || world?.playing) return;
  busy = true;
  play.disabled = true;
  document.body.classList.add('is-loading');
  try {
    world ??= new SoundWorld();
    for (const [id, setting] of Object.entries(settings)) {
      world.setLevel(id, setting.level, true);
      world.setMuted(id, setting.muted);
      for (const [key, value] of Object.entries(setting.parameters)) world.setParameter(id, key, value);
    }
    await world.start();
    play.textContent = 'Playing';
    stop.disabled = false;
    document.body.classList.add('is-playing');
  } catch (error) {
    console.error('Audio initialization failed:', error);
    world?.dispose();
    world = undefined;
    play.disabled = false;
  } finally {
    busy = false;
    document.body.classList.remove('is-loading');
  }
}, { signal: events.signal });

stop.addEventListener('click', () => {
  if (busy || !world?.playing) return;
  world.stop();
  document.body.classList.remove('is-playing');
  stop.disabled = true;
  play.textContent = 'Start';
  // Let the audio-clock fade finish before another Start can be scheduled.
  setTimeout(() => { play.disabled = false; }, 160);
}, { signal: events.signal });

function draw() {
  const levels = world?.getLevels() ?? {};
  cards.forEach((card) => card.updateMeter(levels[card.id] ?? 0));
  animation = requestAnimationFrame(draw);
}
draw();

if (import.meta.hot) {
  import.meta.hot.dispose(() => { events.abort(); cancelAnimationFrame(animation); world?.dispose(); });
}
window.addEventListener('pagehide', () => { world?.stop(); }, { signal: events.signal });
