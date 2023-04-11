const fs = require('fs');
const linkExtractor = require('../link/extractor');

function getFileAddress(rootDirectory, linkString) {
    const fileAddress = linkString.startsWith('/')
        ? `${rootDirectory}/_wiki${linkString}.md`
        : `${rootDirectory}/_wiki/${linkString}.md`;
    return fileAddress
}

/**
 * 주어진 position의 위치에 있는 wiki 링크를 찾아 그 파일의 주소 정보를 리턴합니다.
 */
function get(CTX, textDocument, position) {
  const text = textDocument.getText();
  const offset = textDocument.offsetAt(position);
  const link = linkExtractor.extractFromTextPosition(text, offset);

  if (link) {
    const linkPath = link[1];
    const fileAddress = getFileAddress(CTX.rootDirectory, linkPath);

    if (fs.existsSync(fileAddress)) {
      return {
        uri: "File://" + fileAddress,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
      };
    }
  }

  return null;
}

module.exports = {
    get,
}
