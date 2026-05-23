import { registerPlugin } from "@capacitor/core";

export type NanoFeatureStatus =
  | "AVAILABLE"
  | "DOWNLOADABLE"
  | "DOWNLOADING"
  | "UNAVAILABLE"
  | "ERROR"
  | string;

export interface NanoFeatureDiagnostic {
  status: NanoFeatureStatus;
  error?: string;
}

export interface NanoDiagnosticsResult {
  speechAdvanced: NanoFeatureDiagnostic;
}

export interface NanoPromptSmokeTestResult {
  text: string;
}

export interface NanoSpeechRecognitionResult {
  text: string;
}

export interface NanoEntrySpeechParseRequest {
  text: string;
  date: string;
  workCodes: Array<{ id: number; label: string }>;
  existingProjects?: string[];
}

export interface NanoEntrySpeechParseResult {
  type?: "work" | "drive" | "vacation" | "sick" | "time_comp";
  date?: string;
  start?: string;
  end?: string;
  pause?: number;
  project?: string;
  codeId?: number;
  specialManualMode?: boolean;
  confidence?: "high" | "medium" | "low";
  rawText?: string;
}

export interface NanoDiagnosticsPlugin {
  getStatus(): Promise<NanoDiagnosticsResult>;
  downloadSpeechAdvanced(): Promise<void>;
  downloadPrompt(): Promise<void>;
  runPromptSmokeTest(): Promise<NanoPromptSmokeTestResult>;
  recognizeSpeech(): Promise<NanoSpeechRecognitionResult>;
  parseEntrySpeech(options: NanoEntrySpeechParseRequest): Promise<NanoEntrySpeechParseResult>;
}

export const NanoDiagnostics =
  registerPlugin<NanoDiagnosticsPlugin>("NanoDiagnostics");
