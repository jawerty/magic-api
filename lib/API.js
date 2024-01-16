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

	async filterHTML(functionName, classification) {
		const systemPrompt = `
		You are a web developer bot. Your role is to read a javascript function name and determine whether the given classification text is directly relevant to the function name.

		For example, if you are given the following classification text for an article link
		Classification Text: "article link for a news website"

		And the user function is named "getArticleLinks()" you would return a true value under the json key is_match.

		if the function name is NOT related to the given classification text return a false value under the json key is_match.

		Your response must be in JSON format. The boolean value for the match you determine should be under the json field \`is_match\`. Remember to only respond with json. 

		Here's an example of the JSON format:
		{
			"is_match": true
		}`.trim();

		const userPrompt = `The user's function is "${functionName}()" and the classification text is "${classification}"`;

		const response = await this.generate(systemPrompt, userPrompt, false)
		if (response && response["is_match"]) {
			if (typeof response["is_match"] === "string") {
				return response["is_match"].toLowerCase() === "true"
			} else {
				return response["is_match"]
			}
		} else {
			return null
		}
	}

}

export default API;