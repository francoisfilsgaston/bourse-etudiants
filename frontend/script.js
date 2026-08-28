// ==========================================
// ELEMENTS HTML
// ==========================================

const form = document.getElementById("candidatureForm");
const paysSelect = document.getElementById("pays");

const indicatifTelephoneSelect =
    document.getElementById("indicatifTelephone");

const telephoneInput =
    document.getElementById("telephone");
const universiteSelect = document.getElementById("universite");

const message = document.getElementById("message");


// ==========================================
// URL DE NOTRE SERVEUR
// ==========================================

const API = "https://bourse-etudiants.onrender.com";


// ==========================================
// CHARGER LES PAYS
// ==========================================

async function chargerPays() {

    console.log("🌍 Chargement des pays...");


    try {

        const response =
            await fetch(`${API}/api/pays`);


        if (!response.ok) {

            throw new Error(
                `Erreur HTTP : ${response.status}`
            );

        }


        const result =
            await response.json();


        console.log(
            "📦 Réponse serveur :",
            result
        );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Erreur lors du chargement des pays"
            );

        }


        const pays =
            result.data;


        if (!Array.isArray(pays)) {

            throw new Error(
                "Les pays reçus ne sont pas une liste"
            );

        }


        console.log(
            `✅ Nombre de pays : ${pays.length}`
        );


        // Vider le select

        paysSelect.innerHTML = `
            <option value="">
                Sélectionnez un pays
            </option>
        `;


        // Trier les pays

        pays.sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        indicatifTelephoneSelect.innerHTML = `
            <option value="">Code</option>
        `;


        // Ajouter les pays

        pays.forEach(paysItem => {

            const option =
                document.createElement("option");


            option.value =
                paysItem.name;

            option.dataset.dialCode =
                paysItem.dialCode || "";

            option.dataset.minLength =
                paysItem.minLength || 6;

            option.dataset.maxLength =
                paysItem.maxLength || 15;


            option.textContent =
                `${paysItem.flag || "🌍"} ${paysItem.name}`;


            paysSelect.appendChild(option);

            if (paysItem.dialCode) {
                const indicatifOption =
                    document.createElement("option");

                indicatifOption.value =
                    paysItem.dialCode;

                indicatifOption.textContent =
                    `${paysItem.flag || "🌍"} ${paysItem.dialCode}`;

                indicatifTelephoneSelect.appendChild(indicatifOption);
            }

        });

        indicatifTelephoneSelect.value = "+243";
        mettreAJourLongueurTelephone();


    } catch (error) {

        console.error(
            "❌ Impossible de charger les pays :",
            error
        );


        paysSelect.innerHTML = `
            <option value="">
                Erreur de chargement
            </option>
        `;

    }

}


function mettreAJourLongueurTelephone() {

    const paysOption =
        paysSelect.options[paysSelect.selectedIndex];

    const minLength =
        Number(paysOption?.dataset.minLength || 6);

    const maxLength =
        Number(paysOption?.dataset.maxLength || 15);

    telephoneInput.minLength = minLength;
    telephoneInput.maxLength = maxLength;
    telephoneInput.placeholder =
        `Numéro sans indicatif (${minLength}-${maxLength} chiffres)`;

}


function synchroniserIndicatifTelephone() {

    const paysOption =
        paysSelect.options[paysSelect.selectedIndex];

    indicatifTelephoneSelect.value =
        paysOption?.dataset.dialCode || "+243";

    mettreAJourLongueurTelephone();

}


// ==========================================
// CHARGER LES UNIVERSITÉS
// ==========================================

async function chargerUniversites(pays) {

    console.log(
        `🎓 Recherche des universités de ${pays}...`
    );


    // Désactiver pendant le chargement

    universiteSelect.disabled = true;


    universiteSelect.innerHTML = `
        <option value="">
            Chargement des universités...
        </option>
    `;


    try {

        const response = await fetch(
            `${API}/api/universites?country=${encodeURIComponent(pays)}`
        );


        if (!response.ok) {

            throw new Error(
                `Erreur HTTP : ${response.status}`
            );

        }


        const result =
            await response.json();


        console.log(
            "📦 Universités reçues :",
            result
        );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Erreur serveur"
            );

        }


        const universites =
            result.data;


        if (!Array.isArray(universites)) {

            throw new Error(
                "Les universités reçues ne sont pas une liste"
            );

        }


        // Aucune université

        if (universites.length === 0) {

            universiteSelect.innerHTML = `
                <option value="">
                    Aucune université trouvée
                </option>
            `;

            return;
        }


        // Nettoyer

        universiteSelect.innerHTML = `
            <option value="">
                Sélectionnez une université
            </option>
        `;


        // Trier

        universites.sort((a, b) =>
            a.name.localeCompare(b.name)
        );


        // Ajouter

        universites.forEach(universite => {

            const option =
                document.createElement("option");


            option.value =
                universite.name;


            option.textContent =
                universite.name;


            universiteSelect.appendChild(option);

        });


        // Activer

        universiteSelect.disabled = false;


        console.log(
            `✅ ${universites.length} universités disponibles`
        );


    } catch (error) {

        console.error(
            "❌ Erreur universités :",
            error
        );


        universiteSelect.innerHTML = `
            <option value="">
                Impossible de charger les universités
            </option>
        `;

    }

}


// ==========================================
// QUAND L'UTILISATEUR CHOISIT UN PAYS
// ==========================================

paysSelect.addEventListener(
    "change",
    function () {

        const pays =
            this.value;


        console.log(
            "🌍 Pays sélectionné :",
            pays
        );

        synchroniserIndicatifTelephone();


        // Aucun pays

        if (!pays) {

            universiteSelect.disabled = true;

            universiteSelect.innerHTML = `
                <option value="">
                    Choisissez d'abord un pays
                </option>
            `;

            return;
        }


        // Charger les universités

        chargerUniversites(pays);

    }
);


indicatifTelephoneSelect.addEventListener(
    "change",
    mettreAJourLongueurTelephone
);


telephoneInput.addEventListener(
    "input",
    function () {
        this.value = this.value.replace(/\D/g, "");
    }
);


// ==========================================
// SOUMISSION DU FORMULAIRE
// ==========================================

form.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        // Récupération des données

        const candidature = {

            nom:
                document.getElementById(
                    "nom"
                ).value.trim(),


            prenom:
                document.getElementById(
                    "prenom"
                ).value.trim(),


            email:
                document.getElementById(
                    "email"
                ).value.trim(),


            telephone:
                `${indicatifTelephoneSelect.value} ${telephoneInput.value.trim()}`,


            niveau:
                document.getElementById(
                    "niveau"
                ).value,


            filiere:
                document.getElementById(
                    "filiere"
                ).value.trim(),


            universiteActuelle:
                document.getElementById(
                    "universiteActuelle"
                ).value.trim(),


            pays:
                paysSelect.value,


            universite:
                universiteSelect.value,


            motivation:
                document.getElementById(
                    "motivation"
                ).value.trim()

        };


        console.log(
            "📋 CANDIDATURE :"
        );

        console.table(
            candidature
        );


        // Message

        message.innerHTML = `
            <span style="color: green;">
                <i class="fa-solid fa-circle-check"></i>
                Candidature prête à être enregistrée.
            </span>
        `;

    }
);


// ==========================================
// INITIALISATION
// ==========================================

console.log("🚀 Application démarrée");

chargerPays();