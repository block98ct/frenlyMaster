import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
export async function getLocation(lat, lng) {
    // let { lat, lng, apiKey } = req.params; // Assuming lat, lng, and apiKey are provided in the request params
    // lat = 22.6987;
    // lng = 75.8817;
    const apiKey = process.env.GOOGLE_API_KEY;
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
            latlng: `${lat},${lng}`,
            key: apiKey,
        },
    });
    const addressComponents = response.data.results[0].address_components;
    let city, country;

    for (const component of addressComponents) {
        if (component.types.includes('locality')) {
            city = component.long_name;
        } else if (component.types.includes('country')) {
            country = component.long_name;
        }
    }
    console.log("City:", city);
    console.log("Country:", country);

    return { city, country };
}


