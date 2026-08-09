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
    // The phone app's "Desert Light" page background is actually pale
    // cream (0xFFF5F0E8) — the rich gold look in the app comes from its
    // menu CARDS (primary/primaryEnd, 0xFDE68A/0xFBBF24), not the page
    // itself. A display has no menu grid, so the gradient background
    // uses that same gold pair directly to get the same golden impression,
    // with lighter cream cards on top for contrast (mirroring how the
    // app's cards read lighter/richer against its own pale background).
    label: 'Desert Light (bright rooms)',
    vars: {
      '--bg-top': '#FDE68A', '--bg-bottom': '#FBBF24',
      '--card-bg': 'rgba(255, 253, 245, 0.45)', '--card-bg-strong': 'rgba(255, 253, 245, 0.68)',
      '--card-border': 'rgba(146, 64, 14, 0.3)', '--accent': '#7A3B0A',
      '--text': '#3E2200', '--text-muted': 'rgba(62, 34, 0, 0.72)', '--text-dim': 'rgba(62, 34, 0, 0.45)',
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
