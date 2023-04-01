#!/usr/bin/env node

// https://www.toptal.com/javascript/language-server-protocol-tutorial
const {
    TextDocuments,
    createConnection,
} = require('vscode-languageserver')
const {TextDocument} = require('vscode-languageserver-textdocument')

const DIAGNOSTICS = {
    link: require('./src/diagnostics/link'),
}
const COMPLETION = {
    link: require('./src/completion/link'),
}

const connection = createConnection()
const documents = new TextDocuments(TextDocument)

const CTX = {
    connection,
    rootDirectory: process.cwd(),
    documentRootName: '_wiki',
}

const getDiagnostics = (textDocument) => {
    const linkDiagnostics = DIAGNOSTICS.link.get(CTX, textDocument);

    return linkDiagnostics;
};

/** 파일이 변경될 때마다 diagnostics를 판별해 그 결과를 클라이언트에 전달한다. */
documents.onDidChangeContent(change => {
    const diagnosticsData = {
        uri:         change.document.uri,
        diagnostics: getDiagnostics(change.document),
    };
    connection.sendDiagnostics(diagnosticsData);
})

/* 자동완성 목록 제공. */
connection.onCompletion((_textDocumentPosition, token) => {
    return COMPLETION.link.getList(CTX);
});

/* LSP 초기화. */
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

