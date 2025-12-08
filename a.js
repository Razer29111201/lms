fetch("http://localhost:8080/api/attendance/7/2", {
    method: "get",
    headers: {
        "Content-Type": "application/json"
    },

})
    .then(response => response.json())
    .then(data => {
        console.log("Server response:", data);
    })
    .catch(error => {
        console.error("Error:", error);
    });
