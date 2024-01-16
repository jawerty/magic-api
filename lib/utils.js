import puppeteer from "puppeteer";
import fs from "fs";

function timeout(miliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => {resolve()}, miliseconds)
  })
}

async function setupBrowser() {
  const viewportHeight = 800;
  const viewportWidth = 1080;
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0); 
  await page.setViewport({width: viewportWidth, height: viewportHeight});
  
  page.on('console', async (msg) => {
	  const msgArgs = msg.args();
  	for (let i = 0; i < msgArgs.length; ++i) {
  	  try {
  		console.log(await msgArgs[i].jsonValue());
  	  } catch(e) {
  	  	console.log(e);
  	  }
    }
  });

  return [browser, page]
}

async function loadCookies(page) {
  const cookiesString = fs.readFileSync('./cookies.json');
  const cookies = JSON.parse(cookiesString);
  await page.setCookie(...cookies);
}

export {
  loadCookies,
  timeout,
  setupBrowser
}