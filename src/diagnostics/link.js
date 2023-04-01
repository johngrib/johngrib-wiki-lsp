const fs = require('fs');

const {
    DiagnosticSeverity,
} = require('vscode-languageserver')

const MARKDOWN = {
    metadata: require('../markdown/metadata')
}

function getFileAddress(rootDirectory, linkString) {
    const fileAddress = linkString.startsWith('/')
        ? `${rootDirectory}/_wiki${linkString}.md`
        : `${rootDirectory}/_wiki/${linkString}.md`;
    return fileAddress
}

/**
 * 주어진 wiki 문서 텍스트에 포함된 모든 링크를 추출해 리턴합니다.
 */
function extractLinks(text) {
    // 1번 캡쳐그룹: LINK
    // 2번 캡쳐그룹: #소제목
    //              [[ ( LINK  )(#소제목) ]]
    const regex = /\[\[([^\]#]+)(#[^\]]+)?\]\]/g;
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

/**
 * wiki 링크와 관련된 분석 결과 리스트를 리턴합니다.
 */
function get(CTX, textDocument) {
    const warningList = extractLinks(textDocument.getText());

    const results = warningList.map(function ({ index, value, text }) {
        const fileAddress = getFileAddress(CTX.rootDirectory, text);
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

        const meta = MARKDOWN.metadata.readSync(fileAddress);

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
}

module.exports = {
    extractLinks,
    get,
};
