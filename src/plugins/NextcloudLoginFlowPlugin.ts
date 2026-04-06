import { registerPlugin } from "@capacitor/core";

interface NextcloudLoginFlowPlugin {
  authenticate(options: {
    serverUrl: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    serverUrl: string;
    userId: string;
    loginName: string;
  }>;
  
  refreshToken(options: {
    serverUrl: string;
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  
  logout(): Promise<void>;
}

export const NextcloudLoginFlow = registerPlugin<NextcloudLoginFlowPlugin>("NextcloudLoginFlow");
