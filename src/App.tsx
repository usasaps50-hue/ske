import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  CheckCircle2,
  Package,
  Trash2,
  X,
  MoreVertical,
  Target,
  ListChecks,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  type EventItem,
  type ChecklistItem,
  type UserColor,
  ALL_USER_COLORS,
  type NotificationSettings,
  type DayMeta,
  loadEvents,
  saveEvents,
  loadNotifSettings,
  saveNotifSettings,
  loadTab,
  saveTab,
  loadSelectedDate,
  saveSelectedDate,
  loadDayMetas,
  saveDayMetas,
  toDateKey,
  fromDateKey,
  newId,
} from './storage';
import { requestPermission, checkPermission, rescheduleAll } from './notifications';

type AppTab = 'home' | 'settings';

const USER_COLOR_CLASS: Record<UserColor, string> = {
  me: 'bg-user-me text-user-me-text',
  a: 'bg-user-a text-user-a-text',
  b: 'bg-user-b text-user-b-text',
  c: 'bg-user-c text-user-c-text',
  d: 'bg-user-d text-user-d-text',
};

const USER_COLOR_LABEL: Record<UserColor, string> = {
  me: '自分',
  a: '家族A',
  b: '家族B',
  c: '家族C',
  d: '家族D',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function useEvents() {
  const [events, setEvents] = useState<EventItem[]>(() => loadEvents());
  useEffect(() => {
    saveEvents(events);
  }, [events]);
  return [events, setEvents] as const;
}

function useNotifSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(() => loadNotifSettings());
  useEffect(() => {
    saveNotifSettings(settings);
  }, [settings]);
  return [settings, setSettings] as const;
}

function useDayMetas() {
  const [metas, setMetas] = useState<Record<string, DayMeta>>(() => loadDayMetas());
  useEffect(() => {
    saveDayMetas(metas);
  }, [metas]);
  return [metas, setMetas] as const;
}

const MonthlyCalendar = ({
  events,
  viewMonth,
  onChangeMonth,
  onOpenDay,
  onAddEvent,
}: {
  events: EventItem[];
  viewMonth: Date;
  onChangeMonth: (d: Date) => void;
  onOpenDay: (dateKey: string) => void;
  onAddEvent: (dateKey: string) => void;
}) => {
  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const todayKey = toDateKey(today);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const lastTapRef = useRef<{ key: string; time: number } | null>(null);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = useMemo(() => {
    const arr: { date: Date; inMonth: boolean; key: string }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(year, month, i - startOffset + 1);
      arr.push({ date: d, inMonth: d.getMonth() === month, key: toDateKey(d) });
    }
    return arr;
  }, [year, month, startOffset, totalCells]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of events) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return m;
  }, [events]);

  const handleDayTap = (key: string) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.key === key && now - last.time < 400) {
      lastTapRef.current = null;
      setHighlightKey(null);
      onOpenDay(key);
    } else {
      lastTapRef.current = { key, time: now };
      setHighlightKey(key);
      setTimeout(() => {
        setHighlightKey((k) => (k === key ? null : k));
      }, 420);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-4 pt-6 pb-2 flex justify-between items-center border-b border-border-theme">
        <h1 className="text-sm font-bold">
          {year}年 {month + 1}月
        </h1>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => onChangeMonth(new Date())}
            className="text-[9px] font-bold text-primary mr-2 px-2 py-1 font-mono tabular-nums"
          >
            {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日({WEEKDAYS[today.getDay()]}) {String(today.getHours()).padStart(2, '0')}:{String(today.getMinutes()).padStart(2, '0')}:{String(today.getSeconds()).padStart(2, '0')}
          </button>
          <button
            onClick={() => onChangeMonth(new Date(year, month - 1, 1))}
            className="p-1 hover:bg-zinc-100 rounded"
          >
            <ChevronLeft size={16} className="text-text-muted" />
          </button>
          <button
            onClick={() => onChangeMonth(new Date(year, month + 1, 1))}
            className="p-1 hover:bg-zinc-100 rounded"
          >
            <ChevronRight size={16} className="text-text-muted" />
          </button>
        </div>
      </header>

      <div className="px-4 py-1 text-[9px] text-text-muted">
        日付をダブルタップで詳細を開きます
      </div>

      <div className="grid grid-cols-7 border-b border-border-theme bg-zinc-50 py-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[9px] font-bold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-text-muted'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 auto-rows-[minmax(64px,_1fr)] gap-px bg-border-theme h-full">
          {cells.map(({ date, inMonth, key }) => {
            const isToday = key === todayKey;
            const isHighlight = highlightKey === key;
            const dayEvents = eventsByDate.get(key) ?? [];
            return (
              <button
                key={key}
                onClick={() => handleDayTap(key)}
                className={`p-1 flex flex-col gap-0.5 relative text-left transition-colors ${
                  !inMonth ? 'bg-zinc-50 opacity-40' : 'bg-white'
                } ${isHighlight ? 'bg-blue-100' : ''}`}
              >
                <span
                  className={`text-[9px] font-bold ml-0.5 mt-0.5 ${
                    isToday ? 'text-primary' : 'text-text-main'
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`${USER_COLOR_CLASS[event.userColor]} text-[7px] font-bold px-1 py-0.5 rounded-[2px] truncate flex items-center gap-0.5 leading-tight`}
                    >
                      {event.items.length > 0 && <Package size={6} />}
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[7px] text-text-muted font-bold px-1">
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onAddEvent(todayKey)}
        className="fixed bottom-24 right-6 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-10"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

const DayDetailModal = ({
  selectedDate,
  events,
  dayMeta,
  onUpdateDayMeta,
  onClose,
  onEditEvent,
  onAddEvent,
  onToggleItem,
  onDeleteEvent,
}: {
  selectedDate: string;
  events: EventItem[];
  dayMeta: DayMeta;
  onUpdateDayMeta: (updater: (prev: DayMeta) => DayMeta) => void;
  onClose: () => void;
  onEditEvent: (e: EventItem) => void;
  onAddEvent: () => void;
  onToggleItem: (eventId: string, itemId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}) => {
  const date = fromDateKey(selectedDate);
  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    const t = newTodo.trim();
    if (!t) return;
    onUpdateDayMeta((prev) => ({
      ...prev,
      todos: [...prev.todos, { id: newId(), text: t, completed: false }],
    }));
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    onUpdateDayMeta((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  };

  const removeTodo = (id: string) => {
    onUpdateDayMeta((prev) => ({ ...prev, todos: prev.todos.filter((t) => t.id !== id) }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[430px] rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
      >
        <header className="px-4 py-3 border-b border-border-theme flex justify-between items-center shrink-0">
          <h2 className="text-sm font-bold">
            {date.getMonth() + 1}月{date.getDate()}日 ({WEEKDAYS[date.getDay()]})
          </h2>
          <button onClick={onClose} className="p-1">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <section>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={12} className="text-primary" />
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                今日の目標
              </span>
            </div>
            <input
              value={dayMeta.goal}
              onChange={(e) =>
                onUpdateDayMeta((prev) => ({ ...prev, goal: e.target.value }))
              }
              placeholder="例: 早く寝る / 水をたくさん飲む"
              className="w-full text-[12px] font-medium border border-border-theme rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            />
          </section>

          <section>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ListChecks size={12} className="text-primary" />
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                やること
              </span>
            </div>
            <div className="space-y-1.5">
              {dayMeta.todos.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTodo(t.id)}
                    className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 ${
                      t.completed ? 'bg-primary border-primary' : 'border-border-theme'
                    }`}
                  >
                    {t.completed && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                  <span
                    className={`flex-1 text-[11px] ${
                      t.completed ? 'text-text-muted line-through' : 'font-medium'
                    }`}
                  >
                    {t.text}
                  </span>
                  <button
                    onClick={() => removeTodo(t.id)}
                    className="p-1 text-text-muted hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTodo();
                    }
                  }}
                  placeholder="やることを追加..."
                  className="flex-1 text-[11px] border border-border-theme rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={addTodo}
                  className="px-3 bg-primary text-white rounded-lg text-[11px] font-bold"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <CalendarIcon size={12} className="text-primary" />
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  予定
                </span>
              </div>
            </div>
            {dayEvents.length === 0 && (
              <div className="text-[10px] text-text-muted py-2">予定はまだありません</div>
            )}
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-border-theme rounded-xl overflow-hidden"
                >
                  <div
                    className={`${USER_COLOR_CLASS[event.userColor]} px-3 py-2 flex justify-between items-center`}
                  >
                    <div className="flex-1">
                      <div className="text-[9px] font-bold opacity-70">{event.time}</div>
                      <div className="text-[13px] font-bold">{event.title}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditEvent(event)}
                        className="p-1.5 hover:bg-black/10 rounded"
                      >
                        <MoreVertical size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`「${event.title}」を削除しますか？`))
                            onDeleteEvent(event.id);
                        }}
                        className="p-1.5 hover:bg-black/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {event.items.length > 0 && (
                    <div className="bg-white px-3 py-2 space-y-1.5">
                      <div className="text-[8px] font-bold text-text-muted uppercase tracking-wider">
                        持っていくもの
                      </div>
                      {event.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onToggleItem(event.id, item.id)}
                      className="flex items-center gap-2 w-full text-left py-0.5"
                    >
                      <div
                        className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                          item.completed ? 'bg-primary border-primary' : 'border-border-theme'
                        }`}
                      >
                        {item.completed && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span
                        className={`text-[11px] ${
                          item.completed ? 'text-text-muted line-through' : 'font-medium'
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="px-4 py-3 border-t border-border-theme shrink-0">
          <button
            onClick={onAddEvent}
            className="w-full bg-primary text-white text-[12px] font-bold py-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> 予定を追加
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};

const EventEditor = ({
  initial,
  defaultDate,
  onClose,
  onSave,
}: {
  initial: EventItem | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (e: EventItem) => void;
}) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [time, setTime] = useState(initial?.time ?? '09:00');
  const [userColor, setUserColor] = useState<UserColor>(initial?.userColor ?? 'me');
  const [items, setItems] = useState<ChecklistItem[]>(initial?.items ?? []);
  const [newItemText, setNewItemText] = useState('');

  const addItem = () => {
    const t = newItemText.trim();
    if (!t) return;
    setItems([...items, { id: newId(), text: t, completed: false }]);
    setNewItemText('');
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    onSave({
      id: initial?.id ?? newId(),
      date,
      time,
      title: title.trim(),
      userColor,
      items,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[430px] rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
      >
        <header className="sticky top-0 bg-white px-4 py-3 border-b border-border-theme flex justify-between items-center z-10">
          <h2 className="text-sm font-bold">{initial ? '予定を編集' : '予定を追加'}</h2>
          <button onClick={onClose} className="p-1">
            <X size={18} />
          </button>
        </header>

        <div className="px-4 py-4 space-y-4">
          <label className="block">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
              タイトル
            </span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 家族会議"
              className="mt-1 w-full text-[13px] font-medium border border-border-theme rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                日付
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full text-[12px] font-medium border border-border-theme rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                時間
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full text-[12px] font-medium border border-border-theme rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
              />
            </label>
          </div>

          <div>
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
              持っていくもの
            </span>
            <div className="mt-1 space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    value={item.text}
                    onChange={(e) => {
                      const copy = [...items];
                      copy[idx] = { ...item, text: e.target.value };
                      setItems(copy);
                    }}
                    className="flex-1 text-[12px] border border-border-theme rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="p-1.5 text-text-muted hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="追加..."
                  className="flex-1 text-[12px] border border-border-theme rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={addItem}
                  className="px-3 bg-primary text-white rounded-lg text-[11px] font-bold"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 bg-white px-4 py-3 border-t border-border-theme">
          <button
            onClick={handleSave}
            className="w-full bg-primary text-white text-[12px] font-bold py-3 rounded-lg shadow-sm"
          >
            保存
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};


const SettingsScreen = ({
  settings,
  onChange,
  onRequestPermission,
  permissionGranted,
}: {
  settings: NotificationSettings;
  onChange: (s: NotificationSettings) => void;
  onRequestPermission: () => void;
  permissionGranted: boolean;
}) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto pb-24 no-scrollbar">
      <header className="px-4 pt-6 pb-2 border-b border-border-theme">
        <h2 className="text-sm font-bold">通知設定</h2>
      </header>

      <div className="px-4 py-6 space-y-6">
        <section>
          <div
            className={`border rounded-xl p-3 flex items-center gap-3 ${
              permissionGranted ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <Bell
              size={20}
              className={permissionGranted ? 'text-green-600' : 'text-amber-600'}
            />
            <div className="flex-1">
              <div className="text-[11px] font-bold">
                {permissionGranted ? '通知を許可済み' : '通知が未許可'}
              </div>
              <div className="text-[9px] text-text-muted mt-0.5">
                {permissionGranted
                  ? '予定の通知が届きます'
                  : 'タップしてシステムに通知を許可してください'}
              </div>
            </div>
            {!permissionGranted && (
              <button
                onClick={onRequestPermission}
                className="text-[10px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg"
              >
                許可する
              </button>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-[8px] font-bold text-text-muted uppercase tracking-wider mb-2">
            毎日のまとめ通知
          </h3>
          <div className="divide-y divide-border-theme border-y border-border-theme">
            <div className="flex items-center justify-between py-3">
              <span className="text-[11px] font-bold">通知を有効にする</span>
              <button
                onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  settings.enabled ? 'bg-primary' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
                    settings.enabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            {settings.enabled && (
              <div className="flex items-center justify-between py-3">
                <span className="text-[11px] font-bold">通知時刻</span>
                <input
                  type="time"
                  value={settings.time}
                  onChange={(e) => onChange({ ...settings, time: e.target.value })}
                  className="text-[12px] font-bold border border-border-theme rounded-lg px-2 py-1"
                />
              </div>
            )}
          </div>
          <p className="text-[9px] text-text-muted mt-2 leading-relaxed">
            設定した時刻に「今日の目標 / 予定 / やること / 持っていくもの」をまとめて1通で通知します。
          </p>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const t = loadTab<AppTab>('home');
    return t === 'home' || t === 'settings' ? t : 'home';
  });
  const [events, setEvents] = useEvents();
  const [settings, setSettings] = useNotifSettings();
  const [dayMetas, setDayMetas] = useDayMetas();
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    loadSelectedDate(toDateKey(new Date())),
  );
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; initial: EventItem | null }>({
    open: false,
    initial: null,
  });
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    saveTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveSelectedDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    checkPermission().then(setPermissionGranted);
  }, []);

  useEffect(() => {
    if (permissionGranted) rescheduleAll(events, dayMetas, settings);
  }, [events, dayMetas, settings, permissionGranted]);

  const handleSaveEvent = useCallback(
    (e: EventItem) => {
      setEvents((prev) => {
        const existing = prev.findIndex((x) => x.id === e.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = e;
          return copy;
        }
        return [...prev, e];
      });
      setSelectedDate(e.date);
      setEditor({ open: false, initial: null });
    },
    [setEvents],
  );

  const handleDeleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [setEvents],
  );

  const handleToggleItem = useCallback(
    (eventId: string, itemId: string) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id !== eventId
            ? e
            : {
                ...e,
                items: e.items.map((i) =>
                  i.id === itemId ? { ...i, completed: !i.completed } : i,
                ),
              },
        ),
      );
    },
    [setEvents],
  );

  const updateDayMeta = useCallback(
    (dateKey: string, updater: (prev: DayMeta) => DayMeta) => {
      setDayMetas((prev) => {
        const current: DayMeta = prev[dateKey] ?? { date: dateKey, goal: '', todos: [] };
        const next = updater(current);
        return { ...prev, [dateKey]: next };
      });
    },
    [setDayMetas],
  );

  const handleRequestPermission = useCallback(async () => {
    const ok = await requestPermission();
    setPermissionGranted(ok);
    if (!ok) alert('iOSの設定アプリから通知を許可してください');
  }, []);

  const handleOpenDay = useCallback((key: string) => {
    setSelectedDate(key);
    setDetailDate(key);
  }, []);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white shadow-2xl relative flex flex-col overflow-hidden font-sans border-x border-border-theme">
      <div className="h-10 px-6 bg-white shrink-0 border-b border-border-theme" />

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            {activeTab === 'home' && (
              <MonthlyCalendar
                events={events}
                viewMonth={viewMonth}
                onChangeMonth={setViewMonth}
                onOpenDay={handleOpenDay}
                onAddEvent={(dateKey) => {
                  setSelectedDate(dateKey);
                  setEditor({ open: true, initial: null });
                }}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsScreen
                settings={settings}
                onChange={setSettings}
                onRequestPermission={handleRequestPermission}
                permissionGranted={permissionGranted}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {detailDate && !editor.open && (
            <DayDetailModal
              selectedDate={detailDate}
              events={events}
              dayMeta={dayMetas[detailDate] ?? { date: detailDate, goal: '', todos: [] }}
              onUpdateDayMeta={(updater) => updateDayMeta(detailDate, updater)}
              onClose={() => setDetailDate(null)}
              onEditEvent={(e) => setEditor({ open: true, initial: e })}
              onAddEvent={() => setEditor({ open: true, initial: null })}
              onToggleItem={handleToggleItem}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editor.open && (
            <EventEditor
              initial={editor.initial}
              defaultDate={selectedDate}
              onClose={() => setEditor({ open: false, initial: null })}
              onSave={handleSaveEvent}
            />
          )}
        </AnimatePresence>
      </main>

      <nav className="h-16 bg-white border-t border-border-theme flex items-center justify-around px-4 shrink-0 z-40">
        {[
          { id: 'home' as const, icon: CalendarIcon, label: 'カレンダー' },
          { id: 'settings' as const, icon: Settings, label: '設定' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeTab === tab.id ? 'text-primary' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <tab.icon size={18} />
            <span className="text-[9px] font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
