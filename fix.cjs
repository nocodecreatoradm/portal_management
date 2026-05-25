const fs = require('fs');
const files = [
  'src/components/DataTable.tsx',
  'src/components/EnergyEfficiency.tsx',
  'src/components/ProductDetailModal.tsx',
  'src/components/ProductsModule.tsx',
  'src/components/Samples.tsx'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let updated = content;

    // Pattern 1: with codProv
    updated = updated.replace(
      /suppliers\.find\(s => s\.id === ([a-zA-Z0-9_\.]+)\.proveedor \|\| s\.legalName === \1\.proveedor \|\| s\.erpCode === \1\.codProv\)/g,
      'suppliers.find(s => ($1.proveedor && (s.id === $1.proveedor || s.legalName === $1.proveedor)) || ($1.codProv && s.erpCode === $1.codProv))'
    );

    // Pattern 2: without codProv (EnergyEfficiency)
    updated = updated.replace(
      /suppliers\.find\(s => s\.id === ([a-zA-Z0-9_\.]+)\.proveedor \|\| s\.legalName === \1\.proveedor\)/g,
      'suppliers.find(s => $1.proveedor && (s.id === $1.proveedor || s.legalName === $1.proveedor))'
    );

    if (content !== updated) {
      fs.writeFileSync(file, updated);
      console.log('Updated ' + file);
    }
  }
});
