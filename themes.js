// Five selectable display themes. Colors are set as CSS custom properties
// on :root at runtime (see applyTheme), so style.css only ever needs to
// reference var(--bg-top) etc. once, regardless of which theme is active.

const THEMES = {
  teal: {
    label: 'Ocean Teal (default)',
    vars: {
      '--bg-top': '#00494f', '--bg-bottom': '#00838f',
      '--card-bg': 'rgba(0, 172, 193, 0.16)', '--card-bg-strong': 'rgba(0, 172, 193, 0.26)',
      '--card-border': 'rgba(38, 180, 196, 0.4)', '--accent': '#b2ebf2',
      '--text': '#ffffff', '--text-muted': 'rgba(255, 255, 255, 0.75)', '--text-dim': 'rgba(255, 255, 255, 0.5)',
    },
  },
  night: {
    label: 'Night / High Contrast (best for readability at a distance)',
    vars: {
      '--bg-top': '#000000', '--bg-bottom': '#0a0a0a',
      '--card-bg': 'rgba(255, 255, 255, 0.06)', '--card-bg-strong': 'rgba(255, 255, 255, 0.1)',
      '--card-border': 'rgba(212, 175, 55, 0.4)', '--accent': '#ffd700',
      '--text': '#ffffff', '--text-muted': 'rgba(255, 255, 255, 0.72)', '--text-dim': 'rgba(255, 255, 255, 0.45)',
    },
  },
  green: {
    label: 'Forest Green',
    vars: {
      '--bg-top': '#0d3b1f', '--bg-bottom': '#1b5e20',
      '--card-bg': 'rgba(165, 214, 167, 0.14)', '--card-bg-strong': 'rgba(165, 214, 167, 0.22)',
      '--card-border': 'rgba(129, 199, 132, 0.4)', '--accent': '#a5d6a7',
      '--text': '#ffffff', '--text-muted': 'rgba(255, 255, 255, 0.75)', '--text-dim': 'rgba(255, 255, 255, 0.5)',
    },
  },
  midnight: {
    label: 'Royal Blue / Midnight',
    vars: {
      '--bg-top': '#0d1b3e', '--bg-bottom': '#1a237e',
      '--card-bg': 'rgba(144, 202, 249, 0.14)', '--card-bg-strong': 'rgba(144, 202, 249, 0.22)',
      '--card-border': 'rgba(100, 181, 246, 0.4)', '--accent': '#90caf9',
      '--text': '#ffffff', '--text-muted': 'rgba(255, 255, 255, 0.75)', '--text-dim': 'rgba(255, 255, 255, 0.5)',
    },
  },
  light: {
    // Matches the phone app's actual "Desert Light" theme exactly
    // (app_settings.dart _themes['light']) — golden/amber, not beige.
    label: 'Desert Light (bright rooms)',
    vars: {
      '--bg-top': '#FEF3C7', '--bg-bottom': '#FDE68A',
      '--card-bg': 'rgba(146, 64, 14, 0.08)', '--card-bg-strong': 'rgba(146, 64, 14, 0.14)',
      '--card-border': 'rgba(251, 191, 36, 0.5)', '--accent': '#92400E',
      '--text': '#111827', '--text-muted': 'rgba(17, 24, 39, 0.72)', '--text-dim': 'rgba(17, 24, 39, 0.45)',
    },
  },
  purple: {
    // Matches the phone app's "Amethyst Purple" theme exactly
    // (app_settings.dart _themes['purple']).
    label: 'Amethyst Purple',
    vars: {
      '--bg-top': '#7B1FA2', '--bg-bottom': '#470E63',
      '--card-bg': 'rgba(225, 190, 231, 0.14)', '--card-bg-strong': 'rgba(225, 190, 231, 0.22)',
      '--card-border': 'rgba(166, 83, 194, 0.45)', '--accent': '#E1BEE7',
      '--text': '#ffffff', '--text-muted': 'rgba(255, 255, 255, 0.75)', '--text-dim': 'rgba(255, 255, 255, 0.5)',
    },
  },
};

function applyTheme(key) {
  const theme = THEMES[key] || THEMES.teal;
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries(theme.vars)) {
    root.setProperty(name, value);
  }
}
