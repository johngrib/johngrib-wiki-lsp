
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

module.exports = {
  extractLinks,
};
