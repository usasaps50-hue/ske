import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { EventItem, NotificationSettings, DayMeta } from './storage';

const isNative = () => Capacitor.isNativePlatform();

export async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const res = await LocalNotifications.requestPermissions();
  return res.display === 'granted';
}

export async function checkPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const res = await LocalNotifications.checkPermissions();
  return res.display === 'granted';
}

async function cancelAll() {
  if (!isNative()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}

function hashId(s: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647;
}

export async function rescheduleAll(
  events: EventItem[],
  dayMetas: Record<string, DayMeta>,
  settings: NotificationSettings,
) {
  if (!isNative()) return;
  await cancelAll();

  if (!settings.enabled) return;

  const now = new Date();
  const toSchedule: ScheduleOptions['notifications'] = [];

  const [hh, mm] = settings.time.split(':').map(Number);
  for (let d = 0; d < 14; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    day.setHours(hh, mm, 0, 0);
    if (day.getTime() <= now.getTime()) continue;

    const dateKey =
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    const todays = events
      .filter((e) => e.date === dateKey)
      .sort((a, b) => a.time.localeCompare(b.time));
    const meta = dayMetas[dateKey];
    const goal = meta?.goal?.trim() ?? '';
    const todos = (meta?.todos ?? []).filter((t) => !t.completed).map((t) => t.text);
    const items = (meta?.items ?? []).filter((i) => !i.completed).map((i) => i.text);

    if (!goal && todos.length === 0 && todays.length === 0 && items.length === 0) continue;

    const lines: string[] = [];
    lines.push('おはようございます☀');
    if (goal) lines.push(`今日の目標: ${goal}`);
    if (todays.length > 0) {
      const titles = todays.map((e) => `${e.time} ${e.title}`).join('、');
      lines.push(`予定: ${titles}`);
    }
    if (todos.length > 0) lines.push(`やること: ${todos.join('、')}`);
    if (items.length > 0) lines.push(`持っていくもの: ${items.join('、')}`);
    lines.push('いい一日を🌸');

    toSchedule.push({
      id: hashId(dateKey, 2),
      title: '今日のまとめ',
      body: lines.join('\n'),
      schedule: { at: day },
    });
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
}
