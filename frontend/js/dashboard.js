const API_URL = "https://solumus-v.onrender.com";
// ==============================
// =========================================================
// SOLUMUS-V GEO-NEURAL FIELD MAP
// =========================================================

let solumusMap = null;
let sensorNodeMarker = null;
let sensorCoverageCircle = null;


// =========================================================
// SENSOR NODE CONFIGURATION
// =========================================================

const SENSOR_NODE = {
    id: "SN-001",
    name: "SOLUMUS-V Sensor Node 01",

    // Current testing coordinates
    // Replace these with the ACTUAL sensor deployment coordinates.
    latitude: 10.3157,
    longitude: 123.8854,

    // Visualization of the sensor monitoring area.
    // This is NOT yet a scientifically established sensor range.
    radius: 5
};


// =========================================================
// INITIALIZE MAP
// =========================================================

function initializeSolumusMap() {

    const mapContainer =
        document.getElementById("solumusMap");

    if (!mapContainer) {
        console.error(
            "SOLUMUS-V map container not found."
        );
        return;
    }

    solumusMap = L.map("solumusMap").setView(
        [
            SENSOR_NODE.latitude,
            SENSOR_NODE.longitude
        ],
        19
    );


    // OpenStreetMap
    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 22,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(solumusMap);


    createSensorNode();


    // Fix Leaflet rendering when map is inside
    // a dynamically sized layout.
    setTimeout(() => {

        if (solumusMap) {
            solumusMap.invalidateSize();
        }

    }, 300);
}


// =========================================================
// CREATE SENSOR NODE
// =========================================================

function createSensorNode() {

    if (!solumusMap) {
        return;
    }

    const position = [
        SENSOR_NODE.latitude,
        SENSOR_NODE.longitude
    ];


    // -----------------------------------------------------
    // SENSOR NODE MARKER
    // -----------------------------------------------------

    sensorNodeMarker =
        L.circleMarker(
            position,
            {
                radius: 8,
                weight: 3,
                color: "#ffffff",
                fillColor: "#38a169",
                fillOpacity: 1
            }
        ).addTo(solumusMap);


    sensorNodeMarker.bindTooltip(
        SENSOR_NODE.name,
        {
            direction: "top",
            offset: [0, -8]
        }
    );


    // -----------------------------------------------------
    // SENSOR MONITORING RANGE
    // -----------------------------------------------------

    sensorCoverageCircle =
        L.circle(
            position,
            {
                radius: SENSOR_NODE.radius,
                color: "#38a169",
                weight: 2,
                fillColor: "#38a169",
                fillOpacity: 0.18
            }
        ).addTo(solumusMap);


    // -----------------------------------------------------
    // NODE CLICK
    // -----------------------------------------------------

    sensorNodeMarker.on(
        "click",
        (event) => {

            openSensorNodeModal(
                SENSOR_NODE,
                event.latlng
            );

        }
    );


    // -----------------------------------------------------
    // MONITORING AREA CLICK
    // -----------------------------------------------------

    sensorCoverageCircle.on(
        "click",
        (event) => {

            openSensorNodeModal(
                SENSOR_NODE,
                event.latlng
            );

        }
    );
}


// =========================================================
// GET MAP HEALTH STATUS
// =========================================================

function getMapHealthStatus(level) {

    if (!level) {

        return {
            label: "No Sensor Data",
            color: "#718096"
        };

    }


    const normalized =
        String(level)
            .trim()
            .toLowerCase();


    if (
        normalized.includes("good") ||
        normalized.includes("healthy")
    ) {

        return {
            label: "Good",
            color: "#38a169"
        };

    }


    if (
        normalized.includes("attention") ||
        normalized.includes("need")
    ) {

        return {
            label: "Need Attention",
            color: "#d69e2e"
        };

    }


    if (
        normalized.includes("critical") ||
        normalized.includes("poor")
    ) {

        return {
            label: "Critical",
            color: "#e53e3e"
        };

    }


    return {
        label: "No Sensor Data",
        color: "#718096"
    };
}


// =========================================================
// UPDATE SENSOR NODE APPEARANCE
// =========================================================

function updateSensorNodeMap() {

    if (
        !solumusMap ||
        !sensorNodeMarker ||
        !sensorCoverageCircle
    ) {
        return;
    }


    const healthLevel =
        document
            .getElementById("soilHealthLevel")
            ?.textContent
            ?.trim()
        || "";


    const status =
        getMapHealthStatus(healthLevel);


    // Update sensor marker
    sensorNodeMarker.setStyle({

        color: "#ffffff",
        fillColor: status.color,
        fillOpacity: 1,
        weight: 3

    });


    // Update monitoring zone
    sensorCoverageCircle.setStyle({

        color: status.color,
        fillColor: status.color,
        fillOpacity: 0.18,
        weight: 2

    });
}


// =========================================================
// OPEN SENSOR NODE MODAL
// =========================================================

function openSensorNodeModal(
    node,
    latlng
) {

    const modal =
        document.getElementById(
            "soilNodeModal"
        );


    if (!modal) {
        return;
    }


    // -----------------------------------------------------
    // POSITION MODAL BESIDE SENSOR
    // -----------------------------------------------------

    if (
        latlng &&
        solumusMap
    ) {

        const point =
            solumusMap
                .latLngToContainerPoint(
                    latlng
                );


        const mapRect =
            solumusMap
                .getContainer()
                .getBoundingClientRect();


        const modalWidth = 390;
        const spacing = 16;


        let left =
            mapRect.left +
            point.x +
            spacing;


        let top =
            mapRect.top +
            point.y -
            120;


        // If there is not enough room
        // on the right, place it on the left.
        if (
            left + modalWidth >
            window.innerWidth - 15
        ) {

            left =
                mapRect.left +
                point.x -
                modalWidth -
                spacing;

        }


        // Prevent modal from going
        // above the viewport.
        if (top < 15) {
            top = 15;
        }


        // Prevent modal from going
        // below the viewport.
        const estimatedHeight = 500;

        if (
            top + estimatedHeight >
            window.innerHeight - 15
        ) {

            top =
                window.innerHeight -
                estimatedHeight -
                15;

        }


        modal.style.left =
            `${left}px`;

        modal.style.top =
            `${top}px`;
    }


    // -----------------------------------------------------
    // NODE NAME
    // -----------------------------------------------------

    const nodeName =
        document.getElementById(
            "modalNodeName"
        );

    if (nodeName) {

        nodeName.textContent =
            node.name;

    }


    // -----------------------------------------------------
    // HEALTH TIER
    // -----------------------------------------------------

    const healthLevel =
        document
            .getElementById(
                "soilHealthLevel"
            )
            ?.textContent
            ?.trim()
        || "No Sensor Data";


    const healthStatus =
        getMapHealthStatus(
            healthLevel
        );


    const modalHealth =
        document.getElementById(
            "modalHealthTier"
        );

    if (modalHealth) {

        modalHealth.textContent =
            healthStatus.label;

        modalHealth.style.color =
            healthStatus.color;

    }


    // -----------------------------------------------------
    // SOIL PARAMETERS
    // -----------------------------------------------------

    const parameterMap = {

        modalMoisture:
            "moisture",

        modalPh:
            "ph",

        modalTemperature:
            "soilTemperature",

        modalEc:
            "ec",

        modalNitrogen:
            "nitrogen",

        modalPhosphorus:
            "phosphorus",

        modalPotassium:
            "potassium"

    };


    Object.entries(
        parameterMap
    ).forEach(
        (
            [
                modalId,
                sourceId
            ]
        ) => {

            const modalElement =
                document.getElementById(
                    modalId
                );

            const sourceElement =
                document.getElementById(
                    sourceId
                );


            if (
                modalElement &&
                sourceElement
            ) {

                modalElement.textContent =
                    sourceElement.textContent
                    || "--";

            }

        }
    );


    // -----------------------------------------------------
    // RECOMMENDATION
    // -----------------------------------------------------

    const recommendationList =
        document.getElementById(
            "recommendationList"
        );


    const modalRecommendation =
        document.getElementById(
            "modalRecommendation"
        );


    if (
        recommendationList &&
        modalRecommendation
    ) {

        const recommendations =
            Array.from(
                recommendationList
                    .querySelectorAll("li")
            )
            .map(
                item =>
                    item.textContent.trim()
            )
            .filter(
                text =>
                    text.length > 0
            );


        modalRecommendation.textContent =
            recommendations.length > 0
                ? recommendations.join(" ")
                : "No recommendation available.";
    }


    // -----------------------------------------------------
    // SHOW MODAL
    // -----------------------------------------------------

    modal.classList.add(
        "active"
    );
}


// =========================================================
// CLOSE SENSOR NODE MODAL
// =========================================================

function closeSensorNodeModal() {

    const modal =
        document.getElementById(
            "soilNodeModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );
}


// =========================================================
// INITIALIZE GEO-NEURAL MAP
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeSolumusMap();


        // Close button
        const closeButton =
            document.getElementById(
                "closeSoilModal"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeSensorNodeModal
            );

        }


        // Close when clicking outside
        const modal =
            document.getElementById(
                "soilNodeModal"
            );


        if (modal) {

            modal.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target === modal
                    ) {

                        closeSensorNodeModal();

                    }

                }
            );

        }

    }
);
// ==============================
// MODAL EVENTS
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    initializeSolumusMap();

    const closeButton =
        document.getElementById("closeSoilModal");

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeSensorNodeModal
        );
    }

    const modal =
        document.getElementById("soilNodeModal");

    if (modal) {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                closeSensorNodeModal();
            }

        });
    }

});


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
        updateSensorNodeMap();

    } catch (error) {
        console.error("Soil data error:", error);
    }
}
// ==============================
// SOIL HISTORY
// ==============================

async function loadSoilHistoryByDate()  {
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
    .addEventListener("click", loadSoilHistoryByDate);

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

async function loadRecentSoilHistory() {
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

loadRecentSoilHistory();


// Refresh graph every 10 seconds
setInterval(loadRecentSoilHistory, 10000);