# Juegos de la abuela — actualizaciones

Aquí solo está la parte web de los cuatro juegos (`juegos/<juego>/game.js`, `engine.js`, `index.html`)
y `version.json` con la versión y las huellas SHA-256 de cada archivo.

Las apps de la tablet miran este `version.json` al abrirse, descargan la versión nueva si la hay
y la usan en el siguiente arranque. No contiene partidas ni datos personales.
