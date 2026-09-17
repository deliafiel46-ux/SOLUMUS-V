const express = require("express");
const cors = require("cors");
const axios = require("axios");

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase service account
const fs = require("fs");
const path = require("path");

const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(
        __dirname,
        "solumus-v-7ea04-firebase-adminsdk-fbsvc-23816a022d.json"
    );

const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
);

// Initialize Firebase
initializeApp({
    credential: cert(serviceAccount),
    databaseURL:
        "https://solumus-v-7ea04-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = getDatabase();

app.use(cors());
app.use(express.json());


// ==============================
// TEST ENDPOINT
// ==============================

app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        system: "SOLUMUS-V",
        message: "Backend is running."
    });
});


// ==============================
// FIREBASE TEST ENDPOINT
// ==============================

app.get("/api/firebase-test", async (req, res) => {
    try {
        await db.ref("system/test").set({
            message: "Firebase connection successful",
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: "Data successfully written to Firebase."
        });

    } catch (error) {
        console.error("Firebase error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to connect to Firebase.",
            error: error.message
        });
    }
});


// ==============================
// POST SOIL DATA
// ==============================

app.post("/api/soil-data", async (req, res) => {
    try {
        const {
            moisture,
            temperature,
            ph,
            ec,
            nitrogen,
            phosphorus,
            potassium
        } = req.body;

        const values = {
            moisture,
            temperature,
            ph,
            ec,
            nitrogen,
            phosphorus,
            potassium
        };

        // Validate that all values are numbers
        for (const [key, value] of Object.entries(values)) {
            if (
                typeof value !== "number" ||
                !Number.isFinite(value)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a valid number.`
                });
            }
        }

        // Create soil reading
        const reading = {
            moisture,
            temperature,
            ph,
            ec,
            nitrogen,
            phosphorus,
            potassium,
            timestamp: new Date().toISOString()
        };

        // Save latest reading
        await db.ref("soilData/current").set(reading);

        // Save reading to history
        const historyRef = db.ref("soilData/history").push();

        await historyRef.set(reading);

        res.json({
            success: true,
            message: "Soil reading saved successfully.",
            historyId: historyRef.key,
            data: reading
        });

    } catch (error) {
        console.error("Soil data error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save soil reading.",
            error: error.message
        });
    }
});


// ==============================
// GET CURRENT SOIL DATA
// ==============================

app.get("/api/soil-data", async (req, res) => {
    try {
        const snapshot = await db
            .ref("soilData/current")
            .once("value");

        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "No soil data available."
            });
        }

        const soilHealth = calculateSoilHealth(data);
        const recommendations =
            generateSoilRecommendations(data);

        const irrigationRisk =
            calculateIrrigationRisk(data);

        res.json({
            success: true,
            data: data,
            soilHealth: soilHealth,
            irrigationRisk: irrigationRisk,
            recommendations: recommendations
        });

    } catch (error) {
        console.error("Get soil data error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve soil data.",
            error: error.message
        });
    }
});


// ==============================
// SOIL THRESHOLDS
// ==============================

const SOIL_THRESHOLDS = {

    ph: {
        low: 5.5,
        high: 7.0
    },

    ec: {
        low: 0.2,
        high: 0.8
    },

    moisture: {
        low: 30,
        high: 70
    },

    nitrogen: {
        low: 20,
        high: 50
    },

    phosphorus: {
        low: 10,
        high: 30
    },

    potassium: {
        low: 20,
        high: 50
    }
};


// ==============================
// CLASSIFY SOIL VALUE
// ==============================

function classifyValue(value, threshold) {

    if (value < threshold.low) {
        return "LOW";
    }

    if (value > threshold.high) {
        return "HIGH";
    }

    return "NORMAL";
}


// ==============================
// OVERALL SOIL HEALTH
// ==============================

function calculateSoilHealth(reading) {

    const statuses = {

        moisture: classifyValue(
            reading.moisture,
            SOIL_THRESHOLDS.moisture
        ),

        ph: classifyValue(
            reading.ph,
            SOIL_THRESHOLDS.ph
        ),

        ec: classifyValue(
            reading.ec,
            SOIL_THRESHOLDS.ec
        ),

        nitrogen: classifyValue(
            reading.nitrogen,
            SOIL_THRESHOLDS.nitrogen
        ),

        phosphorus: classifyValue(
            reading.phosphorus,
            SOIL_THRESHOLDS.phosphorus
        ),

        potassium: classifyValue(
            reading.potassium,
            SOIL_THRESHOLDS.potassium
        )
    };

    let score = 100;

    for (const status of Object.values(statuses)) {

        if (
            status === "LOW" ||
            status === "HIGH"
        ) {
            score -= 10;
        }
    }

    let level;
    let color;
    let message;

    if (score >= 80) {

        level = "GOOD";
        color = "GREEN";
        message =
            "Soil conditions are generally favorable.";

    } else if (score >= 60) {

        level = "MODERATE";
        color = "YELLOW";
        message =
            "Some soil conditions require monitoring.";

    } else if (score >= 40) {

        level = "POOR";
        color = "ORANGE";
        message =
            "Several soil conditions require attention.";

    } else {

        level = "CRITICAL";
        color = "RED";
        message =
            "Multiple soil conditions require immediate attention.";
    }

    return {
        score,
        level,
        color,
        message,
        parameters: statuses
    };
}


// ==============================
// IRRIGATION RISK
// ==============================

function calculateIrrigationRisk(reading) {

    const moisture = Number(reading.moisture);

    if (!Number.isFinite(moisture)) {

        return {
            level: "UNAVAILABLE",
            message:
                "Irrigation risk cannot be assessed without a valid soil-moisture reading."
        };
    }

    if (
        moisture <
        SOIL_THRESHOLDS.moisture.low
    ) {

        return {
            level: "HIGH",
            message:
                "Soil moisture is below the configured range. Irrigation may be needed, subject to crop stage and field conditions."
        };
    }

    if (
        moisture >
        SOIL_THRESHOLDS.moisture.high
    ) {

        return {
            level: "HIGH",
            message:
                "Soil moisture is above the configured range. Avoid unnecessary irrigation and check field drainage."
        };
    }

    return {
        level: "LOW",
        message:
            "Soil moisture is within the configured range. No immediate irrigation need is indicated by moisture alone."
    };
}


// ==============================
// SOIL RECOMMENDATIONS
// ==============================

function generateSoilRecommendations(reading) {

    const recommendations = [];

    const moistureStatus =
        classifyValue(
            reading.moisture,
            SOIL_THRESHOLDS.moisture
        );

    const phStatus =
        classifyValue(
            reading.ph,
            SOIL_THRESHOLDS.ph
        );

    const ecStatus =
        classifyValue(
            reading.ec,
            SOIL_THRESHOLDS.ec
        );

    const nitrogenStatus =
        classifyValue(
            reading.nitrogen,
            SOIL_THRESHOLDS.nitrogen
        );

    const phosphorusStatus =
        classifyValue(
            reading.phosphorus,
            SOIL_THRESHOLDS.phosphorus
        );

    const potassiumStatus =
        classifyValue(
            reading.potassium,
            SOIL_THRESHOLDS.potassium
        );


    // ==========================
    // MOISTURE
    // ==========================

    if (moistureStatus === "LOW") {

        recommendations.push(
            "Soil moisture is low. Check the irrigation system and provide appropriate irrigation based on crop stage and field conditions."
        );
    }

    if (moistureStatus === "HIGH") {

        recommendations.push(
            "Soil moisture is high. Avoid unnecessary irrigation and check field drainage to prevent prolonged waterlogging."
        );
    }


    // ==========================
    // pH
    // ==========================

    if (phStatus === "LOW") {

        recommendations.push(
            "Soil pH is low, indicating acidic soil conditions. Consider an appropriate liming or soil amendment program based on soil-test results and soil type."
        );
    }

    if (phStatus === "HIGH") {

        recommendations.push(
            "Soil pH is high, indicating alkaline soil conditions. Consider appropriate soil amendments based on soil-test results and crop requirements."
        );
    }


    // ==========================
    // EC
    // ==========================

    if (ecStatus === "LOW") {

        recommendations.push(
            "Electrical conductivity is low. Nutrient availability may be limited; consider evaluating soil fertility before applying fertilizer."
        );
    }

    if (ecStatus === "HIGH") {

        recommendations.push(
            "Electrical conductivity is high. Check for possible salt accumulation and avoid unnecessary fertilizer application."
        );
    }


    // ==========================
    // NITROGEN
    // ==========================

    if (nitrogenStatus === "LOW") {

        recommendations.push(
            "Nitrogen level is low. Consider appropriate nitrogen management based on crop requirements and soil-test results."
        );
    }

    if (nitrogenStatus === "HIGH") {

        recommendations.push(
            "Nitrogen level is high. Avoid unnecessary additional nitrogen application."
        );
    }


    // ==========================
    // PHOSPHORUS
    // ==========================

    if (phosphorusStatus === "LOW") {

        recommendations.push(
            "Phosphorus level is low. Consider appropriate phosphorus management based on soil-test results and crop requirements."
        );
    }

    if (phosphorusStatus === "HIGH") {

        recommendations.push(
            "Phosphorus level is high. Avoid unnecessary phosphorus application."
        );
    }


    // ==========================
    // POTASSIUM
    // ==========================

    if (potassiumStatus === "LOW") {

        recommendations.push(
            "Potassium level is low. Consider appropriate potassium management based on soil-test results and crop requirements."
        );
    }

    if (potassiumStatus === "HIGH") {

        recommendations.push(
            "Potassium level is high. Avoid unnecessary additional potassium application."
        );
    }


    // ==========================
    // DEFAULT
    // ==========================

    if (recommendations.length === 0) {

        recommendations.push(
            "The monitored soil parameters are within the configured ranges. Continue regular monitoring and maintain appropriate field management practices."
        );
    }

    return recommendations;
}


// ==============================
// SOIL HISTORY
// ==============================

app.get("/api/soil-history", async (req, res) => {

    try {

        const snapshot = await db
            .ref("soilData/history")
            .orderByChild("timestamp")
            .once("value");

        const data = snapshot.val();

        if (!data) {

            return res.json({
                success: true,
                readings: []
            });
        }

        const readings =
            Object.entries(data)
                .map(([id, reading]) => ({
                    id,
                    ...reading
                }))
                .sort(
                    (a, b) =>
                        new Date(a.timestamp) -
                        new Date(b.timestamp)
                );

        res.json({
            success: true,
            readings
        });

    } catch (error) {

        console.error(
            "Soil history error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to retrieve soil history.",
            error: error.message
        });
    }
});


// ==============================
// RECENT SOIL READINGS
// ==============================

app.get(
    "/api/soil-history/recent",
    async (req, res) => {

        try {

            const snapshot = await db
                .ref("soilData/history")
                .orderByChild("timestamp")
                .limitToLast(50)
                .once("value");

            const data = snapshot.val();

            if (!data) {

                return res.json({
                    success: true,
                    readings: []
                });
            }

            const readings =
                Object.entries(data)
                    .map(([id, reading]) => ({
                        id,
                        ...reading
                    }))
                    .sort(
                        (a, b) =>
                            new Date(a.timestamp) -
                            new Date(b.timestamp)
                    );

            res.json({
                success: true,
                readings
            });

        } catch (error) {

            console.error(
                "Recent soil history error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to retrieve recent soil readings.",
                error: error.message
            });
        }
    }
);


// ==============================
// WEATHER CODE CONVERSION
// ==============================

function getWeatherCondition(code) {

    const conditions = {

        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",

        45: "Fog",
        48: "Depositing rime fog",

        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",

        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",

        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",

        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",

        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };

    return conditions[code] || "Unknown";
}


// ==============================
// WEATHER RISK ANALYSIS
// ==============================

function getWeatherRisk(current, daily) {

    const risks = [];

    const temperature =
        current.temperature_2m;

    const precipitation =
        current.precipitation;

    const weatherCode =
        current.weather_code;

    const maxRainProbability =
        Math.max(
            ...(daily.precipitation_probability_max || [0])
        );


    // Rain-related risk

    if (
        maxRainProbability >= 70 ||
        precipitation >= 10
    ) {

        risks.push({
            type: "rain",
            level: "HIGH",
            message:
                "High chance of rainfall. Consider delaying field activities."
        });

    } else if (
        maxRainProbability >= 40 ||
        precipitation > 0
    ) {

        risks.push({
            type: "rain",
            level: "MODERATE",
            message:
                "Rainfall is possible. Monitor the forecast before field activities."
        });
    }


    // Heat-related risk

    if (temperature >= 35) {

        risks.push({
            type: "heat",
            level: "HIGH",
            message:
                "High temperature may increase crop water demand."
        });

    } else if (temperature >= 32) {

        risks.push({
            type: "heat",
            level: "MODERATE",
            message:
                "Warm conditions may increase crop water demand."
        });
    }


    // Thunderstorm risk

    if (
        [95, 96, 99].includes(weatherCode)
    ) {

        risks.push({
            type: "storm",
            level: "HIGH",
            message:
                "Thunderstorm conditions detected. Avoid exposed field activities."
        });
    }


    // Overall risk

    let overall = "LOW";

    if (
        risks.some(
            risk => risk.level === "HIGH"
        )
    ) {

        overall = "HIGH";

    } else if (
        risks.some(
            risk => risk.level === "MODERATE"
        )
    ) {

        overall = "MODERATE";
    }


    return {
        overall,
        risks,
        condition:
            getWeatherCondition(weatherCode),
        rainProbability:
            maxRainProbability
    };
}


// ==============================
// WEATHER DATA ENDPOINT
// ==============================

app.get("/api/weather", async (req, res) => {

    try {

        const {
            lat,
            lon
        } = req.query;


        // Validate coordinates

        if (!lat || !lon) {

            return res.status(400).json({
                success: false,
                message:
                    "Latitude and longitude are required."
            });
        }


        const latitude = Number(lat);
        const longitude = Number(lon);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid latitude or longitude."
            });
        }


        // Open-Meteo weather request

        const weatherUrl = new URL(
            "https://api.open-meteo.com/v1/forecast"
        );

        weatherUrl.searchParams.set(
            "latitude",
            String(latitude)
        );

        weatherUrl.searchParams.set(
            "longitude",
            String(longitude)
        );

        weatherUrl.searchParams.set(
            "current",
            "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
        );

        weatherUrl.searchParams.set(
            "daily",
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"
        );

        weatherUrl.searchParams.set(
            "forecast_days",
            "3"
        );

        weatherUrl.searchParams.set(
            "timezone",
            "auto"
        );


        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                15000
            );

        let response;

        try {

            response = await fetch(
                weatherUrl,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    },
                    signal:
                        controller.signal
                }
            );

        } finally {

            clearTimeout(timeout);
        }


        if (!response.ok) {

            const providerMessage =
                await response.text();

            throw new Error(
                `Open-Meteo HTTP ${response.status}: ${providerMessage}`
            );
        }


        const weather =
            await response.json();


        if (
            !weather.current ||
            !weather.daily ||
            !Array.isArray(
                weather.daily.time
            )
        ) {

            throw new Error(
                "Open-Meteo returned an incomplete weather response."
            );
        }


        const weatherRisk =
            getWeatherRisk(
                weather.current,
                weather.daily
            );


        res.json({

            success: true,

            location: {
                latitude,
                longitude
            },

            current: {
                ...weather.current,

                condition:
                    getWeatherCondition(
                        weather.current
                            .weather_code
                    )
            },

            daily:
                weather.daily,

            weatherRisk:
                weatherRisk
        });


    } catch (error) {

        console.error(
            "Weather API error:",
            error
        );

        const message =
            error &&
            error.name === "AbortError"

                ? "Weather provider request timed out."

                : error.message;


        res.status(502).json({

            success: false,

            message:
                "Failed to retrieve weather data.",

            error:
                message
        });
    }
});


// ==============================
// SENSOR LOCATION
// ==============================

app.get(
    "/api/sensor-location",
    async (req, res) => {

        try {

            const nodeId =
                req.query.nodeId ||
                "SOLUMUS-V-01";


            const snapshot =
                await db
                    .ref(
                        `devices/${nodeId}/location`
                    )
                    .once("value");


            const location =
                snapshot.val();


            if (!location) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No registered sensor location found."
                });
            }


            res.json({

                success: true,

                data:
                    location
            });


        } catch (error) {

            console.error(
                "Sensor location GET error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve sensor location.",

                error:
                    error.message
            });
        }
    }
);


app.post(
    "/api/sensor-location",
    async (req, res) => {

        try {

            const {

                nodeId =
                    "SOLUMUS-V-01",

                latitude,

                longitude

            } = req.body;


            const lat =
                Number(latitude);

            const lon =
                Number(longitude);


            if (

                !Number.isFinite(lat) ||

                !Number.isFinite(lon) ||

                lat < -90 ||

                lat > 90 ||

                lon < -180 ||

                lon > 180

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid latitude or longitude."
                });
            }


            const location = {

                nodeId,

                latitude: lat,

                longitude: lon,

                updatedAt:
                    Date.now()
            };


            await db
                .ref(
                    `devices/${nodeId}/location`
                )
                .set(location);


            console.log(

                `Sensor location updated: ${nodeId} → ${lat}, ${lon}`

            );


            res.json({

                success: true,

                message:
                    "Sensor location saved successfully.",

                data:
                    location
            });


        } catch (error) {

            console.error(
                "Sensor location POST error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to save sensor location.",

                error:
                    error.message
            });
        }
    }
);


// ==============================
// START SERVER
// ==============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `SOLUMUS-V backend running on port ${PORT}`
        );
    }
);