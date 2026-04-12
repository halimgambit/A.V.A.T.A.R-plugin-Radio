import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const CLIENT_TIMEOUT = new Map();

export async function action(data, callback) {

	try {

		const tblActions = {
			stopRadio: () => stopRadio(data.client)
		};

		info("Radio:", data.action.command, L.get("plugin.from"), data.client);

		if (tblActions[data.action.command]) {
			tblActions[data.action.command]();
			callback();
		} else {
			webRadios(data);
		}

	} catch (err) {
		if (data.client) Avatar.Speech.end(data.client);
		if (err.message) error(err.message);
	}

	callback();
}


/* =========================
   WEB RADIOS
========================= */

const webRadios = (data) => {

	const client = data.client;
	const command = data.action.command;

	// clear ancien timeout
	if (CLIENT_TIMEOUT.has(client)) {
		clearTimeout(CLIENT_TIMEOUT.get(client));
		CLIENT_TIMEOUT.delete(client);
	}

	// stop radio en cours
	Avatar.stop(client);

	const radio = Config.modules.Radio[command];

	if (!radio) {
		Avatar.speak("Radio inconnue", client);
		return;
	}

	Avatar.speak(`Je mets ${command}`, client, () => {

		Avatar.Speech.end(client);

		// ✅ CORRECTION ICI
		Avatar.play(radio, client, "url", "after");

		const t = setTimeout(() => {

			Avatar.stop(client);
			CLIENT_TIMEOUT.delete(client);

			Avatar.speak("Arrêt automatique de la radio", client);

		}, 30 * 60 * 1000);

		CLIENT_TIMEOUT.set(client, t);
	});
};


/* =========================
   STOP RADIO
========================= */

const stopRadio = (client) => {

	if (CLIENT_TIMEOUT.has(client)) {
		clearTimeout(CLIENT_TIMEOUT.get(client));
		CLIENT_TIMEOUT.delete(client);
	}

	Avatar.stop(client);
	Avatar.speak("J'arrête la radio", client);
};;