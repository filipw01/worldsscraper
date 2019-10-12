const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(
    "https://lol.gamepedia.com/2019_Season_World_Championship/Main_Event",
    {
      waitUntil: "load",
      timeout: 0
    }
  );
  // Get the "viewport" of the page, as reported by the page.

  // get match history links
  await page.waitFor("#md-table > tbody td:nth-child(14) > a");
  const matchHistoryLinks = await page.evaluate(async () => {
    let links = [];
    const anchors = [
      ...document.querySelectorAll("#md-table > tbody td:nth-child(14) > a"),
      ...document.querySelectorAll(
        "#md-table > tbody  td:nth-child(4) a.external"
      )
    ];
    for (const anchor of anchors) {
      links.push(anchor.href);
    }
    return links;
  });
  const finalData = [];
  for (const matchHistory of matchHistoryLinks) {
    await page.goto(matchHistory, {
      waitUntil: "load",
      timeout: 0
    });
    await page.waitFor(".grid-list > li");
    await page.waitFor(3000);
    const game = await page.evaluate(async () => {
      const team = { players: [] };
      const team2 = { players: [] };
      const playerNodes = document.querySelectorAll(".grid-list > li");
      let i = 0;
      for (const playerNode of playerNodes) {
        const player = {};
        player.name = playerNode
          .querySelector(".champion-nameplate-name")
          .innerText.match(/ .*/)[0]
          .slice(1);
        player.kills = playerNode
          .querySelector(".kda-kda")
          .innerText.match(/.*?\//)[0]
          .slice(0, -1);
        player.deaths = playerNode
          .querySelector(".kda-kda")
          .innerText.match(/\/.*\//)[0]
          .slice(1, -1);
        player.assists = playerNode
          .querySelector(".kda-kda")
          .innerText.slice(
            playerNode.querySelector(".kda-kda").innerText.lastIndexOf("/") + 1
          );
        player.champion = {
          id: playerNode.querySelector(".champion-icon > div").dataset.rgId,
          image: playerNode.querySelector(".champion-icon > div img").src
        };
        player.creeps = playerNode.querySelector(".cs").innerText;
        player.gold = playerNode
          .querySelector(".gold")
          .innerText.replace("k", "00")
          .replace(".", "");
        const items = [];
        for (const itemNode of playerNode.querySelectorAll(".item-icon img")) {
          items.push({
            id: itemNode.parentNode.dataset.rgId,
            image: itemNode.src
          });
        }

        player.items = items;
        player.damage = document
          .querySelector("#grid-cell-" + (i + 351))
          .innerText.replace("k", "00")
          .replace(".", "");
        switch (i % 5) {
          case 0:
            player.position = "top";
            break;
          case 1:
            player.position = "jungle";
            break;
          case 2:
            player.position = "mid";
            break;
          case 3:
            player.position = "adc";
            break;
          case 4:
            player.position = "support";
            break;

          default:
            player.position = "unknown";
            break;
        }
        if (i === 4) {
          team.name = playerNode
            .querySelector(".champion-nameplate-name")
            .innerText.match(/\w*/)[0];
        }
        if (i === 9) {
          team2.name = playerNode
            .querySelector(".champion-nameplate-name")
            .innerText.match(/\w*/)[0];
        }
        if (i < 5) {
          team.players.push(player);
        } else {
          team2.players.push(player);
        }
        i++;
      }
      team.gameLength = document.querySelector(
        ".map-header-duration"
      ).innerText;
      team2.gameLength = document.querySelector(
        ".map-header-duration"
      ).innerText;
      const firstBloodNode = document.querySelector(
        ".card-champion-kill .killer > div > div"
      );
      if (firstBloodNode) {
        team.firstBlood = {
          id: firstBloodNode.dataset.rgId,
          image: firstBloodNode.firstChild.src
        };
        team2.firstBlood = {
          id: firstBloodNode.dataset.rgId,
          image: firstBloodNode.firstChild.src
        };
      }
      const bans = [];
      const bans2 = [];
      const bansNodes = document.querySelectorAll(
        ".bans-container .champion-icon > div"
      );
      for (let iterator = 0; iterator < 10; iterator++) {
        if (iterator < 5) {
          bans.push({
            id: bansNodes[iterator].dataset.rgId,
            image: bansNodes[iterator].firstChild.src
          });
        } else {
          bans2.push({
            id: bansNodes[iterator].dataset.rgId,
            image: bansNodes[iterator].firstChild.src
          });
        }
      }
      team.bans = bans;
      team2.bans = bans2;
      team.herald = document.querySelector(
        ".scoreboard .team-100 .rift-herald-kills"
      ).innerText;
      team2.herald = document.querySelector(
        ".scoreboard .team-200 .rift-herald-kills"
      ).innerText;
      team.barons = document.querySelector(
        ".scoreboard .team-100 .baron-kills"
      ).innerText;
      team2.barons = document.querySelector(
        ".scoreboard .team-200 .baron-kills"
      ).innerText;
      team.dragons = document.querySelector(
        ".scoreboard .team-100 .dragon-kills"
      ).innerText;
      team2.dragons = document.querySelector(
        ".scoreboard .team-200 .dragon-kills"
      ).innerText;
      team.towers = document.querySelector(
        ".scoreboard .team-100 .tower-kills"
      ).innerText;
      team2.towers = document.querySelector(
        ".scoreboard .team-200 .tower-kills"
      ).innerText;
      team.inhibitors = document.querySelector(
        ".scoreboard .team-100 .inhibitor-kills"
      ).innerText;
      team2.inhibitors = document.querySelector(
        ".scoreboard .team-200 .inhibitor-kills"
      ).innerText;
      team.win =
        document.querySelector(".game-conclusion").innerText === "VICTORY"
          ? true
          : false;
      team2.win =
        document.querySelector(".game-conclusion").innerText === "VICTORY"
          ? false
          : true;

      const gameIdentity = window.location.href.match(
        /06\/.*?gameHash=.*?&/
      )[0];
      const gameId = gameIdentity.slice(3, 10);
      const gameHash = gameIdentity.slice(20, -1);

      await fetch(
        "https://acs.leagueoflegends.com/v1/stats/game/ESPORTSTMNT06/" +
          gameId +
          "/timeline?gameHash=" +
          gameHash
      )
        .then(res => res.json())
        .then(response => {
          const arrayOfPlayers = [];
          for (let i = 1; i <= 10; i++) {
            arrayOfPlayers.push(response.frames[15].participantFrames[i]);
          }
          const arrayOfTotalGold = arrayOfPlayers.map(item => item.totalGold);
          team.goldDifferenceAt15 = arrayOfTotalGold.reduce(
            (acc, curr, index) => {
              if (index < 5) {
                return acc + curr;
              }
              return acc - curr;
            }
          );
          team2.goldDifferenceAt15 = -team.goldDifferenceAt15;
        });

      return [team, team2];
    });
    finalData.push(...game);
    const firstBloodId = game[0].firstBlood
      ? game[0].firstBlood.id
      : "!!! Unable to load first blood. Fix after saving the file !!!";
    console.log(
      game[0].name +
        " vs " +
        game[1].name +
        " has been scrapped. First blood by " +
        firstBloodId
    );
  }
  console.log("All " + finalData.length / 2 + " games have been scrapped");

  fs.writeFile("mainEvent.json", JSON.stringify(finalData), "utf8", function(err) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }

    console.log("JSON file has been saved.");
  });
  await browser.close();
})();
