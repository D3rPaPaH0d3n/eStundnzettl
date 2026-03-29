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

export const initGoogleAuth = async () => {
  await ensureGoogleAuthInitialized();
};

export const signInGoogle = async () => {
  return await connectGoogleDrive();
};

export const getGoogleAuthStatus = async () => {
  return await getNativeStatus();
};

export const getValidToken = async () => {
  return await getValidGoogleToken();
};

export const refreshGoogleToken = async () => {
  return await getValidGoogleToken();
};

export const isGoogleLoggedIn = async () => {
  const status = await getNativeStatus();
  return !!status?.hasToken;
};

export const signOutGoogle = async () => {
  await disconnectGoogleDrive();
};

export const backgroundTokenRefresh = async () => false;

export const uploadOrUpdateFile = async (_accessToken, fileName, jsonContent) => {
  return await uploadBackupFile(fileName, jsonContent);
};

export const findLatestBackup = async () => {
  return await findLatestBackupFile();
};

export const downloadFileContent = async (_accessToken, fileId) => {
  return await downloadBackupFileContent(fileId);
};

export { getStoredGoogleAuth };
