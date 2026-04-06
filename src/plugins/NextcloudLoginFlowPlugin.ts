import { registerPlugin } from "@capacitor/core";

export interface NextcloudLoginFlowResult {
  server: string;
  loginName: string;
  appPassword: string;
}

export interface NextcloudLoginFlowPlugin {
  startLoginFlow(options: { url: string }): Promise<NextcloudLoginFlowResult>;
}

export const NextcloudLoginFlow = registerPlugin<NextcloudLoginFlowPlugin>("NextcloudLoginFlow");
