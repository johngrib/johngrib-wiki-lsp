#!/usr/bin/env node

// https://www.toptal.com/javascript/language-server-protocol-tutorial
const {
    DiagnosticSeverity,
    TextDocuments,
    createConnection,
} = require('vscode-languageserver')
const {TextDocument} = require('vscode-languageserver-textdocument')
const fs = require('fs');

const { readFirstFiveLines, readMarkdownMetadataSync } = require('./metadata');

const currentDirectory = process.cwd();

const getFileAddress = (linkString) => {
    const fileAddress = linkString.startsWith('/')
        ? `${currentDirectory}/_wiki${linkString}.md`
        : `${currentDirectory}/_wiki/${linkString}.md`;
    return fileAddress
}

const getWikiLinks = (text) => {
    const regex = /\[\[([^\]]+)\]\]/g;
    const results = []
    regex.lastIndex = 0
    while ((matches = regex.exec(text)) && results.length < 100) {
        results.push({
            index: matches.index,
            value: matches[0],
            text: matches[1],
        })
    }
    return results
}

const getDiagnostics = (textDocument) => {
  const text = textDocument.getText();
  const warningList = getWikiLinks(text);

  const results = warningList.map(function ({ index, value, text }) {
    const fileAddress = getFileAddress(text);
    const isExistFile = fs.existsSync(fileAddress);

    if (!isExistFile) {
      return {
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(index),
          end: textDocument.positionAt(index + value.length),
        },
        message: `${value} is invalid link.`,
        source: "JohnGrib Wiki LSP",
      };
    }

    const meta = readMarkdownMetadataSync(fileAddress);

    return {
      severity: DiagnosticSeverity.Information,
      range: {
        start: textDocument.positionAt(index),
        end: textDocument.positionAt(index + value.length),
      },
      message: meta.title,
      source: "JohnGrib Wiki LSP",
    };
  });

  return results;
};

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
