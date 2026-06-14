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
             listenRadio: () => webRadios(data, data.client, data.toClient || data.client, Locale),
            stopRadio: () => stopRadio(data.client, data.toClient || data.client, Locale)
        };

        info("Radio:", data.action.command, "from", data.client, "to",data.toClient);

        if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        }

    } catch (err) {
        if (data.client) Avatar.Speech.end(data.client);
        error(err.message);
    }

    callback();
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


const webRadios = async (data, client, toClient, Locale) => {

    clearClientTimeout(toClient);

    const sentence = (data.rawSentence || data.sentence || "").toLowerCase();
    
    const radios = Config.modules.Radio.radios;
    
    const foundRadioKey = Object.keys(radios).sort((a, b) => b.length - a.length).find(key =>
        sentence.includes(key.toLowerCase())
    );

    if (!foundRadioKey) {
        return askUnknownRadio(data, client, toClient, Locale);
    }

    const urlRadio = radios[foundRadioKey];

    await killFFPlay(toClient);

    info(foundRadioKey);
    info(urlRadio);

    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get("speech.play", foundRadioKey), client, () => Avatar.Speech.end(client));
        Avatar.play(urlRadio, toClient, "url", "after");
        setAutoStop(toClient, Locale);
    });
}

const askUnknownRadio = (data, client, toClient, Locale) => {
    
    info(Locale.get("speech.askRadio"));

    Avatar.askme(Locale.get("speech.askRadio"), client, {
        "*": "generic",
        "annule": "cancel",
        "annuler": "cancel",
        "terminé": "cancel",
        "terminer": "cancel"
    }, 15, async (answer, end) => {
        end(client);

        if (answer === "cancel") {
            return Avatar.speak(Locale.get("speech.cancel"), client);
        }

        const newRadioName = answer.split(":")[1]?.trim();
        if (!newRadioName) {
            return Avatar.speak(Locale.get("speech.unknownRadio"), client);
        }

        data.rawSentence = newRadioName;
        data.sentence = newRadioName;

        webRadios(data, client, toClient, Locale);
    });
};


const stopRadio = async (client, toClient, Locale) => {
    await killFFPlay(toClient);
    clearClientTimeout(toClient);
    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get("speech.stop"), client, () => Avatar.Speech.end(client));
    });
};
