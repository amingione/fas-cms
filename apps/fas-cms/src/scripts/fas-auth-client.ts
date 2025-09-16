const MAX_WAIT = 40;
const WAIT_MS = 100;

export async function getFasAuthClient(): Promise<any | null> {
  let attempts = 0;
  while (!(window as any).fasAuth && attempts < MAX_WAIT) {
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    attempts += 1;
  }
  return (window as any).fasAuth || null;
}
