const fs = require("fs");

const token = process.env.MAPBOX_PUBLIC_TOKEN;

if (!token) {
    throw new Error("MAPBOX_PUBLIC_TOKEN is missing.");
}

const config = `window.SOLUMUS_V_CONFIG = ${JSON.stringify({
    MAPBOX_TOKEN: token
})};`;

fs.writeFileSync("config.js", config);

console.log("SOLUMUS-V: Mapbox config generated successfully.");