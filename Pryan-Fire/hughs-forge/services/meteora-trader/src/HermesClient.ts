import axios from 'axios';

/**
 * HermesClient: Inscribed by Haplo (ola-claw-dev) for real-time Pyth price runes.
 */
export class HermesClient {
    private hermesUrl: string;

    constructor(hermesUrl: string = "https://hermes.pyth.network") {
        this.hermesUrl = hermesUrl;
    }

    async getPrice(priceId: string) {
        console.log(`[Hermes] Fetching price for ${priceId}...`);
        const response = await axios.get(`${this.hermesUrl}/v2/latest_price_feeds?ids[]=${priceId}`);
        return response.data;
    }
}
