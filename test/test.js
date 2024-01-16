import Magic from "../index"

(async function() {
	const magic = new Magic();
	await magic.init()

	await magic.goto("https://getbootstrap.com/docs/4.0/examples/pricing/")
	const classifications = await magic.classifyHTML()

	console.log("Running magic functions")
	const pricingCards = await magic.getAllPricingCards({ price: true, title: true })
	console.log("pricingCards", pricingCards)
	/*
	const result = await magic.goto("")
		.classifyHTML()
		.getAllArticles({ articleName: true })
	
	console.log(result)
	*/
})()

process.on("SIGINT", () => {
  console.log("Ctrl-C was pressed");
  process.exit();
});
