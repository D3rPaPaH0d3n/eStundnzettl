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
  androidSdk?: number;
  device?: string;
  aicoreInstalled: boolean;
  aicoreVersion?: string | null;
  speechAdvanced: NanoFeatureDiagnostic;
  prompt: NanoFeatureDiagnostic;
}

export interface NanoPromptSmokeTestResult {
  text: string;
}

export interface NanoSpeechRecognitionResult {
  text: string;
}

export interface NanoDiagnosticsPlugin {
  getStatus(): Promise<NanoDiagnosticsResult>;
  downloadSpeechAdvanced(): Promise<void>;
  downloadPrompt(): Promise<void>;
  runPromptSmokeTest(): Promise<NanoPromptSmokeTestResult>;
  recognizeSpeech(): Promise<NanoSpeechRecognitionResult>;
}

export const NanoDiagnostics =
  registerPlugin<NanoDiagnosticsPlugin>("NanoDiagnostics");
