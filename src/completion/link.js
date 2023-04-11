const fs = require('fs');
const path = require('path');
const {
    CompletionItemKind,
} = require('vscode-languageserver')

/**
 * 주어진 경로 하위의 모든 마크다운 파일을 찾아 리스트로 리턴합니다.
 */
function getMarkdownFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            fileList = getMarkdownFiles(filePath, fileList);
        } else if (path.extname(file) === '.md') {
            fileList.push(filePath);
        }
    });

    return fileList;
};

/**
 * 자동완성 아이템 리스트를 리턴합니다.
 */
function getList(CTX) {
    const { rootDirectory, documentRootName } = CTX;

    const markdownFiles = getMarkdownFiles(path.join(rootDirectory, documentRootName));
    const completionItems = markdownFiles.map((file) => {
        const relativePath = path.relative(path.join(rootDirectory, documentRootName), file);
        const fileName = relativePath.replace(/\.md$/, '');
        return {
            label: fileName,
            kind: CompletionItemKind.File,
            detail: `Markdown file: ${fileName}`,
            documentation: `Link to the file: [[${fileName}]]`,
        };
    });

    return completionItems;
};

module.exports = {
    getList,
};
