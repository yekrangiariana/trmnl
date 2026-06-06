const https = require('https');

const token = '0441967d90777e0353a79a540f6870aedeab70dd';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  try {
    console.log("Fetching completed tasks...");
    // Let's get today's start date in ISO format YYYY-MM-DDT00:00:00Z
    const today = new Date();
    today.setHours(0,0,0,0);
    const sinceIso = today.toISOString();
    
    const url = `https://api.todoist.com/api/v1/tasks/completed?since=${encodeURIComponent(sinceIso)}`;
    console.log("URL:", url);
    const res = await makeRequest(url);
    console.log("Response Status:", res.statusCode);
    console.log("Response Body (truncated):", res.data.substring(0, 1000));
  } catch (err) {
    console.error("Error running test:", err);
  }
}

run();
