import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, Comment } from "vue";
import DOMPurify from "dompurify";

export default defineComponent({
  name: "HtmlFragment",
  props: { html: { type: String, required: true } },
  setup(props) {
    const anchor = ref<Node | null>(null);
    let inserted: ChildNode[] = [];

    const renderNow = () => {
      if (!anchor.value || !anchor.value.parentNode) return;

      // remove previous nodes
      for (const n of inserted) if (n.parentNode) n.parentNode.removeChild(n);
      inserted = [];

      // sanitize then parse into real nodes
      const safe = DOMPurify.sanitize(props.html);
      const frag = document.createRange().createContextualFragment(safe);
      const nodes = Array.from(frag.childNodes);

      anchor.value.parentNode.insertBefore(frag, anchor.value);
      inserted = nodes;
    };

    onMounted(renderNow);
    watch(() => props.html, renderNow);
    onBeforeUnmount(() => {
      for (const n of inserted) if (n.parentNode) n.parentNode.removeChild(n);
    });

    // invisible anchor (comment node), injected siblings appear before it
    // @ts-expect-error - This works at runtime, but TS has trouble with the `h(Comment, ...)` signature.
    return () => h(Comment, { ref: anchor });
  },
});
