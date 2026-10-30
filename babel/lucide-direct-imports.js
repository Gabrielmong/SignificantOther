// Rewrites `import { Home } from 'lucide-react-native'` to an import of that
// icon's own file. Metro doesn't tree-shake, so importing from the package
// entry bundles and loads all ~3300 icons at startup.
const fs = require('fs');

const PACKAGE = 'lucide-react-native';
// The build Metro resolves (the package's "react-native" field)
const BUILD = `${PACKAGE}/dist/esm`;

let iconFiles;

// Icon name (including aliases like Home for House) -> file in icons/
const getIconFiles = () => {
  if (iconFiles) return iconFiles;
  const entry = fs.readFileSync(require.resolve(`${BUILD}/lucide-react-native.js`), 'utf8');
  iconFiles = new Map();
  for (const [, names, file] of entry.matchAll(
    /export \{([^}]+)\} from '\.\/icons\/([\w-]+)\.js'/g,
  )) {
    for (const [, name] of names.matchAll(/default as (\w+)/g)) iconFiles.set(name, file);
  }
  return iconFiles;
};

module.exports = ({ types: t }) => ({
  name: 'lucide-direct-imports',
  visitor: {
    ImportDeclaration(path) {
      const { node } = path;
      if (node.source.value !== PACKAGE || node.importKind === 'type') return;

      const direct = [];
      const rest = [];
      for (const specifier of node.specifiers) {
        const file =
          t.isImportSpecifier(specifier) &&
          specifier.importKind !== 'type' &&
          getIconFiles().get(specifier.imported.name ?? specifier.imported.value);
        if (file) {
          direct.push(
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(specifier.local.name))],
              t.stringLiteral(`${BUILD}/icons/${file}.js`),
            ),
          );
        } else {
          rest.push(specifier);
        }
      }

      if (direct.length === 0) return;
      if (rest.length > 0) {
        node.specifiers = rest;
        path.insertAfter(direct);
      } else {
        path.replaceWithMultiple(direct);
      }
    },
  },
});
