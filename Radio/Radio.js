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
            stopRadio: () => stopRadio(data.client, data.toClient || data.client, Locale)
        };

        info("Radio:", data.action.command, ("plugin.from"), data.client, ("plugin.to"), data.toClient);

        if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        } else {
            await webRadios(data, data.client, data.toClient || data.client, Locale);
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


const webRadios = async (data, client, toClient, Locale) => {

    const command = data.action.command;

    clearClientTimeout(toClient);

    const radio = Config.modules.Radio[command];

    if (!radio) {
        Avatar.speak(Locale.get("speech.unknown"), client);
        return;
    }

    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get(["speech.play", command]), client, () => {
            Avatar.Speech.end(client);
            Avatar.play(radio, toClient, "url", "after");
            setAutoStop(toClient, Locale);
        });
    });
};

const stopRadio = async (client, toClient, Locale) => {

    clearClientTimeout(toClient);

    Avatar.stop(toClient, () => {
        Avatar.speak(Locale.get("speech.stop"), client, () => Avatar.Speech.end(client));
    });
};
