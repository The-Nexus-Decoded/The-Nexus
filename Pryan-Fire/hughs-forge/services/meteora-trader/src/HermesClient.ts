import axios from 'axios';

/**
 * HermesClient: Pyth Network real-time price veil piercing.
 * Required for P&L tracking (Fees - IL - Gas).
 */
export class HermesClient {
    private hermesUrl: string;

    constructor(hermesUrl: string = "https://hermes.pyth.network") {
        this.hermesUrl = hermesUrl;
    }

    /**
     * Pierces the veil to get actual price grain.
     * Formula: price * 10^expo
     */
    async getPrice(priceId: string): Promise<number | null> {
        try {
            console.log(`[Hermes] Requesting price for ${priceId}...`);
            const response = await axios.get(`${this.hermesUrl}/v2/latest_price_feeds?ids[]=${priceId}`);
            const feed = response.data[0];
            if (!feed) return null;
            
            const price = parseFloat(feed.price.price);
            const expo = feed.price.expo;
            return price * Math.pow(10, expo);
        } catch (error) {
            console.error(`[Hermes] Failed to perceive price: ${error}`);
            return null;
        }
    }
}
