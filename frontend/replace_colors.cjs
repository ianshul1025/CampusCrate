const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Backgrounds
            content = content.replace(/bg-black\/40/g, 'bg-card');
            content = content.replace(/bg-black\/60/g, 'bg-card');
            content = content.replace(/bg-white\/5/g, 'bg-secondary');
            content = content.replace(/bg-white\/10/g, 'bg-secondary');
            content = content.replace(/bg-black\/20/g, 'bg-secondary');
            
            // Hovers
            content = content.replace(/hover:bg-white\/5/g, 'hover:bg-secondary/80');
            content = content.replace(/hover:bg-white\/10/g, 'hover:bg-secondary');
            content = content.replace(/hover:bg-white\/20/g, 'hover:bg-secondary');

            // Borders
            content = content.replace(/border-white\/10/g, 'border-border');
            content = content.replace(/border-white\/20/g, 'border-border');
            content = content.replace(/border-white\/5/g, 'border-border');
            
            // Text
            content = content.replace(/text-white\/10/g, 'text-muted-foreground/30');
            content = content.replace(/text-white\/20/g, 'text-muted-foreground/50');
            content = content.replace(/text-white\/30/g, 'text-muted-foreground/50');
            content = content.replace(/text-white\/70/g, 'text-muted-foreground');
            content = content.replace(/text-white\/80/g, 'text-muted-foreground');
            content = content.replace(/text-white\/90/g, 'text-foreground/90');
            content = content.replace(/text-white/g, 'text-foreground');
            
            // Fix contrast on colored backgrounds
            content = content.replace(/bg-red-500 text-foreground/g, 'bg-red-500 text-primary-foreground');
            content = content.replace(/bg-red-600 text-foreground/g, 'bg-red-600 text-primary-foreground');
            content = content.replace(/bg-green-500 text-foreground/g, 'bg-green-500 text-primary-foreground');
            content = content.replace(/bg-green-600 text-foreground/g, 'bg-green-600 text-primary-foreground');
            content = content.replace(/bg-primary text-foreground/g, 'bg-primary text-primary-foreground');
            content = content.replace(/text-foreground bg-primary/g, 'text-primary-foreground bg-primary');
            content = content.replace(/text-foreground font-bold text-base border-0/g, 'text-primary-foreground font-bold text-base border-0'); // Catch typical alert buttons
            // Specific overrides for brand/buttons where white should remain white
            // Actually, if it's inside a primary button, it usually uses text-primary-foreground which I set to #FFFFFF.
            // Let's replace text-foreground with text-primary-foreground if it's on a red button.
            // But we already did a global replace. It's safer to just let it be text-foreground (which is white in dark mode, black in light mode),
            // and maybe some badges will have black text in light mode, which is fine!
            
            // Placeholders
            content = content.replace(/placeholder:text-foreground\/20/g, 'placeholder:text-muted-foreground/50');
            content = content.replace(/placeholder:text-white\/20/g, 'placeholder:text-muted-foreground/50');
            
            // Focus rings
            content = content.replace(/focus-visible:ring-white\/20/g, 'focus-visible:ring-ring');

            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');
