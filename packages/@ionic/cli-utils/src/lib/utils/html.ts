import * as parse5 from 'parse5';

export function findElementByTag(nodes: parse5.AST.Default.Element[], tag: string): parse5.AST.Default.Element | undefined {
  return nodes.find(n => n.tagName === tag) as parse5.AST.Default.Element;
}

export function findElementsByTag(nodes: parse5.AST.Default.Element[], tag: string): parse5.AST.Default.Element[] {
  return nodes.filter(n => n.tagName === tag) as parse5.AST.Default.Element[];
}

export function findElementByAttribute(nodes: parse5.AST.Default.Element[], attr: Partial<parse5.AST.Default.Attribute>): parse5.AST.Default.Element | undefined {
  for (const node of nodes) {
    if (node.attrs.find(a => (typeof attr.name === 'undefined' || a.name === attr.name) && (typeof attr.value === 'undefined' || a.value === attr.value))) {
      return node;
    }
  }
}
