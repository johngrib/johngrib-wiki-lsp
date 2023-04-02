
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

/*
 * 파일 경로(uri)의 특정 위치(position)에서 [[링크]]를 추출한다.
 */
async function extractLinkFromFileAtPosition(documents, uri, position) {
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

/*
 * 리네임 요청 처리기.
 */
async function exe(CTX, params) {
    CTX.logToFile(`Rename: ${JSON.stringify(params)}`);

    const { textDocument, position, newName } = params;
    const uri = textDocument.uri;

    const link = await extractLinkFromFileAtPosition(CTX.documents, uri, position);

    CTX.connection.window.showInformationMessage(`Rename: ${link} -> ${newName}`);

    const oldFilePath = `${CTX.documentRootName}/${link}.md`
        .replace(/\/+/g, '/');
    const newFilePath = `${CTX.documentRootName}/${newName}.md`
        .replace(/\/+/g, '/');

    CTX.logToFile(`Rename: ${oldFilePath} -> ${newFilePath}`);

    const scriptPath = path.join(CTX.rootDirectory, 'tool', 'mv-document.sh');
    CTX.logToFile(`Script path: ${scriptPath}`);

    if (!fs.existsSync(scriptPath)) {
        CTX.logToFile(`Script not found: ${scriptPath}`);
        CTX.connection.window.showErrorMessage(`Rename script not found: ${scriptPath}`);
        return [];
    }

    return new Promise((resolve, reject) => {
        execFile(
            'bash',
            [scriptPath, oldFilePath, newFilePath],
            { cwd: CTX.rootDirectory },
            (error, stdout, stderr) => {
                if (error) {
                    CTX.logToFile(`Script error: ${error.message}`);
                    reject(error);
                } else {
                    if (stdout) {
                        CTX.logToFile(`Script output: ${stdout}`);
                    }
                    if (stderr) {
                        CTX.logToFile(`Script error: ${stderr}`);
                    }
                    resolve([]);
                }
            });
    });
}

module.exports = {
    exe,
};
