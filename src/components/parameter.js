import { formatParameter, normalizeParameter } from '../music/controls.js';

// Rotary controls support vertical drag and keyboard arrows/Home/End.
export function createParameterControl(track, control, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = `parameter parameter-${control.type}`;
  const id = `parameter-${track.id}-${control.key}`;
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = control.label;
  wrapper.append(label);
  const input = document.createElement(
    control.type === 'select' ? 'select' : control.type === 'knob' ? 'button' : 'input',
  );
  input.id = id;
  input.setAttribute('aria-label', `${control.label}: ${track.name}`);
  const output = document.createElement('output');
  output.htmlFor = id;
  let value = control.value;
  const update = (next, emit = true) => {
    value = normalizeParameter(control, next);
    if (control.type === 'knob') {
      input.setAttribute('aria-valuenow', String(value));
      input.setAttribute('aria-valuetext', formatParameter(control, value));
      input.style.setProperty(
        '--angle',
        `${-135 + (270 * (value - control.min)) / (control.max - control.min)}deg`,
      );
    } else input.value = String(value);
    if (control.type !== 'select') output.value = formatParameter(control, value);
    if (emit) onChange(track.id, control.key, value);
  };
  if (control.type === 'select') {
    for (const option of control.options) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      input.append(element);
    }
    input.addEventListener('change', () => update(input.value));
  } else if (control.type === 'range') {
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.addEventListener('input', () => update(input.value));
  } else {
    input.type = 'button';
    input.className = 'knob';
    input.setAttribute('role', 'slider');
    input.setAttribute('aria-valuemin', String(control.min));
    input.setAttribute('aria-valuemax', String(control.max));
    input.title = 'Drag up/down or use the arrow keys';
    const indicator = document.createElement('span');
    indicator.className = 'knob-indicator';
    input.append(indicator);
    let gesture;
    input.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      gesture = { y: event.clientY, value };
      input.setPointerCapture(event.pointerId);
      input.focus();
      event.preventDefault();
    });
    input.addEventListener('pointermove', (event) => {
      if (!gesture) return;
      const next =
        gesture.value + ((gesture.y - event.clientY) / 140) * (control.max - control.min);
      update(Number((Math.round(next / control.step) * control.step).toFixed(4)));
    });
    input.addEventListener('lostpointercapture', () => {
      gesture = undefined;
    });
    input.addEventListener('pointerup', (event) => {
      gesture = undefined;
      input.releasePointerCapture(event.pointerId);
    });
    input.addEventListener('keydown', (event) => {
      const deltas = {
        ArrowUp: 1,
        ArrowRight: 1,
        ArrowDown: -1,
        ArrowLeft: -1,
        PageUp: 10,
        PageDown: -10,
      };
      if (event.key === 'Home' || event.key === 'End' || event.key in deltas) {
        event.preventDefault();
        update(
          event.key === 'Home'
            ? control.min
            : event.key === 'End'
              ? control.max
              : Number((value + deltas[event.key] * control.step).toFixed(4)),
        );
      }
    });
  }
  wrapper.append(input);
  if (control.type !== 'select') wrapper.append(output);
  update(value, false);
  return wrapper;
}
