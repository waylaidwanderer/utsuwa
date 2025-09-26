// web/src/composables/useDiff.ts
import { computed } from 'vue';
import type { Ref } from 'vue';
import DiffMatchPatch from 'diff-match-patch';

export type DiffLine = {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
  isHtml?: boolean;
};

export function useDiff(
  oldContentRef: Ref<string | undefined>,
  newContentRef: Ref<string | undefined>
) {
  const dmp = new DiffMatchPatch();

  const diffLines = computed((): DiffLine[] => {
    const oldContent = oldContentRef.value || '';
    const newContent = newContentRef.value || '';

    const a = dmp.diff_linesToChars_(oldContent, newContent);
    const diffs = dmp.diff_main(a.chars1, a.chars2, false);
    dmp.diff_charsToLines_(diffs, a.lineArray);

    const result: DiffLine[] = [];
    let lineOld = 1;
    let lineNew = 1;

    for (const [op, text] of diffs) {
      const lines = text.replace(/\n$/, '').split('\n');
      for (const line of lines) {
        if (op === DiffMatchPatch.DIFF_EQUAL) {
          result.push({ type: 'unchanged', content: line, lineNumberOld: lineOld++, lineNumberNew: lineNew++ });
        } else if (op === DiffMatchPatch.DIFF_INSERT) {
          result.push({ type: 'added', content: line, lineNumberNew: lineNew++ });
        } else if (op === DiffMatchPatch.DIFF_DELETE) {
          result.push({ type: 'removed', content: line, lineNumberOld: lineOld++ });
        }
      }
    }
    return result;
  });

  return {
    diffLines,
  };
}