const url = require('url');

/**
 * uri 를 filepath 로 변환해 리턴합니다.
 *
 * 예)
 *   url: file:///Users/johngrib/johngrib.github.io/_wiki/http/response.md
 *   returns: /Users/johngrib/johngrib.github.io/_wiki/http/response.md
 */
function toFilepath(uri) {
    const { pathname } = url.parse(uri);
    return decodeURIComponent(pathname);
}

module.exports = {
    toFilepath,
}
