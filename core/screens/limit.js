// Экран «На сегодня достаточно»: показывается, когда дневной лимит времени исчерпан.

import { h, button } from '../dom.js';
import { STR } from '../strings.js';

export function renderLimit(app) {
  return h('div', { class: 'screen limit-screen' },
    h('div', { class: 'limit-icon', text: '🌙' }),
    h('h1', { text: STR.limit.title }),
    h('p', { text: STR.limit.text }),
    button('btn quiet', `⚙️ ${STR.limit.parent}`, () => app.go.parent()));
}
