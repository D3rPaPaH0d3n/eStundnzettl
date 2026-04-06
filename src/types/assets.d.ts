declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.css';

interface ImportMeta {
  readonly env: Record<string, string | boolean | undefined> & { DEV: boolean };
}
