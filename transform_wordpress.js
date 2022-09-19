const fs = require('fs');
const posts = require("./data/wordpress_posts.json");
const media = require("./data/wordpress_media.json");
const data = [];

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { document } = (new JSDOM(`...`)).window;

htmlentities = {
  /**
   * Converts a string to its html characters completely.
   *
   * @param {String} str String with unescaped HTML characters
   **/
  encode : function(str) {
    var buf = [];
    
    for (var i=str.length-1;i>=0;i--) {
      buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
    }
    
    return buf.join('');
  },
  /**
   * Converts an html characterSet into its original character.
   *
   * @param {String} str htmlSet entities
   **/
  decode : function(str) {
    return str.replace(/&#(\d+);/g, function(match, dec) {
      return String.fromCharCode(dec);
    });
  }
};

function run() {
  let items = posts.rss.channel.item;
  for(let i=0; i<items.length; i++) {
    let item = items[i];
    let row = {
      title: item.title.__cdata,
      slug: item.link.replace(/https?:\/\/[^\/]+/, ''),
      content: typeof(item.encoded[0].__cdata) == "object" ? item.encoded[0].__cdata[0] : item.encoded[0].__cdata,
    };
    
    console.log('Importing ' + row.title);
    
    row.content = row.content.replace(/https?:\/\/(www\.)?elmbridgelibdems.org.uk\/wp-content/g, "https://archive.elmbridgelibdems.org.uk/wp-content");
    if(!row.content.match(/<p/)) {
      row.content = "<p>" + row.content + "</p>";
    }
    
    let div = document.createElement('div');
    div.innerHTML = row.content;
    let excerpt = div.querySelector('p').textContent.trim();
    if(excerpt.length > 120) {
      excerpt = excerpt.substring(0, 120) + "...";
    }
    row.excerpt = excerpt;
    
    // Date
    // 10:00 10-09-2015
    let date = new Date( Date.parse( item.pubDate ) );
    let dateString = date.getUTCHours() + ":" + date.getUTCMinutes() + " " + date.getUTCDate() + "-" + (date.getUTCMonth()+1) + "-" + date.getUTCFullYear();
    row.date = dateString;
    
    let image_id = false;
    for(let j=0; j<item.postmeta.length; j++) {
      let meta = item.postmeta[j];
      if(meta.meta_key.__cdata == "_thumbnail_id") {
        image_id = meta.meta_value.__cdata;

      }
    }
    
    row.featuredImageURL = "";
    if(image_id) {
      for(let j=0; j<media.rss.channel.item.length; j++) {
        let mediaItem = media.rss.channel.item[j];
        if(mediaItem.post_id == image_id) {
          row.featuredImageURL = mediaItem.guid;
        }
      }
    }
    
    data.push(row);
  }
  
  let dataString = JSON.stringify(data, null, 2);;
  fs.writeFile('./data/import.json', dataString, (err) => {
      if (err) throw err;
      console.log('Data written to file');
  });
  console.log('End of file');
}

run();