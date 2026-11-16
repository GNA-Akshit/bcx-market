// THE LIGHT / DARK SWITCH — the visitor's choice (5 Nov'26, passes 62–64). A small pill in the page's
// bottom-left corner — "Light" with a sun on the dark site, "Dark" with a moon on the light one. (A moon /
// sun button in the header was tried and "looked AI generated"; the corner was right.) The switch is
// INSTANT, a cross-fade with no reload (website/theme.js); the choice is kept in this browser and the site
// opens DARK until a visitor picks light.
import { Moon, Sun } from 'lucide-react'
import { toggleTheme, useTheme } from './theme.js'

export default function ThemeSwitch() {
  const dark = useTheme() === 'dark'
  const label = dark ? 'Switch to the light theme' : 'Switch to the dark theme'
  return (
    <button className="bx-theme-sw" onClick={toggleTheme} aria-label={label} title={label}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span>{dark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
