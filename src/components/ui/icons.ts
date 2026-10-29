/** Stroke paths on a 24×24 grid; drawn by Icon.astro. */
export const ICON_PATHS = {
  'arrow-up-right': ['M7 17 17 7', 'M8 7h9v9'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  'arrow-left': ['M19 12H5', 'm11 18-6-6 6-6'],
  'chevron-left': ['m15 6-6 6 6 6'],
  'chevron-right': ['m9 6 6 6-6 6'],
  mail: ['M3 6.5h18v11H3z', 'm3 7 9 6.5L21 7'],
  message: ['M4 5h16v11H10l-5 4v-4H4z'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  github: [
    'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  ],
  linkedin: ['M4 9h4v11H4z', 'M6 4.5v.01', 'M11 20v-6a3 3 0 0 1 6 0v6M11 9v11'],
  lock: ['M5 11h14v9H5z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  paperclip: [
    'm20.5 11.5-8.3 8.3a5.3 5.3 0 0 1-7.5-7.5l8.6-8.6a3.5 3.5 0 0 1 5 5l-8.6 8.6a1.8 1.8 0 0 1-2.5-2.5l7.8-7.8',
  ],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  copy: ['M9 9h11v11H9z', 'M15 9V4H4v11h5'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
} as const;

export type IconName = keyof typeof ICON_PATHS;
