// directives/onClickOutside.ts
import type { Directive, DirectiveBinding } from 'vue';

interface HTMLElementWithClickOutside extends HTMLElement {
  _clickOutside?: (event: MouseEvent) => void;
}

export const onClickOutside: Directive = {
  mounted(el: HTMLElementWithClickOutside, binding: DirectiveBinding) {
    el._clickOutside = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el: HTMLElementWithClickOutside) {
    if (el._clickOutside) {
      document.removeEventListener('click', el._clickOutside);
    }
  },
};
