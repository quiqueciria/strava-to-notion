require("dotenv").config(); // Carga las variables de entorno desde .env
const axios = require("axios");
const { Client } = require("@notionhq/client");

// Configuración de Strava
let STRAVA_ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const stravaUrl = "https://www.strava.com/api/v3/athlete/activities";

// Configuración de Notion
const notion = new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Función para actualizar el token de Strava
async function refreshAccessToken() {
  try {
    const response = await axios.post(
      "https://www.strava.com/oauth/token",
      null,
      {
        params: {
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: STRAVA_REFRESH_TOKEN,
        },
      }
    );

    // Actualizar el token de acceso
    STRAVA_ACCESS_TOKEN = response.data.access_token;
    console.log("Nuevo token de acceso:", STRAVA_ACCESS_TOKEN);

    // Aquí podrías guardar el nuevo token de acceso en un lugar seguro si fuera necesario

    return STRAVA_ACCESS_TOKEN;
  } catch (error) {
    console.error("Error al renovar el token de acceso:", error);
    throw error;
  }
}

// Función para obtener actividades de Strava con manejo de errores de autenticación
async function getActivities() {
  try {
    const response = await axios.get(stravaUrl, {
      headers: { Authorization: `Bearer ${STRAVA_ACCESS_TOKEN}` },
    });

    const activities = response.data;
    for (const activity of activities) {
      // Convierte a kilómetros y redondea a 2 decimales
      const distanceInKilometers = parseFloat(
        (activity.distance / 1000).toFixed(2)
      );
      // Convertir a Horas
      const elapsedTimeInHours = parseFloat(
        (activity.elapsed_time / 3600).toFixed(2)
      );
      // Convertir a km/h
      const averageSpeedKmH = parseFloat(
        (activity.average_speed * 3.6).toFixed(2)
      );
      // Buscar si la actividad ya existe en Notion usando el ID de Strava
      const existingPage = await notion.databases.query({
        database_id: NOTION_DATABASE_ID,
        filter: {
          property: "Strava ID",
          rich_text: {
            equals: activity.id.toString(),
          },
        },
      });

      if (existingPage.results.length === 0) {
        // Si la actividad no existe, crear una nueva página
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
            Elapsed: {
              number: elapsedTimeInHours,
            },
            Media: {
              number: averageSpeedKmH,
            },
            "Strava ID": {
              rich_text: [
                {
                  text: {
                    content: activity.id.toString(),
                  },
                },
              ],
            },
          },
        });
        console.log(`Actividad '${activity.name}' añadida a Notion.`);
      } else {
        console.log(`Actividad '${activity.name}' ya existe en Notion.`);
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Si el token expiró, renovar y volver a intentar
      console.log("El token expiró, renovando...");
      STRAVA_ACCESS_TOKEN = await refreshAccessToken();
      // Reintentar la solicitud con el nuevo token
      await getActivities();
    } else {
      console.error(`Error al obtener actividades de Strava: ${error}`);
    }
  }
}

// Ejecutar la función de sincronización
getActivities();
