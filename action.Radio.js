import {default as _helpers} from '../../ia/node_modules/ava-ia/helpers/index.js'

export default function (state) {
	return new Promise((resolve, reject) => {

     try {
      let stopRadio = false;
      let terms = state.rawSentence.split(' ');

      terms.map(term => {
		if (term.toLowerCase() === 'éteins' || term.toLowerCase() === 'coupe' || term.toLowerCase() === 'stop' || term.toLowerCase() === 'stoppe' || term.toLowerCase() === 'arrête') {
		  stopRadio = true;
		}
	  });

		setTimeout(() => { 
      if (stopRadio) {
          state.action = {
            module: 'Radio',
            command: 'stopRadio',
          };
           } else {
          if (state.debug) info('Action Radio');
			state.action = {
				module: 'Radio',
				command: state.rule,
			};
    };
			resolve(state);
		}, Config.waitAction.time);

     } catch (error) {
      reject(new Error(`Une erreur s'est produite lors du traitement de la commande radio: ${error.message}`));
    }

	});
}
