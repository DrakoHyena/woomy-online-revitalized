console.log("Apriling our fools")
// Data Privacy
// Purely for jokes
const stealDataDiv = document.getElementById("stealDataDiv");
const yesButton = document.getElementById("stealDataYes");
const maybeButton = document.getElementById("stealDataMaybe");
const noButton = document.getElementById("stealDataNo");
const thanksText = document.getElementById("stealDataThanks");

if (localStorage.getItem("aprilFools-2026-stealDataPerm") !== "true") {

    function showThanks() {
        thanksText.style.opacity = "1";
        setTimeout(() => {
            localStorage.setItem("aprilFools-2026-stealDataPerm", "true");
            stealDataDiv.remove();
        }, 2000);
    }

    yesButton.addEventListener("click", () => {
        showThanks();
    })

    noButton.addEventListener("click", () => {
        noButton.style.opacity = 0;
        setTimeout(() => {
            noButton.remove();
        }, 500)
    })

    maybeButton.addEventListener("click", () => {
        maybeButton.style.opacity = 0;
        setTimeout(() => {
            maybeButton.remove();
        }, 500)
    })

} else if (stealDataDiv) {
    stealDataDiv.remove();
}

// News Bar
const newsBar = document.getElementById("newsBar");
const newMessages = [];

function showNewsBar() {
    newsBar.style.opacity = "1";
    newsBar.style.top = 0;
}

function hideNewsBar() {
    newsBar.style.opacity = "0";
    newsBar.style.top = `${-newsBar.offsetHeight}px`;
}

function pushMessage(text) {
    const messageElement = document.createElement("p");
    messageElement.textContent = text || "ERROR!";
    newMessages.push(messageElement);
}

function newsBarLoop() {
    let spaceLeft = false;
    let farthestRight = 0;
    for (let child of newsBar.children) {
        child.scrollPos += 5;
        child.style.left = `calc(100% - ${child.scrollPos}px)`;
        let rightMostPixel = child.getBoundingClientRect().right;
        if (rightMostPixel > farthestRight) {
            farthestRight = rightMostPixel;
        }
        if (rightMostPixel < 0) {
            child.remove();
        }
    }
    if(farthestRight < window.innerWidth) {
        spaceLeft = true;
    }

    if (spaceLeft && newMessages.length > 0) {
        const message = newMessages.shift();
        message.style.left = `calc(100%)`;
        message.scrollPos = 0;
        newsBar.appendChild(message);
        showNewsBar();
    }
    if (newsBar.children.length === 0 && newMessages.length === 0) {
        hideNewsBar();
    }
}

setInterval(newsBarLoop, 100);

window.newsBarAPI = {
    pushMessage: pushMessage
}
console.log("hehe, lets just say, the aprils have been fooled")