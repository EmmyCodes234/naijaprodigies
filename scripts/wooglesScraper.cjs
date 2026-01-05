/**
 * Woogles.io Live Games Scraper
 * 
 * This script scrapes live game data from woogles.io and pushes it to Supabase.
 * Designed to run as a GitHub Action on a cron schedule.
 * 
 * Usage: node wooglesScraper.cjs
 * 
 * Required environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (not anon key)
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const WOOGLES_URL = 'https://woogles.io';
const MAX_GAMES = 20;
const SCROLL_ATTEMPTS = 3;
const WAIT_TIME = 5000;

// High profile threshold (combined rating)
const HIGH_PROFILE_THRESHOLD = 4000;

// Initialize Supabase client with service role key
const isDryRun = process.argv.includes('--dry-run');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!isDryRun && (!supabaseUrl || !supabaseServiceKey)) {
    console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY (or use --dry-run)');
    process.exit(1);
}

const supabase = isDryRun ? null : createClient(supabaseUrl, supabaseServiceKey);

/**
 * Parse rating from text like "1850" or handle empty/missing
 */
function parseRating(ratingText) {
    if (!ratingText) return null;
    const cleaned = ratingText.replace(/[^\d]/g, '');
    const rating = parseInt(cleaned, 10);
    return isNaN(rating) ? null : rating;
}

/**
 * Main scraping function
 */
async function scrapeWooglesGames() {
    console.log(`[${new Date().toISOString()}] Starting Woogles scraper...`);

    let browser;
    try {
        // Launch browser with settings optimized for GitHub Actions
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Navigating to woogles.io...');
        await page.goto(WOOGLES_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for the games table to load
        console.log('Waiting for games to load...');
        await page.waitForSelector('tr.game-listing, .ant-table-row', { timeout: 15000 }).catch(() => {
            console.log('No game listings found yet, waiting more...');
        });

        // Extra wait for React to render
        await new Promise(r => setTimeout(r, WAIT_TIME));

        // Scroll to load more games
        for (let i = 0; i < SCROLL_ATTEMPTS; i++) {
            await page.evaluate(() => {
                const scrollContainer = document.querySelector('.main-content') || document.body;
                scrollContainer.scrollTop += 500;
            });
            await new Promise(r => setTimeout(r, 1000));
        }

        // Extract game data
        console.log('Extracting game data...');
        const games = await page.evaluate((maxGames) => {
            const rows = document.querySelectorAll('tr.game-listing, tr[data-row-key]');
            const results = [];

            rows.forEach((row, index) => {
                if (index >= maxGames) return;

                const gameId = row.getAttribute('data-row-key');
                if (!gameId) return;

                const playerNames = Array.from(row.querySelectorAll('.player-name, .username'))
                    .map(el => el.textContent?.trim())
                    .filter(Boolean);

                const ratings = Array.from(row.querySelectorAll('.ant-tag, .rating'))
                    .map(el => el.textContent?.trim())
                    .filter(Boolean);

                const lexiconEl = row.querySelector('.lexicon, td:nth-child(3)');
                const timeEl = row.querySelector('.time, td:nth-child(4)');

                if (playerNames.length >= 2) {
                    results.push({
                        gameId,
                        player1: playerNames[0] || 'Unknown',
                        player2: playerNames[1] || 'Unknown',
                        rating1: ratings[0] || null,
                        rating2: ratings[1] || null,
                        lexicon: lexiconEl?.textContent?.trim() || null,
                        timeControl: timeEl?.textContent?.trim() || null
                    });
                }
            });

            return results;
        }, MAX_GAMES);

        console.log(`Found ${games.length} games`);

        if (games.length === 0) {
            console.log('No games found. Page might have different structure or no live games.');
            await browser.close();
            return;
        }

        // Prepare data for Supabase
        const gameRecords = games.map(game => ({
            woogles_game_id: game.gameId,
            player1_name: game.player1,
            player2_name: game.player2,
            player1_rating: parseRating(game.rating1),
            player2_rating: parseRating(game.rating2),
            lexicon: game.lexicon,
            time_control: game.timeControl,
            game_url: `https://woogles.io/game/${game.gameId}`,
            status: 'active',
            last_seen_at: new Date().toISOString()
        }));

        // Calculate high_profile flag
        gameRecords.forEach(record => {
            const combinedRating = (record.player1_rating || 0) + (record.player2_rating || 0);
            record.is_high_profile = combinedRating > HIGH_PROFILE_THRESHOLD;
        });

        if (isDryRun) {
            console.log('DRY RUN MODE: Skipping Supabase ops.');
            console.log('Would have upserted:', gameRecords.length, 'games');
            console.log('Sample record:', gameRecords[0]);
        } else {
            console.log('Upserting games to Supabase...');

            // Upsert games (insert or update based on woogles_game_id)
            const { data, error } = await supabase
                .from('live_games')
                .upsert(gameRecords, {
                    onConflict: 'woogles_game_id',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('Supabase upsert error:', error);
            } else {
                console.log(`Successfully upserted ${gameRecords.length} games`);
            }

            // Mark games not seen in this scrape as inactive
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            const { error: updateError } = await supabase
                .from('live_games')
                .update({ status: 'inactive' })
                .eq('status', 'active')
                .lt('last_seen_at', fiveMinutesAgo);

            if (updateError) {
                console.error('Error marking old games inactive:', updateError);
            } else {
                console.log('Marked stale games as inactive');
            }
        }

        await browser.close();
        console.log(`[${new Date().toISOString()}] Scraper completed successfully!`);

    } catch (error) {
        console.error('Scraper error:', error);
        if (browser) await browser.close();
        process.exit(1);
    }
}

// Run the scraper
scrapeWooglesGames();
