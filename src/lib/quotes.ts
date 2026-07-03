// 陪伴语录库 —— 体现"陪伴而非监督"的产品气质
// 所有文案均避免催促/警告/竞争，强调鼓励/成长/坚持/陪伴

interface Quote {
  text: string;
  author?: string;
}

/** 首页轮播的陪伴语录 */
export const COMPANION_QUOTES: Quote[] = [
  { text: "今天也辛苦啦，慢慢来，姐姐一直在。", author: "学习小岛" },
  { text: "不用和别人比，今天的你比昨天的你多懂一点点就好。", author: "学习小岛" },
  { text: "累了就歇会儿，岛上的风很温柔。", author: "学习小岛" },
  { text: "做不完也没关系，已经完成的那些都很了不起。", author: "学习小岛" },
  { text: "高三很长，但每个清晨都有人在等你早安。", author: "学习小岛" },
  { text: "你不需要完美，只需要在走。", author: "学习小岛" },
  { text: "专注的每一分钟，都是给未来自己的礼物。", author: "学习小岛" },
  { text: "别担心，我们一起把今天过完。", author: "学习小岛" },
];

/**
 * 根据当天日期稳定地选一条语录。
 * 同一天显示同一条，避免频繁切换让人分心。
 */
export function getQuoteOfTheDay(date: Date = new Date()): Quote {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const index = dayOfYear % COMPANION_QUOTES.length;
  return COMPANION_QUOTES[index]!;
}
