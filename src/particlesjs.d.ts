declare module 'particles.js' {
  interface ParticlesJSConfig {
    particles?: any;
    interactivity?: any;
  }

  export function particlesJS(tagId: string, params: ParticlesJSConfig): void;

  export function particlesJS(tagId: string, path: string, callback?: () => void): void;

  declare global {
    interface Window {
      particlesJS: typeof import('particles.js').particlesJS;
    }
  }
}
