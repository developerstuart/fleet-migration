# Fleet migration tool
This is a nodeJS tool to be run on terminal/command line to aid with importing blog posts into the new Typo3/Fleet system. It works by running a puppeteer script to programatically open Typo3 in the browser and click through each element on the page.

Note1: This script needs to use your Fleet login credentials to work. These details aren't passed back anywhere, but you should be mindful when storing/sharing these files.

Note2: Hopefully this script is helpful to you, but it wasn't originally intended for sharing/release. It's only been tested to help Elmbridge import their content and your use case may be different. Also typo3 often throws errors or bugs outside the control of this script.

## Setup
You will need node and npm installed on your machine and familiarity with running both in Terminal or cmd

Download a copy of this repo

Create your own `.env` file from the example in this repo

Create your own `data/import.json` file using the same structure as the example in the folder

Run `npm install` to download the needed `node_modules`

## Import script
### .env
The `.env` file has the following configs to set up
* USER_ID - Your typo3 username (membership ID)
* USER_PASS - Your typo3 password (don't ever copy the .env file anywhere!)
* URL_NEWS_LIST - The URL in the typo3 panel of where you see your list of news records. Steps to find: (1) Click purple News Administration icon in left nav, (2) Expand "Data", click "News" in your local party file structure 
* CONSOLE_DEBUG - Whether to show all of the messages typo3 writes to the console when running the script (0 or 1)
* SCREENSHOT_DEBUG - Whether to take screenshots of each step in the process (0 or 1)

### import.json
The `data/import.json` file is designed to be fairly straightforward such that you can amend data from your previous system to match fairly easily. You can create a spreadsheet/CSV file of the data and then use an online tool to convert to JSON.

```
[
  {
    "title": "Blog post title",
    "slug": "/slug/", // The URI of the blog post
    "content": "Content in HTML format",
    "excerpt": "Short excerpt to display on the news page",
    "date": "07:44 04-08-2022", // Date format as string in HH:II dd-mm-yyyy format
    "featuredImageURL": "https://elmbridgelibdems.org.uk/wp-content/uploads/2022/08/1million-shared-prosperity.jpg" // URL of an existing image you'd like downloaded and uploaded as the card image/top mast on your blog post
  }
]
```

### Running the script
Open terminal and run

`node import_posts.js`

Depending on your environment config it'll then tell you all the glorious things it's doing, including talking a lot about a deprecated datepicker from Typo3 (if CONSOLE_DEBUG is turned on)

## Wordpress conversion script
Also included in repo is example JSON files and a node script to convert from Wordpress Export files into the import.json format.

I won't include a lot of notes here but you may wish to use this to help you convert your data into the import.json format

## Any questions
You can find me as Stuart Lawrence on the LibDems Tech Project slack - send me a DM!