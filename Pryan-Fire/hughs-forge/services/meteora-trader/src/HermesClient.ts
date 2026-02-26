import axios from 'axios';

/**
 * HermesClient: Real-time Pyth price veil piercing.
 */
export class HermesClient {
    private hermesUrl: string;

    constructor(hermesUrl: string = "https://hermes.pyth.network") {
        this.hermesUrl = hermesUrl;
    }

    /**
     * Fetches current price grain for P&L tracking (fees earned minus IL/gas).
     */
    async getLatestPrice(priceId: string) {
        try {
            console.log(`[Hermes] Piercing the veil for ID: ${priceId}...`);
            const response = await axios.get(`${this.hermesUrl}/v2/latest_price_feeds?ids[]=${priceId}`);
            const priceData = response.data[0].price;
            
            // Formula: price * 10^expo
            const actualPrice = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
            return actualPrice;
        } catch (error) {
            console.error(`[Hermes] Could not perceive price: ${error}`);
            return null;
        }
    }
}
