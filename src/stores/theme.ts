import { defineStore } from 'pinia';

export type Theme = 'light' | 'dark' | 'system';
export type ChatLayout = 'bubbled' | 'aligned';

interface ThemeState {
  theme: Theme;
  chatLayout: ChatLayout;
}

function getThemeFromLocalStorage(): Theme | null {
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return null;
  } catch (error) {
    console.error('Could not access localStorage:', error);
    return null;
  }
}

function getChatLayoutFromLocalStorage(): ChatLayout | null {
  try {
    const layout = localStorage.getItem('chatLayout');
    if (layout === 'bubbled' || layout === 'aligned') {
      return layout;
    }
    return null;
  } catch (error) {
    console.error('Could not access localStorage:', error);
    return null;
  }
}

function setThemeInLocalStorage(theme: Theme) {
  try {
    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  } catch (error) {
    console.error('Could not access localStorage:', error);
  }
}

function setChatLayoutInLocalStorage(layout: ChatLayout) {
  try {
    localStorage.setItem('chatLayout', layout);
  } catch (error) {
    console.error('Could not access localStorage:', error);
  }
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    theme: 'system',
    chatLayout: 'bubbled',
  }),

  actions: {
    initializeTheme() {
      // Handle Theme (light/dark/system)
      const savedTheme = getThemeFromLocalStorage();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

      if (savedTheme) {
        this.theme = savedTheme;
      } else {
        this.theme = 'system';
      }

      prefersDark.addEventListener('change', (e) => {
        if (this.theme === 'system') {
          this._applyTheme(e.matches ? 'dark' : 'light');
        }
      });

      if (this.theme === 'light' || this.theme === 'dark') {
        this._applyTheme(this.theme);
      } else {
        this._applyTheme(prefersDark.matches ? 'dark' : 'light');
      }

      // Handle Chat Layout
      const savedLayout = getChatLayoutFromLocalStorage();
      if (savedLayout) {
        this.chatLayout = savedLayout;
      } else {
        this.chatLayout = 'bubbled';
      }
    },

    setTheme(newTheme: Theme) {
      this.theme = newTheme;
      setThemeInLocalStorage(newTheme);

      if (newTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this._applyTheme(prefersDark ? 'dark' : 'light');
      } else {
        this._applyTheme(newTheme);
      }
    },

    setChatLayout(newLayout: ChatLayout) {
      this.chatLayout = newLayout;
      setChatLayoutInLocalStorage(newLayout);
    },

    _applyTheme(theme: 'light' | 'dark') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
  },
});
