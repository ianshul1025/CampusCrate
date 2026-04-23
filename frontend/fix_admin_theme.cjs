const fs = require('fs');

function fixFile(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  
  // Replace all bg-slate-950 with bg-background
  c = c.replace(/bg-slate-950/g, 'bg-background');
  
  // Replace bg-slate-900 with specific opacity/tokens
  c = c.replace(/bg-slate-900\/80/g, 'bg-background/80');
  c = c.replace(/bg-slate-900\/60/g, 'bg-card');
  c = c.replace(/bg-slate-900\/50/g, 'bg-secondary/50');
  c = c.replace(/bg-slate-900/g, 'bg-card');
  
  // Replace borders
  c = c.replace(/border-white\/\[0\.0[0-9]+\]/g, 'border-border');
  c = c.replace(/divide-white\/\[0\.0[0-9]+\]/g, 'divide-border');
  
  // Replace background opacities and specific colors
  c = c.replace(/bg-black\/70/g, 'bg-background/70');
  c = c.replace(/bg-black\/30/g, 'bg-secondary/50');
  c = c.replace(/bg-black/g, 'bg-card');
  
  c = c.replace(/bg-\[\#111b21\]/g, 'bg-card');
  c = c.replace(/bg-\[\#202c33\]/g, 'bg-secondary');
  c = c.replace(/bg-\[\#0b141a\]/g, 'bg-background');
  
  c = c.replace(/text-\[\#e9edef\]/g, 'text-foreground');
  c = c.replace(/text-\[\#8696a0\]/g, 'text-muted-foreground');
  c = c.replace(/text-\[\#00a884\]/g, 'text-emerald-500');
  c = c.replace(/bg-\[\#00a884\]/g, 'bg-emerald-500');
  c = c.replace(/text-white\/\[0\.0[0-9]+\]/g, 'text-muted-foreground');
  
  c = c.replace(/bg-white\/\[0\.04\]/g, 'bg-secondary/50');
  
  fs.writeFileSync(filePath, c);
  console.log(`Fixed ${filePath}`);
}

fixFile('src/pages/AdminDashboard.jsx');
fixFile('src/pages/AdminLogin.jsx');
