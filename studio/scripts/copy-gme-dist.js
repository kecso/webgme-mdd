'use strict';

/**
 * Copy webgme.classes build assets into public/gme-dist (webgme-dss pattern).
 */
var fs = require('fs');
var path = require('path');

var studioRoot = path.join(__dirname, '..');
var destDir = path.join(studioRoot, 'public', 'gme-dist');

var searchRoots = [
    path.join(studioRoot, 'node_modules', 'webgme-engine'),
    path.join(studioRoot, '..', 'node_modules', 'webgme-engine')
];

function findClassesBuild(root) {
    var candidates = [
        path.join(root, 'dist', 'webgme.classes.build.js'),
        path.join(root, 'client', 'dist', 'webgme.classes.build.js'),
        path.join(root, 'src', 'client', 'dist', 'webgme.classes.build.js')
    ];
    for (var i = 0; i < candidates.length; i += 1) {
        if (fs.existsSync(candidates[i])) {
            return candidates[i];
        }
    }

    // Fallback walk (shallow) for renamed layouts across engine versions.
    var queue = [root];
    while (queue.length) {
        var dir = queue.shift();
        var entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            continue;
        }
        for (var j = 0; j < entries.length; j += 1) {
            var entry = entries[j];
            var full = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === 'webgme.classes.build.js') {
                return full;
            }
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                // Limit depth
                var rel = path.relative(root, full).split(path.sep);
                if (rel.length < 5) {
                    queue.push(full);
                }
            }
        }
    }
    return null;
}

var sourceFile = null;
for (var r = 0; r < searchRoots.length; r += 1) {
    if (fs.existsSync(searchRoots[r])) {
        sourceFile = findClassesBuild(searchRoots[r]);
        if (sourceFile) {
            break;
        }
    }
}

if (!sourceFile) {
    console.warn(
        '[copy-gme-dist] webgme.classes.build.js not found. ' +
        'Install webgme-engine, then re-run npm run copy:gme-dist.'
    );
    process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
    console.info('[copy-gme-dist]', path.relative(studioRoot, dest));
}

copyFile(sourceFile, path.join(destDir, 'webgme.classes.build.js'));

// Copy sibling map / css if present.
['webgme.classes.build.js.map', 'webgme.classes.css', 'webgme.classes.build.css'].forEach(function (name) {
    var sibling = path.join(path.dirname(sourceFile), name);
    if (fs.existsSync(sibling)) {
        copyFile(sibling, path.join(destDir, name));
    }
});
