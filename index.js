import { createClient } from '@vercel/kv';
import { scrap } from 'linkedin-profile-scraper';

async function runScraper() {
  const kvUrl = process.env.KV_URL;
  const linkedinCookie = process.env.LINKEDIN_COOKIE;

  if (!kvUrl || !linkedinCookie) {
    console.error('FATAL: Missing KV_URL or LINKEDIN_COOKIE in secrets.');
    process.exit(1);
  }

  const kv = createClient({ url: kvUrl });

  console.log('Scraping process started...');

  try {
    const profileData = await scrap({
      url: 'https://www.linkedin.com/in/jaymin-dattani-ba6695294/',
      cookie: linkedinCookie,
    });

    // We only need specific parts of the data
    const finalData = {
      profilePicture: profileData.userProfile.photo,
      about: profileData.userProfile.summary,
      experience: profileData.experiences,
      certifications: profileData.certifications,
      lastScraped: new Date().toISOString(),
    };

    console.log('Data extracted. Saving to KV store...');
    await kv.set('linkedin-profile-data', finalData);
    console.log('Scraping process finished successfully.');

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    process.exit(1);
  }
}

runScraper();
