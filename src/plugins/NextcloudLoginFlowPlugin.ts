import { registerPlugin } from "@capacitor/core";

export interface NextcloudLoginFlowResult {
  server: string;
  loginName: string;
  appPassword: string;
}

export interface NextcloudHttpRequestOptions {
  url: string;
  method: string;
  username: string;
  password: string;
  body?: string;
  bodyBase64?: string;
  contentType?: string;
}

export interface NextcloudHttpRequestResult {
  ok: boolean;
  status: number;
  body?: string;
  error?: { code: string; message: string };
}

export interface NextcloudLoginFlowPlugin {
  startLoginFlow(options: { url: string }): Promise<NextcloudLoginFlowResult & { ok: boolean }>;
  pollLoginFlow(options: { pollEndpoint: string; token: string }): Promise<NextcloudLoginFlowResult & { ok: boolean; status?: string }>;
  httpRequest(options: NextcloudHttpRequestOptions): Promise<NextcloudHttpRequestResult>;
}

export const NextcloudLoginFlow = registerPlugin<NextcloudLoginFlowPlugin>("NextcloudLoginFlow");
