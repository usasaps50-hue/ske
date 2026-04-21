export type UserColor = 'me' | 'a' | 'b' | 'c' | 'd';

export const ALL_USER_COLORS: UserColor[] = ['me', 'a', 'b', 'c', 'd'];

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface EventItem {
  id: string;
  date: string;
  title: string;
  time: string;
  userColor: UserColor;
}

export interface DayMeta {
  date: string;
  goal: string;
  todos: ChecklistItem[];
  items: ChecklistItem[];
}

export interface NotificationSettings {
  enabled: boolean;
  time: string;
}

const KEY_EVENTS = 'kizuna_events_v1';
const KEY_NOTIF = 'kizuna_notif_v2';
const KEY_TAB = 'kizuna_activeTab';
const KEY_SELECTED_DATE = 'kizuna_selectedDate';
const KEY_DAY_META = 'kizuna_dayMeta_v1';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage failed:', e);
  }
};

export const loadEvents = (): EventItem[] => read<EventItem[]>(KEY_EVENTS, []);
export const saveEvents = (events: EventItem[]) => write(KEY_EVENTS, events);

export const loadNotifSettings = (): NotificationSettings =>
  read<NotificationSettings>(KEY_NOTIF, {
    enabled: true,
    time: '07:00',
  });
export const saveNotifSettings = (s: NotificationSettings) => write(KEY_NOTIF, s);

export const loadTab = <T extends string>(fallback: T): T => read<T>(KEY_TAB, fallback);
export const saveTab = (t: string) => write(KEY_TAB, t);

export const loadSelectedDate = (fallback: string): string =>
  read<string>(KEY_SELECTED_DATE, fallback);
export const saveSelectedDate = (d: string) => write(KEY_SELECTED_DATE, d);

export const loadDayMetas = (): Record<string, DayMeta> =>
  read<Record<string, DayMeta>>(KEY_DAY_META, {});
export const saveDayMetas = (m: Record<string, DayMeta>) => write(KEY_DAY_META, m);

export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const newId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
