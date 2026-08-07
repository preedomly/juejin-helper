export async function wait(time = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function randomRangeNumber(start = 500, end = 1000): number {
  return (Math.random() * (end - start) + start) >> 0;
}

export function getUsersCookie(env: Record<string, string | undefined>): string[] {
  const users = [env.COOKIE];

  const keys = Object.keys(env).filter(key => key.match(/^COOKIE_([0-9])+$/));
  keys.forEach(key => users.push(env[key]));

  return users.filter((cookie): cookie is string => !!cookie);
}