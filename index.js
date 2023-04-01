#!/usr/bin/env node

// https://www.toptal.com/javascript/language-server-protocol-tutorial
const {
    TextDocuments,
    createConnection,
    CompletionItemKind,
} = require('vscode-languageserver')
const {TextDocument} = require('vscode-languageserver-textdocument')
const fs = require('fs');
const path = require('path');
const DOCUMENT_ROOT_DIR = '_wiki';

const DIAGNOSTICS = {
    link: require('./src/diagnostics/link'),
}

const currentDirectory = process.cwd();
const connection = createConnection()
const documents = new TextDocuments(TextDocument)

const CTX = {
    connection,
    rootDirectory: process.cwd(),
}

const getDiagnostics = (textDocument) => {
    const linkDiagnostics = DIAGNOSTICS.link.get(CTX, textDocument);

    return linkDiagnostics;
};

/**
 * 파일이 변경될 때마다 diagnostics를 판별해 그 결과를 클라이언트에 전달한다.
 */
documents.onDidChangeContent(change => {
    const diagnosticsData = {
        uri:         change.document.uri,
        diagnostics: getDiagnostics(change.document),
    };
    connection.sendDiagnostics(diagnosticsData);
})

/**
 * 자동완성 아이템을 수집해 리턴합니다.
 */
const getCompletionItems = () => {
    const markdownFiles = getMarkdownFiles(path.join(currentDirectory, DOCUMENT_ROOT_DIR));
    const completionItems = markdownFiles.map((file) => {
        const relativePath = path.relative(path.join(currentDirectory, DOCUMENT_ROOT_DIR), file);
        const label = relativePath.replace(/\.md$/, '');
        return {
            label,
            kind: CompletionItemKind.File,
            detail: `Markdown file: ${label}`,
            documentation: `Link to the file: [[${label}]]`,
        };
    });

    return completionItems;
};

connection.onCompletion((_textDocumentPosition, token) => {
    return getCompletionItems();
});

const getMarkdownFiles = (dir, fileList = []) => {
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

connection.onInitialize(function() {
    connection.window.showInformationMessage('JohnGrib Wiki LSP is running...');
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                triggerCharacters: ['/'],   // 자동완성 트리거 키는 /
            },
        },
    }
});

documents.listen(connection)
connection.listen()

