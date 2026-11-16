// «Аглая и гусь»: комикс с заданиями на чтение. Глава = серия. История написана заранее — story.js.

import { TEXT } from './texts.js';
import { STORY, HEROES } from './story.js';
import { runComic } from './game.js';

export function start(ctx) {
  const stop = runComic(ctx, { STORY, HEROES, TEXT });
  return () => {
    stop();
  };
}
