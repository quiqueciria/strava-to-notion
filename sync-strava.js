const axios = require("axios");
const { Client } = require("@notionhq/client");

// Configuración de Strava
const STRAVA_ACCESS_TOKEN = "97ef35ac2dad3ceb4905f14fb4208cd9b07d0a28";
const stravaUrl = "https://www.strava.com/api/v3/athlete/activities";

// Configuración de Notion
const NOTION_ACCESS_TOKEN =
  "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";
const NOTION_DATABASE_ID = "137ad089a85b802b95c1cbc7b14f1009";
const notion = new Client({ auth: NOTION_ACCESS_TOKEN });

// Obtener actividades de Strava
axios
  .get(stravaUrl, {
    headers: { Authorization: `Bearer ${STRAVA_ACCESS_TOKEN}` },
  })
  .then((response) => {
    const activities = response.data;
    activities.forEach(async (activity) => {
      // Suponiendo que activity.distance está en metros
      const distanceInKilometers = parseFloat(
        (activity.distance / 1000).toFixed(2)
      ); // Convierte a número

      // Buscar si la actividad ya existe en Notion usando el ID de Strava
      const existingPage = await notion.databases.query({
        database_id: NOTION_DATABASE_ID,
        filter: {
          property: "Strava ID", // Asegúrate de tener una columna en Notion para almacenar el ID de Strava
          rich_text: {
            equals: activity.id.toString(), // Compara con el ID de la actividad
          },
        },
      });

      // Si no existe, crear una nueva página
      if (existingPage.results.length === 0) {
        // Si la actividad no está en la base de datos, la creamos
        await notion.pages.create({
          parent: { database_id: NOTION_DATABASE_ID },
          properties: {
            Name: {
              title: [
                {
                  text: {
                    content: activity.name,
                  },
                },
              ],
            },
            Distance: {
              number: distanceInKilometers,
            },
            Date: {
              date: {
                start: activity.start_date_local,
              },
            },
            "Strava ID": {
              // Guarda el ID de Strava para futuras comparaciones
              rich_text: [
                {
                  text: {
                    content: activity.id.toString(),
                  },
                },
              ],
            },
            // Agrega más propiedades según tus necesidades
          },
        });
      }
    });
  })
  .catch((error) => {
    console.error(`Error al obtener actividades de Strava: ${error}`);
  });
