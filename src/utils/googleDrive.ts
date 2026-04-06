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

export const signInGoogle = async (): Promise<any> => {
  return await connectGoogleDrive();
};

export const getGoogleAuthStatus = async (): Promise<any> => {
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

export const backgroundTokenRefresh = async (): Promise<boolean> => {
  return false;
};

export const uploadOrUpdateFile = async (
  _accessToken: string,
  fileName: string,
  jsonContent: string
): Promise<any> => {
  return await uploadBackupFile(fileName, jsonContent);
};

export const findLatestBackup = async (): Promise<any> => {
  return await findLatestBackupFile();
};

export const downloadFileContent = async (
  _accessToken: string,
  fileId: string
): Promise<string> => {
  return await downloadBackupFileContent(fileId);
};

export { getStoredGoogleAuth };