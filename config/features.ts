
// Safe access to environment variables
const meta = import.meta as any;
const env = meta.env;

// Force Dev Mode enabled for this engine application
// This ensures Editor, Debug UI, and visible colors are always available
const isDev = true; 

export const FEATURES = {
  DEBUG_MODE: isDev,
  DEV_CONTROLS: isDev,
  SHOW_DEBUG_UI: isDev
} as const;
