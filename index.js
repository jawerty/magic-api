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
    this.init = async function () {
		this.scraper = new WebScraper();
		await this.scraper.init();

		this.api = new API();
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
		await this.scraper.page.evaluate(() => {
			class API {
				constructor() {

				}

				async generate(system_prompt, user_prompt, isRaw) {
					const apiUrl = "https://9339-34-71-1-87.ngrok-free.app/generate"
					const result = await fetch(apiUrl, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Accept": "application/json"
						},
						body: JSON.stringify({
							system_prompt,
							user_prompt,
							not_json: isRaw
						})
					});

					try {
						const response = await result.json();
						console.log(response)
						return response["response"];
					} catch(e) {
						console.log(e)
						return null
					}
				}

				async classifyHTML(htmlString) {
					const systemPrompt = `
					You are a html classifying bot. Your role is to analyze given HTML snippets and respond with what you think the HTML represents in the real world. 
					For example, if given an html snippet that looks like a comment from a reply thread, then you would respond with "thread comment". If given an html snippet that looks like a news advertisement you would respond with "advertisement from a news website".
					Your answer must be based on the html's semantic meaning as if you were describing it to a non-technical person.

					Your response must be in JSON format. The HTML classification you determine should be under the json field \`classification\`. Remember to only respond with json. 

					Here's an example of JSON format:
					{
						"classification": "your classification goes here"
					}`.trim();

					const userPrompt = `Here is the HTML I want you to classify: ${htmlString.slice(0,2000)}`;

					const response = await this.generate(systemPrompt, userPrompt, false)
					if (response && response["classification"]) {
						return response["classification"]
					} else {
						return null
					}
				}

				async extractDataFromHTML(html, data) {
					console.log("FIELDS:", Object.keys(data));
					const systemPrompt = `
					You are a html data extracting bot. Your role is to read given html and extract the data based on the fields given by the user and return json with those fields and the extracted data as the value.

					The user will give you the html and the data you must extract.

					If the user wants the fields "article_title, article_link" from html code of a news article, you must reply with a json object with both fields  \`article_title\` and \`article_link\`

					Your response must be in JSON format. The extracted data from the html you found should be under the json fields exactly the same as the fields the user gave you. Remember to only respond with json. 

					Here's an example of JSON format for the above example:
					{
						"article_title": "The article title you extracted",
						"article_link": "The article link you extracted"
					}`.trim();

					const userPrompt = `I want you extract these fields: "${Object.keys(data).join(', ')}"\n\n THE HTML: ${html.slice(0,2000)}\n\nOnce again only extract these fields: "${Object.keys(data).join(', ')}"`;

					const response = await this.generate(systemPrompt, userPrompt, false)
					if (response) {
						console.log(response)
						return response
					} else {
						return null
					}
				}

			}
			window.api = new API();
		})
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
