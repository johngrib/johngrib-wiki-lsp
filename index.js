#!/usr/bin/env node

// https://www.toptal.com/javascript/language-server-protocol-tutorial
const {
    DiagnosticSeverity,
    TextDocuments,
    createConnection,
} = require('vscode-languageserver')
const {TextDocument} = require('vscode-languageserver-textdocument')
const fs = require('fs');

const currentDirectory = process.cwd();

const getWikiLinks = (text) => {
    const regex = /\[\[([^\]]+)\]\]/g;
    const results = []
    regex.lastIndex = 0
    while ((matches = regex.exec(text)) && results.length < 100) {
        const linkString = matches[1];

        const fileAddress = linkString.startsWith('/')
            ? `${currentDirectory}/_wiki${linkString}.md`
            : `${currentDirectory}/_wiki/${linkString}.md`;

        const isExistFile = fs.existsSync(fileAddress);

        if ( ! isExistFile) {
            results.push({
                value: matches[0],
                index: matches.index,
            })
        }
    }
    return results
}

const getDiagnostics = (textDocument) => {
    const text = textDocument.getText();
    const warningList = getWikiLinks(text);

    return warningList.map(function ({index, value}) {
        return {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(index),
                end: textDocument.positionAt(index + value.length),
            },
            message: `${value} is invalid link.`,
            source: 'JohnGrib Wiki LSP',
        }
    })
}

const connection = createConnection()
const documents = new TextDocuments(TextDocument)

connection.onInitialize(() => ({
    capabilities: {
        textDocumentSync: documents.syncKind,
    },
}))

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

documents.listen(connection)
connection.listen()
