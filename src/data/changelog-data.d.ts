declare module './changelog-data.js' {
  interface ChangelogEntry {
    version: string;
    date: string;
    title?: string;
    isMajor?: boolean;
    sections?: Array<{
      iconName: string;
      title: string;
      changes: string[];
    }>;
    changes?: string[];
  }
  export const CHANGELOG_DATA: ChangelogEntry[];
}