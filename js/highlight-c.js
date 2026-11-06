document.addEventListener("DOMContentLoaded", function () {
  const keywords = new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if",
    "inline", "int", "long", "register", "restrict", "return", "short",
    "signed", "sizeof", "static", "struct", "switch", "typedef", "union",
    "unsigned", "void", "volatile", "while", "_Bool", "_Complex", "_Imaginary"
  ]);
  const types = new Set(["size_t", "ptrdiff_t", "FILE", "NULL"]);
  const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|^[ \t]*#\s*[A-Za-z_]\w*[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|\b\d+(?:\.\d+)?(?:[uUlLfF]*)\b|[^\s]/gm;

  document.querySelectorAll("article.language-c pre code").forEach(function (code) {
    const source = code.textContent;
    const fragment = document.createDocumentFragment();
    let match;
    let cursor = 0;

    tokens.lastIndex = 0;
    while ((match = tokens.exec(source)) !== null) {
      if (match.index > cursor) {
        fragment.append(document.createTextNode(source.slice(cursor, match.index)));
      }

      const token = match[0];
      let className = "";

      if (token.startsWith("//") || token.startsWith("/*")) {
        className = "code-comment";
      } else if (token.startsWith("#")) {
        className = "code-preprocessor";
      } else if (token.startsWith('"') || token.startsWith("'")) {
        className = "code-string";
      } else if (keywords.has(token)) {
        className = "code-keyword";
      } else if (types.has(token)) {
        className = "code-type";
      } else if (/^\d/.test(token)) {
        className = "code-number";
      } else if (/^[A-Z_][A-Z_0-9]*$/.test(token)) {
        className = "code-constant";
      } else if (/^[A-Za-z_]\w*$/.test(token) && /^\s*\(/.test(source.slice(tokens.lastIndex))) {
        className = "code-function";
      }

      if (className) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = token;
        fragment.append(span);
      } else {
        fragment.append(document.createTextNode(token));
      }
      cursor = tokens.lastIndex;
    }

    if (cursor < source.length) {
      fragment.append(document.createTextNode(source.slice(cursor)));
    }

    code.replaceChildren(fragment);
  });
});
