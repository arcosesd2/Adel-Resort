export const palette = {
  ocean: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
    400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
    800: '#075985', 900: '#0c4a6e',
  },
  sand: {
    50: '#fdf8f0', 100: '#faefd9', 200: '#f5ddb3', 300: '#eec683',
    400: '#e5a74f', 500: '#dc8f2d', 600: '#c97523', 700: '#a75b1f',
    800: '#874921', 900: '#6d3c1f',
  },
  ivory: {
    50: '#fdfcf8', 100: '#fbf9f4', 200: '#f5f1e8', 300: '#ebe4d2', 400: '#d9cdb0',
  },
  navy: {
    50: '#f4f6fa', 100: '#dde3ed', 200: '#bcc7d8', 300: '#7a8ba8',
    400: '#3d5378', 500: '#1e3454', 600: '#172a47', 700: '#0f1f3a',
    800: '#0a1830', 900: '#0a1628', 950: '#060e1c',
  },
  brass: {
    50: '#faf6ee', 100: '#f1e6cc', 200: '#e7d3a3', 300: '#d4b27a',
    400: '#c29e66', 500: '#b08d57', 600: '#9a7642', 700: '#7a5d33', 800: '#5a4525',
  },
}

export const chartColors = {
  light: {
    primary: palette.navy[500],
    secondary: palette.brass[500],
    tertiary: palette.ocean[500],
    quaternary: palette.brass[300],
    muted: palette.navy[300],
    grid: palette.ivory[300],
    text: palette.navy[700],
    background: '#ffffff',
    series: [
      palette.navy[500], palette.brass[500], palette.ocean[600],
      palette.brass[300], palette.navy[300], palette.ocean[400],
    ],
  },
  dark: {
    primary: palette.brass[300],
    secondary: palette.ocean[300],
    tertiary: palette.brass[500],
    quaternary: palette.navy[200],
    muted: palette.navy[300],
    grid: palette.navy[700],
    text: palette.ivory[100],
    background: palette.navy[900],
    series: [
      palette.brass[300], palette.ocean[300], palette.brass[500],
      palette.ivory[200], palette.navy[200], palette.ocean[400],
    ],
  },
}

export const motion = {
  ease: [0.2, 0.8, 0.2, 1],
  durations: {
    fast: 0.25,
    base: 0.6,
    slow: 1.0,
  },
  stagger: 0.08,
}

export const shadows = {
  editorial: '0 1px 2px rgba(10, 22, 40, 0.04), 0 12px 40px -12px rgba(10, 22, 40, 0.12)',
  editorialLg: '0 1px 2px rgba(10, 22, 40, 0.05), 0 24px 60px -20px rgba(10, 22, 40, 0.18)',
  brassGlow: '0 0 0 1px rgba(176, 141, 87, 0.25), 0 8px 24px -8px rgba(176, 141, 87, 0.35)',
}
