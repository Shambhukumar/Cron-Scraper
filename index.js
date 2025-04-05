const puppeteer = require("puppeteer");
const axios = require("axios");

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000; // Use Render's PORT

const headlessStatus = true;
const newsTopicArr = ["home", "world", "politics", "business", "sports", "health", "Middle East", "Ukraine Russia", "asia", "uk"];
// const newsTopicArr = ["Middle East"];
const collectedNewsArr = [];

const APP_BASE_URL = "https://archer-api.netlify.app/.netlify/functions/server/"

// Storing News Format
// {
//     image: "image of the article",
//     heading: "heading of the article",   
//     articleLink: "link of the article to the brodcaster site",
//     brodcaster: "what is the name of the news angency",
//     category: "category of the article",
//     articleText: "article text",
// }

const timeout = 0; // 60 seconds

const axiosInstance = axios.create({
    baseURL: APP_BASE_URL,
    timeout: 30000,
})

const executablePath = '/usr/bin/chromium-browser';
// const executablePath = '';



const init = async () => {
    for (let i = 0; i < newsTopicArr.length; i++) {
        await BBC(newsTopicArr[i]);
        await Gurdian(newsTopicArr[i]);
        await NYT(newsTopicArr[i]);
        await CNN(newsTopicArr[i]);
        console.log("Process finished", collectedNewsArr.length);
    }
};

const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage', // Prevents memory issues in Docker
    // '--disable-extensions',  // Disable Chrome extensions
    // '--disable-default-apps',  // Disable default Chrome apps
    // '--no-zygote',


    '--no-zygote',
    '--disable-dev-tools',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-features=IsolateOrigins,site-per-process',
    '--mute-audio',
    '--disable-accelerated-2d-canvas',
];

const BBC = async (category) => {
    const defaultUrl = "https://www.bbc.com";
    console.log(`Visiting BBC with category: ${category}`);

    try {
        const bbcCategoryUrlsObj = {
          sports: `${defaultUrl}/sport`,
          home: `${defaultUrl}/news`,
          "Middle East": `${defaultUrl}/news/world/middle_east`,
          "Ukraine Russia": `${defaultUrl}/news/war-in-ukraine`,
          asia: `${defaultUrl}/news/world/asia`,
        };
        
        let urlWithCategory = bbcCategoryUrlsObj[category] || `${defaultUrl}/news/${category}`;


        var browser = await puppeteer.launch({
            timeout: timeout,
            executablePath,
            headless: headlessStatus,
            args: puppeteerArgs,
        });

        const page = await browser.newPage();
        await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Mobile/15E148 Safari/537.36'
  );
        await page.setViewport({ width: 375, height: 667 });
        page.setDefaultNavigationTimeout(0);
        await page.goto(urlWithCategory, { timeout: timeout });

        const news = await page.evaluate(async (category) => {
            const scrollIntoViewWithDelay = (element) => {
                return new Promise((resolve) => {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(resolve, 400);
                });
            };

            const scrollListIntoViewSequentially = async (list) => {
                for (const element of list) {
                    await scrollIntoViewWithDelay(element);
                }
            };

            const allDivs = document.querySelectorAll("div");
            const arrayOfDivs = Array.from(allDivs);
            const filteredElement = [];
            const uniqueKey = [];

            arrayOfDivs.forEach((element) => {
                if (element.querySelector("img") && element.querySelector("p")) {
                    const title = element.querySelector('span[role="text"]') ?? element.querySelector("h2");
                    if (title.textContent.length > 25 && !uniqueKey.includes(title.textContent)) {
                        uniqueKey.push(title.textContent);
                        filteredElement.push(element);
                    }
                }
            });

            await scrollListIntoViewSequentially(filteredElement);

            const articleWithDetails = [];
            filteredElement.forEach((element) => {
                element.scrollIntoView();
                const srcset = element.querySelector("img").getAttribute("srcset");
                const articleHeadline = element.querySelector('span[role="text"]') ?? element.querySelector("h2");
                const articleLink = element.querySelector("a").href;
                const articleParagraph = element.querySelector("p").textContent;

                if (srcset) {
                    articleWithDetails.push({
                        image: srcset.split(",")[0].split(" ")[0],
                        heading: articleHeadline.textContent,
                        articleLink: articleLink,
                        brodcaster: "BBC",
                        category,
                        articleText: articleParagraph,
                    });
                }
            });

            if (articleWithDetails.length) articleWithDetails.shift();
            console.log(articleWithDetails);
            return articleWithDetails;
        }, category);

        if (news.length) collectedNewsArr.push(news);
        console.log(news.length)
        await browser.close();


        if (news.length > 1) {
            await axiosInstance.post(`saveNews`, {
                data: {
                    Category: category,
                    brodcaster: "BBC",
                    news,
                },
            });
        } else {
            return null;
        }
    } catch (e) {
        console.log(e);
        await browser.close();
        // console.log(e);
    }
};

const Gurdian = async (category) => {
    console.log(`Inside Guardian ${category}`);

    const gurdianCategoryUrlsObj = {
        sports: "https://www.theguardian.com/sport",
        home: "https://www.theguardian.com/",
        "Middle East": "https://www.theguardian.com/world/middleeast",
        "Ukraine Russia": "https://www.theguardian.com/world/ukraine",
        asia: "https://www.theguardian.com/world/asia",
    }

    let urlWithCategory = gurdianCategoryUrlsObj[category] || `https://www.theguardian.com/${category}`;

    try {
        var browser = await puppeteer.launch({ 
            timeout: timeout,
            executablePath,
            headless: headlessStatus, 
            args: puppeteerArgs
        });
        const page = await browser.newPage();
        await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Mobile/15E148 Safari/537.36'
  );
        await page.setViewport({ width: 375, height: 667 });
        await page.goto(urlWithCategory, {timeout: timeout});

        const news = await page.evaluate((CurrentCategory) => {
            const list = document.querySelectorAll('li');
            
            const arrayList = Array.from(list);
            const FilterdNews = [];

            arrayList.map((element, el) => {
                const img = element.querySelector("img");
                const anchor = element.querySelector("a");
                const currentNews = {};
                const heading = anchor?.parentElement?.querySelector(".card-headline")?.textContent
                const articleText = anchor?.parentElement?.querySelector(".show-underline")?.textContent
                if (anchor && heading && articleText && img) {
                  
                    
                    currentNews.image = anchor.parentElement.querySelector("source").getAttribute("srcset");
                    currentNews.heading = heading;
                    currentNews.articleLink = anchor.href;
                    currentNews.brodcaster = "Gurdian";
                    currentNews.category = CurrentCategory;
                    currentNews.articleText = articleText;
                    console.log(currentNews.articleText, currentNews.image);

                    FilterdNews.push(currentNews);
                }
            });
            console.log(FilterdNews);
            return FilterdNews;
        }, category);

        console.log("browser Closed");

        console.log(news.length)
        await browser.close();

        if (news.length > 1) {
            await axiosInstance.post(`saveNews`, {
                data: {
                    Category: category,
                    brodcaster: "Guardian",
                    news
                }
            });
        } else {
            return null;
        }
    } catch (e) {
        console.log(e);
        await browser.close();
        console.log("Browser Closed");
    } finally {
        await browser.close();
    }
};

const NYT = async (category) => {
    console.log(`Inside NYT ${category}`);
    try {
        const url = "https://www.nytimes.com";
        const NYTCategoryUrlsObj = { 
            home: `${url}/nyregion`,
            uk: `${url}/topic/destination/great-britain`,
            'Middle East': `${url}/section/world/middleeast`,
            'Ukraine Russia': `${url}/news-event/ukraine-russia`,

        }

        let urlWithCategory = NYTCategoryUrlsObj[category] || `${url}/${category}`;

        var browser = await puppeteer.launch({
            timeout: timeout,
            executablePath,
            headless: headlessStatus,
            args: puppeteerArgs
        });
        const page = await browser.newPage();
        await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Mobile/15E148 Safari/537.36'
  );
        await page.setViewport({ width: 375, height: 667 });
        await page.goto(urlWithCategory, {timeout: timeout});

        const news = await page.evaluate((CurrentCategory) => {
            const FilterdNews = [];
            const section = document.querySelector("#stream-panel");
            if (section) {
                const ol = section.querySelector("ol");
                const ollist = Array.from(ol.querySelectorAll("li"));

                ollist.map((element) => {
                    const img = element.querySelector("img");
                    const anchor = element.querySelector("a");
                    if (img && anchor) {
                        const AllNews = {
                            image: img.src,
                            anchorText: element.querySelector("h3").innerText,
                            articleLink: anchor.href,
                            brodcaster: "NewYorkTimes",
                        };
                        const paragraph = element.querySelector("p");
                        paragraph && (AllNews.articleText = paragraph.textContent);
                        FilterdNews.push(AllNews);
                    }
                });
            }

            const list = document.querySelectorAll('article');
            const arrayList = Array.from(list);
            arrayList.map((element) => {
                const img = element.querySelector("img");
                const anchor = element.querySelector("h3");
                if (img && anchor) {
                    const AllNews = {
                        image: img.src,
                        heading: element.querySelector("a").textContent,
                        articleLink: element.querySelector("a").href,
                        brodcaster: "NewYorkTimes",
                    };
                    const paragraph = element.querySelector("p");
                    paragraph && (AllNews.articleText = paragraph.textContent);

                    let duplicate = false;
                    FilterdNews.forEach((item) => {
                        if (item.anchorLink === AllNews.articleLink) duplicate = true;
                    });
                    if (!duplicate) FilterdNews.push(AllNews);
                }
            });
            console.log(FilterdNews);
            return FilterdNews;
        }, category);

        console.log("browser Closed");
        await browser.close();

        console.log(news.length)

        if (news.length > 1) {
            await axiosInstance.post(`saveNews`, {
                data: {
                    Category: category,
                    brodcaster: "NYT",
                    news
                }
            });
        } else {
            return null;
        }
    } catch (e) {
        console.log(e);
        await browser.close();
        console.log("Browser Closed");
    } finally {
        await browser.close();
    }
};

const CNN = async (category) => {
    console.log(`Inside CNN ${category}`);
    const url = `https://edition.cnn.com`;
    const CNNCategoryUrlsObj = {
        home: `${url}/`,
        'Middle East': `${url}/world/middleeast`,
        'Ukraine Russia': `${url}/world/europe/ukraine`,
    }
    let urlWithCategory = CNNCategoryUrlsObj[category] || `${url}/${category}`;
    try {

        var browser = await puppeteer.launch({
            timeout: timeout,
            executablePath,
            headless: headlessStatus,
            args: [
                '--disable-gpu', 
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox', 
                '--no-sandbox', 
                '--no-zygote',
                
            ]
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });
        await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Mobile/15E148 Safari/537.36'
  );
        await page.setViewport({ width: 375, height: 667 });
        await page.goto(urlWithCategory, { waitUntil: "domcontentloaded", timeout: timeout  });
        const news = await page.evaluate(async (CurrentCategory) => {
            const list = document.querySelectorAll('.card');
            const arrayList = Array.from(list);
            const FilterdNews = [];

            arrayList.map((element) => {
                const img = element.querySelector("img");
                if (img) {
                    const anchor = element.querySelector("a");
                    const imge = img.src;
                    const heading = element.querySelector('span').textContent;
                    const articleLink = anchor.href;

                    if (heading && heading.length > 10) {
                        FilterdNews.push({
                            imge,
                            heading,
                            articleLink,
                            brodcaster: "CNN",
                            category: CurrentCategory,
                            articleText: null
                        });
                    }
                }
            });
            // console.log(FilterdNews)
            return FilterdNews;
        }, category);

        console.log("browser Closed");
        await browser.close();
        console.log(news.length);

        if (news.length > 9) {
            await axiosInstance.post(`saveNews`, {
                data: {
                    Category: category,
                    brodcaster: "CNN",
                    news
                }
            });
        } else {
            return null;
        }
    } catch (e) {
        console.log(e);
        await browser.close();
        console.log("Browser Closed");
    } finally {
        await browser.close();
    }
};



// init();


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });


  app.get('/runScraper', async (req, res) => {
    console.log("Scraper started")
    init()
  })