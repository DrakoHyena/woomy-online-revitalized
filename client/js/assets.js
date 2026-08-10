function loadImage(image, cache) {
    const img = new Image();
    img.src = image[0];
    img.ready = false;
    img.onload = function() {
        img.ready = true;
        //console.log(`Image "${image[1]} loaded."`);
        cache[image[1]] = img;
    };
}
const imageCache = (function loadImages() {
    const cache = {};
    let i = 0;
    for (let image of [ // MUST BE PNG
        ["./resources/IED.png", "ied"],
        ["./resources/danksGun.png", "danksGun"],
        ["./resources/hotwheels.png", "hotWheels"],
        ["./resources/ned.png", "ned"],
        ["./resources/omega.png", "omega"],
        ["./resources/do_not_open_at_any_cost.jpg", "do_not_open_at_any_cost"],
        ["./resources/speedy.bmp", "speedy"],
        ["./resources/missingno.bmp", "missingno"],
        ["./resources/ice_hue.png", "ice_hue"],
        ["./resources/poison_hue.png", "poison_hue"],
        ["./resources/emp_hue.png", "emp_hue"],
        ["./resources/par_hue.png", "par_hue"],
        ["./resources/YGlitch250.png", "fourFour"],
        ["./resources/MarbleDecoration.png", "marble_swirl"],
        ["//media.discordapp.net/attachments/995124277521166356/998978430068605058/magma.png", "fillygroove_badge"],
        ["./resources/soccerballs.png", "soccerballs"],
        ["./resources/ooooo_youre_a_boy_kisser.png", "boyKisser"],
        ["./resources/tonk.png", "tonk"],
        ["./resources/rollfac.png", "rollfac"],
        ["./resources/fordf150.png", "f150", 2],
        ["./resources/fordf150Flipped.png", "f150Flipped", 2],
        ["./resources/treadmarks.png", "treadmarks"],
        ["./resources/seniorpentagon.png", "seniorpentagon"],
        ["./resources/blackhole.png", "starbackground"],
        ["./resources/whitehole.png", "starbackgroundInverted"]
    ]) {
        setTimeout(() => {
            if (image[2]) {
                let file = image[0].split(".png")[0]
                for (let i = 0; i < image[2]; i++) {
                    loadImage([`${file}-${i}.png`, `${image[1]}-${i}`], cache)
                }
            } else {
                loadImage(image, cache)
            }
        }, 5 * i++);
    };
    return (cache);
})();

export { loadImage, imageCache }
