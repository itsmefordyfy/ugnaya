import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from './markdown.ts';

test('headings, paragraphs and lists become blocks', () => {
  const blocks = parseMarkdown('## Who we are\n\nUGNAYA runs the wallet.\nIt is in Naga.\n\n- one\n- two\n\n### Small');
  assert.deepEqual(blocks.map((b) => b.type), ['h2', 'p', 'ul', 'h3']);
  assert.deepEqual(blocks[1], { type: 'p', inline: [{ type: 'text', text: 'UGNAYA runs the wallet. It is in Naga.' }] });
  assert.equal(blocks[2].type === 'ul' && blocks[2].items.length, 2);
});
test('bold and links inside text', () => {
  const [block] = parseMarkdown('Points have **no cash value**. See [the FAQ](/faq).');
  assert.deepEqual(block, {
    type: 'p',
    inline: [
      { type: 'text', text: 'Points have ' },
      { type: 'strong', text: 'no cash value' },
      { type: 'text', text: '. See ' },
      { type: 'link', text: 'the FAQ', href: '/faq' },
      { type: 'text', text: '.' },
    ],
  });
});
test('only safe link targets', () => {
  const [block] = parseMarkdown('[x](javascript:alert(1)) [y](mailto:hello@ugnaya.ph)');
  assert.ok(block.type === 'p');
  if (block.type === 'p') {
    assert.equal(block.inline[0].type, 'text');
    assert.deepEqual(block.inline.at(-1), { type: 'link', text: 'y', href: 'mailto:hello@ugnaya.ph' });
  }
});
