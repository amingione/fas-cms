declare module '@tsparticles/slim' {
  import type { Engine } from '@tsparticles/engine';
  export function loadSlim(engine: Engine): Promise<void>;
}

