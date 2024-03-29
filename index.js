#!/usr/bin/env node

const fs = require('fs');
const logFilePath = '/tmp/johngrib-lsp.log';

const DEBUG_MODE = true;

function logToFile(message) {
    if (!DEBUG_MODE) {
        return;
    }
    // 현재 시간을 가져와서 로그 메시지에 추가합니다.
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;

    // 메시지를 파일에 추가합니다. 기존 내용은 유지하고 새로운 내용이 추가됩니다.
    fs.appendFile(logFilePath, formattedMessage, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

// https://www.toptal.com/javascript/language-server-protocol-tutorial
const {
    TextDocuments,
    createConnection,
    CompletionItemKind,
} = require('vscode-languageserver')
const {TextDocument} = require('vscode-languageserver-textdocument')

const DIAGNOSTICS = {
    link: require('./src/diagnostics/link'),
}
const LINK = {
    finder: require('./src/link/finder'),
    extractor: require('./src/link/extractor'),
    completion: require('./src/link/completion'),
}
const MARKDOWN = {
    renamer: require('./src/markdown/renamer'),
}

const UTIL = {
    url: require('./src/util/url'),
}

const connection = createConnection()
const documents = new TextDocuments(TextDocument)

const CTX = {
    connection,
    documents,
    rootDirectory: process.cwd(),
    documentRootName: '_wiki',
    logToFile,
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

function getResourcePath(texts) {
    for (let i = 0; i < 12; i++) {
        const line = texts[i];
        const match = line.match(/^resource:\s*(.*)$/);
        if (match) {
            return match[1];
        }
    }
    return null;
}

/** 리소스 파일 목록 제공. */
function getResourceList(texts) {
    const resourcePath = getResourcePath(texts);
    const resourceAbsolutePath = `${CTX.rootDirectory}/resource/${resourcePath}/`;
    const resourceFiles = fs.readdirSync(resourceAbsolutePath);

    const markdownFiles = LINK.completion.getList(CTX);
    const resources = resourceFiles.map(filename => {
        logToFile(`filename: ${filename}`);
        return {
            label: `/resource/${resourcePath}/${filename}`,
            kind: CompletionItemKind.File,
            detail: `Resource file: ${filename}`,
            documentation: `Resource file: ${filename}`,
        };
    })

    return resources;
}

/* 자동완성 목록 제공. */
connection.onCompletion((_textDocumentPosition, token) => {
    const totalText = documents.get(_textDocumentPosition.textDocument.uri);
    const text = totalText.getText();
    const texts = text.split('\n');

    const markdownFiles = LINK.completion.getList(CTX);
    const resourceFiles = getResourceList(texts)

    const result = markdownFiles.concat(resourceFiles);
    return result;
});

/* Go to definition 기능. */
connection.onDefinition(({ textDocument, position }) => {
  const document = documents.get(textDocument.uri);
  return LINK.finder.getDefinePosition(CTX, document, position);
});

/* rename 기능. */
connection.onRenameRequest(async (params) => {
    await MARKDOWN.renamer.rename(CTX, params);
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
            definitionProvider: true,
            renameProvider: true,
            referencesProvider: true,
        },
    }
});

/*
 * References 탐색 기능.
 */
connection.onReferences(async (params) => {
    const { textDocument, position } = params;
    const filePath = UTIL.url.toFilepath(textDocument.uri);

    logToFile(`filePath: ${filePath}`);

    const link = await LINK.extractor.extractFromFile(filePath, position);

     if (!link) {
         return [];
     }

    const results = await LINK.finder.getAllPositions(link, CTX.documentRootName);

    logToFile(`results: ${JSON.stringify(results)}`);

    return results.map(result => {
        const resultUri = `file://${CTX.rootDirectory}/${result.filePath}`;
        return {
            uri: resultUri,
            range: {
                start: { line: result.lineNumber - 1, character: 0 },
                end: { line: result.lineNumber - 1, character: result.line.length },
            }
        };
    });
});

documents.listen(connection)
connection.listen()

