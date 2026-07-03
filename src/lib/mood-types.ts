// 心情记录类型与选项 —— 供 API 与前端共享

export type CreatorRole = "sister" | "younger";

/** 心情记录 */
export interface MoodEntry {
  id: string;
  role: CreatorRole;
  /** 心情 key，见 MOOD_OPTIONS */
  mood: string;
  note: string | null;
  createdAt: string;
}

/**
 * 心情选项 —— 治愈系，避免强负面标签（用"有点"软化）。
 * emoji + 中文标签 + 浅色（用于卡片背景/边框点缀，不引入蓝紫色块）。
 */
export interface MoodOption {
  key: string;
  label: string;
  emoji: string;
  /** 浅色 Tailwind class（背景），奶白/浅绿/浅灰系 */
  softBg: string;
  /** 文字色 Tailwind class */
  textColor: string;
  /** 陪伴向一句话（记录后给用户的回应） */
  whisper: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    key: "calm",
    label: "平静",
    emoji: "🍃",
    softBg: "bg-leaf-soft/50",
    textColor: "text-leaf",
    whisper: "稳稳的，这样就很棒。",
  },
  {
    key: "happy",
    label: "开心",
    emoji: "☀️",
    softBg: "bg-amber-50/60",
    textColor: "text-amber-700",
    whisper: "今天有好事呢，姐姐也替你开心。",
  },
  {
    key: "tired",
    label: "有点累",
    emoji: "🌙",
    softBg: "bg-stone-100/60",
    textColor: "text-stone-600",
    whisper: "累了就歇会儿，岛上的风很温柔。",
  },
  {
    key: "anxious",
    label: "有点焦虑",
    emoji: "🌧️",
    softBg: "bg-slate-100/60",
    textColor: "text-slate-600",
    whisper: "不安也没关系，慢慢深呼吸。",
  },
  {
    key: "sad",
    label: "有点难过",
    emoji: "💧",
    softBg: "bg-sky-50/50",
    textColor: "text-sky-700",
    whisper: "难过的时候，姐姐一直都在。",
  },
];

export function getMoodOption(key: string): MoodOption | undefined {
  return MOOD_OPTIONS.find((m) => m.key === key);
}

/** 今日概览里附带的心情摘要 */
export interface TodayMoodSummary {
  mood: string;
  label: string;
  emoji: string;
}
