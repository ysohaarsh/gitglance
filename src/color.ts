export interface Painter {
  green(text: string): string;
  red(text: string): string;
  yellow(text: string): string;
  bold(text: string): string;
  dim(text: string): string;
}

/**
 * Decide whether to emit ANSI colors. Follows the NO_COLOR convention
 * (any non-empty value disables color), FORCE_COLOR, then falls back to
 * whether stdout is a terminal that is not "dumb".
 */
export function shouldColor(
  env: NodeJS.ProcessEnv = process.env,
  isTTY: boolean = process.stdout.isTTY === true,
): boolean {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "") {
    return env.FORCE_COLOR !== "0";
  }
  return isTTY && env.TERM !== "dumb";
}

function wrap(open: number, close: number): (text: string) => string {
  return (text) => `\u001b[${open}m${text}\u001b[${close}m`;
}

const identity = (text: string): string => text;

/** A painter that returns text unchanged. */
export const plain: Painter = {
  green: identity,
  red: identity,
  yellow: identity,
  bold: identity,
  dim: identity,
};

/** Create a painter; when disabled it is the no-op `plain` painter. */
export function createPainter(enabled: boolean): Painter {
  if (!enabled) return plain;
  return {
    green: wrap(32, 39),
    red: wrap(31, 39),
    yellow: wrap(33, 39),
    bold: wrap(1, 22),
    dim: wrap(2, 22),
  };
}
