#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const logFilePath = '/tmp/johngrib-lsp.log';
const { execFile } = require('child_process');

const DEBUG_MODE = false;

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
} = require('vscode-languageserver')
const {TextDocument} = require('vscode-languageserver-textdocument')

const DIAGNOSTICS = {
    link: require('./src/diagnostics/link'),
}
const COMPLETION = {
    link: require('./src/completion/link'),
}
const DEFINITION = {
    address: require('./src/definition/address'),
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

/* Go to definition 기능. */
connection.onDefinition(({ textDocument, position }) => {
  const document = documents.get(textDocument.uri);
  return DEFINITION.address.get(CTX, document, position);
});

async function extractLinkFromFileAtPosition(uri, position) {
  const document = documents.get(uri);
  const text = document.getText();
  const lines = text.split(/\r?\n/);
  const line = lines[position.line];

  const linkPattern = /\[\[([^\]]+)\]\]/g;
  let linkMatch;

  while ((linkMatch = linkPattern.exec(line)) !== null) {
    const linkStart = linkMatch.index;
    const linkEnd = linkPattern.lastIndex;
    const character = position.character;

    if (linkStart <= character && character <= linkEnd) {
      const linkContent = linkMatch[1];
      return linkContent;
    }
  }

  return null;
}

/* rename 기능. */
connection.onRenameRequest(async (params) => {
    const { textDocument, position, newName } = params;
    const uri = textDocument.uri;

    const link = await extractLinkFromFileAtPosition(uri, position);

    connection.window.showInformationMessage(`Rename: ${link} -> ${newName}`);

    const oldFilePath = `${CTX.documentRootName}/${link}.md`
        .replace(/\/+/g, '/');
    const newFilePath = `${CTX.documentRootName}/${newName}.md`
        .replace(/\/+/g, '/');

    logToFile(`Rename: ${oldFilePath} -> ${newFilePath}`);

    const scriptPath = path.join(CTX.rootDirectory, 'tool', 'mv-document.sh');
    logToFile(`Script path: ${scriptPath}`);

    if (!fs.existsSync(scriptPath)) {
        logToFile(`Script not found: ${scriptPath}`);
        connection.window.showErrorMessage(`Rename script not found: ${scriptPath}`);
        return [];
    }

    return new Promise((resolve, reject) => {
        execFile(
            'bash',
            [scriptPath, oldFilePath, newFilePath],
            { cwd: CTX.rootDirectory },
            (error, stdout, stderr) => {
                if (error) {
                    logToFile(`Script error: ${error.message}`);
                    reject(error);
                } else {
                    if (stdout) {
                        logToFile(`Script output: ${stdout}`);
                    }
                    if (stderr) {
                        logToFile(`Script error: ${stderr}`);
                    }
                    resolve([]);
                }
            });
    });
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
        },
    }
});

documents.listen(connection)
connection.listen()

