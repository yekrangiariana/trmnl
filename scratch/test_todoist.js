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
    const tasksRes = await makeRequest('https://api.todoist.com/api/v1/tasks?filter=today%20%7C%20overdue');
    const tasksData = JSON.parse(tasksRes.data);
    const firstTask = tasksData.results && tasksData.results[0] ? tasksData.results[0] : null;
    console.log("FIRST TASK:", JSON.stringify(firstTask, null, 2));

    const projectsRes = await makeRequest('https://api.todoist.com/api/v1/projects');
    const projectsData = JSON.parse(projectsRes.data);
    const firstProject = projectsData.results && projectsData.results[0] ? projectsData.results[0] : null;
    console.log("\nFIRST PROJECT:", JSON.stringify(firstProject, null, 2));
  } catch (err) {
    console.error("Error running test:", err);
  }
}

run();
