const https = require('https');

const token = '0441967d90777e0353a79a540f6870aedeab70dd';
const taskId = '6ffX2FGMfhfMcWM8'; // "Water plants" task ID from previous fetch

function postRequest(url) {
  const urlObj = new URL(url);
  const options = {
    method: 'POST',
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Length': 0
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function run() {
  try {
    // Try the api/v1/tasks/{id}/close path first
    console.log("Testing POST to /api/v1/tasks/{id}/close...");
    const res1 = await postRequest(`https://api.todoist.com/api/v1/tasks/${taskId}/close`);
    console.log("Response Status:", res1.statusCode);
    console.log("Response Body:", res1.data);
  } catch (err) {
    console.error("Error running test:", err);
  }
}

run();
