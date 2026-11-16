// One-time JSX migration and repeatable copy extraction. Italian remains the source.
import fs from 'node:fs';
import ts from 'typescript';
const files = ['src/components/experience/LakeExperience.tsx','src/components/experience/JourneyMapFields.tsx','src/components/experience/SaveTripAccount.tsx','src/components/account/MyTrips.tsx'];
const sources = new Set();
const faceAttributes = new Set(['aria-label','alt','title','placeholder']);
const normalize = text => text.split(/\r?\n/).map((line,index,lines)=>{let s=line.replace(/\t/g,' ');if(index)s=s.trimStart();if(index<lines.length-1)s=s.trimEnd();return s}).filter(Boolean).join(' ');
const record = text => { if (text.trim()) sources.add(text.trim()); return text; };
const migrate = process.argv.includes('--migrate');
for (const file of files) {
  const source = ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const transformer = context => {
    const f=context.factory;
    const call = (text, values) => f.createCallExpression(f.createIdentifier('t'),undefined,[f.createStringLiteral(record(text)),...(values?[values]:[])]);
    function display(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text.trim() ? call(node.text) : node;
      if (ts.isConditionalExpression(node)) return f.updateConditionalExpression(node,node.condition,node.questionToken,display(node.whenTrue),node.colonToken,display(node.whenFalse));
      if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) return f.updateBinaryExpression(node,display(node.left),node.operatorToken,display(node.right));
      if (ts.isTemplateExpression(node)) {
        let text=node.head.text;
        const properties=node.templateSpans.map((span,index)=>{text+=`{value${index}}`+span.literal.text;return f.createPropertyAssignment(`value${index}`,display(span.expression));});
        return call(text,f.createObjectLiteralExpression(properties));
      }
      return node;
    }
    function visit(node) {
      if (ts.isJsxText(node)) {const text=normalize(node.text);if(text.trim()){record(text);if(migrate)return f.createJsxExpression(undefined,call(text));}}
      if (ts.isJsxAttribute(node) && faceAttributes.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
        record(node.initializer.text);
        if(migrate)return f.updateJsxAttribute(node,node.name,f.createJsxExpression(undefined,call(node.initializer.text)));
      }
      if (ts.isStringLiteral(node) && node.text !== 'Escape' && /[A-ZÀ-ÿ]|\s/.test(node.text) && !/^(https?:|\/|\[experience)/.test(node.text) && !node.text.includes('className')) record(node.text);
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text==='t' && ts.isStringLiteral(node.arguments[0])) record(node.arguments[0].text);
      const visited=ts.visitEachChild(node,visit,context);
      if (migrate && ts.isJsxExpression(visited) && visited.expression && (!ts.isJsxAttribute(node.parent) || faceAttributes.has(node.parent.name.text))) return f.updateJsxExpression(visited,display(visited.expression));
      return visited;
    }
    return node => ts.visitNode(node,visit);
  };
  const result=ts.transform(source,[transformer]);
  if(migrate)fs.writeFileSync(file,ts.createPrinter().printFile(result.transformed[0]));
  result.dispose();
}
// Content and metadata are extracted separately by translate.mjs.
fs.writeFileSync('messages/experience/ui-source.json',JSON.stringify([...sources].filter(s=>!/^[A-Z][A-Z_]+$/.test(s)||s==='ARRIVI').sort(),null,2)+'\n');
console.log(`Experience UI source strings: ${sources.size}. JSX migration: ${migrate}.`);
