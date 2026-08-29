import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const CLIENT_TIMEOUT = new Map();

export async function init () {
    await Avatar.lang.addPluginPak('Radio');
}

export async function action(data, callback) {
    
    try {

        const Locale = await Avatar.lang.getPak('Radio', data.language);

        const tblActions = {
             listenRadio: () => webRadios(data, data.client, data.toClient || data.client, Locale, callback),
             stopRadio: () => stopRadio(data.client, data.toClient || data.client, Locale, callback)
        };

        info("Radio:", data.action.command, "from", data.client, "to", data.toClient);

        if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        } else {
            callback();
        }

    } catch (err) {
        if (data.client) Avatar.Speech.end(data.client);
        error(err.message);
        callback();
    }
}

const clearClientTimeout = (client) => {
    const t = CLIENT_TIMEOUT.get(client);
    if (t) clearTimeout(t);
    CLIENT_TIMEOUT.delete(client);
};

const setAutoStop = (client, Locale) => {
    clearClientTimeout(client);
    const timeout = setTimeout(() => {
        Avatar.stop(client, () => {
            CLIENT_TIMEOUT.delete(client);
            Avatar.speak(Locale.get("speech.autoStop"), client);
        });
    }, 45 * 60 * 1000);

    CLIENT_TIMEOUT.set(client, timeout);
};

const killApp = (toClient, app) => {
    return new Promise(resolve => {
        Avatar.runApp("taskkill", toClient, `/F /T /IM ${app}`, () => resolve());
        setTimeout(resolve, 500);
    });
};

const webRadios = async (data, client, toClient, Locale, callback) => {

    clearClientTimeout(toClient);

    const sentence = (data.rawSentence || data.action?.sentence || "").toLowerCase();
    const radios = Config.modules.Radio.radios;
    
    const foundRadioKey = Object.keys(radios).sort((a, b) => b.length - a.length).find(key =>
        sentence.includes(key.toLowerCase())
    );

    if (!foundRadioKey) {
        return askUnknownRadio(data, client, toClient, Locale, callback);
    }

    const urlRadio = radios[foundRadioKey];

    await killApp(toClient, "vlc.exe");
    await killApp(toClient, "ffplay.exe");
    await killApp(toClient, "brave.exe");

    info(foundRadioKey);
    info(urlRadio);

    Avatar.stop(toClient, () => {
    Avatar.speak(Locale.get("speech.play", foundRadioKey), client, () => {
        info("Démarrage audio radio :", foundRadioKey);
            Avatar.play(urlRadio, toClient, "url", "after");
            info("Avatar.play envoyé");
            setAutoStop(toClient, Locale);
            callback();
        }
    );
});

}


const askUnknownRadio = (data, client, toClient, Locale, callback) => {
    info(Locale.get("speech.askRadio"));
    Avatar.askme(Locale.get("speech.askRadio"), client, {
        "*": "generic",
        "annule": "cancel",
        "annuler": "cancel",
        "terminé": "cancel",
        "terminer": "cancel"
    }, 15, async (answer, end) => {
        end(client);

        info("Radio askme réponse :", answer);

        if (answer && answer.split(':')[1]) {
            const newRadioName = answer.split(':')[1].trim();
            if (newRadioName) {
                data.rawSentence = newRadioName;
                data.sentence = newRadioName;
                return webRadios(data, client, toClient, Locale, callback);
            }
        }

        switch (answer) {
            case "cancel":
                Avatar.speak(Locale.get("speech.cancel"), client, () => {
                    Avatar.Speech.end(client);
                    callback();
                });
                break;

            default:
                if (!answer || answer === "timeout") {
                    info("Radio : Aucun message reçu (Timeout). Libération forcée du client.");
                    Avatar.Speech.end(client);
                    return callback();
                }

                Avatar.speak(Locale.get("speech.unknownRadio"), client, () => {
                    Avatar.Speech.end(client);
                    callback();
                });
                break;
        }
    });
};


const stopRadio = (client, toClient, Locale, callback) => {
    clearClientTimeout(toClient);
    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get("speech.stop"), client, () => {
            callback();
        });
    });
};
