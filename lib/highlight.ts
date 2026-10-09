import type { CodeBlock } from "./types";

// A tiny, dependency-free tokenizer: enough to colour keywords, strings, numbers,
// function calls and comments in the short snippets the rounds use.

export type TokenKind = "key" | "str" | "num" | "fn" | "cmt" | "plain";

export interface Token {
  text: string;
  kind: TokenKind;
}

type Lang = CodeBlock["lang"];

const JS_KEYWORDS = new Set([
  "let", "const", "var", "function", "return", "if", "else", "for", "while", "do",
  "break", "continue", "switch", "case", "default", "new", "class", "extends",
  "import", "export", "from", "async", "await", "try", "catch", "finally", "throw",
  "typeof", "instanceof", "in", "of", "true", "false", "null", "undefined", "this",
]);

const PY_KEYWORDS = new Set([
  "def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or",
  "is", "None", "True", "False", "import", "from", "as", "class", "pass", "break",
  "continue", "try", "except", "finally", "raise", "with", "lambda",
]);

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  "JOIN", "LEFT", "RIGHT", "INNER", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT",
  "AND", "OR", "NOT", "NULL", "AS", "COUNT", "DISTINCT", "CREATE", "TABLE",
]);

const KEYWORDS: Record<Lang, Set<string>> = {
  js: JS_KEYWORDS,
  py: PY_KEYWORDS,
  sql: SQL_KEYWORDS,
  html: new Set(),
};

const COMMENT: Record<Lang, string | null> = {
  js: "//",
  py: "#",
  sql: "--",
  html: null,
};

const isDigit = (c: string) => c >= "0" && c <= "9";
const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c);
const isIdentPart = (c: string) => /[\w$]/.test(c);
const isQuote = (c: string) => c === '"' || c === "'" || c === "`";

export function tokenizeLine(line: string, lang: Lang): Token[] {
  const keywords = KEYWORDS[lang];
  const comment = COMMENT[lang];
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (comment && line.startsWith(comment, i)) {
      tokens.push({ text: line.slice(i), kind: "cmt" });
      break;
    }

    if (isQuote(ch)) {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), kind: "str" });
      i = j + 1;
      continue;
    }

    if (isDigit(ch)) {
      let j = i + 1;
      while (j < line.length && (isDigit(line[j]) || line[j] === ".")) j++;
      tokens.push({ text: line.slice(i, j), kind: "num" });
      i = j;
      continue;
    }

    if (isIdentStart(ch)) {
      let j = i + 1;
      while (j < line.length && isIdentPart(line[j])) j++;
      const word = line.slice(i, j);
      let k = j;
      while (line[k] === " ") k++;
      const lookup = lang === "sql" ? word.toUpperCase() : word;
      const kind: TokenKind = keywords.has(lookup) ? "key" : line[k] === "(" ? "fn" : "plain";
      tokens.push({ text: word, kind });
      i = j;
      continue;
    }

    // Whitespace and punctuation: take a run of them as one plain token.
    let j = i + 1;
    while (
      j < line.length &&
      !isDigit(line[j]) &&
      !isIdentStart(line[j]) &&
      !isQuote(line[j]) &&
      !(comment && line.startsWith(comment, j))
    ) {
      j++;
    }
    tokens.push({ text: line.slice(i, j), kind: "plain" });
    i = j;
  }

  return tokens;
}
