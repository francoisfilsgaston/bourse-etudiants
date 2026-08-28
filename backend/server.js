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


// =====================================================
// API PAYS
// =====================================================

app.get("/api/pays", async (req, res) => {

    try {

        console.log("🌍 Récupération des pays...");

        const url =
            "https://raw.githubusercontent.com/umpirsky/country-list/master/data/en/country.json";


        console.log("🔗 URL pays :", url);


        const response =
            await fetch(url);


        console.log(
            "📡 HTTP REST Countries :",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                `REST Countries HTTP ${response.status}`
            );

        }


        const countries =
            await response.json();

        let phoneCodes = {};

        try {
            const phoneResponse =
                await fetch("https://country.io/phone.json");

            if (phoneResponse.ok) {
                phoneCodes = await phoneResponse.json();
            }
        } catch (phoneError) {
            console.warn("Indicatifs téléphoniques indisponibles :", phoneError.message);
        }


        if (!countries || typeof countries !== "object" || Array.isArray(countries)) {

            throw new Error(
                "La source des pays n'a pas retourné un objet valide"
            );

        }


        const pays =
            Object.entries(countries)
                .map(([code, name]) => ({
                    name,
                    code,
                    flag: code
                        .toUpperCase()
                        .replace(/[A-Z]/g, letter =>
                            String.fromCodePoint(
                                127397 + letter.charCodeAt(0)
                            )
                        ),
                    dialCode: phoneCodes[code]
                        ? `+${phoneCodes[code]}`
                        : "",
                    minLength: phoneLengths[code]
                        ? phoneLengths[code][0]
                        : 6,
                    maxLength: phoneLengths[code]
                        ? phoneLengths[code][1]
                        : 15
                }))
                .filter(country => country.name);


        console.log(
            `✅ ${pays.length} pays récupérés`
        );


        res.json({

            success: true,

            data:
                pays

        });


    } catch (error) {

        console.error(
            "❌ ERREUR API PAYS :",
            error
        );


        res.status(500).json({

            success: false,

            data: null,

            message:
                "Impossible de récupérer les pays",

            error:
                error.message

        });

    }

});


// =====================================================
// API UNIVERSITÉS
// =====================================================

app.get("/api/universites", async (req, res) => {

    try {

        const pays =
            req.query.country;


        console.log("");
        console.log(
            "🎓 Pays demandé :",
            pays
        );


        // ---------------------------------------------
        // Vérification du pays
        // ---------------------------------------------

        if (!pays) {

            return res.status(400).json({

                success: false,

                data: [],

                message:
                    "Le paramètre country est obligatoire"

            });

        }


        // ---------------------------------------------
        // API UNIVERSITÉS
        // ---------------------------------------------

        /*
         * IMPORTANT :
         *
         * HTTP fonctionne dans ton environnement.
         *
         * HTTPS provoquait :
         *
         * ETIMEDOUT ...:443
         *
         */

        const url =
            "http://universities.hipolabs.com/search?country=" +
            encodeURIComponent(pays);


        console.log(
            "🔗 URL universités :",
            url
        );


        // ---------------------------------------------
        // Appel API
        // ---------------------------------------------

        const response =
            await fetch(url);


        console.log(
            "📡 HTTP universités :",
            response.status
        );


        if (!response.ok) {

            const texte =
                await response.text();


            console.error(
                "❌ Réponse API :",
                texte
            );


            throw new Error(
                `API universités HTTP ${response.status}`
            );

        }


        // ---------------------------------------------
        // JSON
        // ---------------------------------------------

        const universites =
            await response.json();


        console.log(
            "📦 Type reçu :",
            Array.isArray(universites)
                ? "Array"
                : typeof universites
        );


        console.log(
            "🎓 Nombre reçu :",
            Array.isArray(universites)
                ? universites.length
                : 0
        );


        // ---------------------------------------------
        // Vérification
        // ---------------------------------------------

        if (!Array.isArray(universites)) {

            throw new Error(
                "L'API universités n'a pas retourné un tableau"
            );

        }


        // ---------------------------------------------
        // Nettoyage
        // ---------------------------------------------

        const resultat =
            universites

                .filter(universite =>
                    universite &&
                    universite.name
                )

                .map(universite => ({

                    name:
                        universite.name,

                    country:
                        universite.country || pays,

                    alpha_two_code:
                        universite.alpha_two_code || "",

                    domains:
                        Array.isArray(
                            universite.domains
                        )
                            ? universite.domains
                            : [],

                    web_pages:
                        Array.isArray(
                            universite.web_pages
                        )
                            ? universite.web_pages
                            : []

                }));


        console.log(
            `✅ ${resultat.length} universités trouvées pour ${pays}`
        );


        // ---------------------------------------------
        // Réponse
        // ---------------------------------------------

        res.json({

            success: true,

            data:
                resultat

        });


    } catch (error) {

        console.error(
            "❌ ERREUR API UNIVERSITÉS :",
            error
        );


        res.status(500).json({

            success: false,

            data: [],

            message:
                "Impossible de récupérer les universités",

            error:
                error.message,

            cause:
                error.cause
                    ? error.cause.message
                    : null,

            code:
                error.cause
                    ? error.cause.code
                    : null

        });

    }

});


// =====================================================
// TEST UNIVERSITÉS
// =====================================================

app.get("/test-universites", async (req, res) => {

    try {

        const pays = "Algeria";


        const url =
            "http://universities.hipolabs.com/search?country=" +
            encodeURIComponent(pays);


        console.log(
            "🧪 Test universités :",
            url
        );


        const response =
            await fetch(url);


        console.log(
            "📡 Status :",
            response.status
        );


        const data =
            await response.json();


        res.json({

            success: true,

            nombre:
                data.length,

            data:
                data.slice(0, 5)

        });


    } catch (error) {

        console.error(
            "❌ TEST UNIVERSITÉS :",
            error
        );


        res.status(500).json({

            success: false,

            error:
                error.message,

            cause:
                error.cause
                    ? error.cause.message
                    : null

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