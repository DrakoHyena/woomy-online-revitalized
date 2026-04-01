import { setAsset } from "../shared/assets.js";

setAsset("trout", "/resources/trout.png", {image:true, p1:2, p2:1, p3:4, p4:2})
setAsset("chimp1", "/resources/chimp1.png", {image:true, p1:2, p2:2, p3:4, p4:4})
setAsset("chimp2", "/resources/chimp2.png", {image:true, p1:2, p2:2, p3:4, p4:4})
setAsset("chimp3", "/resources/chimp3.png", {image:true, p1:2, p2:2, p3:4, p4:4})
setAsset("billgates-bill", "/resources/billgates-bill.png", {image:true, p1:2, p2:1, p3:4, p4:2})
setAsset("supergates-bill", "/resources/supergates-bill.png", {image:true, p1:2, p2:1, p3:4, p4:2})


// Here's some examples, they work in their intended places.
// These can be used for any data
// Suggest expanding this system in the discord

// Use getAsset("assetName") for certain values in defs

/*
// For BODY or PROP.SHAPE
setAsset("arrowShape", "M16.153 19 21 12l-4.847-7H3l4.848 7L3 19h13.153Z", {path2d: true, path2dDiv: 12})

// For BODY
setAsset("ranImage", "https://picsum.photos/100", {
	image:true,
	p1:2,
	p2:2,
	p3:4,
	p4:4
})

// For COLOR
setAsset("pumpkinOrange", "#FF7518");
*/