const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

/**
 * file 의 position을 감싸는 link를 찾아 리턴합니다.
 */
async function extract(filePath, position) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const line = lines[position.line];
    const linkPattern = /\[\[([^|\]]+)\|?([^\]]+)?\]\]/g;
    let match;

    while ((match = linkPattern.exec(line)) !== null) {
        const linkStart = match.index;
        const linkEnd = match.index + match[0].length;

        if (position.character >= linkStart && position.character <= linkEnd) {
            return match[1];
        }
    }

    return null;
}

module.exports = {
    extract,
}
