// Zentrale Type-Definitionen für eStundnzettl

export interface TimeEntry {
  id: number;
  date: Date;
  start: Date;
  end: Date;
  pauseMinutes: number;
  workCodeId: string | null;
  code?: number; // Alias für workCodeId als number (für Kompatibilität)
  type?: string; // 'work', 'vacation', 'sick', etc.
  project?: string; // Projektname
  description: string;
  attachments: string[]; // Array von Attachment-IDs
  netDuration?: number; // Berechnete Nettodauer in Minuten
  createdAt: Date;
  updatedAt: Date;
}

// Alias für Kompatibilität mit bestehendem Code
// Note: In reality, Entry should be phased out in favor of TimeEntry
export type Entry = TimeEntry;

export interface WorkCode {
  id: string;
  code: string;
  description: string;
  label?: string; // Alias für description (für Kompatibilität)
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Alias für Kompatibilität mit bestehendem Code
export type WorkCodeItem = WorkCode;
export type SimpleWorkCode = WorkCode; // Simplified: just use WorkCode

export interface Attachment {
  id: string;
  entryId: number;
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // Base64 encoded (optional, falls im Dateisystem gespeichert)
  storagePath?: string; // Pfad im Dateisystem (optional)
  label?: string; // Benutzerdefinierte Beschreibung
  createdAt: Date;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  company: string;
  role: string;
  hourlyRate: number;
  workHoursPerDay: number;
  workHoursPerWeek: number;
}

export interface BackupMetadata {
  id: string;
  type: 'google-drive' | 'nextcloud' | 'local';
  timestamp: Date;
  size: number;
  entryCount: number;
  successful: boolean;
  error?: string;
}

export interface NextcloudConfig {
  baseUrl: string;
  username: string;
  password?: string;
  token?: string;
  webdavPath: string;
}

export interface GoogleDriveConfig {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'de' | 'en';
export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

// UI State Types
export interface AppState {
  isOnboardingComplete: boolean;
  isSQLiteActive: boolean;
  isDemoMode: boolean;
  theme: Theme;
  language: Language;
  lastBackup: Date | null;
}

// Action Hook Types - DEPRECATED: Use TimeEntry instead
// Keeping for backward compatibility during migration
export interface LegacyEntry {
  id: number;
  type: 'work' | 'vacation' | 'sick' | 'time_comp';
  date: string;
  start: string | null;
  end: string | null;
  pause: number;
  project: string;
  code: number | null;
  netDuration: number;
}



export interface UserData {
  name: string;
  position: string;
  photo: string | null;
  workDays: number[];
  company?: string;
  workModelId?: string;
  settings?: {
    autoBackup?: boolean;
  };
}

export interface DeleteTarget {
  type: 'single' | 'all';
  id?: number;
}

export interface FormState {
  formDate: string;
  entryType: string;
  startTime: string;
  endTime: string;
  pauseDuration: number;
  project: string;
  code: number;
  editingEntry: Entry | null;
  isLiveEntry: boolean;
  specialManualMode?: boolean;
  setFormDate: (date: string) => void;
  setEntryType: (type: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setPauseDuration: (duration: number) => void;
  setProject: (project: string) => void;
  setCode: (code: number) => void;
  setEditingEntry: (entry: Entry | null) => void;
  setIsLiveEntry: (isLive: boolean) => void;
  setSpecialManualMode?: (mode: boolean) => void;
  resetForm: () => void;
  startEdit: (entry: Entry) => void;
}

export interface TimerResult {
  start: Date;
  end: Date;
  pause: number;
}

// Utility Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;