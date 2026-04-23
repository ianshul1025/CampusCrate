const fs = require('fs');
let c = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');
c = c.replace(/bg-white\/\[0\.0[0-9]+\]/g, 'bg-secondary');
c = c.replace(/border-white\/8/g, 'border-border');
fs.writeFileSync('src/pages/AdminDashboard.jsx', c);
console.log('Fixed AdminDashboard');
