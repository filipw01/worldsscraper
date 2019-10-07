const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://na.leagueoflegends.com/en/game-info/items/", {
    waitUntil: "load",
    timeout: 0
  });
  // Get the "viewport" of the page, as reported by the page.

  // get match history links
  await page.waitFor(".content-border [data-rg-name]");
  const items = await page.evaluate(async () => {
    let items = [];
    const itemNodes = document.querySelectorAll(
      ".content-border [data-rg-name]"
    );
    for (const itemNode of itemNodes) {
      items.push({ id: itemNode.dataset.rgId, name: itemNode.nextSibling.textContent });
    }
    return items;
  });

  fs.writeFile("items.json", JSON.stringify(items), "utf8", function(err) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }

    console.log("JSON file has been saved.");
  });
  // await page.$eval("#user_login", (el, username) => (el.value = username), config.username);
  await browser.close();
})();
