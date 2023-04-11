const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

/**
 * 주어진 file 에서 link 를 포함하고 있는 모든 position을 리턴합니다.
 */
async function searchInFile(filePath, linkPattern) {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    return lines.reduce((result, line, index) => {
        if (linkPattern.test(line)) {
            result.push({
                filePath,
                lineNumber: index + 1, line });
        }
        return result;
    }, []);
}

/**
 * 주어진 경로의 모든 파일을 탐색해 link 를 포함하고 있는 모든 position을 리턴합니다.
 */
async function searchInDirectory(directoryPath, linkPattern) {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const results = await Promise.all(
        entries.map(async entry => {
            const entryPath = path.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                return searchInDirectory(entryPath, linkPattern);
            }
            if (entry.isFile() && entry.name.endsWith('.md')) {
                return searchInFile(entryPath, linkPattern);
            }
            return [];
        })
    );
    return results.flat();
}

/**
 * rootPath 하위의 모든 파일을 탐색해 link 를 포함하고 있는 모든 position을 리턴합니다.
 */
async function getAllPositions(link, rootPath) {
    const linkPattern = new RegExp(`\\[\\[/?${link}/?(#[^\\]]+)?\\]\\]`, 'g');

    return searchInDirectory(rootPath, linkPattern);
}

module.exports = {
    getAllPositions,
}

