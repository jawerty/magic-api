import { setupBrowser } from "./utils";

import API from "./API";

class WebScraper {
	constructor() {
		this.currentMagicFunction = null
		this.classifications = []
	}

	async init() {
		const [browser, page] = await setupBrowser();
		this.browser = browser
		this.page = page;
	}


	async getComponents() {
		const foundComponents = await this.page.evaluate(() => {
			const contentDensityScores = []
			let nodeId = 0

			function isHidden(el) {
			    return (el.offsetParent === null)
			}

			function calculateElementContentScore(element) {
				let score = 0;
				if (isHidden(element)) {
					return score
				}

				const formWeight = 5;
				const imgWeight = 2;
				const svgWeight = 2;
				const canvasWeight = 5;
				const elText = [];
				
				for (let childNode of element.childNodes) {
					if (childNode.nodeType === Node.TEXT_NODE) {
						elText.push(childNode.innerText);
					}
				}
				
				const elementTopLevelText = elText.join(' ') 
				if (elementTopLevelText.length > 0) {
					score += 1
					score *= Math.log(elementTopLevelText.length)
				}
				
				if (element.tagName === "INPUT" 
						|| element.tagName === "SELECT" 
						|| element.tagname === "TEXTAREA" 
						|| element.tagName === "BUTTON") {
					score += formWeight // score weight
				}
				
				if (element.tagName === "IMG") {
					score += imgWeight // score weight
				} else if (element.style.backgroundImage !== '') {
					score += imgWeight // score weight
				}

				if (element.tagName === "SVG") {
					score += svgWeight // score weight
				}

				if (element.tagName === "CANVAS") {
					score += canvasWeight // score weight
				}

				return score
			}

			function getContentDensity(childrenContentScores, parentDepth) {
				let depth = 0;
				let contentDensityScore = 0

				for (let scoreObject of childrenContentScores) {
					const depthDiff = scoreObject.depth-parentDepth
					// depth deranking  
					contentDensityScore += (scoreObject.elementContentScore) * Math.log(depthDiff+1)
				}

				return contentDensityScore;
			}

			function processContentDensity(element, depth) {
				nodeId++;

				const localNodeId = nodeId;
				element.setAttribute('data-super-node-id', localNodeId);

				let childrenContentScores = []
				for (let child of element.children) {
					 const childContentScores = processContentDensity(child, depth+1);
					 childrenContentScores = childrenContentScores.concat(childContentScores)
				}


				const elementContentScore = calculateElementContentScore(element)
				const contentDensityScore = getContentDensity(childrenContentScores, depth)
												
				// ignore shallow component: component 
				let isShallowComponent = false;
				if (element.children.length === 1) {
					const child = element.children[0];
					if (child.children.length > 0) {
						isShallowComponent = true
					}
				}

				if (element.tagName !== "BODY" || !isShallowComponent) { // ignore body
					contentDensityScores.push({
						nodeId: localNodeId,
						elementContent: element.outerHTML,
						contentScore: elementContentScore,
						contentDensityScore,
					})
				}
				

				return childrenContentScores.concat({
					elementContentScore,
					depth
				})
			}

			processContentDensity(document.body, 0);
			// console.log("contentDensityScores", contentDensityScores);

			const foundComponents = contentDensityScores.sort((a, b) => {
				return b.contentDensityScore - a.contentDensityScore
			}).filter((component) => {
				// re look at this threshold
				return component.contentDensityScore > .2 // find a non arbitrary score
			}).map((component) => {
				return component.nodeId
			});

			// console.log("foundComponents LONG:", contentDensityScores.sort((a, b) => {
			// 	return b.contentDensityScore - a.contentDensityScore
			// }).filter((component) => {
			// 	// re look at this threshold
			// 	return component.contentDensityScore > .2 // find a non arbitrary score
			// }))
			// console.log("foundComponents", foundComponents)
			return foundComponents
		});

		console.log("foundComponents", foundComponents.length);
		return foundComponents;
	}

	async classifyComponents(foundComponents) {
		return await this.page.evaluate(async (foundComponents) => {
			const maxComponentsClassified = 100;
			let componentsClassified = 0
			console.log("Classifying", foundComponents.length, "nodes")
			console.log(foundComponents)
			const virtualDOM = document.cloneNode(true);
			const components = {}
			const postOrderTraverse = async (root) => {
				for (let child of root.children) {
					await postOrderTraverse(child)
				}

				if (componentsClassified >= maxComponentsClassified-1) {	
					return
				}

				// thing to do
				const nodeId = root.getAttribute('data-super-node-id');

				root.removeAttribute('data-super-node-id')
				
				if (nodeId
					&& foundComponents.indexOf(parseInt(nodeId)) > -1) {
					console.log("Classifying node id" + nodeId)
					if (componentsClassified > maxComponentsClassified) {
						console.log("CANCEL")
						return;
					}

					const classifyComponent = new Promise((resolve) => {
						return classifyHTML(root.outerHTML).then((classification) => {
							if (classification) {
								console.log("classification:" + nodeId + "-" + classification)
								components[nodeId] = classification
								try {
									const newElementName = classification.replaceAll(',', ' ').replaceAll('\'', ' ').split(" ").join('-').toLowerCase()
									const newElement = document.createElement(newElementName)
									root.replaceWith(newElement)
									componentsClassified++
								} catch(e) {
									console.log("Couldn't assign classification to element")
									console.log(JSON.stringify(e))
								}
							} else {
								console.log("classification failed for nodeId", nodeId)
							}
							resolve()
						}).catch((err) => {
							console.log(JSON.stringify(err))
							resolve()
						})
						
					})

					await classifyComponent
				}

				return
			}

			await postOrderTraverse(virtualDOM.body)
			console.log("FINISHED: " + Object.keys(components).length)
			return components
		}, foundComponents)
	}

	async classifyHTML() {
		const foundComponents = await this.getComponents();
		// classify all the components
		console.log(foundComponents)
		const classfications = await this.classifyComponents(foundComponents);
		console.log(classfications)
		return classfications	
		// a FILTER prompt
			// to find out which component matches the magic function 
		// Scrape all the elements from the filter prompt use the 'data-super-node-id'
	}

	async extractDataFromComponents(nodeIds, data) {
		return await this.page.evaluate(async (nodeIds, data) => {
			const allExtractedData = []
			for (let nodeId of nodeIds) {
				const element = document.querySelector(`[data-super-node-id="${parseInt(nodeId)}"]`)
				if (element) {
					const extractedData = await extractDataFromHTML(element.outerHTML, data)
					allExtractedData.push(extractedData)
				}
			}
			return allExtractedData;
		}, nodeIds, data)
	}
}

export default WebScraper