
const { extractLinks } = require('./link');

test('Extract links from wiki text', () => {
  const wikiText = `[[/valid-link]] and [[/valid-link#section]].`;

  const expectedLinks = [
    {
      index: 0,
      value: '[[/valid-link]]',
      text: '/valid-link',
    },
    {
      index: 20,
      value: '[[/valid-link#section]]',
      text: '/valid-link',
    },
  ];

  const actualLinks = extractLinks(wikiText);

  expect(actualLinks).toEqual(expectedLinks);
});
