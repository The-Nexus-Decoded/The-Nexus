import axios from 'axios';

/**
 * HermesClient: Real-time Pyth price runes for P&L tracking.
 */
export class HermesClient {
    private hermesUrl: string;

    constructor(hermesUrl: string = "https://hermes.pyth.network") {
        this.hermesUrl = hermesUrl;
    }

    /**
     * Fetches current price grain for real-time P&L minus gas logic.
     */
    async getLatestPrice(priceId: string) {
        try {
            const response = await axios.get(`${this.hermesUrl}/v2/latest_price_feeds?ids[]=${priceId}`);
            const priceData = response.data[0].price;
            // P&L Pulse: (Price * Expo)
            return parseFloat(priceData.price) * Math.pow(10, priceData.expo);
        } catch (error) {
            console.error(`[Hermes] Error piercing the price veil: ${error}`);
            return null;
        }
    }
}
