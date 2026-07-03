// 学习统计类型 —— 供 API 与前端共享

/** 单日专注统计 */
export interface DailyFocusStat {
  /** "YYYY-MM-DD" */
  date: string;
  /** 短日期标签 "M/D" 或 "周一" */
  label: string;
  /** 当日专注分钟数 */
  focusMinutes: number;
  /** 当日完成番茄数 */
  pomodoroCount: number;
}

/** 心情分布项 */
export interface MoodStatItem {
  mood: string;
  label: string;
  emoji: string;
  count: number;
}

/** 科目分布项 */
export interface SubjectStatItem {
  subject: string;
  /** 该科目任务数 */
  taskCount: number;
  /** 该科目错题数 */
  mistakeCount: number;
}

/** 学习统计聚合数据 */
export interface StatsData {
  /** 累计专注分钟（全部历史） */
  totalFocusMinutes: number;
  /** 累计完成番茄数 */
  totalPomodoros: number;
  /** 累计错题数 */
  totalMistakes: number;
  /** 坚持天数（有 focus session 的不同日期数） */
  activeDays: number;
  /** 近 7 天每日专注统计（含今天，按日期 asc） */
  dailyFocus: DailyFocusStat[];
  /** 近 7 天任务完成数 */
  weeklyCompletedTasks: number;
  /** 近 7 天待完成任务数 */
  weeklyPendingTasks: number;
  /** 近 7 天心情分布 */
  moodDistribution: MoodStatItem[];
  /** 近 7 天科目分布（任务+错题） */
  subjectDistribution: SubjectStatItem[];
}
