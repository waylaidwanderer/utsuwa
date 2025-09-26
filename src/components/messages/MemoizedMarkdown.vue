<template>
  <HtmlFragment v-for="(blockHtml, i) in renderedBlocks" :key="i" :html="blockHtml" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';
import hljs from '@/services/highlighter';
import { useThemeStore } from '@/stores/theme';
import HtmlFragment from './HtmlFragment';

const props = defineProps<{
  content: string;
}>();

const themeStore = useThemeStore();

const isDark = computed(() => {
  if (themeStore.theme === 'dark') return true;
  if (themeStore.theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});

const md = computed<MarkdownIt>(() => {
  const isCurrentlyDark = isDark.value;
  return new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str: string, lang: string) => {
      const preClass = isCurrentlyDark ? 'class="hljs dark"' : 'class="hljs"';
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
          return `<pre ${preClass}><code>${highlighted}</code></pre>`;
        } catch {}
      }
      const escaped = new MarkdownIt().utils.escapeHtml(str);
      return `<pre ${preClass}><code>${escaped}</code></pre>`;
    },
  });
});

const renderedBlocks = computed(() => {
  const tokens = md.value.parse(props.content, {});
  const blocks: string[] = [];
  let currentBlockTokens: Token[] = [];

  tokens.forEach((token: Token) => {
    // A new top-level block starts with an "_open" token at level 0.
    // When we see one, we render the block we've accumulated so far and start a new one.
    if (token.level === 0 && token.type.endsWith('_open') && currentBlockTokens.length > 0) {
      blocks.push(md.value.renderer.render(_deepCopyTokens(currentBlockTokens), md.value.options, {}));
      currentBlockTokens = [];
    }
    currentBlockTokens.push(token);
  });

  // Render any remaining tokens in the last block.
  if (currentBlockTokens.length > 0) {
    blocks.push(md.value.renderer.render(_deepCopyTokens(currentBlockTokens), md.value.options, {}));
  }

  return blocks;
});

// markdown-it tokens can be mutated by the renderer, so we need to deep copy them
// to avoid issues with the computed property cache.
function _deepCopyTokens(tokens: Token[]): Token[] {
  return tokens.map(token => ({ ...token }));
}
</script>