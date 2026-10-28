export interface ConventionalCommit {
  type: string;
  scope: string | null;
  breaking: boolean;
  description: string;
  body: string;
}

const HEADER = /^([A-Za-z]+)(?:\(([^()\r\n]*)\))?(!)?:[ \t]+(.+)$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:[ \t]+\S/m;

/**
 * Parse a commit message as a Conventional Commit.
 * Returns null when the subject line does not follow the format.
 */
export function parseConventionalCommit(
  message: string,
): ConventionalCommit | null {
  const normalized = message.replace(/\r\n/g, "\n").trim();
  const newline = normalized.indexOf("\n");
  const subject = (
    newline === -1 ? normalized : normalized.slice(0, newline)
  ).trim();
  const body = newline === -1 ? "" : normalized.slice(newline + 1).trim();

  const match = HEADER.exec(subject);
  if (!match) return null;

  const [, type = "", scope, bang, description = ""] = match;
  return {
    type: type.toLowerCase(),
    scope: scope && scope.trim().length > 0 ? scope.trim() : null,
    breaking: bang === "!" || BREAKING_FOOTER.test(body),
    description: description.trim(),
    body,
  };
}
