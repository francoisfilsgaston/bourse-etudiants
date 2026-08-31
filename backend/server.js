const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const phoneLengths = {
    CD: [9, 9], FR: [9, 9], CG: [9, 9], CM: [9, 9], CI: [10, 10],
    SN: [9, 9], BJ: [10, 10], BF: [8, 8], ML: [8, 8], NE: [8, 8],
    TD: [8, 8], GA: [8, 9], GN: [9, 9], RW: [9, 9], BI: [8, 8],
    UG: [9, 9], KE: [9, 9], TZ: [9, 9], ZA: [9, 9], NG: [10, 10],
    GH: [9, 9], GB: [10, 10], DE: [10, 11], BE: [9, 9], CH: [9, 9],
    ES: [9, 9], IT: [9, 10], PT: [9, 9], MA: [9, 9], DZ: [9, 9],
    TN: [8, 8], EG: [10, 10], US: [10, 10], CA: [10, 10], IN: [10, 10],
    CN: [11, 11], JP: [10, 10], AU: [9, 9], BR: [10, 11]
};


// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// ROUTE TEST
// =====================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Serveur Bourse Étudiant opérationnel"
    });

});


const countriesApi = "https://countriesnow.space/api/v0.1/countries";
const universitiesApi = "https://api.openalex.org/institutions?filter=country_code:";

function normalizeCountryName(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

async function getCountryCodeByName(countryName) {
    const target = normalizeCountryName(countryName);

    if (!target) {
        return null;
    }

    const response = await fetch(countriesApi);
    if (!response.ok) {
        throw new Error(`CountriesNow HTTP ${response.status}`);
    }

    const payload = await response.json();
    const countries = Array.isArray(payload?.data) ? payload.data : [];

    const found = countries.find(country => {
        if (!country || !country.country) {
            return false;
        }

        const candidate = normalizeCountryName(country.country);
        return candidate === target ||
            candidate.includes(target) ||
            target.includes(candidate) ||
            (country.iso2 && country.iso2.toLowerCase() === target);
    });

    return found ? (found.iso2 || null) : null;
}

// =====================================================
// API PAYS
// =====================================================

app.get("/api/pays", async (req, res) => {
    try {
        console.log("🌍 Récupération des pays...");

        console.log("🔗 URL pays :", countriesApi);

        const response = await fetch(countriesApi);
        console.log("📡 HTTP CountriesNow :", response.status);

        if (!response.ok) {
            throw new Error(`CountriesNow HTTP ${response.status}`);
        }

        const payload = await response.json();
        const countries = Array.isArray(payload?.data) ? payload.data : [];

        let phoneCodes = {};

        try {
            const phoneResponse = await fetch("https://country.io/phone.json");
            if (phoneResponse.ok) {
                phoneCodes = await phoneResponse.json();
            }
        } catch (phoneError) {
            console.warn("Indicatifs téléphoniques indisponibles :", phoneError.message);
        }

        if (!Array.isArray(countries)) {
            throw new Error("La source des pays n'a pas retourné un tableau valide");
        }

        const pays = countries
            .filter(country => country && country.country)
            .map(country => ({
                name: country.country,
                code: country.iso2 || "",
                flag: (country.iso2 || "")
                    .toUpperCase()
                    .replace(/[A-Z]/g, letter => String.fromCodePoint(127397 + letter.charCodeAt(0))),
                dialCode: phoneCodes[country.iso2] ? `+${phoneCodes[country.iso2]}` : "",
                minLength: phoneLengths[country.iso2] ? phoneLengths[country.iso2][0] : 6,
                maxLength: phoneLengths[country.iso2] ? phoneLengths[country.iso2][1] : 15
            }))
            .filter(country => country.name);

        console.log(`✅ ${pays.length} pays récupérés`);

        res.json({
            success: true,
            data: pays
        });

    } catch (error) {
        console.error("❌ ERREUR API PAYS :", error);

        res.status(500).json({
            success: false,
            data: null,
            message: "Impossible de récupérer les pays",
            error: error.message
        });
    }
});


// =====================================================
// API UNIVERSITÉS
// =====================================================

app.get("/api/universites", async (req, res) => {
    try {
        const pays = req.query.country;

        console.log("");
        console.log("🎓 Pays demandé :", pays);

        if (!pays) {
            return res.status(400).json({
                success: false,
                data: [],
                message: "Le paramètre country est obligatoire"
            });
        }

        const countryCode = await getCountryCodeByName(pays);

        if (!countryCode) {
            return res.status(404).json({
                success: false,
                data: [],
                message: `Aucun code pays trouvé pour ${pays}`
            });
        }

        const institutions = [];
        let page = 1;
        const maxPages = 20;

        while (page <= maxPages) {
            const url = `${universitiesApi}${countryCode}&per-page=200&page=${page}`;
            console.log("🔗 URL universités :", url);

            const response = await fetch(url);
            console.log("📡 HTTP universités :", response.status);

            if (!response.ok) {
                const texte = await response.text();
                console.error("❌ Réponse API :", texte);
                throw new Error(`API universités HTTP ${response.status}`);
            }

            const data = await response.json();
            const results = Array.isArray(data?.results) ? data.results : [];

            if (!results.length) {
                break;
            }

            institutions.push(...results);

            if (results.length < 200) {
                break;
            }

            if (data?.meta?.count && institutions.length >= data.meta.count) {
                break;
            }

            page += 1;
        }

        const uniqueInstitutions = Array.from(
            new Map(
                institutions
                    .filter(item => item && item.display_name)
                    .map(item => [item.display_name, item])
            ).values()
        );

        const resultat = uniqueInstitutions.map(institution => {
            const homepage = typeof institution.homepage_url === "string" ? institution.homepage_url : "";
            let domain = "";

            if (homepage) {
                try {
                    const parsed = new URL(homepage);
                    domain = parsed.hostname.replace(/^www\./i, "");
                } catch (error) {
                    domain = "";
                }
            }

            return {
                name: institution.display_name,
                country: institution.country_code || pays,
                alpha_two_code: institution.country_code || "",
                domains: domain ? [domain] : [],
                web_pages: homepage ? [homepage] : [],
                homepage_url: homepage,
                type: institution.type || "",
                id: institution.id || ""
            };
        });

        console.log(`✅ ${resultat.length} universités trouvées pour ${pays}`);

        res.json({
            success: true,
            data: resultat
        });

    } catch (error) {
        console.error("❌ ERREUR API UNIVERSITÉS :", error);

        res.status(500).json({
            success: false,
            data: [],
            message: "Impossible de récupérer les universités",
            error: error.message,
            cause: error.cause ? error.cause.message : null,
            code: error.cause ? error.cause.code : null
        });
    }
});


// =====================================================
// TEST UNIVERSITÉS
// =====================================================

app.get("/test-universites", async (req, res) => {
    try {
        const pays = "Burundi";
        const countryCode = await getCountryCodeByName(pays);

        if (!countryCode) {
            return res.status(404).json({
                success: false,
                message: `Aucun code pays trouvé pour ${pays}`
            });
        }

        const url = `${universitiesApi}${countryCode}&per-page=5&page=1`;

        console.log("🧪 Test universités :", url);

        const response = await fetch(url);
        console.log("📡 Status :", response.status);

        const data = await response.json();
        const results = Array.isArray(data?.results) ? data.results : [];

        res.json({
            success: true,
            nombre: results.length,
            data: results.slice(0, 5)
        });

    } catch (error) {
        console.error("❌ TEST UNIVERSITÉS :", error);

        res.status(500).json({
            success: false,
            error: error.message,
            cause: error.cause ? error.cause.message : null
        });
    }
});


// =====================================================
// ROUTE 404
// =====================================================

app.use((req, res) => {

    console.log(
        "❌ ROUTE INTROUVABLE :",
        req.method,
        req.originalUrl
    );


    res.status(404).json({

        success: false,

        message:
            "Route introuvable",

        route:
            req.originalUrl

    });

});


// =====================================================
// DÉMARRAGE
// =====================================================

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("🎓 BOURSE ÉTUDIANT");
    console.log("======================================");

    console.log(
        `🚀 Serveur : http://localhost:${PORT}`
    );

    console.log("");

    console.log(
        "🌍 Pays :"
    );

    console.log(
        `http://localhost:${PORT}/api/pays`
    );

    console.log("");

    console.log(
        "🎓 Universités :"
    );

    console.log(
        `http://localhost:${PORT}/api/universites?country=Algeria`
    );

    console.log("");

    console.log(
        "🧪 Test universités :"
    );

    console.log(
        `http://localhost:${PORT}/test-universites`
    );

    console.log("");

    console.log("======================================");
    console.log("");

});