import type { Command } from "commander";

export const SHELLS = ["bash", "zsh", "fish"] as const;
export type Shell = (typeof SHELLS)[number];

export function isShell(value: string): value is Shell {
  return (SHELLS as readonly string[]).includes(value);
}

interface Spec {
  name: string;
  global: string[];
  commands: { name: string; description: string; flags: string[] }[];
}

function flagsOf(cmd: Command): string[] {
  return cmd.options.flatMap((o) => (o.long ? [o.long] : []));
}

function collect(program: Command): Spec {
  return {
    name: program.name(),
    global: [...flagsOf(program), "--help", "--version"],
    commands: program.commands.map((c) => ({
      name: c.name(),
      description: c.description(),
      flags: [...flagsOf(c), "--help"],
    })),
  };
}

function bash(spec: Spec): string {
  const cases = spec.commands
    .map((c) => `    ${c.name}) opts="${c.flags.join(" ")}" ;;`)
    .join("\n");
  return `# bash completion for ${spec.name}
_${spec.name}() {
  local cur="\${COMP_WORDS[COMP_CWORD]}" cmd="" w opts
  for w in "\${COMP_WORDS[@]:1}"; do
    case "$w" in
      ${spec.commands.map((c) => c.name).join("|")}) cmd="$w"; break ;;
    esac
  done
  case "$cmd" in
${cases}
    *) opts="${[...spec.commands.map((c) => c.name), ...spec.global].join(" ")}" ;;
  esac
  COMPREPLY=($(compgen -W "$opts" -- "$cur"))
}
complete -F _${spec.name} ${spec.name}
`;
}

function zsh(spec: Spec): string {
  const esc = (s: string): string => s.replace(/'/g, "'\\''");
  const cmds = spec.commands
    .map((c) => `    '${c.name}:${esc(c.description).replace(/:/g, "\\:")}'`)
    .join("\n");
  const cases = spec.commands
    .map((c) => `    ${c.name}) _values 'options' ${c.flags.join(" ")} ;;`)
    .join("\n");
  return `#compdef ${spec.name}
_${spec.name}() {
  local -a commands
  commands=(
${cmds}
  )
  if (( CURRENT == 2 )); then
    _describe 'command' commands
    _values 'options' ${spec.global.join(" ")}
    return
  fi
  case "$words[2]" in
${cases}
  esac
}
_${spec.name} "$@"
`;
}

function fish(spec: Spec): string {
  const lines = [`# fish completion for ${spec.name}`];
  const names = spec.commands.map((c) => c.name).join(" ");
  for (const c of spec.commands) {
    lines.push(
      `complete -c ${spec.name} -n "not __fish_seen_subcommand_from ${names}" -a ${c.name} -d '${c.description.replace(/'/g, "\\'")}'`,
    );
  }
  for (const f of spec.global) {
    lines.push(`complete -c ${spec.name} -l ${f.slice(2)}`);
  }
  for (const c of spec.commands) {
    for (const f of c.flags) {
      lines.push(
        `complete -c ${spec.name} -n "__fish_seen_subcommand_from ${c.name}" -l ${f.slice(2)}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

/** Generate a completion script for the given shell from the program's commands and options. */
export function generateCompletion(program: Command, shell: Shell): string {
  const spec = collect(program);
  if (shell === "bash") return bash(spec);
  if (shell === "zsh") return zsh(spec);
  return fish(spec);
}
