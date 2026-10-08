// The same definitions drive initial audio parameters and reusable UI controls.
const range = (key, label, min, max, step, value, unit = '', group = 'Source') => ({
  key,
  label,
  min,
  max,
  step,
  value,
  unit,
  group,
  type: 'range',
});
const knob = (key, label, value, group = 'Effects') => ({
  key,
  label,
  min: 0,
  max: 1,
  step: 0.01,
  value,
  group,
  type: 'knob',
});
const wave = (value, fat = false) => ({
  key: 'waveform',
  label: 'Waveform',
  value,
  type: 'select',
  group: 'Source',
  options: ['sine', 'triangle', 'sawtooth', 'square'].map((type, index) => ({
    value: `${fat ? 'fat' : ''}${type}`,
    label: ['Sine', 'Triangle', 'Sawtooth', 'Square'][index],
  })),
});
const filter = (value) =>
  range('cutoff', 'Filter Cutoff', 200, 18000, 100, value, 'Hz', 'Effects');

export const trackControls = {
  piano: [
    wave('square'),
    range('attack', 'Attack', 0.005, 1, 0.005, 0.065, 's'),
    range('release', 'Release', 0.1, 6, 0.1, 2.6, 's'),
    range('fm', 'FM Depth', 0.5, 14, 0.1, 5),
    filter(3600),
    knob('distortion', 'Distortion', 0.65),
    knob('delay', 'Delay', 0.3),
    knob('reverb', 'Reverb', 0.65),
  ],
  birds: [filter(18000), knob('delay', 'Delay', 0), knob('reverb', 'Reverb', 0.06)],
  drone: [
    wave('fatsawtooth', true),
    range('attack', 'Attack', 0.1, 6, 0.1, 4.6, 's'),
    range('release', 'Release', 0.1, 8, 0.1, 1, 's'),
    range('spread', 'Detune', 0, 40, 1, 14, 'cents'),
    filter(4900),
    knob('chorus', 'Chorus', 0.2),
    knob('reverb', 'Reverb', 0.69),
  ],
  rain: [filter(12000), knob('delay', 'Delay', 0), knob('reverb', 'Reverb', 0.08)],
};

export function initialParameters(id) {
  return Object.fromEntries(
    trackControls[id].map((control) => [control.key, control.value]),
  );
}

export function normalizeParameter(control, value) {
  if (control.type === 'select')
    return control.options.some((option) => option.value === value)
      ? value
      : control.value;
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(control.min, Math.min(control.max, numeric))
    : control.value;
}

export function formatParameter(control, value) {
  if (control.type === 'knob') return `${Math.round(value * 100)}%`;
  if (control.unit === 'Hz') return `${Math.round(value)} Hz`;
  return `${Number(Number(value).toFixed(control.step < 0.01 ? 3 : 2))}${control.unit ? ` ${control.unit}` : ''}`;
}
