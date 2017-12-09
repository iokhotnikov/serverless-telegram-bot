import cheerio from 'cheerio';

export default [{
  url: 'https://some-site-to-get-data.com/',
  title: 'title of the data item',
  handler: (body) => {
    // USAGE:
    const $ = cheerio.load(body);
    const element = $('.some-element');
    return element.text(); // returns value for data item
  }
}];
