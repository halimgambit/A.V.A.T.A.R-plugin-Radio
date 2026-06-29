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

const killFFPlay = (toClient) => {
    return new Promise(resolve => {
        let timer;
        const done = (result) => {
            clearTimeout(timer);
            resolve(result);
        };
        timer = setTimeout(() => done(false), 500); 
        Avatar.runApp("taskkill", toClient, "/F /IM ffplay.exe", () => done(true));
    });
}

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

    await killFFPlay(toClient);
    Avatar.runApp("taskkill", toClient, "/F /T /IM brave.exe");

    info(foundRadioKey);
    info(urlRadio);

    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get("speech.play", foundRadioKey), client, () => {
            callback(); 
        });
        Avatar.play(urlRadio, toClient, "url", "after");
        setAutoStop(toClient, Locale);
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

        // === LE FALLBACK CORRECT POUR LE TIMEOUT ===
      if (!answer || answer.trim() === "" || answer === "timeout") {
        end(client);
        Avatar.Speech.end(client);
        info("Radio : Aucun message reçu (Timeout). Libération forcée du client.");
        return callback();
      }

      end(client);

        if (answer === "cancel") {
            info(Locale.get("speech.cancel"));
            return Avatar.speak(Locale.get("speech.cancel"), client, () => {
                callback();
            });
        }

        const newRadioName = answer.split(":")[1]?.trim();
        if (!newRadioName) {
            return Avatar.speak(Locale.get("speech.unknownRadio"), client, () => {
                callback();
            });
        }

        data.rawSentence = newRadioName;
        data.sentence = newRadioName;

        webRadios(data, client, toClient, Locale, callback);
    });
};

const stopRadio = async (client, toClient, Locale, callback) => {
    await killFFPlay(toClient);
    clearClientTimeout(toClient);
    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get("speech.stop"), client, () => {
            callback();
        });
    });
};
