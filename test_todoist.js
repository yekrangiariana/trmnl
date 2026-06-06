const apiKey = "0441967d90777e0353a79a540f6870aedeab70dd";
const headers = { 'Authorization': 'Bearer ' + apiKey };

Promise.all([
  fetch('https://api.todoist.com/api/v1/tasks?filter=' + encodeURIComponent('today | overdue'), { headers }).then(r => {
    if (!r.ok) throw new Error("Tasks " + r.status);
    return r.json();
  }),
  fetch('https://api.todoist.com/api/v1/projects', { headers }).then(r => {
    if (!r.ok) throw new Error("Projects " + r.status);
    return r.json();
  }),
  fetch('https://api.todoist.com/api/v1/tasks/completed', { headers }).then(r => {
    if (!r.ok) throw new Error("Completed " + r.status);
    return r.json();
  })
]).then(res => {
  console.log("Success!", Object.keys(res[0]), Object.keys(res[1]), Object.keys(res[2]));
}).catch(err => console.error("Error!", err));
