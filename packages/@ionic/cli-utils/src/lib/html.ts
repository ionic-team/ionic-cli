export function injectScript(content: string, code: string): string {
  let match = content.match(/<\/body>(?![\s\S]*<\/body>)/i);

  if (!match) {
    match = content.match(/<\/html>(?![\s\S]*<\/html>)/i);
  }

  if (match) {
    content = content.replace(match[0], `${code}${match[0]}`);
  } else {
    content += code;
  }

  return content;
}
