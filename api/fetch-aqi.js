import axios from 'axios';
import dayjs from 'dayjs';

const FLASK_API_URL = 'https://aqi-flask-ml-api.onrender.com/predict';

export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://preeminent-griffin-da3e5b.netlify.app'); // or '*' for dev
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD');

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm2_5,pm10,us_aqi&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

  try {
    const response = await axios.get(url);
    const { time, us_aqi } = response.data.hourly;
    const aqi24 = us_aqi.slice(-24);

    const predictRes = await axios.post(FLASK_API_URL, {
      aqi_sequence: aqi24,
    });

    const predictedAQI = predictRes.data.predicted_next_3hr_avg_aqi;
    const currentAQI = us_aqi[us_aqi.length - 1];

    return res.status(200).json({
      current_aqi: currentAQI,
      forecast_aqi: predictedAQI,
      trend: time.map((t, i) => ({
        time: t,
        us_aqi: us_aqi[i],
      })),
    });
  } catch (error) {
    console.error('[!] Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch or predict AQI data' });
  }
}
