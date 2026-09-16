const API_URL = "http://localhost:3000";


// ==============================
// SOIL DATA
// ==============================

async function loadSoilData() {
    try {
        const response = await fetch(`${API_URL}/api/soil-data`);

        if (!response.ok) {
            throw new Error(`Soil API returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        const soil = result.data;
        const soilHealth = result.soilHealth;
        const recommendations = result.recommendations; 

        document.getElementById("moisture").textContent =
            `${soil.moisture} %`;

        document.getElementById("soilTemperature").textContent =
            `${soil.temperature} °C`;

        document.getElementById("ph").textContent =
            soil.ph;

        document.getElementById("ec").textContent =
            `${soil.ec} mS/cm`;

        document.getElementById("nitrogen").textContent =
            `${soil.nitrogen} mg/kg`;

        document.getElementById("phosphorus").textContent =
            `${soil.phosphorus} mg/kg`;

        document.getElementById("potassium").textContent =
            `${soil.potassium} mg/kg`;
            // Overall Soil Health
document.getElementById("soilHealthScore").textContent =
    `${soilHealth.score}/100`;

document.getElementById("soilHealthLevel").textContent =
    soilHealth.level;

document.getElementById("soilHealthMessage").textContent =
    soilHealth.message;


// Soil Recommendations
const recommendationList =
    document.getElementById("recommendationList");

recommendationList.innerHTML = "";

recommendations.forEach(recommendation => {

    const item = document.createElement("li");

    item.textContent = recommendation;

    recommendationList.appendChild(item);
});

        console.log("Soil data loaded:", soil);

    } catch (error) {
        console.error("Soil data error:", error);
    }
}
// ==============================
// SOIL HISTORY
// ==============================

async function loadSoilHistory() {
    const date = document.getElementById("historyDate").value;

    if (!date) {
        document.getElementById("historyStatus").textContent =
            "Please select a date.";

        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/soil-history?date=${date}`
        );

        if (!response.ok) {
            throw new Error(
                `History API returned ${response.status}`
            );
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        // ==============================
        // STATUS
        // ==============================

        document.getElementById("historyStatus").textContent =
            `${result.count} reading(s) recorded on ${result.date}.`;


        // ==============================
        // DAILY SUMMARY
        // ==============================

        document.getElementById("dailySummaryText").textContent =
            result.summary;


        // ==============================
        // PARAMETER SUMMARY
        // ==============================

        const summaryBody =
            document.getElementById("parameterSummaryBody");

        summaryBody.innerHTML = "";

        const parameters = [
            ["Moisture", result.parameterSummary.moisture, "%"],
            ["Temperature", result.parameterSummary.temperature, "°C"],
            ["pH", result.parameterSummary.ph, ""],
            ["EC", result.parameterSummary.ec, "mS/cm"],
            ["Nitrogen", result.parameterSummary.nitrogen, "mg/kg"],
            ["Phosphorus", result.parameterSummary.phosphorus, "mg/kg"],
            ["Potassium", result.parameterSummary.potassium, "mg/kg"]
        ];

        parameters.forEach(([name, values, unit]) => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${name}</td>
                <td>${values.min} ${unit}</td>
                <td>${values.max} ${unit}</td>
                <td>${values.average} ${unit}</td>
            `;

            summaryBody.appendChild(row);
        });


        // ==============================
        // READING HISTORY TABLE
        // ==============================

        const historyBody =
            document.getElementById("historyTableBody");

        historyBody.innerHTML = "";

        result.readings.forEach(reading => {

            const row = document.createElement("tr");

            const time =
                new Date(reading.timestamp)
                    .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    });

            row.innerHTML = `
                <td>${time}</td>
                <td>${reading.moisture} %</td>
                <td>${reading.temperature} °C</td>
                <td>${reading.ph}</td>
                <td>${reading.ec} mS/cm</td>
                <td>${reading.nitrogen} mg/kg</td>
                <td>${reading.phosphorus} mg/kg</td>
                <td>${reading.potassium} mg/kg</td>
            `;

            historyBody.appendChild(row);
        });


        console.log("Soil history loaded:", result);

    } catch (error) {

        console.error("Soil history error:", error);

        document.getElementById("historyStatus").textContent =
            "Unable to retrieve soil history.";

    }
}


// Search button
document
    .getElementById("searchHistoryButton")
    .addEventListener("click", loadSoilHistory);

// ==============================
// WEATHER DATA
// ==============================

async function loadWeather() {
    try {
        // Testing-site coordinates
        const latitude = 10.3157;
        const longitude = 123.8854;

        const response = await fetch(
            `${API_URL}/api/weather?lat=${latitude}&lon=${longitude}`
        );

        if (!response.ok) {
            throw new Error(`Weather API returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        const weather = result.current;
        const risk = result.weatherRisk;

        // Current weather
        document.getElementById("weatherCondition").textContent =
            weather.condition;

        document.getElementById("weatherTemperature").textContent =
            `${weather.temperature_2m} °C`;

        document.getElementById("humidity").textContent =
            `${weather.relative_humidity_2m} %`;

        document.getElementById("rainfall").textContent =
            `${weather.precipitation} mm`;

        document.getElementById("windSpeed").textContent =
            `${weather.wind_speed_10m} km/h`;

        // Weather risk
        document.getElementById("weatherRisk").textContent =
            risk.overall;

        if (risk.risks.length > 0) {
            document.getElementById("weatherRiskMessage").textContent =
                risk.risks
                    .map(item => item.message)
                    .join(" ");
        } else {
            document.getElementById("weatherRiskMessage").textContent =
                "No significant weather risks detected.";
        }

        // Forecast
        loadForecast(result.daily);

        console.log("Weather data loaded:", result);

    } catch (error) {
        console.error("Weather error:", error);

        document.getElementById("weatherRiskMessage").textContent =
            "Unable to retrieve weather data.";
    }
}


// ==============================
// 3-DAY FORECAST
// ==============================

function loadForecast(daily) {
    const forecastContainer =
        document.getElementById("forecast");

    forecastContainer.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {

        const date = daily.time[i];

        const condition =
            getWeatherCondition(daily.weather_code[i]);

        const forecastCard =
            document.createElement("div");

        forecastCard.innerHTML = `
            <h3>${date}</h3>

            <p>
                Condition:
                ${condition}
            </p>

            <p>
                Temperature:
                ${daily.temperature_2m_min[i]} °C -
                ${daily.temperature_2m_max[i]} °C
            </p>

            <p>
                Rainfall:
                ${daily.precipitation_sum[i]} mm
            </p>

            <p>
                Rain Probability:
                ${daily.precipitation_probability_max[i]} %
            </p>
        `;

        forecastContainer.appendChild(forecastCard);
    }
}


// ==============================
// WEATHER CODE
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
// INITIAL LOAD
// ==============================

loadSoilData();
loadWeather();


// Refresh soil data every 10 seconds
setInterval(loadSoilData, 10000);
// ==============================
// LIVE SOIL MONITORING GRAPH
// ==============================

let soilChart = null;
let recentSoilData = [];
let selectedParameter = "moisture";

async function loadSoilHistory() {
    try {
        const response = await fetch(
            `${API_URL}/api/soil-history/recent`
        );

        if (!response.ok) {
            throw new Error(
                `Soil history API returned ${response.status}`
            );
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

recentSoilData = result.readings || [];

        updateSoilChart();

        console.log(
            "Recent soil history loaded:",
            recentSoilData
        );

    } catch (error) {
        console.error(
            "Soil history error:",
            error
        );
    }
}


// ==============================
// UPDATE GRAPH
// ==============================

function updateSoilChart() {

    const canvas =
        document.getElementById("soilChart");

    if (!canvas || recentSoilData.length === 0) {
        return;
    }

    const labels = recentSoilData.map(reading => {

        const date =
            new Date(reading.timestamp);

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    });

    const values = recentSoilData.map(
        reading => reading[selectedParameter]
    );


    if (soilChart) {
        soilChart.destroy();
    }


    soilChart = new Chart(canvas, {

        type: "line",

        data: {

            labels: labels,

            datasets: [
                {
                    label: getParameterLabel(
                        selectedParameter
                    ),

                    data: values,

                    tension: 0.3,

                    fill: false,

                    pointRadius: 3
                }
            ]
        },


        options: {

            responsive: true,

            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            scales: {

                x: {
                    title: {
                        display: true,
                        text: "Time"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: getParameterUnit(
                            selectedParameter
                        )
                    }
                }
            }
        }

    });
}


// ==============================
// PARAMETER LABEL
// ==============================

function getParameterLabel(parameter) {

    const labels = {

        moisture: "Moisture",

        temperature: "Temperature",

        ph: "pH",

        ec: "Electrical Conductivity",

        nitrogen: "Nitrogen",

        phosphorus: "Phosphorus",

        potassium: "Potassium"

    };

    return labels[parameter] || parameter;
}


// ==============================
// PARAMETER UNIT
// ==============================

function getParameterUnit(parameter) {

    const units = {

        moisture: "%",

        temperature: "°C",

        ph: "pH",

        ec: "mS/cm",

        nitrogen: "mg/kg",

        phosphorus: "mg/kg",

        potassium: "mg/kg"

    };

    return units[parameter] || "";
}


// ==============================
// GRAPH BUTTONS
// ==============================

document
    .querySelectorAll(".chart-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll(".chart-button")
                .forEach(btn =>
                    btn.classList.remove("active")
                );

            button.classList.add("active");

            selectedParameter =
                button.dataset.parameter;

            updateSoilChart();

        });

    });


// ==============================
// INITIAL GRAPH LOAD
// ==============================

loadSoilHistory();


// Refresh graph every 10 seconds
setInterval(loadSoilHistory, 10000);