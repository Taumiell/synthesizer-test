import { trackControls } from '../music/controls.js';
import { createParameterControl } from './parameter.js';

export function createTrack(definition, onLevel, onMute, onParameter) {
  const card = document.createElement('article');
  card.className = 'track';
  card.dataset.track = definition.id;
  card.innerHTML = `
    <div class="track-top"><h2>${definition.name}</h2><button class="mute-button" aria-label="Mute ${definition.name}" aria-pressed="false">Mute</button></div>
    <div class="level-header"><label for="volume-${definition.id}">Volume</label><output for="volume-${definition.id}">${definition.level}%</output></div>
    <input id="volume-${definition.id}" type="range" min="0" max="100" step="1" value="${definition.level}" aria-label="Volume: ${definition.name}" />
    <div class="range-labels" aria-hidden="true"><span>0</span><span>100</span></div>
    <div class="meter" aria-hidden="true"><span></span></div>
    `;
  const groups = document.createElement('div');
  groups.className = 'parameter-groups';
  for (const groupName of [...new Set(trackControls[definition.id].map(control => control.group))]) {
    const group = document.createElement('fieldset');
    group.className = 'control-group';
    const legend = document.createElement('legend');
    legend.textContent = groupName;
    group.append(legend);
    for (const control of trackControls[definition.id].filter(control => control.group === groupName)) {
      group.append(createParameterControl(definition, control, onParameter));
    }
    groups.append(group);
  }
  card.append(groups);
  const slider = card.querySelector('input');
  const output = card.querySelector('output');
  const button = card.querySelector('button');
  const meter = card.querySelector('.meter span');
  let muted = false;
  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    output.textContent = `${value}%`;
    onLevel(definition.id, value);
  });
  button.addEventListener('click', () => {
    muted = !muted;
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', `${muted ? 'Unmute' : 'Mute'} ${definition.name}`);
    button.textContent = muted ? 'Unmute' : 'Mute';
    card.classList.toggle('is-muted', muted);
    onMute(definition.id, muted);
  });
  return { element: card, updateMeter: (value) => { meter.style.width = `${Math.min(100, Math.sqrt(Math.max(0, value)) * 100)}%`; } };
}
