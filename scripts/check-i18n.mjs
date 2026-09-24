import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const dictionaryPath = path.join(root, 'lib/i18n.ts');
const dictionarySource = ts.createSourceFile(dictionaryPath, fs.readFileSync(dictionaryPath, 'utf8'), ts.ScriptTarget.Latest, true);
const keys = new Set();

function visitDictionary(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(dictionarySource) === 'translations' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
    for (const property of node.initializer.properties) {
      if (ts.isPropertyAssignment(property) && (ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))) keys.add(property.name.text);
    }
  }
  ts.forEachChild(node, visitDictionary);
}
visitDictionary(dictionarySource);

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? filesIn(target) : /\.tsx?$/.test(item.name) ? [target] : [];
  });
}

const missing = [];
for (const file of [...filesIn(path.join(root, 'app')), ...filesIn(path.join(root, 'components'))]) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      const key = node.arguments[0].text;
      if (!keys.has(key)) missing.push(`${path.relative(root, file)}: ${key}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (missing.length) {
  console.error('Missing Persian translations:\n' + missing.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`All literal translation keys are covered (${keys.size} Persian entries).`);
}
