import {
  ensureGoogleAuthInitialized,
  connectGoogleDrive,
  disconnectGoogleDrive,
  getNativeStatus,
  getValidGoogleToken,
  uploadBackupFile,
  findLatestBackupFile,
  downloadBackupFileContent,
  getStoredAuth as getStoredGoogleAuth,
} from './googleDriveBackup';

export const initGoogleAuth = async (): Promise<void> => {
  await ensureGoogleAuthInitialized();
};

export const signInGoogle = async (): Promise<Record<string, unknown>> => {
  return await connectGoogleDrive();
};

export const getGoogleAuthStatus = async (): Promise<Record<string, unknown>> => {
  return await getNativeStatus();
};

export const getValidToken = async (): Promise<{ accessToken: string }> => {
  return await getValidGoogleToken();
};

export const refreshGoogleToken = async (): Promise<{ accessToken: string }> => {
  return await getValidGoogleToken();
};

export const isGoogleLoggedIn = async (): Promise<boolean> => {
  const status = await getNativeStatus();
  return !!status?.hasToken;
};

export const signOutGoogle = async (): Promise<void> => {
  await disconnectGoogleDrive();
};

export const backgroundTokenRefresh = async (): Promise<boolean> => false;

export const uploadOrUpdateFile = async (_accessToken: string, fileName: string, jsonContent: unknown): Promise<unknown> => {
  return await uploadBackupFile(fileName, jsonContent);
};

export const findLatestBackup = async (): Promise<Record<string, unknown> | null> => {
  return await findLatestBackupFile();
};

export const downloadFileContent = async (_accessToken: string, fileId: string): Promise<unknown> => {
  return await downloadBackupFileContent(fileId);
};

export { getStoredGoogleAuth };
