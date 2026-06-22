import express from 'express';
import { kv } from '@vercel/kv';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 10000;

// The endpoint that will trigger the scrape
app.get('/scrape', async (req, res) => {
  // Simple secret to prevent unauthorized scrapes
  if (req.headers['x-secret-key'] !== process.env.SCRAPE_SECRET_KEY) {
    return res.status(401).send('Unauthorized');
  }

  console.log('Scraping process started...');
  res.status(202).send('Scraping process initiated. Check server logs for status.');

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    });

    const page = await browser.newPage();
    await page.goto('https://www.linkedin.com/in/jaymin-dattani-ba6695294/', { waitUntil: 'networkidle2' });

    console.log('Page loaded. Extracting data...');

    // --- Extract Data ---
    const data = await page.evaluate(() => {
      const getCleanText = (element) => element?.innerText.trim() || '';

      // Profile Picture
      const profilePicture = document.querySelector('.pv-top-card-profile-picture__image')?.src || '';

      // About section
      const aboutText = document.querySelector('.pv-about-section .inline-show-more-text')?.innerText.trim() || '';

      // Experience Section
      const experienceItems = [];
      document.querySelectorAll('#experience ~ .pvs-list__outer-container > ul > li.artdeco-list__item').forEach(item => {
        const title = getCleanText(item.querySelector('.mr1.t-bold > span[aria-hidden="true"]'));
        const companyAndDuration = getCleanText(item.querySelector('.t-14.t-normal > span[aria-hidden="true"]'));
        const description = getCleanText(item.querySelector('.pv-shared-text-with-see-more .inline-show-more-text'));
        
        if (title) {
            experienceItems.push({ title, companyAndDuration, description });
        }
      });

      // Certifications Section
      const certificationItems = [];
      document.querySelectorAll('#licenses_and_certifications ~ .pvs-list__outer-container > ul > li.artdeco-list__item').forEach(item => {
        const title = getCleanText(item.querySelector('.mr1.t-bold > span[aria-hidden="true"]'));
        const issuer = getCleanText(item.querySelector('.t-14.t-normal > span[aria-hidden="true"]'));
        const image = item.querySelector('.pvs-entity__logo img')?.src || '';

        if (title) {
            certificationItems.push({ title, issuer, image });
        }
      });

      return {
        profilePicture,
        about: aboutText,
        experience: experienceItems,
        certifications: certificationItems,
        lastScraped: new Date().toISOString(),
      };
    });

    console.log('Data extracted. Saving to KV store...');
    await kv.set('linkedin-profile-data', data);

    await browser.close();
    console.log('Scraping process finished successfully.');

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  }
});

app.listen(PORT, () => {
  console.log(`Scraper service listening on port ${PORT}`);
});
