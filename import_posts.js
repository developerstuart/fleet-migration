const fs = require('fs');
const client = require('https');
require('dotenv').config();
const puppeteer = require('puppeteer');

const importList = require("./data/import.json");

const urls = {
  base: "https://beta.libdems.org.uk",
  login: "https://beta.libdems.org.uk/typo3/",
  news_list: "https://beta.libdems.org.uk/typo3/module/web/NewsAdministration/?id=2420",
  add_blog_post: "https://beta.libdems.org.uk/typo3/record/edit?edit%5Btx_news_domain_model_news%5D%5B2420%5D=new"
}

const fleet = {
  user_id: process.env.USER_ID,
  user_pass: process.env.USER_PASS
}

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        client.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                // Consume response data to free up memory
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

            }
        });
    });
}

function init() {
  //console.log(process.env);
  
}

async function close(browser) {
  browser.close();
}

async function login() {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      //page.setCookie(...cookies);
      page.on('console', consoleObj => console.log(consoleObj.text()));
      
      await page.goto(urls.login);
      await page.type('#t3-username', fleet.user_id);
      await page.type('#t3-password', fleet.user_pass);
      await page.click('#t3-login-submit');
      await page.waitForNavigation();
      
      const cookies = await page.cookies();
      console.log(cookies);
      
      
      await page.setCookie(...cookies);

      
      importList.reverse();
      
      for(let i=0; i<importList.length; i++) {
        let importItem = importList[i];
        console.log(`... Importing [${i+1} / ${importList.length}]`);
        
        
        try {
          // Grab image
          importItem.featuredImagePath = false;
          if(importItem.featuredImageURL) {
            let fileNameParts = importItem.featuredImageURL.split("/");
            let fileName = fileNameParts[fileNameParts.length-1];
            let filePath = "./media/" + fileName;
            importItem.featuredImageFileName = fileName;
            try {
              if (fs.existsSync(filePath)) {
                //file exists
                importItem.featuredImagePath = filePath;
              } else {
                await downloadImage(importItem.featuredImageURL, filePath).then(() => {
                  importItem.featuredImagePath = filePath;
                })
              }
            } catch(err) {
              console.error(err)
            }
            
          }
          
          // Determine if page exists and edit, or to create new page
          await page.goto(urls.news_list, {waitUntil: 'networkidle0'});
          await page.waitForSelector("#typo3-contentIframe");
          await page.evaluate( (importItem) => {
            let frameContext = document.getElementById('typo3-contentIframe').contentWindow.document;
            let $pages = frameContext.querySelectorAll('.col-title a');
            let $editElement = false;
            $pages.forEach($el => {
              if($el.textContent.trim() == importItem.title) {
                $editElement = $el;
              }
            });
            if($editElement) {
              $editElement.click();
              console.log('Page already exists, editing');
            } else {
              frameContext.querySelector('a[title="Create new news record"]').click();
              console.log('Create new page!');
            }
          }, importItem);
        
          await page.waitForNavigation();
          //await page.goto(edit_page_url, {waitUntil: 'networkidle0'});
          let contentFrameHandle = await page.waitForSelector("#typo3-contentIframe");
          const contentFrame = await contentFrameHandle.contentFrame();
          //await page.waitForSelector("[name='_savedok']");
          let setValues = await page.evaluate((importItem) => {
            let frameWindow = document.getElementById('typo3-contentIframe').contentWindow;
            let frameContext = frameWindow.document;
            var setValues = [];
            var event_input = new Event('input', {
                bubbles: true,
                cancelable: true,
            });
            var event_change = new Event('change', {
                bubbles: true,
                cancelable: true,
            }); 
            
            var values = {
              title: importItem.title,
              teaser: importItem.excerpt,
              bodytext: importItem.content,
              path_segment: importItem.slug,
              datetime: importItem.date
            }
            
            let $inputs = frameContext.querySelectorAll('input, textarea');
            $inputs.forEach($el => {
              $el.focus();
              let name = $el.getAttribute("data-formengine-input-name");
              if(!name)
                name = $el.getAttribute("name");
              //console.log(name);
              let name_parts = name ? name.match(/\[([^\]]+)\]/g) : false;
              let ref = false;
              if(name_parts && name_parts.length && name_parts[name_parts.length-1]) {
                ref = name_parts[name_parts.length-1].replace("[", "").replace("]", "");
              }
              if(ref)
                console.log(ref);
              
              if(ref && values[ ref ]) {
                $el.value = values[ ref ];
                console.log('Found ' + ref);
                setValues.push(ref);
                
                try {
                  $el.dispatchEvent(event_input);
                  $el.dispatchEvent(event_change);
                } catch(err) { console.error(err); }
                
                if(ref == "bodytext") {
                  let id = $el.getAttribute("id");
                  frameWindow.CKEDITOR.instances[id].setData(values[ref]);
                  console.log('setting CKEditor value');
                }
                console.log('Setting value');
              }
            });
            
          /* let $mediaButton = frameContext.querySelector('[title="Add media file"]');
            $mediaButton.click();
            let $mediaIframe = document.querySelector('[name="modal_frame"]');
            let mediaFrameDocument = $mediaIframe.contentWindow.document;
            let $folderButtons = mediaFrameDocument.querySelectorAll('.node-name');
            $folderButtons.forEach($folder => {
              if($folder.textContent == "Images") {
                $folder.click();
              }
            });
            let $fileInput = mediaFrameDocument.querySelector('[name="upload_0[]"]');
            // Set file value
            let $fileUpload = mediaFrameDocument.querySelector('.btn[type="submit"][value="Upload files"]');
            $fileUpload.click();*/
            
            //
      
            //frameContext.querySelector('[name="_savedok"]').click();
            return (setValues);
          }, importItem);
          
          if(importItem.featuredImagePath) {
            await contentFrame.click('.typo3-TCEforms ul.nav li:nth-child(3) > a');
            await contentFrame.waitForSelector('button[title="Add media file"]');
            
            let imageAlreadyExists = await contentFrame.evaluate(() => {
              let el = document.querySelector("button.form-irre-header-cell")
              return el ? true : false;
            });
            console.log('imageAlreadyExists? ' + imageAlreadyExists);
            await page.screenshot({path: 'screenshots/got-here1.png'});
            
            if(!imageAlreadyExists) {
            
              await contentFrame.click('button[title="Add media file"]');
              let mediaFrameHandle = await page.waitForSelector('[name="modal_frame"]');
              const mediaFrame = await mediaFrameHandle.contentFrame();
              await mediaFrame.waitForSelector('g.node[title="Images"]');
              await page.screenshot({path: 'screenshots/got-here2.png'});
              await mediaFrame.click('g.node[title="Images"]');
              await page.screenshot({path: 'screenshots/got-here3.png'});
              await mediaFrame.waitForSelector('input[type=file][name="upload_0[]"]');
              await page.screenshot({path: 'screenshots/got-here4.png'});
              
              let imageAlreadyUploaded = await mediaFrame.evaluate((importItem) => {
                let el = document.querySelector(`.btn.btn-default[data-file-name="${importItem.featuredImageFileName}"]`)
                return el ? true : false;
              }, importItem);
              console.log('imageAlreadyUploaded? ' + imageAlreadyUploaded);
              
              if(!imageAlreadyUploaded) {
                const fileUploadHandle = await mediaFrame.$('input[type=file][name="upload_0[]"]');
                await fileUploadHandle.uploadFile(importItem.featuredImagePath);
                await mediaFrame.click('.btn[type="submit"][value="Upload files"]')
                await mediaFrame.waitForSelector('.alert.alert-success');
                await page.screenshot({path: 'screenshots/got-here5.png'});
              }
              
              await mediaFrame.click(`.btn.btn-default[data-file-name="${importItem.featuredImageFileName}"]`);
              await page.screenshot({path: 'screenshots/got-here6.png'});
              await page.click('.t3js-modal-close');
              await page.screenshot({path: 'screenshots/got-here7.png'});
              await contentFrame.waitForSelector('select[name$="[showinpreview]"]');
              await page.screenshot({path: 'screenshots/got-here8.png'});
              await contentFrame.select('select[name$="[showinpreview]"]', "1");
              await page.screenshot({path: 'screenshots/got-here9.png'});
            
            }
          }
          
          await contentFrame.click('button[name="_savedok"]');
          await page.waitForNavigation();
        
        } catch(e) {
          console.log(e);
          console.log('...retrying this one');
          i--;
        }

      }
      
      close(browser);
      return resolve(false);
      
    } catch (e) {
      return reject(e);
    }
  })
  //process.env.USER_ID
  //process.env.USER_PASS
}


init();
login().then((setValues) => {
  console.log(setValues);
  //addPosts(browser).catch(console.err);
  //close(browser);
}).catch(console.err);