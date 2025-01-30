import WebScraper from "./lib/WebScraper";
import API from "./lib/API";

function enableNoSuchMethod(obj) {
  return new Proxy(obj, {
    get(target, p) {
      if (p in target) {
        return target[p];
      } else if (typeof target.__noSuchMethod__ == "function") {
        return function(...args) {
          return target.__noSuchMethod__.call(target, p, args);
        };
      }
    }
  });
}

function Magic() {
    this.init = async function (apiUrl) {
		this.scraper = new WebScraper();
		await this.scraper.init();

		this.api = new API(apiUrl);
	}

	this.runMagicFunction = async function(name, data) {
		console.log(name, data)
		const filteredComponents = await this.filterComponents(name)
		return await this.scrapeComponentsForData(data[0])	
	}

	this.goto = async function(website) {
		console.log(website)
		await this.scraper.page.setBypassCSP(true)
		await this.scraper.page.goto(website)
		await this.scraper.page.exposeFunction("extractDataFromHTML", async (html, data) => {
			return await this.api.extractDataFromHTML(html, data)
		});
		await this.scraper.page.exposeFunction("classifyHTML", async (html) => {
			return await this.api.classifyHTML(html)
		});
		return true;
	}

	this.classifyHTML = async function() {
		const classifications = await this.scraper.classifyHTML()
		this.classifications = classifications;
	}

	this.filterComponents = async function(nameOfMagicFunction) {
		const filteredComponents = {}
		for (let nodeId in this.classifications) {
			const classification = this.classifications[nodeId]
			const isMatch = await this.api.filterHTML(nameOfMagicFunction, classification);
			if (isMatch) {
				filteredComponents[nodeId] = classification
			}
		}
		return filteredComponents
	}

	this.scrapeComponentsForData = async function(data) {
		const nodeIds = Object.keys(this.classifications)
		return await this.scraper.extractDataFromComponents(nodeIds, data)
	}

	return enableNoSuchMethod(this);
}

Magic.prototype.__noSuchMethod__ = async function(name, data) {
  return this.runMagicFunction(name, data)
};



export default Magic;
